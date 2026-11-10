"use client";

import { notFound } from "next/navigation";
import { Button } from "@/components/ui/shared/button";
import { PageSpinner } from "@/components/ui/shared/spinner";
import { ProductForm } from "./product-form";
import { useProduct } from "./use-product";

/** Loads the product first, so the form always starts from what is saved. */
export function EditProduct({ id }: { id: string }) {
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
  return <ProductForm key={state.product.id} mode="edit" product={state.product} />;
}
