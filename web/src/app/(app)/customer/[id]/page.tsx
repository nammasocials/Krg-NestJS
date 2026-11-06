import type { Metadata } from "next";
import { CustomerDetails } from "@/features/customers/customer-details";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetails id={id} />;
}
