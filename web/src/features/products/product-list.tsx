"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import { Spinner } from "@/components/ui/shared/spinner";
import { useConfirm } from "@/components/ui/shared/confirm-dialog";
import { useToast } from "@/components/ui/shared/toast";
import { ApiError, NetworkError } from "@/lib/api/client";
import { createProductsApi } from "@/lib/api/products";
import { useAuth } from "@/lib/auth/use-auth";
import { Pagination } from "@/features/customers/pagination";
import { SearchBox } from "@/features/customers/search-box";
import {
  ACTIVE_FILTERS,
  SORTS,
  SORT_LABELS,
  buildApiSearch,
  buildListSearch,
  pageAfterDelete,
  parseListQuery,
  type ActiveFilter,
  type ListQuery,
  type PageSize,
  type Sort,
} from "./list-query";
import { ProductCards } from "./product-cards";
import { ProductTable } from "./product-table";
import type { ProductListItem, ProductPage } from "./product.types";

const NETWORK_MESSAGE = "Could not reach the server. Check your connection and try again.";
const SERVER_MESSAGE = "The server is not responding right now. Please try again in a moment.";

const messageOf = (err: unknown) =>
  err instanceof NetworkError
    ? NETWORK_MESSAGE
    : err instanceof ApiError
      ? err.status >= 500
        ? SERVER_MESSAGE
        : err.message
      : "Something went wrong. Please try again.";

const ACTIVE_LABELS: Record<ActiveFilter, string> = { all: "All products", true: "Active only", false: "Inactive only" };

/** What the last request for a given address came back with. */
type Outcome = { key: string; error?: string };

const SELECT = "h-10 rounded-lg border border-input bg-white px-2 text-sm";

export function ProductList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { client } = useAuth();
  const api = useMemo(() => createProductsApi(client), [client]);
  const toast = useToast();
  const confirm = useConfirm();

  const query = useMemo(() => parseListQuery(searchParams), [searchParams]);
  const apiSearch = buildApiSearch(query);

  // Each answer is stored with the key it was asked for, so an older answer never shows for a newer search.
  const [reload, setReload] = useState(0);
  const key = `${apiSearch}#${reload}`;
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [page, setPage] = useState<ProductPage | null>(null); // last good data, kept while the next loads
  const [busyId, setBusyId] = useState<string | null>(null);

  const go = useCallback(
    (next: ListQuery, mode: "push" | "replace" = "push") => {
      router[mode](`${pathname}${buildListSearch(next)}`);
    },
    [router, pathname],
  );

  useEffect(() => {
    let current = true; // false once a newer request replaced this one
    api
      .list(apiSearch)
      .then((data) => {
        if (!current) return;
        // A page beyond the end (typed in the address, or after deletes elsewhere): show the last page.
        if (data.items.length === 0 && data.total > 0 && data.page > 1) {
          go({ ...parseListQuery(new URLSearchParams(apiSearch)), page: data.totalPages }, "replace");
          return;
        }
        setPage(data);
        setOutcome({ key });
      })
      .catch((err: unknown) => {
        if (current) setOutcome({ key, error: messageOf(err) });
      });
    return () => {
      current = false;
    };
  }, [api, apiSearch, key, go]);

  const answered = outcome?.key === key;
  const error = answered ? outcome.error : undefined;
  const loading = !answered;

  const commitSearch = useCallback((q: string) => go({ ...query, q, page: 1 }, "replace"), [go, query]);

  async function onDelete(product: ProductListItem) {
    const ok = await confirm({
      title: "Delete product?",
      message: `“${product.name}” will be removed from the product list.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;

    setBusyId(product.id);
    try {
      await api.remove(product.id);
      toast.success(`Deleted “${product.name}”`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) toast.info(`“${product.name}” was already deleted`);
      else {
        toast.error(messageOf(err));
        setBusyId(null);
        return;
      }
    }
    setBusyId(null);
    const target = pageAfterDelete(query.page, page?.items.length ?? 0);
    if (target !== query.page) go({ ...query, page: target }, "replace");
    else setReload((n) => n + 1);
  }

  const filtering = query.q !== "" || query.active !== "all";
  const addButton = (
    <Button nativeButton={false} render={<Link href="/product/new" />} className="h-10 px-4">
      <Plus aria-hidden="true" /> Add product
    </Button>
  );

  let body;
  if (error) {
    body = (
      <div role="alert" className="flex min-h-[16rem] flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-gray-700">{error}</p>
        <Button variant="outline" onClick={() => setReload((n) => n + 1)}>Retry</Button>
      </div>
    );
  } else if (!page) {
    body = (
      <div className="flex min-h-[16rem] items-center justify-center text-brand-primary">
        <Spinner size="lg" label="Loading products…" />
      </div>
    );
  } else if (page.total === 0) {
    body = (
      <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 p-6 text-center">
        {filtering ? (
          <>
            <p className="text-gray-700 break-all">
              {query.q ? `No products match “${query.q}”` : "No products match"}
              {query.active !== "all" ? ` (${ACTIVE_LABELS[query.active].toLowerCase()})` : ""}.
            </p>
            <Button variant="outline" onClick={() => go({ ...query, q: "", active: "all", page: 1 }, "replace")}>
              Clear filters
            </Button>
          </>
        ) : (
          <>
            <p className="text-gray-700">No products yet.</p>
            {addButton}
          </>
        )}
      </div>
    );
  } else {
    body = (
      <>
        <ProductTable items={page.items} onDelete={onDelete} busyId={busyId} />
        <div className="p-3 md:hidden">
          <ProductCards items={page.items} onDelete={onDelete} busyId={busyId} />
        </div>
        <Pagination
          page={page.page}
          pageSize={page.pageSize as PageSize}
          total={page.total}
          totalPages={page.totalPages}
          disabled={loading}
          onPage={(p) => go({ ...query, page: p })}
          onPageSize={(size) => go({ ...query, pageSize: size, page: 1 })}
        />
      </>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        {addButton}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SearchBox value={query.q} onCommit={commitSearch} placeholder="Name or HSN code" label="Search products" />
        <select
          className={SELECT}
          aria-label="Show"
          value={query.active}
          onChange={(e) => go({ ...query, active: e.target.value as ActiveFilter, page: 1 }, "replace")}
        >
          {ACTIVE_FILTERS.map((a) => (
            <option key={a} value={a}>{ACTIVE_LABELS[a]}</option>
          ))}
        </select>
        <select
          className={SELECT}
          aria-label="Sort by"
          value={query.sort}
          onChange={(e) => go({ ...query, sort: e.target.value as Sort, page: 1 }, "replace")}
        >
          {SORTS.map((s) => (
            <option key={s} value={s}>{SORT_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-lg bg-white shadow-sm" aria-busy={loading}>
        <div className={loading && page ? "opacity-60 transition-opacity" : "transition-opacity"}>{body}</div>
        {loading && page && (
          <div className="pointer-events-none absolute top-3 right-3 text-brand-primary">
            <Spinner label="Loading products…" />
          </div>
        )}
      </div>
    </section>
  );
}
