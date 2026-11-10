"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import { Spinner } from "@/components/ui/shared/spinner";
import { useToast } from "@/components/ui/shared/toast";
import { ApiError, NetworkError } from "@/lib/api/client";
import { createProductsApi } from "@/lib/api/products";
import { useAuth } from "@/lib/auth/use-auth";
import { Field } from "@/features/customers/customer-form";
import { useUnsavedGuard } from "@/features/customers/use-unsaved-guard";
import { formatStock } from "./format";
import type { Product } from "./product.types";
import {
  canCountInPacks,
  EMPTY_ENTRY,
  ENTRY_KINDS,
  ENTRY_LABELS,
  mapStockError,
  MAX_NOTE,
  MAX_STOCK_BALANCE,
  previewBalance,
  stockEntrySchema,
  toPieces,
  toRequest,
  type StockEntryField,
  type StockEntryValues,
} from "./stock-entry-schema";

const FIELD_ORDER: StockEntryField[] = ["kind", "unit", "quantity", "note"];
const selectClass = "h-10 w-full rounded-lg border border-input bg-white px-2 text-sm disabled:opacity-60";

const messageOf = (err: unknown) =>
  err instanceof NetworkError
    ? "Could not reach the server. Check your connection and try again."
    : err instanceof ApiError
      ? err.status >= 500
        ? "The server is not responding right now. Please try again in a moment."
        : err.message
      : "Something went wrong. Please try again.";

export function StockEntryForm({ product }: { product: Product }) {
  const router = useRouter();
  const toast = useToast();
  const { client } = useAuth();
  const api = useMemo(() => createProductsApi(client), [client]);
  const [submitting, setSubmitting] = useState(false);
  const packs = canCountInPacks(product.unit);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isDirty },
  } = useForm<StockEntryValues>({
    resolver: zodResolver(stockEntrySchema),
    defaultValues: EMPTY_ENTRY,
    mode: "onTouched",
  });
  const guard = useUnsavedGuard(isDirty);

  const kind = useWatch({ control, name: "kind" });
  const unit = useWatch({ control, name: "unit" });
  const quantity = useWatch({ control, name: "quantity" });
  const pieces = toPieces(quantity, unit);
  const current = product.stock.qtyOnHand;
  const preview = pieces !== null && pieces > 0 ? previewBalance(current, kind, pieces) : null;
  const isAdjustment = kind !== "IN";

  async function onSubmit(values: StockEntryValues) {
    if (submitting) return;
    setSubmitting(true);
    const req = toRequest(values);
    try {
      const result =
        req.endpoint === "stock-in" ? await api.stockIn(product.id, req.body) : await api.adjustStock(product.id, req.body);
      guard.allowLeave();
      toast.success(`Stock of “${product.name}” is now ${formatStock(result.product.stock.qtyOnHand)}`);
      router.push(`/product/${product.id}`);
    } catch (err) {
      const mapped = mapStockError(err);
      const withErrors = FIELD_ORDER.filter((f) => mapped.fields[f]);
      for (const f of withErrors) setError(f, { type: "server", message: mapped.fields[f] });
      // The fields are disabled while saving; focus can only land once they are enabled again.
      if (withErrors[0]) setTimeout(() => setFocus(withErrors[0]), 0);
      if (mapped.general.length > 0) toast.error(mapped.general.join(" "));
      if (withErrors.length === 0 && mapped.general.length === 0) {
        toast.error(err instanceof ApiError && err.status === 404 ? "This product no longer exists." : messageOf(err));
      }
      setSubmitting(false);
    }
  }

  async function onCancel() {
    if (!(await guard.confirmLeave())) return;
    router.push(`/product/${product.id}`);
  }

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800">Update stock</h1>
      <p className="mt-1 text-sm text-gray-600">
        <span className="font-medium text-gray-800">{product.name}</span> · Now{" "}
        <span data-testid="current-stock" className="font-medium text-gray-800">{formatStock(current)}</span>. Stock is counted in
        pieces.
      </p>

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="mt-4 grid gap-5 rounded-lg bg-white p-4 shadow-sm sm:p-6 md:grid-cols-2"
        aria-busy={submitting}
      >
        <Field id="kind" label="What happened" required error={errors.kind?.message} className="md:col-span-2">
          {(p) => (
            <select {...p} className={selectClass} disabled={submitting} {...register("kind")}>
              {ENTRY_KINDS.map((k) => (
                <option key={k} value={k}>{ENTRY_LABELS[k]}</option>
              ))}
            </select>
          )}
        </Field>

        <Field id="quantity" label="Quantity" required error={errors.quantity?.message}>
          {(p) => (
            <Input {...p} inputMode="numeric" maxLength={9} className="h-10" autoComplete="off" disabled={submitting} {...register("quantity")} />
          )}
        </Field>

        <Field id="unit" label="Counted in" error={errors.unit?.message} hint={packs ? "A pack is 10 pieces." : "This product is counted in pieces."}>
          {(p) => (
            <select {...p} className={selectClass} disabled={submitting || !packs} {...register("unit")}>
              <option value="PIECE">Pieces</option>
              {packs && <option value="PACK">Packs (10 pieces each)</option>}
            </select>
          )}
        </Field>

        <div className="rounded-lg bg-gray-50 p-3 text-sm md:col-span-2" aria-live="polite" data-testid="stock-preview">
          {preview === null && <p className="text-gray-600">Enter a quantity to see the new stock.</p>}
          {preview?.state === "ok" && (
            <p className="font-medium text-gray-800">
              {formatStock(current)} → {formatStock(preview.after)}
              {unit === "PACK" && pieces !== null && <span className="ml-2 font-normal text-gray-500">({formatStock(pieces)} {kind === "DECREASE" ? "removed" : "added"})</span>}
            </p>
          )}
          {preview?.state === "short" && (
            <p className="font-medium text-red-600">Not enough stock: {formatStock(preview.available)} on hand.</p>
          )}
          {preview?.state === "limit" && (
            <p className="font-medium text-red-600">
              This would take the stock above the limit of {MAX_STOCK_BALANCE.toLocaleString("en-IN")} pieces.
            </p>
          )}
        </div>

        <Field
          id="note"
          label={isAdjustment ? "Reason" : "Note"}
          required={isAdjustment}
          error={errors.note?.message}
          hint={isAdjustment ? `Why the count is changed (3 to ${MAX_NOTE} characters).` : `Optional, for example the supplier or bill number (up to ${MAX_NOTE} characters).`}
          className="md:col-span-2"
        >
          {(p) => <Input {...p} maxLength={MAX_NOTE + 20} className="h-10" autoComplete="off" disabled={submitting} {...register("note")} />}
        </Field>

        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4 md:col-span-2">
          <Button type="button" variant="outline" className="h-10 px-4" disabled={submitting} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="h-10 px-5" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner size="sm" label={null} /> Saving…
              </>
            ) : (
              "Save stock"
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}
