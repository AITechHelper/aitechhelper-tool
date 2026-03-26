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

    // Accent rule
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(pad, textY - Math.round(h * 0.026), Math.round(w * 0.10), Math.max(3, Math.round(h * 0.004)));

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
// Logo badge top-left, website/phone pill top-right — no scrim or headline.
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

    // Raw logo — top-left, no background or clip
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

    // Website / phone pill — top-right
    const rawContact = brandOptions.website || brandOptions.phone || "";
    const contactText = rawContact.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    if (contactText) {
      const pillFontSize = Math.round(h * 0.022);
      ctx.font = `600 ${pillFontSize}px 'Arial', 'Helvetica', sans-serif`;
      const tw = ctx.measureText(contactText).width;
      const pillPadX = Math.round(w * 0.026);
      const pillPadY = Math.round(h * 0.011);
      const pillW = tw + pillPadX * 2;
      const pillH = pillFontSize + pillPadY * 2;
      const pillMargin = Math.round(w * 0.038);
      const px = w - pillW - pillMargin;
      const py = pillMargin;
      const pillR = pillH / 2;

      ctx.fillStyle = "rgba(0,0,0,0.52)";
      drawRoundRect(ctx, px, py, pillW, pillH, pillR);
      ctx.fill();

      ctx.strokeStyle = hexToRgba(brandOptions.secondaryColor, 0.4);
      ctx.lineWidth = Math.max(1, Math.round(w * 0.0015));
      drawRoundRect(ctx, px, py, pillW, pillH, pillR);
      ctx.stroke();

      ctx.fillStyle = brandOptions.secondaryColor;
      ctx.font = `600 ${pillFontSize}px 'Arial', 'Helvetica', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(contactText, px + pillW / 2, py + pillH / 2);
    }

    return canvas.toDataURL("image/jpeg", 0.93);
  } catch {
    return imageBase64;
  }
}

// Branding + photo + text overlay.
// Strict pipeline — every step has a defined zone. Nothing can overlap text.
// 1. Photo  2. Border (perimeter)  3. Scrim (bottom 38%)
// 4. Accent rule  5. Headline  6. Logo  7. Contact pill
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

    // ── 2. Border — perimeter only, 3 options ─────────────────────────────────
    const inset = Math.round(w * 0.018);
    const thin  = Math.max(3, Math.round(w * 0.004));
    const thick = Math.max(8, Math.round(w * 0.012));
    const bLen  = Math.round(w * 0.16);

    const borderChoice = Math.floor(Math.random() * 3);
    if (borderChoice === 0) {
      // Thin inset border
      ctx.strokeStyle = hexToRgba(pc, 0.85);
      ctx.lineWidth = thin;
      ctx.strokeRect(inset + thin / 2, inset + thin / 2, w - inset * 2 - thin, h - inset * 2 - thin);
    } else if (borderChoice === 1) {
      // Thick border
      ctx.strokeStyle = hexToRgba(pc, 0.9);
      ctx.lineWidth = thick;
      ctx.strokeRect(thick / 2, thick / 2, w - thick, h - thick);
    } else {
      // Corner L-brackets
      ctx.fillStyle = hexToRgba(pc, 0.92);
      const i = inset, l = bLen, t = thick;
      ctx.fillRect(i, i, l, t);         ctx.fillRect(i, i, t, l);
      ctx.fillRect(w-i-l, i, l, t);     ctx.fillRect(w-i-t, i, t, l);
      ctx.fillRect(i, h-i-t, l, t);     ctx.fillRect(i, h-i-l, t, l);
      ctx.fillRect(w-i-l, h-i-t, l, t); ctx.fillRect(w-i-t, h-i-l, t, l);
    }

    // ── 3. Scrim — bottom 38% only, 2 options ─────────────────────────────────
    const scrimTop = Math.round(h * 0.62);
    const scrimChoice = Math.floor(Math.random() * 2);
    if (scrimChoice === 0) {
      // Gradient fade
      const g = ctx.createLinearGradient(0, scrimTop, 0, h);
      g.addColorStop(0,   "rgba(0,0,0,0)");
      g.addColorStop(0.4, "rgba(0,0,0,0.55)");
      g.addColorStop(1,   "rgba(0,0,0,0.92)");
      ctx.fillStyle = g;
      ctx.fillRect(0, scrimTop, w, h - scrimTop);
    } else {
      // Solid dark panel
      ctx.fillStyle = "rgba(0,0,0,0.76)";
      ctx.fillRect(0, scrimTop, w, h - scrimTop);
    }

    // ── 4. Accent rule + 5. Headline — always drawn last, always on top ───────
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
    const textY      = h - Math.round(h * 0.065) - totalTextH;

    // Accent rule
    ctx.fillStyle = pc;
    ctx.fillRect(pad, textY - Math.round(h * 0.026), Math.round(w * 0.13), Math.max(3, Math.round(h * 0.004)));

    // Headline — line 1 white, line 2 brand primary
    ctx.textAlign   = "left";
    ctx.textBaseline = "top";
    if (lines.length === 1) {
      const words   = lines[0].split(" ");
      const splitAt = Math.max(1, Math.ceil(words.length * 0.6));
      const part1   = words.slice(0, splitAt).join(" ");
      const part2   = words.slice(splitAt).join(" ");
      ctx.fillStyle = "#ffffff";
      ctx.fillText(part1, pad, textY);
      if (part2) {
        ctx.fillStyle = pc;
        ctx.fillText(part2, pad + ctx.measureText(part1 + " ").width, textY);
      }
    } else {
      lines.forEach((line, i) => {
        ctx.fillStyle = i === 0 ? "#ffffff" : pc;
        ctx.fillText(line, pad, textY + i * lineH);
      });
    }

    // ── 6. Logo — top-left, raw ───────────────────────────────────────────────
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

    // ── 7. Contact pill — top-right ───────────────────────────────────────────
    const rawContact  = brandOptions.website || brandOptions.phone || "";
    const contactText = rawContact.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    if (contactText) {
      const pfs  = Math.round(h * 0.022);
      ctx.font   = `600 ${pfs}px 'Arial', 'Helvetica', sans-serif`;
      const tw   = ctx.measureText(contactText).width;
      const ppx  = Math.round(w * 0.026);
      const ppy  = Math.round(h * 0.011);
      const pw   = tw + ppx * 2;
      const ph   = pfs + ppy * 2;
      const pm   = Math.round(w * 0.038);
      const px   = w - pw - pm;
      const py   = pm;
      const pr   = ph / 2;

      ctx.fillStyle = "rgba(0,0,0,0.52)";
      drawRoundRect(ctx, px, py, pw, ph, pr); ctx.fill();
      ctx.strokeStyle = hexToRgba(brandOptions.secondaryColor, 0.4);
      ctx.lineWidth   = Math.max(1, Math.round(w * 0.0015));
      drawRoundRect(ctx, px, py, pw, ph, pr); ctx.stroke();
      ctx.fillStyle   = brandOptions.secondaryColor;
      ctx.font        = `600 ${pfs}px 'Arial', 'Helvetica', sans-serif`;
      ctx.textAlign   = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(contactText, px + pw / 2, py + ph / 2);
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
