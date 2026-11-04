import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { ROLES } from "../users/roles";
import type { AuthenticatedRequest } from "./auth-user";
import { IS_PUBLIC_KEY } from "./decorators";

export const AUTH_REQUIRED = "Authentication required";

/** Global guard: every route needs a valid access token unless it is marked `@Public()`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.bearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException(AUTH_REQUIRED);

    try {
      // Pin the algorithm so a token cannot choose its own (for example "none").
      const payload = await this.jwt.verifyAsync<{ sub?: unknown; role?: unknown }>(token, { algorithms: ["HS256"] });
      if (typeof payload.sub !== "string" || !ROLES.includes(payload.role as (typeof ROLES)[number])) {
        throw new Error("unexpected token payload");
      }
      request.user = { id: payload.sub, role: payload.role as (typeof ROLES)[number] };
      return true;
    } catch {
      throw new UnauthorizedException(AUTH_REQUIRED);
    }
  }

  private bearerToken(header: string | undefined): string | undefined {
    const [scheme, token, ...rest] = (header ?? "").split(" ");
    return scheme?.toLowerCase() === "bearer" && token && rest.length === 0 ? token : undefined;
  }
}
