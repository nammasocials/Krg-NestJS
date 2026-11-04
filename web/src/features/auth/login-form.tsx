"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useAuth } from "@/lib/auth/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import { Label } from "@/components/ui/shared/label";
import { loginSchema, type LoginValues } from "./login-schema";

const FIELD_CLASS = "h-11 px-4 text-input-size";
const subscribeNever = () => () => {}; // "true once hydrated" flag for useSyncExternalStore

/** `next` is already checked by safeNext on the server; it is where to go after signing in. */
export function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Until the page is interactive a native submit would put the password in the address bar (GET).
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    setFocus,
    resetField,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched", // messages appear after blur, then update as the user types
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    setFocus("username");
  }, [setFocus]);

  async function onSubmit(values: LoginValues) {
    if (loading) return; // double-submit guard
    setLoading(true);
    setServerError(null);
    const error = await login(values.username, values.password); // the password is never logged
    if (error === null) {
      router.replace(next); // stays in the loading state until the page changes
      return;
    }
    setServerError(error);
    resetField("password");
    setLoading(false);
    setFocus("password");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-5">
      <div aria-live="polite" className="empty:hidden">
        {serverError && (
          <p role="alert" className="text-validation rounded-lg bg-red-50 p-3">
            {serverError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="username" className="text-input-size text-gray-700">
          Username
        </Label>
        <Input
          id="username"
          type="text"
          autoComplete="username"
          aria-invalid={errors.username ? true : undefined}
          aria-describedby={errors.username ? "username-error" : undefined}
          className={FIELD_CLASS}
          {...register("username")}
        />
        {errors.username && (
          <p id="username-error" className="text-validation">
            {errors.username.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-input-size text-gray-700">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
            className={`${FIELD_CLASS} pr-12`}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-gray-500 outline-none hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="text-validation">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading || !ready}
        aria-busy={loading}
        // Keep focus in the field on mouse-down: otherwise the blur shows an error,
        // the layout shifts, and the click lands off the button and is lost.
        onMouseDown={(e) => e.preventDefault()}
        className="h-11 w-full text-base"
      >
        {loading ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
