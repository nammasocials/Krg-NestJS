"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/shared/button";
import { Label } from "@/components/ui/shared/label";
import { Spinner } from "@/components/ui/shared/spinner";
import { checkLogoFile, LOGO_ACCEPT, MAX_LOGO_MB, type LogoChange } from "./logo-file";

/** An address for showing a Blob in `<img>`. */
export function useObjectUrl(blob: Blob | null): string | null {
  const [made, setMade] = useState<{ blob: Blob; url: string } | null>(null);
  useEffect(() => {
    if (!blob) return;
    // Read as a data: address (no address to release); the answer arrives in a callback.
    const reader = new FileReader();
    reader.onload = () => setMade({ blob, url: String(reader.result) });
    reader.readAsDataURL(blob);
    return () => {
      reader.onload = null;
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
  }, [blob]);
  // Only a preview made for the current Blob is shown.
  return blob && made?.blob === blob ? made.url : null;
}

interface Props {
  /** The logo already saved for this customer (edit page), or null / undefined when there is none. */
  saved: Blob | null | undefined;
  /** True while the saved logo is still being fetched. */
  loadingSaved?: boolean;
  change: LogoChange;
  onChange: (change: LogoChange) => void;
  disabled?: boolean;
  /** What the picture is called on screen; "logo" for customers, "image" for products. */
  noun?: string;
}

export function LogoPicker({ saved, loadingSaved = false, change, onChange, disabled = false, noun = "logo" }: Props) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const fileInput = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const shown = change.action === "replace" ? change.file : change.action === "keep" ? (saved ?? null) : null;
  const previewUrl = useObjectUrl(shown);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be chosen again after a mistake
    if (!file) return;
    const message = await checkLogoFile(file);
    if (message) {
      setProblem(message);
      return;
    }
    setProblem(null);
    onChange({ action: "replace", file });
  }

  const hasLogo = shown !== null;
  const canRemove = change.action === "replace" || (change.action === "keep" && !!saved);

  return (
    <div>
      <Label htmlFor={inputId}>{noun.charAt(0).toUpperCase() + noun.slice(1)} (optional)</Label>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <div
          className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400"
          aria-live="polite"
        >
          {loadingSaved ? (
            <Spinner label={`Loading ${noun}…`} />
          ) : previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a data: address cannot go through next/image
            <img src={previewUrl} alt={`${noun.charAt(0).toUpperCase() + noun.slice(1)} preview`} className="size-full object-contain" />
          ) : (
            <ImagePlus className="size-8" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <input
            ref={fileInput}
            id={inputId}
            type="file"
            accept={LOGO_ACCEPT}
            className="sr-only"
            disabled={disabled}
            onChange={onPick}
            aria-describedby={problem ? `${hintId} ${errorId}` : hintId}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={disabled} onClick={() => fileInput.current?.click()}>
              {hasLogo ? `Change ${noun}` : `Choose ${noun}`}
            </Button>
            {canRemove && (
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => {
                  setProblem(null);
                  onChange({ action: "remove" });
                }}
              >
                <Trash2 aria-hidden="true" /> Remove
              </Button>
            )}
            {change.action === "remove" && !!saved && (
              <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange({ action: "keep" })}>
                Undo remove
              </Button>
            )}
          </div>
          <p id={hintId} className="text-xs text-gray-500">
            JPEG, PNG or WebP, up to {MAX_LOGO_MB} MB.
          </p>
          {problem && (
            <p id={errorId} role="alert" className="text-sm text-red-600">
              {problem}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
