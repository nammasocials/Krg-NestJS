import { AuthGate } from "@/components/layout/auth-gate";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

/**
 * Authenticated layout: sticky header, page content, footer.
 * Routes are guarded twice: proxy.ts (cookie hint) and AuthGate (verified session).
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGate>
      <div className="flex min-h-screen flex-col bg-gray-100">
        <Header />

        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</div>
        </main>

        <Footer />
      </div>
    </AuthGate>
  );
}
