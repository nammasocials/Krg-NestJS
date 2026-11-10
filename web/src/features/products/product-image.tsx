"use client";

import { Package } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Spinner } from "@/components/ui/shared/spinner";
import { createProductsApi } from "@/lib/api/products";
import { useAuth } from "@/lib/auth/use-auth";
import { useObjectUrl } from "@/features/customers/logo-picker";

type Loaded = { id: string; blob: Blob | null };

/**
 * The product's image. The endpoint needs the access token, so the image is fetched with the API
 * client; while loading a spinner shows, and a missing or broken image shows a neutral placeholder.
 */
export function ProductImage({ id, hasImage, name }: { id: string; hasImage: boolean; name: string }) {
  const { client } = useAuth();
  const api = useMemo(() => createProductsApi(client), [client]);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [broken, setBroken] = useState<string | null>(null);

  useEffect(() => {
    if (!hasImage) return;
    let current = true;
    api
      .getImageBlob(id)
      .then((blob) => current && setLoaded({ id, blob }))
      .catch(() => current && setLoaded({ id, blob: null }));
    return () => {
      current = false;
    };
  }, [api, id, hasImage]);

  const answered = loaded?.id === id ? loaded : null;
  const url = useObjectUrl(answered?.blob ?? null);
  const loading = hasImage && !answered;
  const showImage = !!url && broken !== url;

  return (
    <div
      className="flex size-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-gray-400"
      aria-busy={loading}
    >
      {loading ? (
        <span className="text-brand-primary">
          <Spinner label="Loading image…" />
        </span>
      ) : showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- a data: address cannot go through next/image
        <img src={url} alt={`${name} image`} className="size-full object-contain" onError={() => setBroken(url)} />
      ) : (
        <Package className="size-12" aria-label="No image" role="img" />
      )}
    </div>
  );
}
