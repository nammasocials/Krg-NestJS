/** "9876543210" becomes "98765 43210" (anything that is not 10 digits is shown as it is). */
export const formatPhone = (phone: string): string => (/^\d{10}$/.test(phone) ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone);

const DATE = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** "5 Nov 2026" for an ISO timestamp; empty text for anything unreadable. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : DATE.format(d);
}
