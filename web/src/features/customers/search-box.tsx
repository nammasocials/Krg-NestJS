"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/shared/input";
import { MAX_SEARCH_LENGTH } from "./list-query";

export const SEARCH_DEBOUNCE_MS = 300;

interface SearchBoxProps {
  /** The search text currently in the address bar. */
  value: string;
  /** Called 300 ms after typing stops, or at once when the box is cleared. */
  onCommit: (q: string) => void;
}

/**
 * A search field that follows the address bar: typing updates the address after a short pause, and
 * Back/Forward (which change the address) update the field.
 */
export function SearchBox({ value, onCommit }: SearchBoxProps) {
  const [draft, setDraft] = useState(value);
  // The last text this box sent up (or took from the address bar). A different `value` means the
  // address changed from outside, e.g. Back, so the field follows it.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setDraft(value);
  }

  useEffect(() => {
    const text = draft.trim();
    if (text === seen) return;
    const timer = setTimeout(() => {
      setSeen(text);
      onCommit(text);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, seen, onCommit]);

  function clear() {
    setDraft("");
    if (seen !== "") {
      setSeen("");
      onCommit("");
    }
  }

  return (
    <div className="relative w-full sm:max-w-md">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
      <Input
        type="search"
        value={draft}
        maxLength={MAX_SEARCH_LENGTH}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Name, email, phone, GSTIN"
        aria-label="Search customers"
        className="h-10 pr-10 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
