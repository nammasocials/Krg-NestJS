import type { NextConfig } from "next";
import pkg from "./package.json";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:5000";

const nextConfig: NextConfig = {
  // Shown in the footer; always matches web/package.json.
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
  // Same-origin API access: the browser calls /api/*, Next forwards to the Nest API.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiBaseUrl}/api/:path*` }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
