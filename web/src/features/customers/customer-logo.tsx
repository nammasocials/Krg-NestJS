"use client";

import { Building2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Spinner } from "@/components/ui/shared/spinner";
import { createCustomersApi } from "@/lib/api/customers";
import { useAuth } from "@/lib/auth/use-auth";
import { useObjectUrl } from "./logo-picker";

type Loaded = { id: string; blob: Blob | null };

/**
 * The customer's logo. The endpoint needs the access token, so the image is fetched with the API
 * client; while loading a spinner shows, and a missing or broken logo shows a neutral placeholder.
 */
export function CustomerLogo({ id, hasLogo, name }: { id: string; hasLogo: boolean; name: string }) {
  const { client } = useAuth();
  const api = useMemo(() => createCustomersApi(client), [client]);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [broken, setBroken] = useState<string | null>(null);

  useEffect(() => {
    if (!hasLogo) return;
    let current = true;
    api
      .getLogoBlob(id)
      .then((blob) => current && setLoaded({ id, blob }))
      .catch(() => current && setLoaded({ id, blob: null }));
    return () => {
      current = false;
    };
  }, [api, id, hasLogo]);

  const answered = loaded?.id === id ? loaded : null;
  const url = useObjectUrl(answered?.blob ?? null);
  const loading = hasLogo && !answered;
  const showImage = !!url && broken !== url;

  return (
    <div
      className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-gray-400"
      aria-busy={loading}
    >
      {loading ? (
        <span className="text-brand-primary">
          <Spinner label="Loading logo…" />
        </span>
      ) : showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- a data: address cannot go through next/image
        <img src={url} alt={`${name} logo`} className="size-full object-contain" onError={() => setBroken(url)} />
      ) : (
        <Building2 className="size-10" aria-label="No logo" role="img" />
      )}
    </div>
  );
}
