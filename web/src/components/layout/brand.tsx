import Image from "next/image";
import { cn } from "@/lib/utils";
import { APP_NAME, LOGO_SRC } from "@/config/constants";

type BrandProps = {
  /** Logo size in px (the logo is square and round). */
  size?: number;
  /** Responsive logo sizing classes (e.g. "size-9 md:size-12"); replaces the fixed `size` style. */
  imageClassName?: string;
  /** Element used for the app name; use "h1" when the brand is the page heading. */
  nameAs?: "h1" | "span";
  className?: string;
  nameClassName?: string;
};

/** Logo + app name. Shared by the public layout and the authenticated header. */
export function Brand({
  size = 64,
  imageClassName,
  nameAs: Name = "span",
  className,
  nameClassName,
}: BrandProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src={LOGO_SRC}
        alt={`${APP_NAME} logo`}
        width={size}
        height={size}
        style={imageClassName ? undefined : { width: size, height: size }}
        className={cn("rounded-full", imageClassName)}
        priority
      />
      <Name className={cn("font-bold text-gray-800", nameClassName)}>{APP_NAME}</Name>
    </div>
  );
}
