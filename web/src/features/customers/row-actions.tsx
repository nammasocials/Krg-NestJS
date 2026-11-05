import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import type { CustomerListItem } from "./customer.types";

export interface RowActionHandlers {
  onDelete: (customer: CustomerListItem) => void;
  /** The id being deleted right now, so its buttons can be disabled. */
  busyId: string | null;
}

/** View, Edit and Delete for one customer. Used by the table and by the cards. */
/** `compact` hides the words below 1024 px (the table); cards always show them. */
export function RowActions({ customer, onDelete, busyId, compact = false }: RowActionHandlers & { customer: CustomerListItem; compact?: boolean }) {
  const label = compact ? "hidden lg:inline" : "";
  const busy = busyId === customer.id;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href={`/customer/${customer.id}`} aria-label={`View ${customer.name}`} />}
      >
        <Eye aria-hidden="true" /> <span className={label}>View</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href={`/customer/${customer.id}/edit`} aria-label={`Edit ${customer.name}`} />}
      >
        <Pencil aria-hidden="true" /> <span className={label}>Edit</span>
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={busy}
        aria-label={`Delete ${customer.name}`}
        onClick={() => onDelete(customer)}
      >
        <Trash2 aria-hidden="true" /> <span className={label}>Delete</span>
      </Button>
    </div>
  );
}
