"use client";

import { Toast } from "@base-ui/react/toast";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import type { ReactNode } from "react";
import { toastOptions, type ToastExtras, type ToastKind } from "@/lib/ui/toast-options";
import { cn } from "@/lib/utils";

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info } as const;
const TONES: Record<ToastKind, string> = {
  success: "border-green-200 text-green-700",
  error: "border-red-200 text-red-700",
  info: "border-blue-200 text-blue-700",
};

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return (
    <>
      {toasts.map((toast) => {
        const kind = (toast.type as ToastKind) in ICONS ? (toast.type as ToastKind) : "info";
        const Icon = ICONS[kind];
        return (
          <Toast.Root
            key={toast.id}
            toast={toast}
            className={cn(
              "pointer-events-auto relative flex items-start gap-3 rounded-lg border bg-white p-4 pr-10 shadow-lg transition-all duration-200",
              "data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
              TONES[kind],
            )}
          >
            <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <Toast.Content className="min-w-0 flex-1">
              <Toast.Title className="text-sm font-semibold" />
              <Toast.Description className="mt-0.5 text-sm break-words text-gray-700" />
            </Toast.Content>
            <Toast.Close
              aria-label="Close notification"
              className="absolute top-2 right-2 rounded p-1 text-gray-500 outline-none hover:text-gray-800 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </Toast.Close>
          </Toast.Root>
        );
      })}
    </>
  );
}

/**
 * Put once near the root. Toasts sit at the bottom (full width on phones, bottom right on wide
 * screens) so they never cover the header's user area and Logout button.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider limit={3}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col gap-2 p-4 sm:left-auto sm:w-96">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

/** `const toast = useToast(); toast.success("Customer saved")`. */
export function useToast() {
  const { add } = Toast.useToastManager();
  return {
    success: (message: string, extras?: ToastExtras) => add(toastOptions("success", message, extras)),
    error: (message: string, extras?: ToastExtras) => add(toastOptions("error", message, extras)),
    info: (message: string, extras?: ToastExtras) => add(toastOptions("info", message, extras)),
  };
}
