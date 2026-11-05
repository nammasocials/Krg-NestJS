import type {
  Customer,
  CustomerInput,
  CustomerPage,
  CustomerUpdate,
} from "@/features/customers/customer.types";
import type { ApiClient } from "./client";

const BASE = "/customers";

/** Typed calls for the customers endpoints, on top of the shared API client (token, refresh, errors). */
export function createCustomersApi(client: Pick<ApiClient, "request">) {
  return {
    /** `search` is the query string from `buildApiSearch`, including the leading `?`. */
    list: (search: string, init?: { signal?: AbortSignal }) =>
      client.request<CustomerPage>(`${BASE}${search}`, init),
    get: (id: string) => client.request<Customer>(`${BASE}/${id}`),
    create: (input: CustomerInput) => client.request<Customer>(BASE, { method: "POST", body: input }),
    update: (id: string, changes: CustomerUpdate) =>
      client.request<Customer>(`${BASE}/${id}`, { method: "PATCH", body: changes }),
    remove: (id: string) => client.request<void>(`${BASE}/${id}`, { method: "DELETE" }),
    removeLogo: (id: string) => client.request<void>(`${BASE}/${id}/logo`, { method: "DELETE" }),
  };
}

export type CustomersApi = ReturnType<typeof createCustomersApi>;

/**
 * Where the logo is served. The endpoint needs the access token, which a plain `<img src>` cannot
 * send, so screens that show a logo fetch it with the API client (T029/T030) rather than using this
 * as an image address.
 */
export const customerLogoPath = (id: string) => `/api/v1${BASE}/${id}/logo`;
