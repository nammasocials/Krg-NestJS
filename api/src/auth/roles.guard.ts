import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "../users/roles";
import type { AuthenticatedRequest } from "./auth-user";
import { ROLES_KEY } from "./decorators";

export const FORBIDDEN_MESSAGE = "You do not have permission to do this";

/** Global guard, runs after `JwtAuthGuard`: enforces `@Roles()` where present. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles || roles.length === 0) return true;

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user || !roles.includes(user.role)) throw new ForbiddenException(FORBIDDEN_MESSAGE);
    return true;
  }
}
