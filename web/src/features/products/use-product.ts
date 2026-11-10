"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, NetworkError } from "@/lib/api/client";
import { createProductsApi } from "@/lib/api/products";
import { useAuth } from "@/lib/auth/use-auth";
import type { Product } from "./product.types";

export type ProductLoad =
  | { kind: "loading" }
  | { kind: "ready"; product: Product }
  | { kind: "missing" }
  | { kind: "error"; message: string };

type Answer = { id: string; attempt: number } & Exclude<ProductLoad, { kind: "loading" }>;

/** Loads one product. Each answer is stored with the id and attempt it was asked for, so an old answer is never shown for a new one. */
export function useProduct(id: string): { state: ProductLoad; retry: () => void } {
  const { client } = useAuth();
  const api = useMemo(() => createProductsApi(client), [client]);
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);

  useEffect(() => {
    let current = true;
    api
      .get(id)
      .then((product) => current && setAnswer({ id, attempt, kind: "ready", product }))
      .catch((err: unknown) => {
        if (!current) return;
        if (err instanceof ApiError && err.status === 404) {
          setAnswer({ id, attempt, kind: "missing" });
          return;
        }
        const message =
          err instanceof NetworkError
            ? "Could not reach the server. Check your connection and try again."
            : err instanceof ApiError && err.status < 500
              ? err.message
              : "The server is not responding right now. Please try again in a moment.";
        setAnswer({ id, attempt, kind: "error", message });
      });
    return () => {
      current = false;
    };
  }, [api, id, attempt]);

  const state: ProductLoad = answer && answer.id === id && answer.attempt === attempt ? answer : { kind: "loading" };
  return { state, retry: () => setAttempt((n) => n + 1) };
}
