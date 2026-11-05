export type ToastKind = "success" | "error" | "info";

export interface ToastExtras {
  /** Heading above the message. Defaults to "Success", "Error" or "Info". */
  title?: string;
  /** Milliseconds before it closes by itself; 0 keeps it until closed. */
  duration?: number;
}

export const DEFAULT_TITLES: Record<ToastKind, string> = {
  success: "Success",
  error: "Error",
  info: "Info",
};

/** Errors stay a little longer: they usually need reading and acting on. */
export const DEFAULT_DURATIONS: Record<ToastKind, number> = {
  success: 5000,
  error: 8000,
  info: 5000,
};

/**
 * Turns a toast call into the options the toast library takes. `description` is plain text and is
 * rendered as text (never as HTML), so API messages can be passed straight in.
 */
export function toastOptions(kind: ToastKind, message: string, extras: ToastExtras = {}) {
  return {
    type: kind,
    title: extras.title ?? DEFAULT_TITLES[kind],
    description: message,
    timeout: extras.duration ?? DEFAULT_DURATIONS[kind],
    // Errors interrupt screen readers; the rest wait politely.
    priority: kind === "error" ? ("high" as const) : ("low" as const),
  };
}
