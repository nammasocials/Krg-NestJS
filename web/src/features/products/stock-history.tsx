"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/shared/button";
import { Spinner } from "@/components/ui/shared/spinner";
import { ApiError, NetworkError } from "@/lib/api/client";
import { createProductsApi } from "@/lib/api/products";
import { useAuth } from "@/lib/auth/use-auth";
import { Pagination } from "@/features/customers/pagination";
import { formatStock } from "./format";
import type { StockMovement, StockMovementPage } from "./product.types";
import { changeClass, formatChange, formatDateTime, kindLabel, noteLabel, whoText } from "./stock-history-format";
import { parseHistoryQuery, toApiSearch, withHistoryQuery, type HistoryQuery } from "./stock-history-query";

type Answer = { key: string } & ({ kind: "ready"; page: StockMovementPage } | { kind: "error"; message: string });

const messageOf = (err: unknown) =>
  err instanceof NetworkError
    ? "Could not reach the server. Check your connection and try again."
    : err instanceof ApiError && err.status < 500
      ? err.message
      : "The server is not responding right now. Please try again in a moment.";

function Change({ quantity }: { quantity: number }) {
  return <span className={`font-medium tabular-nums ${changeClass(quantity)}`}>{formatChange(quantity)}</span>;
}

/** The note (a reason for adjustments). Sales show "Invoice" until E06 links them. */
function Note({ m }: { m: StockMovement }) {
  if (!m.note && !m.invoiceId) return <span className="text-gray-400">—</span>;
  return (
    <span className="break-words">
      {m.invoiceId && <span className="text-gray-600">Invoice{m.note ? " · " : ""}</span>}
      {m.note}
    </span>
  );
}

function Table({ items }: { items: StockMovement[] }) {
  return (
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Stock changes, newest first</caption>
        <thead className="border-b border-gray-200 text-xs tracking-wide text-gray-500 uppercase">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">Date</th>
            <th scope="col" className="px-4 py-2 font-medium">Kind</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Change</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Balance</th>
            <th scope="col" className="px-4 py-2 font-medium">Note / reason</th>
            <th scope="col" className="px-4 py-2 font-medium">By</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((m) => (
            <tr key={m.id} className="align-top">
              <td className="px-4 py-2.5 whitespace-nowrap text-gray-700">{formatDateTime(m.createdAt)}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">{kindLabel(m.type)}</td>
              <td className="px-4 py-2.5 text-right"><Change quantity={m.quantity} /></td>
              <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">{formatStock(m.balanceAfter)}</td>
              <td className="max-w-xs px-4 py-2.5"><Note m={m} /></td>
              <td className="px-4 py-2.5">{whoText(m)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cards({ items }: { items: StockMovement[] }) {
  return (
    <ul className="divide-y divide-gray-100 sm:hidden">
      {items.map((m) => (
        <li key={m.id} className="px-4 py-3 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium text-gray-800">{kindLabel(m.type)}</span>
            <Change quantity={m.quantity} />
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(m.createdAt)} · {whoText(m)}</p>
          <p className="mt-1 text-gray-700">Balance: {formatStock(m.balanceAfter)}</p>
          {(m.note || m.invoiceId) && (
            <p className="mt-1 break-words text-gray-700">
              <span className="text-gray-500">{noteLabel(m.type)}: </span>
              <Note m={m} />
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/** A product's stock changes, newest first. The page and size live in the address (`?hpage=&hsize=`). */
export function StockHistory({ productId }: { productId: string }) {
  const { client } = useAuth();
  const api = useMemo(() => createProductsApi(client), [client]);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = parseHistoryQuery(searchParams);
  const key = `${productId}|${query.page}|${query.pageSize}`;

  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  // The last rows that were shown, kept on screen (dimmed controls) while the next page loads.
  const [lastPage, setLastPage] = useState<StockMovementPage | null>(null);

  const go = (next: HistoryQuery) =>
    router.replace(`${pathname}${withHistoryQuery(searchParams.toString(), next)}`, { scroll: false });

  useEffect(() => {
    const controller = new AbortController();
    api
      .listMovements(productId, toApiSearch(query), { signal: controller.signal })
      .then((page) => {
        setAnswer({ key, kind: "ready", page });
        setLastPage(page);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setAnswer({ key, kind: "error", message: messageOf(err) });
      });
    return () => controller.abort();
    // `query` is derived from `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, key, attempt]);

  const current = answer && answer.key === key ? answer : null; // an old answer is never shown for a new page
  const loading = current === null;
  const shown = current?.kind === "ready" ? current.page : current === null ? lastPage : null;

  // A page past the end (for example from an old link) falls back to the last one.
  const lastValid = current?.kind === "ready" && current.page.total > 0 && query.page > current.page.totalPages ? current.page.totalPages : null;
  useEffect(() => {
    if (lastValid !== null) go({ ...query, page: lastValid });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastValid]);

  return (
    <section aria-labelledby="stock-history-title" className="mt-6 rounded-lg bg-white shadow-sm" aria-busy={loading}>
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-6">
        <h2 id="stock-history-title" className="text-lg font-semibold text-gray-800">Stock history</h2>
        {loading && shown && <Spinner size="sm" label="Loading history…" />}
      </div>

      {loading && !shown && (
        <div className="flex justify-center p-8">
          <Spinner label="Loading history…" />
        </div>
      )}

      {current?.kind === "error" && (
        <div role="alert" className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-gray-700">{current.message}</p>
          <Button
            variant="outline"
            onClick={() => {
              setAnswer(null);
              setAttempt((n) => n + 1);
            }}
          >
            Retry
          </Button>
        </div>
      )}

      {shown && shown.total === 0 && <p className="p-6 text-center text-sm text-gray-600">No stock changes yet.</p>}

      {shown && shown.total > 0 && (
        <>
          <Table items={shown.items} />
          <Cards items={shown.items} />
          <Pagination
            page={shown.page}
            pageSize={query.pageSize}
            total={shown.total}
            totalPages={shown.totalPages}
            disabled={loading}
            onPage={(page) => go({ ...query, page })}
            onPageSize={(pageSize) => go({ page: 1, pageSize })}
          />
        </>
      )}
    </section>
  );
}
