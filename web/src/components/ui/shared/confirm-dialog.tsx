"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import {
  createContext,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/shared/button";
import { createConfirmController, type ConfirmOptions } from "@/lib/ui/confirm-queue";

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/** Put once near the root. Renders the dialog and answers the promises from `useConfirm()`. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(createConfirmController);
  const request = useSyncExternalStore(controller.subscribe, controller.current, () => null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  return (
    <ConfirmContext.Provider value={controller.ask}>
      {children}
      <AlertDialog.Root
        open={request !== null}
        // Esc closes it as "cancel"; clicking outside does nothing (AlertDialog default).
        onOpenChange={(open) => {
          if (!open) controller.settle(false);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
          <AlertDialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
            {request && (
              <AlertDialog.Popup
                initialFocus={request.destructive ? cancelRef : confirmRef}
                className="max-h-full w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-2xl outline-none"
              >
                <AlertDialog.Title className="text-lg font-bold text-gray-800">
                  {request.title}
                </AlertDialog.Title>
                <AlertDialog.Description className="mt-2 text-sm break-words text-gray-600">
                  {request.message}
                </AlertDialog.Description>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    ref={cancelRef}
                    type="button"
                    variant="outline"
                    className="h-10 px-4 text-sm"
                    onClick={() => controller.settle(false)}
                  >
                    {request.cancelLabel}
                  </Button>
                  <Button
                    ref={confirmRef}
                    type="button"
                    variant={request.destructive ? "destructive" : "default"}
                    className={
                      request.destructive
                        ? "h-10 bg-red-600 px-4 text-sm text-white hover:bg-red-700"
                        : "h-10 px-4 text-sm"
                    }
                    onClick={() => controller.settle(true)}
                  >
                    {request.confirmLabel}
                  </Button>
                </div>
              </AlertDialog.Popup>
            )}
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
}

/** `const confirm = useConfirm(); if (await confirm({ title, message, destructive: true })) { … }` */
export function useConfirm(): Confirm {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>.");
  return ctx;
}
