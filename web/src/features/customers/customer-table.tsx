import type { CustomerListItem } from "./customer.types";
import { formatDate, formatPhone } from "./format";
import { RowActions, type RowActionHandlers } from "./row-actions";
import { stateName } from "./state-names";

const TH = "px-3 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase";
const TD = "px-3 py-3 align-top text-sm text-gray-700";

/** Wide screens (768 px and up; State and Added join at 1024 px). Narrower screens use CustomerCards instead. */
export function CustomerTable({ items, ...actions }: { items: CustomerListItem[] } & RowActionHandlers) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[36rem] border-collapse">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th scope="col" className={TH}>Name</th>
            <th scope="col" className={TH}>GSTIN</th>
            <th scope="col" className={TH}>Phone</th>
            <th scope="col" className={TH}>Email</th>
            <th scope="col" className={`${TH} hidden lg:table-cell`}>State</th>
            <th scope="col" className={`${TH} hidden lg:table-cell`}>Added</th>
            <th scope="col" className={TH}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <th scope="row" className={`${TD} max-w-[14rem] text-left font-medium break-words text-gray-900`}>{c.name}</th>
              <td className={`${TD} font-mono text-xs whitespace-nowrap`}>{c.gstin}</td>
              <td className={`${TD} whitespace-nowrap`}>{formatPhone(c.phone)}</td>
              <td className={`${TD} min-w-[10rem] max-w-[14rem] break-words [overflow-wrap:anywhere]`}>{c.email}</td>
              <td className={`${TD} hidden lg:table-cell`}>{stateName(c.stateCode)}</td>
              <td className={`${TD} hidden whitespace-nowrap lg:table-cell`}>{formatDate(c.createdAt)}</td>
              <td className={TD}><RowActions customer={c} compact {...actions} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
