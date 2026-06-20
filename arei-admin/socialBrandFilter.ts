export type BrandFilterTone = "editorial" | "listing";

const cssFilters: Record<BrandFilterTone, string> = {
  editorial: "saturate(0.92) contrast(0.97) brightness(1.02)",
  listing: "saturate(0.94) contrast(0.98) brightness(1.01)",
};

export function brandFilterCss(tone: BrandFilterTone): string {
  return cssFilters[tone];
}

export function brandFilterUrlParams(tone: BrandFilterTone): string {
  if (tone === "editorial") return "&mod=1.02,0.92,0";
  return "&mod=1.01,0.94,0";
}

export function applyBrandImageFilter(
  ctx: CanvasRenderingContext2D,
  tone: BrandFilterTone,
  draw: () => void,
) {
  ctx.save();
  ctx.filter = brandFilterCss(tone);
  draw();
  ctx.restore();

  ctx.save();
  if (tone === "editorial") {
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(247, 243, 234, 0.045)";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = "rgba(142, 207, 191, 0.055)";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  } else {
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(247, 243, 234, 0.03)";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = "rgba(124, 143, 132, 0.035)";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  ctx.restore();
}
