/** An HSN code has 4, 6 or 8 digits. */
export const HSN_PATTERN = /^(?:[0-9]{4}|[0-9]{6}|[0-9]{8})$/;

export const isHsn = (value: unknown): value is string => typeof value === "string" && HSN_PATTERN.test(value);
