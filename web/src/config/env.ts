/**
 * Typed access to environment values used by the browser bundle.
 * Only NEXT_PUBLIC_* values belong here; each must be referenced literally so Next can inline it.
 * Server-only values (API_BASE_URL) are read in next.config.ts.
 */
export const env = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Invoice Manager",
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
} as const;
