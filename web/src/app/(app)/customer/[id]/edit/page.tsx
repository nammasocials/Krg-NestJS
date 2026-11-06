import type { Metadata } from "next";
import { EditCustomer } from "@/features/customers/edit-customer";

export const metadata: Metadata = { title: "Edit customer" };

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditCustomer id={id} />;
}
