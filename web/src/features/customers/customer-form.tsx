"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import { Label } from "@/components/ui/shared/label";
import { Spinner } from "@/components/ui/shared/spinner";
import { useToast } from "@/components/ui/shared/toast";
import { ApiError, NetworkError } from "@/lib/api/client";
import { createCustomersApi } from "@/lib/api/customers";
import { useAuth } from "@/lib/auth/use-auth";
import { cn } from "@/lib/utils";
import type { Customer } from "./customer.types";
import {
  buildUpdate,
  customerSchema,
  EMPTY_VALUES,
  toFormValues,
  toInput,
  type CustomerField,
  type CustomerFormValues,
} from "./customer-schema";
import { LogoPicker } from "./logo-picker";
import type { LogoChange } from "./logo-file";
import { mapApiError } from "./map-api-errors";
import { STATE_NAMES } from "./state-names";
import { useUnsavedGuard } from "./use-unsaved-guard";

const FIELD_ORDER: CustomerField[] = ["name", "email", "phone", "phoneAlt", "addressLine", "city", "pincode", "gstin"];

const messageOf = (err: unknown) =>
  err instanceof NetworkError
    ? "Could not reach the server. Check your connection and try again."
    : err instanceof ApiError
      ? err.status >= 500
        ? "The server is not responding right now. Please try again in a moment."
        : err.message
      : "Something went wrong. Please try again.";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby": string | undefined }) => React.ReactNode;
  className?: string;
}

export function Field({ id, label, error, hint, required, children, className }: FieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-600">
            *
          </span>
        )}
      </Label>
      <div className="mt-1.5">{children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}</div>
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass = "h-10";

type Props = { mode: "create" } | { mode: "edit"; customer: Customer };

export function CustomerForm(props: Props) {
  const router = useRouter();
  const toast = useToast();
  const { client } = useAuth();
  const api = useMemo(() => createCustomersApi(client), [client]);

  const [saved, setSaved] = useState<Customer | null>(props.mode === "edit" ? props.customer : null);
  const [submitting, setSubmitting] = useState(false);

  // The logo: what is saved (fetched as an image, since the endpoint needs the access token) and what the person chose.
  const [change, setChange] = useState<LogoChange>({ action: "keep" });
  const [savedLogo, setSavedLogo] = useState<Blob | null>(null);
  const [logoLoading, setLogoLoading] = useState(props.mode === "edit" && !!props.customer.logo);
  const customerId = props.mode === "edit" ? props.customer.id : null;
  const hadLogo = props.mode === "edit" && !!props.customer.logo;

  useEffect(() => {
    if (!customerId || !hadLogo) return;
    let current = true;
    api
      .getLogoBlob(customerId)
      .then((blob) => current && setSavedLogo(blob))
      .catch(() => current && toast.error("The saved logo could not be loaded."))
      .finally(() => current && setLogoLoading(false));
    return () => {
      current = false;
    };
    // `toast` changes identity on every render; the logo is fetched once per customer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, customerId, hadLogo]);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    reset,
    formState: { errors, isDirty },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: props.mode === "edit" ? toFormValues(props.customer) : EMPTY_VALUES,
    mode: "onTouched", // messages show after leaving a field, then update while typing
  });

  const dirty = isDirty || change.action !== "keep";
  const guard = useUnsavedGuard(dirty);

  const gstinValue = useWatch({ control, name: "gstin" });
  const stateCode = /^[0-9]{2}/.exec(gstinValue.trim())?.[0];
  const stateText = stateCode ? STATE_NAMES[stateCode] : undefined;

  function showFieldErrors(fields: Partial<Record<CustomerField, string>>) {
    const withErrors = FIELD_ORDER.filter((f) => fields[f]);
    for (const f of withErrors) setError(f, { type: "server", message: fields[f] });
    // The fields are disabled while saving; focus can only land once they are enabled again.
    if (withErrors[0]) setTimeout(() => setFocus(withErrors[0]), 0);
  }

  async function onSubmit(values: CustomerFormValues) {
    if (submitting) return;
    setSubmitting(true);
    let current: Customer;
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
        if (err instanceof ApiError && err.status === 404) toast.error("This customer no longer exists.");
        else toast.error(messageOf(err));
      }
      setSubmitting(false);
      return;
    }

    // The customer is saved. From here on a failure must not look like the customer was lost.
    setSaved(current);
    reset(toFormValues(current));

    const hadSavedLogo = !!current.logo;
    if (change.action !== "keep") {
      try {
        if (change.action === "replace") await api.uploadLogo(current.id, change.file);
        else if (hadSavedLogo) await api.removeLogo(current.id);
      } catch (err) {
        if (!(change.action === "remove" && err instanceof ApiError && err.status === 404)) {
          setSubmitting(false);
          if (props.mode === "create") {
            guard.allowLeave();
            toast.error(`The customer was saved, but the logo was not: ${messageOf(err)} Choose the logo again here.`);
            router.replace(`/customer/${current.id}/edit`);
          } else {
            toast.error(`The details were saved, but the logo was not: ${messageOf(err)} Press Save to try again.`);
          }
          return;
        }
      }
    }

    if (props.mode === "edit" && Object.keys(buildUpdate(saved ?? current, values)).length === 0 && change.action === "keep") {
      toast.info("No changes to save.");
      setSubmitting(false);
      return;
    }

    guard.allowLeave();
    toast.success(props.mode === "create" ? `Added “${current.name}”` : `Saved “${current.name}”`);
    router.push(props.mode === "create" ? "/customer" : `/customer/${current.id}`);
  }

  async function onCancel() {
    if (!(await guard.confirmLeave())) return;
    router.push(props.mode === "edit" ? `/customer/${props.customer.id}` : "/customer");
  }

  const title = props.mode === "create" ? "Add customer" : "Edit customer";

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
          {(p) => <Input {...p} className={inputClass} autoComplete="organization" disabled={submitting} {...register("name")} />}
        </Field>

        <Field id="email" label="Email" required error={errors.email?.message}>
          {(p) => (
            <Input {...p} type="email" className={inputClass} autoComplete="email" disabled={submitting} {...register("email")} />
          )}
        </Field>

        <Field id="phone" label="Phone" required error={errors.phone?.message} hint="10 digits; +91 is fine.">
          {(p) => <Input {...p} type="tel" className={inputClass} autoComplete="tel" disabled={submitting} {...register("phone")} />}
        </Field>

        <Field id="phoneAlt" label="Alternate phone" error={errors.phoneAlt?.message}>
          {(p) => <Input {...p} type="tel" className={inputClass} disabled={submitting} {...register("phoneAlt")} />}
        </Field>

        <Field id="addressLine" label="Address" required error={errors.addressLine?.message} className="md:col-span-2">
          {(p) => (
            <Input {...p} className={inputClass} autoComplete="street-address" disabled={submitting} {...register("addressLine")} />
          )}
        </Field>

        <Field id="city" label="City" required error={errors.city?.message}>
          {(p) => <Input {...p} className={inputClass} autoComplete="address-level2" disabled={submitting} {...register("city")} />}
        </Field>

        <Field id="pincode" label="Pincode" required error={errors.pincode?.message}>
          {(p) => (
            <Input
              {...p}
              inputMode="numeric"
              maxLength={6}
              className={inputClass}
              autoComplete="postal-code"
              disabled={submitting}
              {...register("pincode")}
            />
          )}
        </Field>

        <Field id="gstin" label="GSTIN" required error={errors.gstin?.message}>
          {(p) => (
            <Controller
              control={control}
              name="gstin"
              render={({ field }) => (
                <Input
                  {...p}
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  maxLength={15}
                  className={cn(inputClass, "font-mono uppercase")}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={submitting}
                />
              )}
            />
          )}
        </Field>

        <div>
          <Label htmlFor="state">State</Label>
          <div className="mt-1.5">
            <Input
              id="state"
              readOnly
              tabIndex={-1}
              value={stateText ? `${stateText} (${stateCode})` : ""}
              placeholder="Taken from the first two digits of the GSTIN"
              className={cn(inputClass, "bg-gray-50 text-gray-700")}
              aria-describedby="state-hint"
            />
          </div>
          <p id="state-hint" className="mt-1 text-xs text-gray-500">
            Filled in automatically; it cannot be edited.
          </p>
        </div>

        <div className="md:col-span-2">
          <LogoPicker
            saved={savedLogo}
            loadingSaved={logoLoading}
            change={change}
            onChange={setChange}
            disabled={submitting}
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
              "Add customer"
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}
