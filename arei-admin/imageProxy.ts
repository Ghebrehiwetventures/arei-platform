// imageProxy.ts — one shared client-side image proxy (wsrv.nl).
//
// Hotlinked broker/source images often fail in the browser (hotlink-protection,
// webp/heic, mixed content). Routing them through wsrv.nl — which fetches
// server-side and normalises to JPG — makes thumbnails render reliably. Keeping
// a single builder here means Listing Posts and Social Carousel behave the same
// (previously each view had its own near-identical copy).
export function proxyThumb(url: string, size = 220): string {
  if (!url) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${size}&h=${size}&fit=cover&output=jpg&q=82`;
}
