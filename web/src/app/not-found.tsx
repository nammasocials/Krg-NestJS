import type { Metadata } from "next";
import { HomeLink } from "@/components/layout/home-link";
import { StatusPage } from "@/components/layout/status-page";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <StatusPage code="404" title="Page not found" message="The page you are looking for does not exist or may have been moved.">
      <HomeLink />
    </StatusPage>
  );
}
