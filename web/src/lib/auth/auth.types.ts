export type Role = "SUPER_ADMIN" | "ADMIN";

/** The signed-in user, as returned by POST /auth/login, POST /auth/refresh and GET /auth/me. */
export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
}

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthState {
  status: AuthStatus;
  user: SessionUser | null;
  /** Set when the user chose to sign out, so AuthGate goes to a plain /login. */
  reason?: "logout";
}

/** Shape of the access-token responses (the API wraps them as { code, message, data }). */
export interface TokenResponse {
  accessToken: string;
  expiresIn: number;
  user: SessionUser;
}
