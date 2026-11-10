import Link from "next/link";
import { Boxes, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import type { ProductListItem } from "./product.types";

export interface RowActionHandlers {
  onDelete: (product: ProductListItem) => void;
  /** The id being deleted right now, so its buttons can be disabled. */
  busyId: string | null;
}

/** View, Edit, Update stock and Delete for one product. `compact` hides the words below 1024 px (the table). */
export function RowActions({ product, onDelete, busyId, compact = false }: RowActionHandlers & { product: ProductListItem; compact?: boolean }) {
  const label = compact ? "hidden lg:inline" : "";
  const busy = busyId === product.id;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/product/${product.id}`} aria-label={`View ${product.name}`} />}>
        <Eye aria-hidden="true" /> <span className={label}>View</span>
      </Button>
      <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/product/${product.id}/edit`} aria-label={`Edit ${product.name}`} />}>
        <Pencil aria-hidden="true" /> <span className={label}>Edit</span>
      </Button>
      <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/product/${product.id}/stock`} aria-label={`Update stock of ${product.name}`} />}>
        <Boxes aria-hidden="true" /> <span className={label}>Update stock</span>
      </Button>
      <Button variant="destructive" size="sm" disabled={busy} aria-label={`Delete ${product.name}`} onClick={() => onDelete(product)}>
        <Trash2 aria-hidden="true" /> <span className={label}>Delete</span>
      </Button>
    </div>
  );
}
