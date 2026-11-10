"use client";

import { notFound } from "next/navigation";
import { Button } from "@/components/ui/shared/button";
import { PageSpinner } from "@/components/ui/shared/spinner";
import { StockEntryForm } from "./stock-entry-form";
import { useProduct } from "./use-product";

/** Loads the product first, so the screen always shows the stock as it is now. */
export function StockEntryPage({ id }: { id: string }) {
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
  return <StockEntryForm key={state.product.id} product={state.product} />;
}
