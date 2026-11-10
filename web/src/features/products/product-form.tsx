"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import { Spinner } from "@/components/ui/shared/spinner";
import { useToast } from "@/components/ui/shared/toast";
import { ApiError, NetworkError } from "@/lib/api/client";
import { createProductsApi } from "@/lib/api/products";
import { useAuth } from "@/lib/auth/use-auth";
import { cn } from "@/lib/utils";
import { Field } from "@/features/customers/customer-form";
import type { LogoChange } from "@/features/customers/logo-file";
import { LogoPicker } from "@/features/customers/logo-picker";
import { useUnsavedGuard } from "@/features/customers/use-unsaved-guard";
import { formatRupees, unitName } from "./format";
import { gstPreview } from "./gst-preview";
import { mapApiError } from "./map-api-errors";
import { rupeesToPaise } from "./money";
import {
  buildUpdate,
  EMPTY_VALUES,
  productSchema,
  toFormValues,
  toInput,
  type ProductField,
  type ProductFormValues,
} from "./product-schema";
import { GST_RATES, UNIT_CODES, type Product } from "./product.types";

const FIELD_ORDER: ProductField[] = ["name", "unit", "unitPrice", "hsnCode", "gstRate", "openingStock"];

const messageOf = (err: unknown) =>
  err instanceof NetworkError
    ? "Could not reach the server. Check your connection and try again."
    : err instanceof ApiError
      ? err.status >= 500
        ? "The server is not responding right now. Please try again in a moment."
        : err.message
      : "Something went wrong. Please try again.";

const inputClass = "h-10";
const selectClass = "h-10 w-full rounded-lg border border-input bg-white px-2 text-sm disabled:opacity-60";

type Props = { mode: "create" } | { mode: "edit"; product: Product };

export function ProductForm(props: Props) {
  const router = useRouter();
  const toast = useToast();
  const { client } = useAuth();
  const api = useMemo(() => createProductsApi(client), [client]);

  const [saved, setSaved] = useState<Product | null>(props.mode === "edit" ? props.product : null);
  const [submitting, setSubmitting] = useState(false);

  // The image: what is saved (fetched as an image, since the endpoint needs the access token) and what the person chose.
  const [change, setChange] = useState<LogoChange>({ action: "keep" });
  const [savedImage, setSavedImage] = useState<Blob | null>(null);
  const [imageLoading, setImageLoading] = useState(props.mode === "edit" && !!props.product.image);
  const productId = props.mode === "edit" ? props.product.id : null;
  const hadImage = props.mode === "edit" && !!props.product.image;

  useEffect(() => {
    if (!productId || !hadImage) return;
    let current = true;
    api
      .getImageBlob(productId)
      .then((blob) => current && setSavedImage(blob))
      .catch(() => current && toast.error("The saved image could not be loaded."))
      .finally(() => current && setImageLoading(false));
    return () => {
      current = false;
    };
    // `toast` changes identity on every render; the image is fetched once per product.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, productId, hadImage]);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: props.mode === "edit" ? toFormValues(props.product) : EMPTY_VALUES,
    mode: "onTouched", // messages show after leaving a field, then update while typing
  });

  const dirty = isDirty || change.action !== "keep";
  const guard = useUnsavedGuard(dirty);

  const priceText = useWatch({ control, name: "unitPrice" });
  const rateText = useWatch({ control, name: "gstRate" });
  const paise = rupeesToPaise(priceText);
  const preview = paise !== null && rateText !== "" ? gstPreview(paise, Number(rateText)) : null;

  function showFieldErrors(fields: Partial<Record<ProductField, string>>) {
    const withErrors = FIELD_ORDER.filter((f) => fields[f]);
    for (const f of withErrors) setError(f, { type: "server", message: fields[f] });
    // The fields are disabled while saving; focus can only land once they are enabled again.
    if (withErrors[0]) setTimeout(() => setFocus(withErrors[0]), 0);
  }

  async function onSubmit(values: ProductFormValues) {
    if (submitting) return;
    setSubmitting(true);
    let current: Product;
    try {
      if (saved) {
        const changes = buildUpdate(saved, values);
        current = Object.keys(changes).length > 0 ? await api.update(saved.id, changes) : saved;
      } else {
        current = await api.create(toInput(values));
      }
    } catch (err) {
      const mapped = mapApiError(err);
      if (Object.keys(mapped.fields).length > 0) showFieldErrors(mapped.fields);
      if (mapped.general.length > 0) toast.error(mapped.general.join(" "));
      if (Object.keys(mapped.fields).length === 0 && mapped.general.length === 0) {
        if (err instanceof ApiError && err.status === 404) toast.error("This product no longer exists.");
        else toast.error(messageOf(err));
      }
      setSubmitting(false);
      return;
    }

    // The product is saved. From here on a failure must not look like the product was lost.
    const hadChanges = saved ? Object.keys(buildUpdate(saved, values)).length > 0 : true;
    setSaved(current);
    reset(toFormValues(current));

    const hadSavedImage = !!current.image;
    if (change.action !== "keep") {
      try {
        if (change.action === "replace") await api.uploadImage(current.id, change.file);
        else if (hadSavedImage) await api.removeImage(current.id);
      } catch (err) {
        if (!(change.action === "remove" && err instanceof ApiError && err.status === 404)) {
          setSubmitting(false);
          if (props.mode === "create") {
            guard.allowLeave();
            toast.error(`The product was saved, but the image was not: ${messageOf(err)} Choose the image again here.`);
            router.replace(`/product/${current.id}/edit`);
          } else {
            toast.error(`The details were saved, but the image was not: ${messageOf(err)} Press Save to try again.`);
          }
          return;
        }
      }
    }

    if (props.mode === "edit" && !hadChanges && change.action === "keep") {
      toast.info("No changes to save.");
      setSubmitting(false);
      return;
    }

    guard.allowLeave();
    toast.success(props.mode === "create" ? `Added “${current.name}”` : `Saved “${current.name}”`);
    router.push(props.mode === "create" ? "/product" : `/product/${current.id}`);
  }

  async function onCancel() {
    if (!(await guard.confirmLeave())) return;
    router.push(props.mode === "edit" ? `/product/${props.product.id}` : "/product");
  }

  const title = props.mode === "create" ? "Add product" : "Edit product";

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
      <p className="mt-1 text-sm text-gray-600">
        Fields marked <span className="text-red-600">*</span> are required.
      </p>

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="mt-4 grid gap-5 rounded-lg bg-white p-4 shadow-sm sm:p-6 md:grid-cols-2"
        aria-busy={submitting}
      >
        <Field id="name" label="Name" required error={errors.name?.message} className="md:col-span-2">
          {(p) => <Input {...p} className={inputClass} autoComplete="off" disabled={submitting} {...register("name")} />}
        </Field>

        <Field id="unit" label="Unit" required error={errors.unit?.message} hint="A pack holds 10 pieces.">
          {(p) => (
            <select {...p} className={selectClass} disabled={submitting} {...register("unit")}>
              {UNIT_CODES.map((u) => (
                <option key={u} value={u}>{unitName(u)}</option>
              ))}
            </select>
          )}
        </Field>

        <Field id="unitPrice" label="Unit price (₹)" required error={errors.unitPrice?.message} hint="Per unit, before GST. Up to 2 decimals.">
          {(p) => (
            <Input {...p} inputMode="decimal" className={inputClass} autoComplete="off" disabled={submitting} {...register("unitPrice")} />
          )}
        </Field>

        <Field id="hsnCode" label="HSN code" required error={errors.hsnCode?.message} hint="4, 6 or 8 digits.">
          {(p) => (
            <Input {...p} inputMode="numeric" maxLength={8} className={cn(inputClass, "font-mono")} autoComplete="off" disabled={submitting} {...register("hsnCode")} />
          )}
        </Field>

        <Field id="gstRate" label="GST rate" required error={errors.gstRate?.message}>
          {(p) => (
            <select {...p} className={selectClass} disabled={submitting} {...register("gstRate")}>
              <option value="">Choose…</option>
              {GST_RATES.map((r) => (
                <option key={r} value={String(r)}>{r}%</option>
              ))}
            </select>
          )}
        </Field>

        {props.mode === "create" && (
          <Field
            id="openingStock"
            label="Opening stock (pieces)"
            error={errors.openingStock?.message}
            hint="How many pieces you have now. Leave empty for 0. Later changes are made with stock entries."
          >
            {(p) => (
              <Input {...p} inputMode="numeric" maxLength={7} className={inputClass} autoComplete="off" disabled={submitting} {...register("openingStock")} />
            )}
          </Field>
        )}

        <div className="rounded-lg bg-gray-50 p-3 text-sm md:col-span-2" aria-live="polite">
          <p className="font-medium text-gray-800">
            Price including GST:{" "}
            <span data-testid="price-with-gst">{preview ? formatRupees(preview.total) : "—"}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {preview
              ? `GST ${formatRupees(preview.gst)} (CGST ${formatRupees(preview.cgst)} + SGST ${formatRupees(preview.sgst)}). For information only; it is not saved.`
              : "Enter a price and choose a GST rate to see it. For information only; it is not saved."}
          </p>
        </div>

        {props.mode === "edit" && (
          <div className="md:col-span-2">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    onBlur={field.onBlur}
                    disabled={submitting}
                  />
                  Active (can be added to new invoices)
                </label>
              )}
            />
          </div>
        )}

        <div className="md:col-span-2">
          <LogoPicker
            saved={savedImage}
            loadingSaved={imageLoading}
            change={change}
            onChange={setChange}
            disabled={submitting}
            noun="image"
          />
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4 md:col-span-2">
          <Button type="button" variant="outline" className="h-10 px-4" disabled={submitting} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="h-10 px-5" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner size="sm" label={null} /> Saving…
              </>
            ) : props.mode === "create" ? (
              "Add product"
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}
