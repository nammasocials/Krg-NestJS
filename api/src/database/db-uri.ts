export const DEFAULT_DB_NAME = "krg";

/** Database name from the URI path (`mongodb://host/krg?x=y` → `krg`), else the default. */
export function dbNameFromUri(uri: string): string {
  const match = /^mongodb(?:\+srv)?:\/\/[^/]*\/([^?]+)/.exec(uri);
  return match?.[1] ? decodeURIComponent(match[1]) : DEFAULT_DB_NAME;
}

/** Hides `user:password@` so a connection string can be logged or put in an error. */
export function maskUri(uri: string): string {
  return uri.replace(/\/\/[^/@]*@/, "//***@");
}
