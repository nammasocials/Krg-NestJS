import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSpinner } from "@/components/ui/shared/spinner";
import { ProductList } from "@/features/products/product-list";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  // The list reads the address bar (?q=&page=&sort=&active=), which needs a Suspense boundary.
  return (
    <Suspense fallback={<PageSpinner label="Loading products…" />}>
      <ProductList />
    </Suspense>
  );
}
