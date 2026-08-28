'use client';

import * as React from 'react';

const cache = new Map<string, Promise<string>>();

const decode = async (url: string): Promise<string> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const { type, dataBase64 } = (await res.json()) as { type: string; dataBase64: string };
  const binary = atob(dataBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type });
  return URL.createObjectURL(blob);
};

export const fetchApiBlobUrl = (url: string): Promise<string> => {
  let promise = cache.get(url);
  if (!promise) {
    promise = decode(url);
    cache.set(url, promise);
    promise.catch(() => cache.delete(url));
  }
  return promise;
};

export const useApiBlobUrl = (url: string | null | undefined): string | null => {
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!url) {
      setObjectUrl(null);
      return;
    }
    let cancelled = false;
    fetchApiBlobUrl(url)
      .then((resolved) => {
        if (!cancelled) setObjectUrl(resolved);
      })
      .catch(() => {
        if (!cancelled) setObjectUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return objectUrl;
};
