"use client";

import { useEffect } from "react";
import "./globals.css";

/** Last resort: used when the root layout itself fails, so it has no providers or app components. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-100 p-6 text-center">
        <title>Something went wrong</title>
        <h1 className="text-2xl font-bold text-gray-800">Something went wrong</h1>
        <p className="max-w-md text-gray-600">An unexpected error happened. Please try again.</p>
        <button
          type="button"
          onClick={reset}
          className="h-11 rounded-lg bg-blue-700 px-6 text-base font-medium text-white hover:opacity-90"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
