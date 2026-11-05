import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import { PAGE_SIZES, rangeText, type PageSize } from "./list-query";

interface PaginationProps {
  page: number;
  pageSize: PageSize;
  total: number;
  totalPages: number;
  disabled?: boolean;
  onPage: (page: number) => void;
  onPageSize: (size: PageSize) => void;
}

/** "Showing 11–20 of 53", first/previous/next/last, and the page-size choice. */
export function Pagination({ page, pageSize, total, totalPages, disabled, onPage, onPageSize }: PaginationProps) {
  const last = Math.max(totalPages, 1);
  const atStart = page <= 1;
  const atEnd = page >= last;

  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-600" aria-live="polite">{rangeText(page, pageSize, total)}</p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Per page
          <select
            className="h-8 rounded-lg border border-input bg-white px-2 text-sm"
            value={pageSize}
            disabled={disabled}
            onChange={(e) => onPageSize(Number(e.target.value) as PageSize)}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <nav aria-label="Pagination" className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="First page" disabled={disabled || atStart} onClick={() => onPage(1)}>
            <ChevronsLeft aria-hidden="true" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Previous page" disabled={disabled || atStart} onClick={() => onPage(page - 1)}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="px-2 text-sm text-gray-600">Page {Math.min(page, last)} of {last}</span>
          <Button variant="outline" size="icon" aria-label="Next page" disabled={disabled || atEnd} onClick={() => onPage(page + 1)}>
            <ChevronRight aria-hidden="true" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Last page" disabled={disabled || atEnd} onClick={() => onPage(last)}>
            <ChevronsRight aria-hidden="true" />
          </Button>
        </nav>
      </div>
    </div>
  );
}
