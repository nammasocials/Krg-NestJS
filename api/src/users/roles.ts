export const ROLES = ["SUPER_ADMIN", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

/** Same rule as the web login form (web/src/features/auth/login-schema.ts). */
export const USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9]{4,19}$/;
