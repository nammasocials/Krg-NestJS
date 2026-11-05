import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = { sm: "size-4", md: "size-5", lg: "size-8" } as const;

type SpinnerProps = {
  size?: keyof typeof SIZES;
  /** Text for screen readers. Pass `null` when the surrounding text already says it (e.g. a button). */
  label?: string | null;
  className?: string;
};

/** Spinning indicator. Takes its colour from the text colour; slows to a pulse for reduced motion. */
export function Spinner({ size = "md", label = "Loading…", className }: SpinnerProps) {
  const icon = (
    <Loader2
      className={cn(SIZES[size], "animate-spin motion-reduce:animate-pulse", className)}
      aria-hidden="true"
    />
  );
  if (label === null) return icon;
  return (
    <span role="status" className="inline-flex">
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** A spinner centred in the page. `fullScreen` fills the viewport; otherwise it fills a content area. */
export function PageSpinner({
  label,
  fullScreen = false,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center text-brand-primary",
        fullScreen ? "min-h-screen bg-gray-100" : "min-h-[50vh]",
      )}
    >
      <Spinner size="lg" label={label} />
    </div>
  );
}
