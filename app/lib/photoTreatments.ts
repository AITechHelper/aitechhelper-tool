// Client-side canvas utilities for applying treatments to user-uploaded photos.

export type CompositionMode = "raw" | "minimal-brand" | "headline-brand";

export type BrandOptions = {
  primaryColor: string;
  secondaryColor: string;
  logoBase64?: string;
  website?: string;
  phone?: string;
};

export type InstagramFormat = "square" | "portrait" | "landscape" | "stories";

const FORMAT_LAYOUTS: Record<InstagramFormat, {
  pad: number;
  logoScale: number;
  contactBarH: number;
  headlineMaxWidth: number;
  headlineBottomOffset: number;
}> = {
  square:    { pad: 0.055, logoScale: 0.13, contactBarH: 0.060, headlineMaxWidth: 0.88, headlineBottomOffset: 0.06 },
  portrait:  { pad: 0.055, logoScale: 0.12, contactBarH: 0.065, headlineMaxWidth: 0.86, headlineBottomOffset: 0.07 },
  landscape: { pad: 0.045, logoScale: 0.10, contactBarH: 0.080, headlineMaxWidth: 0.70, headlineBottomOffset: 0.06 },
  stories:   { pad: 0.060, logoScale: 0.11, contactBarH: 0.055, headlineMaxWidth: 0.84, headlineBottomOffset: 0.12 },
};

// ── Private helpers ────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16) || 0;
  const g = parseInt(cleaned.slice(2, 4), 16) || 0;
  const b = parseInt(cleaned.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Wrap text to at most maxLines. Each line fits within maxWidth pixels.
function wrapTextToLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (let i = 0; i < words.length; i++) {
    const test = current ? current + " " + words[i] : words[i];
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      if (lines.length >= maxLines) return lines;
      if (lines.length === maxLines - 1) {
        let last = words.slice(i).join(" ");
        if (ctx.measureText(last).width > maxWidth) {
          let trimmed = "";
          for (const word of words.slice(i)) {
            const candidate = trimmed ? trimmed + " " + word : word;
            if (ctx.measureText(candidate + "…").width <= maxWidth) trimmed = candidate;
            else break;
          }
          last = trimmed + "…";
        }
        lines.push(last);
        return lines;
      }
      current = words[i];
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function drawLogo(
  ctx: CanvasRenderingContext2D,
  logoBase64: string,
  w: number,
  _h: number,
  layoutLogoScale: number
): Promise<void> {
  try {
    const logoImg = await loadImage(logoBase64);
    const logoSize = Math.round(w * layoutLogoScale);
    const margin = Math.round(w * 0.038);
    const ar = logoImg.width / logoImg.height;
    let lw = logoSize, lh = logoSize;
    if (ar > 1) lh = logoSize / ar;
    else lw = logoSize * ar;
    ctx.drawImage(logoImg, margin, margin, lw, lh);
  } catch {
    // Logo load failed — skip gracefully
  }
}

function drawBottomGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  startRatio = 0.70,
  maxOpacity = 0.82
): void {
  const scrimTop = Math.round(h * startRatio);
  const grad = ctx.createLinearGradient(0, scrimTop, 0, h);
  grad.addColorStop(0,   "rgba(0,0,0,0)");
  grad.addColorStop(0.4, `rgba(0,0,0,${(maxOpacity * 0.6).toFixed(2)})`);
  grad.addColorStop(1,   `rgba(0,0,0,${maxOpacity})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, scrimTop, w, h - scrimTop);
}

function drawHeadlineText(
  ctx: CanvasRenderingContext2D,
  text: string,
  w: number,
  h: number,
  contactBarH: number,
  layout: typeof FORMAT_LAYOUTS[InstagramFormat]
): void {
  const pad = Math.round(w * layout.pad);
  const rawText   = (text.split(/[.!?\n]/)[0]?.trim() ?? text).toUpperCase();
  const wordCount = rawText.split(" ").length;
  const fontSize  = wordCount <= 5 ? Math.round(h * 0.082)
                  : wordCount <= 8 ? Math.round(h * 0.068)
                  :                  Math.round(h * 0.054);
  const maxLines  = wordCount <= 5 ? 2 : 3;

  ctx.font = `900 ${fontSize}px 'Impact', 'Arial Black', 'Arial', sans-serif`;
  const lines      = wrapTextToLines(ctx, rawText, w * layout.headlineMaxWidth, maxLines);
  const lineH      = Math.round(fontSize * 1.12);
  const totalTextH = lines.length * lineH;
  const textY      = h - contactBarH - Math.round(h * layout.headlineBottomOffset) - totalTextH;

  ctx.fillStyle    = "#ffffff";
  ctx.textAlign    = "left";
  ctx.textBaseline = "top";
  lines.forEach((line, i) => {
    ctx.fillText(line, pad, textY + i * lineH);
  });
}

function drawContactStrip(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  phone: string | undefined,
  website: string | undefined,
  primaryColor: string,
  layout: typeof FORMAT_LAYOUTS[InstagramFormat],
  compact = false
): number {
  const hasContact = !!(phone || website);
  if (!hasContact) return 0;

  const barH = compact
    ? Math.round(h * 0.042)
    : Math.round(h * layout.contactBarH);
  const alpha   = compact ? 0.75 : 0.90;
  const pad     = Math.round(w * layout.pad);
  const fontSize = Math.round(barH * 0.42);

  ctx.fillStyle = hexToRgba(primaryColor, alpha);
  ctx.fillRect(0, h - barH, w, barH);

  ctx.font = `600 ${fontSize}px 'Arial', 'Helvetica', sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  const midY = h - barH / 2;

  if (phone) {
    ctx.textAlign = "left";
    ctx.fillText(phone, pad, midY);
  }
  if (website) {
    const site = website.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    ctx.textAlign = "right";
    ctx.fillText(site, w - pad, midY);
  }

  return barH;
}

// ── Public API ─────────────────────────────────────────────────────────────────

// Resize an uploaded photo to max 1024px on the longest side, JPEG at 0.85 quality.
export function resizePhotoForStorage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1024;
      let w = img.width;
      let h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round((h * MAX) / w); w = MAX; }
        else { w = Math.round((w * MAX) / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Treatment 1: Raw photo — returned as-is.
export function applyRawTreatment(imageBase64: string): string {
  return imageBase64;
}

// Treatment 2: Photo + editorial text overlay (no branding).
// Scrim bottom 30% only. Smart font scaling.
export async function applyPhotoWithText(
  imageBase64: string,
  caption: string
): Promise<string> {
  try {
    const img = await loadImage(imageBase64);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const w = canvas.width;
    const h = canvas.height;
    const layout = FORMAT_LAYOUTS.square;

    drawBottomGradient(ctx, w, h, 0.70, 0.82);
    drawHeadlineText(ctx, caption, w, h, 0, layout);

    return canvas.toDataURL("image/jpeg", 0.93);
  } catch {
    return imageBase64;
  }
}

// Treatment 3b: Branding + photo only (no text overlay).
// Logo top-left, compact contact strip at bottom.
export async function applyBrandingPhotoOnly(
  imageBase64: string,
  brandOptions: BrandOptions
): Promise<string> {
  try {
    const img = await loadImage(imageBase64);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const w = canvas.width;
    const h = canvas.height;
    const layout = FORMAT_LAYOUTS.square;

    drawContactStrip(ctx, w, h, brandOptions.phone, brandOptions.website, brandOptions.primaryColor, layout, true);

    if (brandOptions.logoBase64) {
      await drawLogo(ctx, brandOptions.logoBase64, w, h, layout.logoScale);
    }

    return canvas.toDataURL("image/jpeg", 0.93);
  } catch {
    return imageBase64;
  }
}

// Branding + photo + text overlay.
// Mode routing:
//   "raw"           → return as-is
//   "minimal-brand" → logo + compact contact strip only (no scrim, no headline)
//   "headline-brand" (default) → full pipeline: scrim + headline + compact contact + logo
export async function applyBrandingWithPhotoAndText(
  imageBase64: string,
  caption: string,
  brandOptions: BrandOptions & { mode?: CompositionMode; format?: InstagramFormat }
): Promise<string> {
  const mode = brandOptions.mode ?? "headline-brand";

  if (mode === "raw") return imageBase64;

  try {
    const img = await loadImage(imageBase64);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const w = canvas.width;
    const h = canvas.height;
    const format = brandOptions.format ?? "square";
    const layout = FORMAT_LAYOUTS[format] ?? FORMAT_LAYOUTS.square;

    if (mode === "minimal-brand") {
      // Logo + compact contact strip only — no scrim, no headline
      drawContactStrip(ctx, w, h, brandOptions.phone, brandOptions.website, brandOptions.primaryColor, layout, true);
      if (brandOptions.logoBase64) {
        await drawLogo(ctx, brandOptions.logoBase64, w, h, layout.logoScale);
      }
      return canvas.toDataURL("image/jpeg", 0.93);
    }

    // "headline-brand" — full pipeline
    drawBottomGradient(ctx, w, h, 0.70, 0.82);
    const contactH = drawContactStrip(ctx, w, h, brandOptions.phone, brandOptions.website, brandOptions.primaryColor, layout, true);
    drawHeadlineText(ctx, caption, w, h, contactH, layout);
    if (brandOptions.logoBase64) {
      await drawLogo(ctx, brandOptions.logoBase64, w, h, layout.logoScale);
    }

    return canvas.toDataURL("image/jpeg", 0.93);
  } catch {
    return imageBase64;
  }
}

// Converts an existing image to an Instagram-compatible aspect ratio using canvas.
// rawPhotoBase64: unused (kept for API compatibility).
// imageBase64: the fully processed image — used for the centered foreground.
export async function convertToInstagramFormat(
  imageBase64: string,
  format: InstagramFormat,
  _rawPhotoBase64?: string
): Promise<string> {
  if (format === "square") return imageBase64;

  const fgImg = await loadImage(imageBase64);

  const srcW = fgImg.naturalWidth;
  const srcH = fgImg.naturalHeight;

  const targets: Record<InstagramFormat, { w: number; h: number }> = {
    square:    { w: 1080, h: 1080 },
    portrait:  { w: 1080, h: 1350 },
    landscape: { w: 1080, h: 566 },
    stories:   { w: 1080, h: 1920 },
  };

  const { w: canvasW, h: canvasH } = targets[format];
  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d")!;

  // 1. Dark solid background — eliminates jarring blurred-photo mismatch
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // 2. Overscan per format — hides hard edge at fill boundaries
  const overscanByFormat: Record<InstagramFormat, number> = {
    square:    1.0,
    portrait:  1.02,
    landscape: 1.01,
    stories:   1.03,
  };
  const baseFgScale = Math.min(canvasW / srcW, canvasH / srcH);
  const fgScale = baseFgScale * overscanByFormat[format];
  const fgW = srcW * fgScale;
  const fgH = srcH * fgScale;
  const fgX = (canvasW - fgW) / 2;
  const fgY = (canvasH - fgH) / 2;

  // 3. Soft shadow before drawing foreground — softens rectangle feel
  ctx.shadowColor   = "rgba(0,0,0,0.18)";
  ctx.shadowBlur    = 24;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 8;
  ctx.drawImage(fgImg, fgX, fgY, fgW, fgH);
  ctx.shadowColor = "transparent";

  return canvas.toDataURL("image/jpeg", 0.92);
}
