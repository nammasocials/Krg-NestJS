"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ArrowLeft, Boxes, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import { useConfirm } from "@/components/ui/shared/confirm-dialog";
import { PageSpinner, Spinner } from "@/components/ui/shared/spinner";
import { useToast } from "@/components/ui/shared/toast";
import { ApiError, NetworkError } from "@/lib/api/client";
import { createProductsApi } from "@/lib/api/products";
import { useAuth } from "@/lib/auth/use-auth";
import { formatDate, formatGstRate, formatRupees, formatStock, unitName } from "./format";
import { gstPreview } from "./gst-preview";
import { ProductImage } from "./product-image";
import type { Product } from "./product.types";
import { StatusBadge } from "./status-badge";
import { StockHistory } from "./stock-history";
import { useProduct } from "./use-product";

function Item({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm break-words text-gray-800">{children}</dd>
    </div>
  );
}

function Details({ product }: { product: Product }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { client } = useAuth();
  const api = useMemo(() => createProductsApi(client), [client]);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (deleting) return;
    const ok = await confirm({
      title: "Delete product?",
      message: `“${product.name}” will be removed from the product list.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.remove(product.id);
      toast.success(`Deleted “${product.name}”`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        toast.info(`“${product.name}” was already deleted`);
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
    router.push("/product");
  }

  const gst = gstPreview(product.unitPrice, product.gstRate);
  return (
    <section className="mx-auto max-w-3xl">
      <Link
        href="/product"
        className="inline-flex items-center gap-1 rounded text-sm font-medium text-brand-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to products
      </Link>

      <div className="mt-3 rounded-lg bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <ProductImage id={product.id} hasImage={!!product.image} name={product.name} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold break-words text-gray-800">{product.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <StatusBadge active={product.isActive} />
              <span>{formatRupees(product.unitPrice)} per {unitName(product.unit).toLowerCase()}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button nativeButton={false} render={<Link href={`/product/${product.id}/edit`} />} className="h-10 px-4">
                <Pencil aria-hidden="true" /> Edit
              </Button>
              <Button variant="outline" nativeButton={false} render={<Link href={`/product/${product.id}/stock`} />} className="h-10 px-4">
                <Boxes aria-hidden="true" /> Update stock
              </Button>
              <Button variant="destructive" className="h-10 px-4" disabled={deleting} onClick={onDelete}>
                {deleting ? <Spinner size="sm" label={null} /> : <Trash2 aria-hidden="true" />}
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>

        <dl className="mt-6 grid gap-5 border-t border-gray-100 pt-5 sm:grid-cols-2">
          <Item label="Unit">{unitName(product.unit)}</Item>
          <Item label="Unit price">{formatRupees(product.unitPrice)}</Item>
          <Item label="HSN code"><span className="font-mono">{product.hsnCode}</span></Item>
          <Item label="GST rate">
            {formatGstRate(product.gstRate)}
            <span className="block text-xs text-gray-500">
              CGST {formatGstRate(product.gstRate / 2)} + SGST {formatGstRate(product.gstRate / 2)}
            </span>
          </Item>
          <Item label="Price including GST">
            {formatRupees(gst.total)}
            <span className="block text-xs text-gray-500">
              GST {formatRupees(gst.gst)} (CGST {formatRupees(gst.cgst)} + SGST {formatRupees(gst.sgst)})
            </span>
          </Item>
          <Item label="Stock on hand">
            {formatStock(product.stock.qtyOnHand)}
            <span className="block text-xs text-gray-500">Changes through stock entries, not here.</span>
          </Item>
          <Item label="Status">{product.isActive ? "Active" : "Inactive"}</Item>
          <Item label="Added">{formatDate(product.createdAt)}</Item>
          <Item label="Last changed">{formatDate(product.updatedAt)}</Item>
        </dl>
      </div>

      {/* The history reads ?hpage=&hsize= from the address, which needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <StockHistory productId={product.id} />
      </Suspense>
    </section>
  );
}

/** The read-only product page: loads the product, then shows it with Edit and Delete. */
export function ProductDetails({ id }: { id: string }) {
  const { state, retry } = useProduct(id);
  if (state.kind === "loading") return <PageSpinner label="Loading product…" />;
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
  return <Details product={state.product} />;
}
