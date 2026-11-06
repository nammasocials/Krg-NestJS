"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, NetworkError } from "@/lib/api/client";
import { createCustomersApi } from "@/lib/api/customers";
import { useAuth } from "@/lib/auth/use-auth";
import type { Customer } from "./customer.types";

export type CustomerLoad =
  | { kind: "loading" }
  | { kind: "ready"; customer: Customer }
  | { kind: "missing" }
  | { kind: "error"; message: string };

type Answer = { id: string; attempt: number } & Exclude<CustomerLoad, { kind: "loading" }>;

/** Loads one customer. Each answer is stored with the id and attempt it was asked for, so an old answer is never shown for a new one. */
export function useCustomer(id: string): { state: CustomerLoad; retry: () => void } {
  const { client } = useAuth();
  const api = useMemo(() => createCustomersApi(client), [client]);
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);

  useEffect(() => {
    let current = true;
    api
      .get(id)
      .then((customer) => current && setAnswer({ id, attempt, kind: "ready", customer }))
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

  const state: CustomerLoad = answer && answer.id === id && answer.attempt === attempt ? answer : { kind: "loading" };
  return { state, retry: () => setAttempt((n) => n + 1) };
}
