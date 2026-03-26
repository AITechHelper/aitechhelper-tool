// Client-side canvas utilities for applying treatments to user-uploaded photos.

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16) || 0;
  const g = parseInt(cleaned.slice(2, 4), 16) || 0;
  const b = parseInt(cleaned.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
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
        // Last allowed line — fit remaining words, truncate with … if needed
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
// Scrim bottom 38% only. Smart font scaling. Consistent with Branded + Text pipeline.
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
    const pad = Math.round(w * 0.055);

    // Scrim — bottom 38% only, matches Branded + Text standard
    const scrimTop = Math.round(h * 0.62);
    const grad = ctx.createLinearGradient(0, scrimTop, 0, h);
    grad.addColorStop(0,   "rgba(0,0,0,0)");
    grad.addColorStop(0.4, "rgba(0,0,0,0.55)");
    grad.addColorStop(1,   "rgba(0,0,0,0.92)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, scrimTop, w, h - scrimTop);

    // Smart font scaling based on word count
    const rawText   = (caption.split(/[.!?\n]/)[0]?.trim() ?? caption).toUpperCase();
    const wordCount = rawText.split(" ").length;
    const fontSize  = wordCount <= 5 ? Math.round(h * 0.082)
                    : wordCount <= 8 ? Math.round(h * 0.068)
                    :                  Math.round(h * 0.054);
    const maxLines  = wordCount <= 5 ? 2 : 3;

    ctx.font = `900 ${fontSize}px 'Impact', 'Arial Black', 'Arial', sans-serif`;
    const lines      = wrapTextToLines(ctx, rawText, w - pad * 2, maxLines);
    const lineH      = Math.round(fontSize * 1.12);
    const totalTextH = lines.length * lineH;
    const textY      = h - Math.round(h * 0.065) - totalTextH;

    // Headline — line 1 white, line 2 off-white
    ctx.textAlign    = "left";
    ctx.textBaseline = "top";
    lines.forEach((line, i) => {
      ctx.fillStyle = i === 0 ? "#ffffff" : "rgba(255,255,255,0.78)";
      ctx.fillText(line, pad, textY + i * lineH);
    });

    return canvas.toDataURL("image/jpeg", 0.93);
  } catch {
    return imageBase64;
  }
}

// Treatment 3b: Branding + photo only (no text overlay).
// Logo top-left, contact info in a clean bottom bar.
export async function applyBrandingPhotoOnly(
  imageBase64: string,
  brandOptions: {
    primaryColor: string;
    secondaryColor: string;
    logoBase64?: string;
    website?: string;
    phone?: string;
  }
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
    const pad = Math.round(w * 0.055);

    // Logo — top-left, raw
    if (brandOptions.logoBase64) {
      try {
        const logoImg = await loadImage(brandOptions.logoBase64);
        const logoSize = Math.round(w * 0.13);
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

    // Contact bar — full-width strip at bottom
    const hasContact = !!(brandOptions.website || brandOptions.phone);
    if (hasContact) {
      const contactBarH = Math.round(h * 0.075);
      const barFontSize = Math.round(contactBarH * 0.42);
      ctx.fillStyle = hexToRgba(brandOptions.primaryColor, 0.95);
      ctx.fillRect(0, h - contactBarH, w, contactBarH);

      ctx.font = `600 ${barFontSize}px 'Arial', 'Helvetica', sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      const midY = h - contactBarH / 2;
      if (brandOptions.phone) {
        ctx.textAlign = "left";
        ctx.fillText(brandOptions.phone, pad, midY);
      }
      if (brandOptions.website) {
        const site = brandOptions.website.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
        ctx.textAlign = "right";
        ctx.fillText(site, w - pad, midY);
      }
    }

    return canvas.toDataURL("image/jpeg", 0.93);
  } catch {
    return imageBase64;
  }
}

// Branding + photo + text overlay.
// Pipeline: 1. Photo  2. Scrim (bottom 38%)  3. Headline (white)  4. Logo  5. Contact bar
export async function applyBrandingWithPhotoAndText(
  imageBase64: string,
  caption: string,
  brandOptions: {
    primaryColor: string;
    secondaryColor: string;
    logoBase64?: string;
    website?: string;
    phone?: string;
  }
): Promise<string> {
  try {
    const img = await loadImage(imageBase64);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    const w = canvas.width;
    const h = canvas.height;
    const pad = Math.round(w * 0.055);
    const pc  = brandOptions.primaryColor;

    // ── 1. Photo ──────────────────────────────────────────────────────────────
    ctx.drawImage(img, 0, 0);

    // ── 2. Scrim — bottom 38%, gradient ──────────────────────────────────────
    const scrimTop = Math.round(h * 0.62);
    const g = ctx.createLinearGradient(0, scrimTop, 0, h);
    g.addColorStop(0,   "rgba(0,0,0,0)");
    g.addColorStop(0.4, "rgba(0,0,0,0.55)");
    g.addColorStop(1,   "rgba(0,0,0,0.88)");
    ctx.fillStyle = g;
    ctx.fillRect(0, scrimTop, w, h - scrimTop);

    // ── 3. Contact bar — full-width strip at bottom ───────────────────────────
    const hasContact = !!(brandOptions.website || brandOptions.phone);
    const contactBarH = hasContact ? Math.round(h * 0.075) : 0;
    if (hasContact) {
      const barFontSize = Math.round(contactBarH * 0.42);
      ctx.fillStyle = hexToRgba(pc, 0.95);
      ctx.fillRect(0, h - contactBarH, w, contactBarH);

      ctx.font = `600 ${barFontSize}px 'Arial', 'Helvetica', sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      const midY = h - contactBarH / 2;
      if (brandOptions.phone) {
        ctx.textAlign = "left";
        ctx.fillText(brandOptions.phone, pad, midY);
      }
      if (brandOptions.website) {
        const site = brandOptions.website.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
        ctx.textAlign = "right";
        ctx.fillText(site, w - pad, midY);
      }
    }

    // ── 4. Headline — white, positioned above contact bar ─────────────────────
    const rawText  = (caption.split(/[.!?\n]/)[0]?.trim() ?? caption).toUpperCase();
    const wordCount = rawText.split(" ").length;
    const fontSize  = wordCount <= 5 ? Math.round(h * 0.082)
                    : wordCount <= 8 ? Math.round(h * 0.068)
                    :                  Math.round(h * 0.054);
    const maxLines  = wordCount <= 5 ? 2 : 3;

    ctx.font = `900 ${fontSize}px 'Impact', 'Arial Black', 'Arial', sans-serif`;
    const lines      = wrapTextToLines(ctx, rawText, w - pad * 2, maxLines);
    const lineH      = Math.round(fontSize * 1.12);
    const totalTextH = lines.length * lineH;
    const textY      = h - contactBarH - Math.round(h * 0.04) - totalTextH;

    ctx.fillStyle    = "#ffffff";
    ctx.textAlign    = "left";
    ctx.textBaseline = "top";
    lines.forEach((line, i) => {
      ctx.fillText(line, pad, textY + i * lineH);
    });

    // ── 5. Logo — top-left, raw ───────────────────────────────────────────────
    if (brandOptions.logoBase64) {
      try {
        const logoImg = await loadImage(brandOptions.logoBase64);
        const logoSize = Math.round(w * 0.13);
        const margin   = Math.round(w * 0.038);
        const ar = logoImg.width / logoImg.height;
        let lw = logoSize, lh = logoSize;
        if (ar > 1) lh = logoSize / ar; else lw = logoSize * ar;
        ctx.drawImage(logoImg, margin, margin, lw, lh);
      } catch { /* skip gracefully */ }
    }

    return canvas.toDataURL("image/jpeg", 0.93);
  } catch {
    return imageBase64;
  }
}

export type InstagramFormat = "square" | "portrait" | "landscape" | "stories";

// Converts an existing image to an Instagram-compatible aspect ratio using canvas.
// rawPhotoBase64: the clean photo with no text/design — used ONLY for the blurred fill bars.
// imageBase64: the fully processed image (text + design) — used for the centered foreground.
export async function convertToInstagramFormat(
  imageBase64: string,
  format: InstagramFormat,
  rawPhotoBase64?: string
): Promise<string> {
  if (format === "square") return imageBase64;

  const fgImg = await loadImage(imageBase64);
  const bgImg = rawPhotoBase64 ? await loadImage(rawPhotoBase64) : fgImg;

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

  // Blurred fill — always the raw clean photo, no text or graphic elements
  const bgScale = Math.max(canvasW / bgImg.naturalWidth, canvasH / bgImg.naturalHeight);
  const bgW = bgImg.naturalWidth * bgScale;
  const bgH = bgImg.naturalHeight * bgScale;
  const bgX = (canvasW - bgW) / 2;
  const bgY = (canvasH - bgH) / 2;
  ctx.filter = "blur(28px) brightness(0.55)";
  ctx.drawImage(bgImg, bgX, bgY, bgW, bgH);
  ctx.filter = "none";

  // Foreground — fully processed image centered (contain fit)
  const fgScale = Math.min(canvasW / srcW, canvasH / srcH);
  const fgW = srcW * fgScale;
  const fgH = srcH * fgScale;
  const fgX = (canvasW - fgW) / 2;
  const fgY = (canvasH - fgH) / 2;
  ctx.drawImage(fgImg, fgX, fgY, fgW, fgH);

  return canvas.toDataURL("image/jpeg", 0.92);
}

// Draws a clean perimeter border on any image — applied as the very last step
// so it wraps the entire canvas (including blurred format bars), not just the photo.
export async function applyPerimeterBorder(
  imageBase64: string,
  primaryColor: string
): Promise<string> {
  try {
    const img = await loadImage(imageBase64);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const w = canvas.width;
    const h = canvas.height;
    const thick = Math.max(8, Math.round(w * 0.016));

    ctx.strokeStyle = hexToRgba(primaryColor, 0.95);
    ctx.lineWidth = thick;
    ctx.strokeRect(thick / 2, thick / 2, w - thick, h - thick);

    return canvas.toDataURL("image/jpeg", 0.93);
  } catch {
    return imageBase64;
  }
}
