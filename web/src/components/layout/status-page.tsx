import type { ReactNode } from "react";
import { Brand } from "./brand";

/** Shared look of the not-found and error pages: brand, one heading, a short text, actions. */
export function StatusPage({
  code,
  title,
  message,
  children,
}: {
  code?: string;
  title: string;
  message: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-100 p-6 text-center">
      <Brand size={48} className="justify-center" nameClassName="text-xl" />
      <div className="max-w-md space-y-2">
        {code && <p className="text-5xl font-bold text-brand-primary">{code}</p>}
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        <p className="text-input-size text-gray-600">{message}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">{children}</div>
    </main>
  );
}

export const ACTION_CLASS =
  "inline-flex h-11 items-center justify-center rounded-lg px-6 text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
export const PRIMARY_ACTION = `${ACTION_CLASS} bg-brand-primary text-white hover:opacity-90`;
export const SECONDARY_ACTION = `${ACTION_CLASS} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;
