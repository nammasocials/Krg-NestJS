import { STATE_NAMES } from "./state-names";

/**
 * A copy of the API's GSTIN rules (api/src/customers/gstin.ts). Both are tested against the same
 * list of sample values (shared/customer-rules.samples.json), so they cannot drift apart unnoticed.
 */
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const GSTIN_FORMAT_MESSAGE =
  "GSTIN must be 15 characters: 2 digits, 5 letters, 4 digits, a letter, a letter or digit, Z, and a letter or digit.";
export const GSTIN_STATE_MESSAGE = "The first two digits are not a valid state code.";
export const GSTIN_CHECK_MESSAGE = "The last character does not match the rest of the GSTIN. Please re-check the number.";

/** Trims and upper-cases: the form in which a GSTIN is sent and compared. */
export const normalizeGstin = (value: string): string => value.trim().toUpperCase();

/** The check character (15th) for the first 14 characters: the GST mod-36 weighted sum. */
export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = CHARSET.indexOf(first14[i]!) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARSET[(36 - (sum % 36)) % 36]!;
}

/** What is wrong with this GSTIN, in words for the person typing it; null when it is valid. */
export function gstinProblem(value: string): string | null {
  const gstin = normalizeGstin(value);
  if (!GSTIN_PATTERN.test(gstin)) return GSTIN_FORMAT_MESSAGE;
  if (!Object.hasOwn(STATE_NAMES, gstin.slice(0, 2))) return GSTIN_STATE_MESSAGE;
  if (gstinCheckChar(gstin.slice(0, 14)) !== gstin[14]) return GSTIN_CHECK_MESSAGE;
  return null;
}

export const isValidGstin = (value: string): boolean => gstinProblem(value) === null;
