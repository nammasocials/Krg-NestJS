import type { Metadata } from "next";
import { StockEntryPage } from "@/features/products/stock-entry-page";

export const metadata: Metadata = { title: "Update stock" };

export default async function UpdateStockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StockEntryPage id={id} />;
}
