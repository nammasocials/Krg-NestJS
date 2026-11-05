/**
 * Indian mobile numbers: 10 digits starting 6-9. A +91, 91 or 0 prefix and spaces or dashes are
 * accepted. Returns the 10 digits, or null when the value is not a valid number.
 */
export function normalizePhone(value: string): string | null {
  const compact = value.trim().replace(/[\s-]/g, "");
  const match = /^(?:\+91|91|0)?([6-9][0-9]{9})$/.exec(compact);
  return match ? match[1]! : null;
}
