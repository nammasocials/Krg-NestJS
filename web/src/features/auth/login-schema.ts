import { z } from "zod";

/** Starts with a letter, 5–20 characters, letters and digits only. */
export const USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9]{4,19}$/;

export const USERNAME_MESSAGE =
  "Username must start with a letter, be 5–20 characters long and contain only letters or numbers.";
export const PASSWORD_REQUIRED_MESSAGE = "Password is required.";

export const loginSchema = z.object({
  username: z.string().trim().regex(USERNAME_PATTERN, USERNAME_MESSAGE),
  // Login only checks presence; complexity rules belong to password creation, not sign-in.
  password: z.string().min(1, PASSWORD_REQUIRED_MESSAGE),
});

export type LoginValues = z.infer<typeof loginSchema>;
