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
import { createCustomersApi } from "@/lib/api/customers";
import { useAuth } from "@/lib/auth/use-auth";
import type { CustomerListItem, CustomerPage } from "./customer.types";
import { CustomerCards } from "./customer-cards";
import { CustomerTable } from "./customer-table";
import {
  buildApiSearch,
  buildListSearch,
  pageAfterDelete,
  parseListQuery,
  type ListQuery,
  type PageSize,
} from "./list-query";
import { Pagination } from "./pagination";
import { SearchBox } from "./search-box";

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

/** What the last request for a given address came back with. */
type Outcome = { key: string; error?: string };

export function CustomerList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { client } = useAuth();
  const api = useMemo(() => createCustomersApi(client), [client]);
  const toast = useToast();
  const confirm = useConfirm();

  const query = useMemo(() => parseListQuery(searchParams), [searchParams]);
  const apiSearch = buildApiSearch(query);

  // `reload` re-asks for the same address (Retry, after a delete). Each answer is stored with the
  // key it was asked for, so an older answer can never be shown for a newer search.
  const [reload, setReload] = useState(0);
  const key = `${apiSearch}#${reload}`;
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [page, setPage] = useState<CustomerPage | null>(null); // last good data, kept while the next loads
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
        // A page number beyond the end (typed in the address, or after deletes elsewhere): show the last page.
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

  async function onDelete(customer: CustomerListItem) {
    const ok = await confirm({
      title: "Delete customer?",
      message: `“${customer.name}” will be removed from the customer list.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;

    setBusyId(customer.id);
    try {
      await api.remove(customer.id);
      toast.success(`Deleted “${customer.name}”`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) toast.info(`“${customer.name}” was already deleted`);
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

  const searching = query.q !== "";
  const addButton = (
    <Button nativeButton={false} render={<Link href="/customer/new" />} className="h-10 px-4">
      <Plus aria-hidden="true" /> Add customer
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
        <Spinner size="lg" label="Loading customers…" />
      </div>
    );
  } else if (page.total === 0) {
    body = (
      <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 p-6 text-center">
        {searching ? (
          <>
            <p className="text-gray-700 break-all">No customers match “{query.q}”.</p>
            <Button variant="outline" onClick={() => go({ ...query, q: "", page: 1 }, "replace")}>Clear search</Button>
          </>
        ) : (
          <>
            <p className="text-gray-700">No customers yet.</p>
            {addButton}
          </>
        )}
      </div>
    );
  } else {
    body = (
      <>
        <CustomerTable items={page.items} onDelete={onDelete} busyId={busyId} />
        <div className="p-3 md:hidden">
          <CustomerCards items={page.items} onDelete={onDelete} busyId={busyId} />
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
        <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
        {addButton}
      </div>

      <div className="mt-4">
        <SearchBox value={query.q} onCommit={commitSearch} />
      </div>

      <div
        className="relative mt-4 overflow-hidden rounded-lg bg-white shadow-sm"
        aria-busy={loading}
      >
        <div className={loading && page ? "opacity-60 transition-opacity" : "transition-opacity"}>{body}</div>
        {loading && page && (
          <div className="pointer-events-none absolute top-3 right-3 text-brand-primary">
            <Spinner label="Loading customers…" />
          </div>
        )}
      </div>
    </section>
  );
}
