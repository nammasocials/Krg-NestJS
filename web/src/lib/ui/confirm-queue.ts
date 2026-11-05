export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, and Cancel gets the initial focus. */
  destructive?: boolean;
}

export interface ConfirmRequest extends Required<Omit<ConfirmOptions, "destructive">> {
  destructive: boolean;
}

/**
 * The promise logic behind `useConfirm()`, kept apart from React so it is easy to test.
 * One question at a time: asking while another is open answers `false` straight away.
 */
export function createConfirmController() {
  let pending: { request: ConfirmRequest; resolve: (answer: boolean) => void } | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  return {
    ask(options: ConfirmOptions): Promise<boolean> {
      if (pending) return Promise.resolve(false);
      return new Promise<boolean>((resolve) => {
        pending = {
          resolve,
          request: {
            title: options.title,
            message: options.message,
            confirmLabel: options.confirmLabel ?? "Confirm",
            cancelLabel: options.cancelLabel ?? "Cancel",
            destructive: options.destructive ?? false,
          },
        };
        notify();
      });
    },
    /** Answers the open question (ignored when none is open). */
    settle(answer: boolean) {
      if (!pending) return;
      const { resolve } = pending;
      pending = null;
      resolve(answer);
      notify();
    },
    current: (): ConfirmRequest | null => pending?.request ?? null,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type ConfirmController = ReturnType<typeof createConfirmController>;
