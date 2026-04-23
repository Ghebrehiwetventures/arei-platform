import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

export const PROPERTY_FALLBACK_IMAGE_URL = "/images/property-fallback.svg";

const probeCache = new Map<string, boolean>();
const pendingProbes = new Map<string, Promise<boolean>>();

function normalizeImageUrls(imageUrls: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawUrl of imageUrls) {
    const url = rawUrl.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    normalized.push(url);
  }

  return normalized;
}

function getCandidateUrls(imageUrls: string[], activeIndex: number): string[] {
  const normalized = normalizeImageUrls(imageUrls);
  if (normalized.length === 0) return [];

  const activeUrl = normalized[activeIndex];
  if (!activeUrl) return normalized;

  return [activeUrl, ...normalized.filter((url) => url !== activeUrl)];
}

function probeImage(url: string): Promise<boolean> {
  const cached = probeCache.get(url);
  if (cached !== undefined) return Promise.resolve(cached);

  const pending = pendingProbes.get(url);
  if (pending) return pending;

  const probe = new Promise<boolean>((resolve) => {
    const img = new Image();

    const finalize = (result: boolean) => {
      probeCache.set(url, result);
      pendingProbes.delete(url);
      img.onload = null;
      img.onerror = null;
      resolve(result);
    };

    img.onload = () => finalize(true);
    img.onerror = () => finalize(false);
    img.src = url;
  });

  pendingProbes.set(url, probe);
  return probe;
}

export function buildCoverImageStyle(imageUrl: string): CSSProperties {
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundColor: "#5c4638",
  };
}

export function useResolvedImageUrl(imageUrls: string[], activeIndex: number): string {
  const [resolvedUrl, setResolvedUrl] = useState(PROPERTY_FALLBACK_IMAGE_URL);

  useEffect(() => {
    let cancelled = false;
    const candidates = getCandidateUrls(imageUrls, activeIndex);

    if (candidates.length === 0) {
      setResolvedUrl(PROPERTY_FALLBACK_IMAGE_URL);
      return () => {
        cancelled = true;
      };
    }

    const activeUrl = candidates[0];
    if (probeCache.get(activeUrl) === true) {
      setResolvedUrl(activeUrl);
    }

    const resolveCandidate = async () => {
      for (const candidate of candidates) {
        if (await probeImage(candidate)) {
          if (!cancelled) setResolvedUrl(candidate);
          return;
        }
      }

      if (!cancelled) {
        setResolvedUrl(PROPERTY_FALLBACK_IMAGE_URL);
      }
    };

    void resolveCandidate();

    return () => {
      cancelled = true;
    };
  }, [activeIndex, imageUrls]);

  return resolvedUrl;
}
