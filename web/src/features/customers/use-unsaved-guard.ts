"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConfirm } from "@/components/ui/shared/confirm-dialog";
import { leavingHref } from "./unsaved-guard";

/**
 * While `dirty`: closing or reloading the tab shows the browser's own warning, and clicking a link
 * inside the app asks first. The browser's Back button cannot be intercepted by the App Router, so it
 * is not covered. Call `allowLeave()` right before navigating away after a successful save.
 */
export function useUnsavedGuard(dirty: boolean) {
  const router = useRouter();
  const confirm = useConfirm();
  const allowed = useRef(false);

  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (allowed.current) return;
      e.preventDefault();
    };

    const onClick = (e: MouseEvent) => {
      if (allowed.current || e.defaultPrevented) return;
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const href = leavingHref(
        { href: link.href, target: link.target, download: link.hasAttribute("download") },
        e,
        { origin: window.location.origin, href: window.location.href },
      );
      if (!href) return;
      e.preventDefault();
      e.stopPropagation();
      void confirm({
        title: "Discard changes?",
        message: "You have unsaved changes. If you leave this page they will be lost.",
        confirmLabel: "Discard changes",
        cancelLabel: "Keep editing",
        destructive: true,
      }).then((leave) => {
        if (!leave) return;
        allowed.current = true;
        router.push(href);
      });
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    // Capture phase, so this runs before the link's own handler navigates.
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, confirm, router]);

  return {
    allowLeave: () => {
      allowed.current = true;
    },
    /** Asks, when there are unsaved changes; resolves true when it is fine to leave (Cancel button). */
    confirmLeave: async () => {
      if (!dirty || allowed.current) return true;
      const ok = await confirm({
        title: "Discard changes?",
        message: "You have unsaved changes. If you leave this page they will be lost.",
        confirmLabel: "Discard changes",
        cancelLabel: "Keep editing",
        destructive: true,
      });
      if (ok) allowed.current = true;
      return ok;
    },
  };
}
