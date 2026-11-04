import type { Request } from "express";
import type { Role } from "../users/roles";

/** What the access token proves. The role is as of sign-in/refresh (at most one access-token lifetime old). */
export interface AuthUser {
  id: string;
  role: Role;
}

export type AuthenticatedRequest = Request & { user?: AuthUser };
