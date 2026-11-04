import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return <PagePlaceholder title="Products" />;
}
