import type { Role } from "./auth.types";

export function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function formatRole(role: Role): string {
  return role === "SUPER_ADMIN" ? "SUPER ADMIN" : role;
}
