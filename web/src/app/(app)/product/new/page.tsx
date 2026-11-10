import type { Metadata } from "next";
import { ProductForm } from "@/features/products/product-form";

export const metadata: Metadata = { title: "Add product" };

export default function NewProductPage() {
  return <ProductForm mode="create" />;
}
