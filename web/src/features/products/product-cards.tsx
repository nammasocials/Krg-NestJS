import { formatGstRate, formatRupees, formatStock, unitName } from "./format";
import type { ProductListItem } from "./product.types";
import { RowActions, type RowActionHandlers } from "./row-actions";
import { StatusBadge } from "./status-badge";

function Field({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-16 shrink-0 text-gray-500">{label}</dt>
      <dd className={`min-w-0 break-words text-gray-800 ${mono ? "font-mono text-xs leading-5" : ""}`}>{children}</dd>
    </div>
  );
}

/** Below 768 px: one card per product, with the same actions as the table. */
export function ProductCards({ items, ...actions }: { items: ProductListItem[] } & RowActionHandlers) {
  return (
    <ul className="space-y-3 md:hidden">
      {items.map((p) => (
        <li key={p.id} className={`rounded-lg border border-gray-200 p-4 ${p.isActive ? "bg-white" : "bg-gray-50"}`}>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-semibold break-words text-gray-900">{p.name}</h2>
            <StatusBadge active={p.isActive} />
          </div>
          <dl className="mt-2 space-y-1">
            <Field label="Price">{formatRupees(p.unitPrice)} per {unitName(p.unit).toLowerCase()}</Field>
            <Field label="GST">{formatGstRate(p.gstRate)}</Field>
            <Field label="HSN" mono>{p.hsnCode}</Field>
            <Field label="Stock">{formatStock(p.stock.qtyOnHand)}</Field>
          </dl>
          <div className="mt-3"><RowActions product={p} {...actions} /></div>
        </li>
      ))}
    </ul>
  );
}
