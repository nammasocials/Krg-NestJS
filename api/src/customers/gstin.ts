import { isStateCode } from "./state-codes";

export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Trims and upper-cases: the form in which a GSTIN is stored and compared. */
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

/** True for a well-formed GSTIN with a real state code and the right check character. */
export function isValidGstin(value: string): boolean {
  const gstin = normalizeGstin(value);
  return (
    GSTIN_PATTERN.test(gstin) && isStateCode(gstin.slice(0, 2)) && gstinCheckChar(gstin.slice(0, 14)) === gstin[14]
  );
}

/** First two digits of a GSTIN. */
export const stateCodeOf = (gstin: string): string => normalizeGstin(gstin).slice(0, 2);
