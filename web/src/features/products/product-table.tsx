import { formatGstRate, formatRupees, formatStock, unitName } from "./format";
import type { ProductListItem } from "./product.types";
import { RowActions, type RowActionHandlers } from "./row-actions";
import { StatusBadge } from "./status-badge";

const TH = "px-3 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase";
const TD = "px-3 py-3 align-top text-sm text-gray-700";

/** Wide screens (768 px and up; HSN and Stock join at 1024 px). Narrower screens use ProductCards instead. */
export function ProductTable({ items, ...actions }: { items: ProductListItem[] } & RowActionHandlers) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[36rem] border-collapse">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th scope="col" className={TH}>Name</th>
            <th scope="col" className={`${TH} hidden lg:table-cell`}>HSN</th>
            <th scope="col" className={TH}>Unit</th>
            <th scope="col" className={`${TH} text-right`}>Price</th>
            <th scope="col" className={`${TH} text-right`}>GST</th>
            <th scope="col" className={`${TH} hidden text-right lg:table-cell`}>Stock</th>
            <th scope="col" className={TH}>Status</th>
            <th scope="col" className={TH}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((p) => (
            <tr key={p.id} className={`hover:bg-gray-50 ${p.isActive ? "" : "bg-gray-50/60 text-gray-500"}`}>
              <th scope="row" className={`${TD} max-w-[16rem] text-left font-medium break-words text-gray-900`}>{p.name}</th>
              <td className={`${TD} hidden font-mono text-xs whitespace-nowrap lg:table-cell`}>{p.hsnCode}</td>
              <td className={`${TD} whitespace-nowrap`}>{unitName(p.unit)}</td>
              <td className={`${TD} text-right whitespace-nowrap`}>{formatRupees(p.unitPrice)}</td>
              <td className={`${TD} text-right whitespace-nowrap`}>{formatGstRate(p.gstRate)}</td>
              <td className={`${TD} hidden text-right whitespace-nowrap lg:table-cell`}>{formatStock(p.stock.qtyOnHand)}</td>
              <td className={TD}><StatusBadge active={p.isActive} /></td>
              <td className={TD}><RowActions product={p} compact {...actions} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
