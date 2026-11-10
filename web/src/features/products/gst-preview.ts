export interface GstPreview {
  /** All amounts in paise. */
  gst: number;
  cgst: number;
  sgst: number;
  total: number;
}

/**
 * The "Price including GST" shown while typing. Information only: it is never sent. GST is rounded to
 * the nearest paisa; the CGST/SGST split gives CGST the lower half when the amount is odd.
 * Integer arithmetic only (the rate is held in hundredths of a percent, so 0.25% is 25).
 */
export function gstPreview(unitPricePaise: number, ratePercent: number): GstPreview {
  const hundredths = Math.round(ratePercent * 100);
  const gst = Math.round((unitPricePaise * hundredths) / 10_000);
  const cgst = Math.floor(gst / 2);
  return { gst, cgst, sgst: gst - cgst, total: unitPricePaise + gst };
}
