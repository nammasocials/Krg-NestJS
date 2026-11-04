import { ExecutionContext, SetMetadata, createParamDecorator } from "@nestjs/common";
import type { Role } from "../users/roles";
import type { AuthUser, AuthenticatedRequest } from "./auth-user";

export const IS_PUBLIC_KEY = "isPublic";
export const ROLES_KEY = "roles";

/** Opts a route (or whole controller) out of the global authentication guard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restricts a route to the listed roles. No `@Roles()` means any signed-in user. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** The authenticated user (`{ id, role }`) of the current request. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const user = ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (!user) throw new Error("@CurrentUser() used on a route that is not authenticated");
  return user;
});
