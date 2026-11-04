import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/login-form";
import { safeNext } from "@/lib/auth/safe-next";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <>
      <p className="text-input-size text-center text-gray-600">Sign in to your account</p>
      <LoginForm next={safeNext(next)} />
    </>
  );
}
