import { APP_NAME, COMPANY_NAME } from "@/config/constants";
import { env } from "@/config/env";

/** The year is taken when the page is built, so it updates with the next deploy. */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-4 text-center text-sm text-gray-500 sm:px-6">
        © {year} {COMPANY_NAME} · {APP_NAME} · v{env.appVersion}
      </div>
    </footer>
  );
}
