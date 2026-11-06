"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import { useConfirm } from "@/components/ui/shared/confirm-dialog";
import { PageSpinner, Spinner } from "@/components/ui/shared/spinner";
import { useToast } from "@/components/ui/shared/toast";
import { ApiError, NetworkError } from "@/lib/api/client";
import { createCustomersApi } from "@/lib/api/customers";
import { useAuth } from "@/lib/auth/use-auth";
import type { Customer } from "./customer.types";
import { CustomerLogo } from "./customer-logo";
import { formatDate, formatPhone } from "./format";
import { stateName } from "./state-names";
import { useCustomer } from "./use-customer";

function Item({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm break-words text-gray-800">{children}</dd>
    </div>
  );
}

function Details({ customer }: { customer: Customer }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { client } = useAuth();
  const api = useMemo(() => createCustomersApi(client), [client]);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (deleting) return;
    const ok = await confirm({
      title: "Delete customer?",
      message: `“${customer.name}” will be removed from the customer list.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.remove(customer.id);
      toast.success(`Deleted “${customer.name}”`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        toast.info(`“${customer.name}” was already deleted`);
      } else {
        toast.error(
          err instanceof NetworkError
            ? "Could not reach the server. Check your connection and try again."
            : err instanceof ApiError && err.status < 500
              ? err.message
              : "The server is not responding right now. Please try again in a moment.",
        );
        setDeleting(false);
        return;
      }
    }
    router.push("/customer");
  }

  const { address } = customer;
  const code = customer.stateCode;
  return (
    <section className="mx-auto max-w-3xl">
      <Link
        href="/customer"
        className="inline-flex items-center gap-1 rounded text-sm font-medium text-brand-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to customers
      </Link>

      <div className="mt-3 rounded-lg bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <CustomerLogo id={customer.id} hasLogo={!!customer.logo} name={customer.name} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold break-words text-gray-800">{customer.name}</h1>
            <p className="mt-1 font-mono text-sm text-gray-600">{customer.gstin}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button nativeButton={false} render={<Link href={`/customer/${customer.id}/edit`} />} className="h-10 px-4">
                <Pencil aria-hidden="true" /> Edit
              </Button>
              <Button variant="destructive" className="h-10 px-4" disabled={deleting} onClick={onDelete}>
                {deleting ? <Spinner size="sm" label={null} /> : <Trash2 aria-hidden="true" />}
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>

        <dl className="mt-6 grid gap-5 border-t border-gray-100 pt-5 sm:grid-cols-2">
          <Item label="Email">
            <a href={`mailto:${customer.email}`} className="text-brand-primary hover:underline">
              {customer.email}
            </a>
          </Item>
          <Item label="Phone">{formatPhone(customer.phone)}</Item>
          <Item label="Alternate phone">{customer.phoneAlt ? formatPhone(customer.phoneAlt) : "—"}</Item>
          <Item label="State">
            {stateName(code)} ({code})
          </Item>
          <Item label="Address" className="sm:col-span-2">
            {address.line}
            <br />
            {address.city} {address.pincode}
          </Item>
          <Item label="Added">{formatDate(customer.createdAt)}</Item>
          <Item label="Last changed">{formatDate(customer.updatedAt)}</Item>
        </dl>
      </div>
    </section>
  );
}

/** The read-only customer page: loads the customer, then shows it with Edit and Delete. */
export function CustomerDetails({ id }: { id: string }) {
  const { state, retry } = useCustomer(id);
  if (state.kind === "loading") return <PageSpinner label="Loading customer…" />;
  if (state.kind === "missing") notFound();
  if (state.kind === "error") {
    return (
      <div role="alert" className="flex min-h-[16rem] flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-gray-700">{state.message}</p>
        <Button variant="outline" onClick={retry}>
          Retry
        </Button>
      </div>
    );
  }
  return <Details customer={state.customer} />;
}
