/** Up to 9 whole-rupee digits, then optionally "." and one or two decimals (same rule as the API's money.ts). */
const RUPEES = /^([0-9]{1,9})(?:\.([0-9]{1,2}))?$/;

/** Rupees as typed ("12.50", " 5 ", "0.1") to whole paise, with no floating-point arithmetic; `null` for anything else. */
export function rupeesToPaise(input: string): number | null {
  const match = RUPEES.exec(input.trim());
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** 1250 becomes "12.50": what the price box shows for a saved price. */
export function paiseToRupees(paise: number): string {
  if (!Number.isSafeInteger(paise) || paise < 0) throw new RangeError("paise must be a non-negative integer");
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, "0")}`;
}
