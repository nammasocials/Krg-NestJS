/**
 * A copy of the API's phone rule (api/src/customers/phone.ts), tested against the same samples
 * (shared/customer-rules.samples.json). Indian mobile numbers: 10 digits starting 6-9; a +91, 91 or
 * 0 prefix and spaces or dashes are accepted. Returns the 10 digits, or null.
 */
export function normalizePhone(value: string): string | null {
  const compact = value.trim().replace(/[\s-]/g, "");
  const match = /^(?:\+91|91|0)?([6-9][0-9]{9})$/.exec(compact);
  return match ? match[1]! : null;
}
