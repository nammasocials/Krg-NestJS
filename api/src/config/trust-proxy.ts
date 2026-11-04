/** Express accepts a boolean, a hop count, or a string/list of subnets for "trust proxy". */
export type TrustProxy = boolean | number | string | string[];

export function parseTrustProxy(raw: string): TrustProxy {
  const value = raw.trim();
  if (value === "" || value.toLowerCase() === "false") return false;
  if (value.toLowerCase() === "true") return true;
  if (/^\d+$/.test(value)) return Number(value);
  return value.includes(",") ? value.split(",").map((part) => part.trim()).filter(Boolean) : value;
}
