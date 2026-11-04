import { Brand } from "@/components/layout/brand";

/**
 * Public layout (login and other pages visible before sign-in).
 * Branded gradient background, one centred card. No navigation or links to private pages.
 */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="bg-brand-gradient flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl">
        <Brand
          size={64}
          nameAs="h1"
          className="mb-6 flex-col text-center"
          nameClassName="text-3xl"
        />
        {children}
      </div>
    </main>
  );
}
