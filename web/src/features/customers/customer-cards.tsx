import type { CustomerListItem } from "./customer.types";
import { formatDate, formatPhone } from "./format";
import { RowActions, type RowActionHandlers } from "./row-actions";
import { stateName } from "./state-names";

function Field({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-16 shrink-0 text-gray-500">{label}</dt>
      <dd className={`min-w-0 break-words text-gray-800 ${mono ? "font-mono text-xs leading-5" : ""}`}>{children}</dd>
    </div>
  );
}

/** Below 768 px: one card per customer, with the same actions as the table. */
export function CustomerCards({ items, ...actions }: { items: CustomerListItem[] } & RowActionHandlers) {
  return (
    <ul className="space-y-3 md:hidden">
      {items.map((c) => (
        <li key={c.id} className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-base font-semibold break-words text-gray-900">{c.name}</h2>
          <dl className="mt-2 space-y-1">
            <Field label="GSTIN" mono>{c.gstin}</Field>
            <Field label="Phone">{formatPhone(c.phone)}</Field>
            <Field label="Email"><span className="break-all">{c.email}</span></Field>
            <Field label="State">{stateName(c.stateCode)}</Field>
            <Field label="Added">{formatDate(c.createdAt)}</Field>
          </dl>
          <div className="mt-3"><RowActions customer={c} {...actions} /></div>
        </li>
      ))}
    </ul>
  );
}
