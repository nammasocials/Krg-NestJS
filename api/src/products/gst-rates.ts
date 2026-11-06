/** The GST slabs a product may carry, in percent. */
export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number];

export const isGstRate = (value: unknown): value is GstRate =>
  typeof value === "number" && (GST_RATES as readonly number[]).includes(value);
