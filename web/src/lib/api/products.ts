import type {
  Product,
  ProductInput,
  ProductPage,
  ProductUpdate,
  StockEntryResult,
  StockMovementPage,
} from "@/features/products/product.types";
import type { ApiClient } from "./client";

const BASE = "/products";

/** Typed calls for the products endpoints, on top of the shared API client (token, refresh, errors). */
export function createProductsApi(client: Pick<ApiClient, "request" | "requestBlob">) {
  return {
    /** `search` is the query string from `buildApiSearch`, including the leading `?`. */
    list: (search: string, init?: { signal?: AbortSignal }) => client.request<ProductPage>(`${BASE}${search}`, init),
    get: (id: string) => client.request<Product>(`${BASE}/${id}`),
    create: (input: ProductInput) => client.request<Product>(BASE, { method: "POST", body: input }),
    update: (id: string, changes: ProductUpdate) =>
      client.request<Product>(`${BASE}/${id}`, { method: "PATCH", body: changes }),
    /** Goods received: whole pieces, optional note. */
    stockIn: (id: string, body: { quantity: number; note?: string }) =>
      client.request<StockEntryResult>(`${BASE}/${id}/stock-in`, { method: "POST", body }),
    /** A correction: signed whole pieces, reason required. */
    adjustStock: (id: string, body: { quantity: number; note: string }) =>
      client.request<StockEntryResult>(`${BASE}/${id}/stock-adjustments`, { method: "POST", body }),
    /** `search` includes the leading `?` (or is empty). */
    listMovements: (id: string, search = "", init?: { signal?: AbortSignal }) =>
      client.request<StockMovementPage>(`${BASE}/${id}/stock-movements${search}`, init),
    remove: (id: string) => client.request<void>(`${BASE}/${id}`, { method: "DELETE" }),
    uploadImage: (id: string, file: Blob) => {
      const form = new FormData();
      form.append("file", file);
      return client.request<unknown>(`${BASE}/${id}/image`, { method: "PUT", body: form });
    },
    /** The product image, or an ApiError with status 404 when there is none. */
    getImageBlob: (id: string) => client.requestBlob(`${BASE}/${id}/image`),
    removeImage: (id: string) => client.request<void>(`${BASE}/${id}/image`, { method: "DELETE" }),
  };
}

export type ProductsApi = ReturnType<typeof createProductsApi>;
