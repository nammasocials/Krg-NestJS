"use client";

import { useEffect } from "react";
import { HomeLink } from "@/components/layout/home-link";
import { SECONDARY_ACTION, StatusPage, PRIMARY_ACTION } from "@/components/layout/status-page";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Details go to the console only, never to the screen.
    console.error(error);
  }, [error]);

  return (
    <StatusPage title="Something went wrong" message="An unexpected error happened. You can try again, or go back to the start.">
      <title>Something went wrong</title>
      <button type="button" onClick={reset} className={PRIMARY_ACTION}>
        Try again
      </button>
      <HomeLink className={SECONDARY_ACTION} />
    </StatusPage>
  );
}
