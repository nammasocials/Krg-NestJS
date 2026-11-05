import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSpinner } from "@/components/ui/shared/spinner";
import { CustomerList } from "@/features/customers/customer-list";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  // The list reads the address bar (?q=&page=), which needs a Suspense boundary.
  return (
    <Suspense fallback={<PageSpinner label="Loading customers…" />}>
      <CustomerList />
    </Suspense>
  );
}
