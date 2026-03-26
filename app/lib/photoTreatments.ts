// Client-side canvas utilities for applying treatments to user-uploaded photos.

export type CompositionMode = "raw" | "minimal-brand" | "headline-brand";

export type BrandOptions = {
  primaryColor: string;
  secondaryColor: string;
  logoBase64?: string;
  website?: string;
  phone?: string;
  name?: string; // business/brand name shown in footer
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

function darkenColor(hex: string, amount: number): string {
  const cleaned = hex.replace("#", "");
  const r = Math.max(0, Math.round((parseInt(cleaned.slice(0, 2), 16) || 0) * (1 - amount)));
  const g = Math.max(0, Math.round((parseInt(cleaned.slice(2, 4), 16) || 0) * (1 - amount)));
  const b = Math.max(0, Math.round((parseInt(cleaned.slice(4, 6), 16) || 0) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// Returns white or black depending on which has better contrast against the given color.
function contrastColor(hex: string): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16) || 0;
  const g = parseInt(cleaned.slice(2, 4), 16) || 0;
  const b = parseInt(cleaned.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#000000" : "#ffffff";
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

// Draws a centered headline. contactBarH reserves space at the bottom.
function drawHeadlineTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  w: number,
  h: number,
  contactBarH: number,
  layout: typeof FORMAT_LAYOUTS[InstagramFormat]
): void {
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

  // Position text above the contact/footer bar with a bottom offset
  const textY = h - contactBarH - Math.round(h * layout.headlineBottomOffset) - totalTextH;

  // Drop shadow for readability
  ctx.shadowColor   = "rgba(0,0,0,0.6)";
  ctx.shadowBlur    = Math.round(fontSize * 0.2);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.round(fontSize * 0.06);

  ctx.fillStyle    = "#ffffff";
  ctx.textAlign    = "center";
  ctx.textBaseline = "top";
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, textY + i * lineH);
  });

  // Clear shadow
  ctx.shadowColor = "transparent";
  ctx.shadowBlur  = 0;
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

// Treatment 2: Photo + centered editorial text overlay (no branding).
// Scrim bottom 30% only. Text centered horizontally.
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

    drawBottomGradient(ctx, w, h, 0.55, 0.80);
    drawHeadlineTextCentered(ctx, caption, w, h, 0, layout);

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
    drawHeadlineTextCentered(ctx, caption, w, h, contactH, layout);
    if (brandOptions.logoBase64) {
      await drawLogo(ctx, brandOptions.logoBase64, w, h, layout.logoScale);
    }

    return canvas.toDataURL("image/jpeg", 0.93);
  } catch {
    return imageBase64;
  }
}

// ── Branded Photo Overlay ──────────────────────────────────────────────────────
// Applies a professional brand frame to any photo:
//   - Responsive border using primary color
//   - Bottom footer bar: logo + business name + website (primary bg, white text)
//   - Thin secondary-color accent line between photo and footer
//   - Optional centered headline text (for Branded + Text)
// Nothing overlaps anything else. All elements are layered cleanly.
export async function applyBrandedPhotoOverlay(
  imageBase64: string,
  brandOptions: BrandOptions & { format?: InstagramFormat },
  textCaption?: string
): Promise<string> {
  try {
    const img = await loadImage(imageBase64);
    const format = brandOptions.format ?? "square";

    // Target canvas dimensions per format
    const targets: Record<InstagramFormat, { w: number; h: number }> = {
      square:    { w: 1080, h: 1080 },
      portrait:  { w: 1080, h: 1350 },
      landscape: { w: 1080, h: 566 },
      stories:   { w: 1080, h: 1920 },
    };
    const { w: targetW, h: targetH } = targets[format];

    // Layout constants (proportional to canvas)
    const borderW   = Math.round(targetW * 0.012);        // ~13px at 1080w
    const footerH   = Math.round(targetH * 0.115);        // ~124px at 1080h square
    const accentH   = Math.max(2, Math.round(targetH * 0.004)); // thin accent line
    const pad       = Math.round(targetW * 0.04);

    // Canvas is photo + footer below + border on all sides
    const canvasW = targetW + 2 * borderW;
    const photoH  = targetH;                               // photo occupies targetH
    const canvasH = photoH + footerH + 2 * borderW;

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d")!;

    // 1. Fill entire canvas with primary color (covers border + footer area)
    ctx.fillStyle = brandOptions.primaryColor;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // 2. Draw photo scaled to fit the targetW × targetH area, centered
    const photoX = borderW;
    const photoY = borderW;
    const scale  = Math.max(targetW / img.width, targetH / img.height);
    const drawW  = img.width * scale;
    const drawH  = img.height * scale;
    const drawX  = photoX + (targetW - drawW) / 2;
    const drawY  = photoY + (targetH - drawH) / 2;

    // Clip to the photo area so the scaled image doesn't bleed into borders/footer
    ctx.save();
    ctx.beginPath();
    ctx.rect(photoX, photoY, targetW, photoH);
    ctx.clip();
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    // 3. Gradient scrim at bottom of photo (for text legibility if textCaption provided)
    if (textCaption) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(photoX, photoY, targetW, photoH);
      ctx.clip();
      const scrimStart = photoY + Math.round(photoH * 0.50);
      const grad = ctx.createLinearGradient(0, scrimStart, 0, photoY + photoH);
      grad.addColorStop(0,   "rgba(0,0,0,0)");
      grad.addColorStop(0.5, "rgba(0,0,0,0.45)");
      grad.addColorStop(1,   "rgba(0,0,0,0.72)");
      ctx.fillStyle = grad;
      ctx.fillRect(photoX, scrimStart, targetW, photoY + photoH - scrimStart);
      ctx.restore();
    }

    // 4. Accent line between photo and footer
    const accentY = borderW + photoH;
    ctx.fillStyle = brandOptions.secondaryColor;
    ctx.fillRect(borderW, accentY, targetW, accentH);

    // 5. Footer area (primary color already filled)
    const footerY = accentY + accentH;

    // 6. Logo in footer (left side)
    let logoRightEdge = borderW + pad;
    if (brandOptions.logoBase64) {
      try {
        const logoImg = await loadImage(brandOptions.logoBase64);
        const maxLogoH = Math.round(footerH * 0.62);
        const ar = logoImg.width / logoImg.height;
        const lh = maxLogoH;
        const lw = Math.round(lh * ar);
        const lx = borderW + pad;
        const ly = footerY + (footerH - lh) / 2;
        ctx.drawImage(logoImg, lx, ly, lw, lh);
        logoRightEdge = lx + lw + Math.round(targetW * 0.025);
      } catch {}
    }

    // 7. Business name + website in footer (centered in remaining space)
    const textAreaLeft  = logoRightEdge;
    const textAreaRight = borderW + targetW - pad;
    const textCenterX   = (textAreaLeft + textAreaRight) / 2;
    const footerMidY    = footerY + footerH / 2;
    const footerTextColor = "#ffffff";
    const altTextColor    = hexToRgba("#ffffff", 0.72);

    const hasName    = !!brandOptions.name;
    const hasWebsite = !!brandOptions.website;
    const hasPhone   = !!brandOptions.phone;

    if (hasName && (hasWebsite || hasPhone)) {
      // Two lines: name above, contact below
      const nameFontSize    = Math.round(footerH * 0.28);
      const contactFontSize = Math.round(footerH * 0.20);
      const gap             = Math.round(footerH * 0.06);

      ctx.font = `700 ${nameFontSize}px 'Arial', 'Helvetica', sans-serif`;
      ctx.fillStyle    = footerTextColor;
      ctx.textAlign    = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(brandOptions.name!, textCenterX, footerMidY - gap / 2);

      const contactStr = brandOptions.website
        ? brandOptions.website.replace(/^https?:\/\//i, "").replace(/^www\./i, "")
        : brandOptions.phone!;
      ctx.font = `400 ${contactFontSize}px 'Arial', 'Helvetica', sans-serif`;
      ctx.fillStyle    = altTextColor;
      ctx.textBaseline = "top";
      ctx.fillText(contactStr, textCenterX, footerMidY + gap / 2);
    } else if (hasName) {
      const nameFontSize = Math.round(footerH * 0.30);
      ctx.font = `700 ${nameFontSize}px 'Arial', 'Helvetica', sans-serif`;
      ctx.fillStyle    = footerTextColor;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(brandOptions.name!, textCenterX, footerMidY);
    } else if (hasWebsite || hasPhone) {
      const contactFontSize = Math.round(footerH * 0.26);
      const contactStr = hasWebsite
        ? brandOptions.website!.replace(/^https?:\/\//i, "").replace(/^www\./i, "")
        : brandOptions.phone!;
      ctx.font = `600 ${contactFontSize}px 'Arial', 'Helvetica', sans-serif`;
      ctx.fillStyle    = footerTextColor;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(contactStr, textCenterX, footerMidY);
    }

    // 8. Headline text inside the photo (centered), above footer
    if (textCaption) {
      const layout = FORMAT_LAYOUTS[format] ?? FORMAT_LAYOUTS.square;
      const rawText   = (textCaption.split(/[.!?\n]/)[0]?.trim() ?? textCaption).toUpperCase();
      const wordCount = rawText.split(" ").length;
      const fontSize  = wordCount <= 5 ? Math.round(photoH * 0.082)
                      : wordCount <= 8 ? Math.round(photoH * 0.068)
                      :                  Math.round(photoH * 0.054);
      const maxLines  = wordCount <= 5 ? 2 : 3;

      ctx.save();
      ctx.beginPath();
      ctx.rect(photoX, photoY, targetW, photoH);
      ctx.clip();

      ctx.font = `900 ${fontSize}px 'Impact', 'Arial Black', 'Arial', sans-serif`;
      const lines      = wrapTextToLines(ctx, rawText, targetW * layout.headlineMaxWidth, maxLines);
      const lineH      = Math.round(fontSize * 1.12);
      const totalTextH = lines.length * lineH;

      // Position text in lower quarter of photo, above the gradient's darkest zone
      const bottomOffset = Math.round(photoH * (layout.headlineBottomOffset + 0.04));
      const textY = photoY + photoH - bottomOffset - totalTextH;

      ctx.shadowColor   = "rgba(0,0,0,0.65)";
      ctx.shadowBlur    = Math.round(fontSize * 0.22);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.round(fontSize * 0.06);

      ctx.fillStyle    = "#ffffff";
      ctx.textAlign    = "center";
      ctx.textBaseline = "top";
      lines.forEach((line, i) => {
        ctx.fillText(line, photoX + targetW / 2, textY + i * lineH);
      });

      ctx.shadowColor = "transparent";
      ctx.shadowBlur  = 0;
      ctx.restore();
    }

    return canvas.toDataURL("image/jpeg", 0.93);
  } catch {
    return imageBase64;
  }
}

// ── Graphic Design Canvas (no AI photo) ───────────────────────────────────────
// Generates a brand-colored graphic design image entirely on canvas.
// Primary color = background. Secondary color = design elements.
// Text (headline + optional contact) centered on the canvas.
export async function generateBrandGraphic(
  caption: string,
  headline: string,
  brandOptions: BrandOptions,
  format: InstagramFormat = "square"
): Promise<string> {
  const targets: Record<InstagramFormat, { w: number; h: number }> = {
    square:    { w: 1080, h: 1080 },
    portrait:  { w: 1080, h: 1350 },
    landscape: { w: 1080, h: 566 },
    stories:   { w: 1080, h: 1920 },
  };
  const { w, h } = targets[format];

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // 1. Background gradient: primary → slightly darker
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, brandOptions.primaryColor);
  bg.addColorStop(1, darkenColor(brandOptions.primaryColor, 0.28));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 2. Secondary color design elements
  const sec = brandOptions.secondaryColor;

  // Large geometric shape: upper-right triangle for depth
  ctx.fillStyle = hexToRgba(sec, 0.12);
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h * 0.5);
  ctx.closePath();
  ctx.fill();

  // Lower-left complementary shape
  ctx.fillStyle = hexToRgba(sec, 0.08);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.6);
  ctx.lineTo(w * 0.4, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Thin horizontal accent line near top (below logo area)
  const topLineY = Math.round(h * 0.14);
  ctx.fillStyle = hexToRgba(sec, 0.45);
  ctx.fillRect(Math.round(w * 0.06), topLineY, Math.round(w * 0.88), Math.max(2, Math.round(h * 0.003)));

  // Thin horizontal accent line near bottom (above contact area)
  const btmLineY = Math.round(h * 0.84);
  ctx.fillStyle = hexToRgba(sec, 0.45);
  ctx.fillRect(Math.round(w * 0.06), btmLineY, Math.round(w * 0.88), Math.max(2, Math.round(h * 0.003)));

  // Bottom solid accent bar
  const accentBarH = Math.max(3, Math.round(h * 0.007));
  ctx.fillStyle = sec;
  ctx.fillRect(0, h - accentBarH, w, accentBarH);

  // 3. Logo (top-left, inside safe zone)
  const pad = Math.round(w * 0.055);
  if (brandOptions.logoBase64) {
    try {
      const logoImg = await loadImage(brandOptions.logoBase64);
      const logoSize = Math.round(w * 0.13);
      const ar = logoImg.width / logoImg.height;
      let lw = logoSize, lh = logoSize;
      if (ar > 1) lh = logoSize / ar;
      else lw = logoSize * ar;
      ctx.drawImage(logoImg, pad, pad, lw, lh);
    } catch {}
  }

  // 4. Headline text — centered vertically in the main content area
  const displayText = headline || (caption.split(/[.!?\n]/)[0]?.trim() ?? caption);
  const textUpper   = displayText.toUpperCase();
  const wordCount   = textUpper.split(" ").length;
  const fontSize    = wordCount <= 4  ? Math.round(h * 0.095)
                    : wordCount <= 7  ? Math.round(h * 0.078)
                    : wordCount <= 10 ? Math.round(h * 0.064)
                    :                   Math.round(h * 0.052);

  ctx.font = `900 ${fontSize}px 'Impact', 'Arial Black', 'Arial', sans-serif`;

  const textAreaW = w * 0.84;
  const lines     = wrapTextToLines(ctx, textUpper, textAreaW, 5);
  const lineH     = Math.round(fontSize * 1.18);
  const totalH    = lines.length * lineH;

  // Vertically center in the middle zone (between top line and bottom line)
  const textZoneTop    = topLineY + Math.round(h * 0.04);
  const textZoneBottom = btmLineY - Math.round(h * 0.04);
  const textZoneH      = textZoneBottom - textZoneTop;
  const textStartY     = textZoneTop + (textZoneH - totalH) / 2;

  const textColor = contrastColor(brandOptions.primaryColor);

  ctx.shadowColor   = "rgba(0,0,0,0.35)";
  ctx.shadowBlur    = Math.round(fontSize * 0.15);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.round(fontSize * 0.05);
  ctx.fillStyle    = textColor;
  ctx.textAlign    = "center";
  ctx.textBaseline = "top";

  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, textStartY + i * lineH);
  });

  ctx.shadowColor = "transparent";
  ctx.shadowBlur  = 0;

  // 5. Business name + website near bottom
  const hasName    = !!brandOptions.name;
  const hasWebsite = !!brandOptions.website;
  const hasPhone   = !!brandOptions.phone;
  const contactFontSize = Math.round(h * 0.022);

  ctx.font      = `500 ${contactFontSize}px 'Arial', 'Helvetica', sans-serif`;
  ctx.fillStyle = hexToRgba(contrastColor(brandOptions.primaryColor), 0.80);
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  const contactY = h - Math.round(h * 0.035) - accentBarH;

  if (hasName && (hasWebsite || hasPhone)) {
    const contactStr = hasWebsite
      ? brandOptions.website!.replace(/^https?:\/\//i, "").replace(/^www\./i, "")
      : brandOptions.phone!;
    ctx.fillText(`${brandOptions.name}  •  ${contactStr}`, w / 2, contactY);
  } else if (hasName) {
    ctx.fillText(brandOptions.name!, w / 2, contactY);
  } else if (hasWebsite) {
    ctx.fillText(brandOptions.website!.replace(/^https?:\/\//i, "").replace(/^www\./i, ""), w / 2, contactY);
  } else if (hasPhone) {
    ctx.fillText(brandOptions.phone!, w / 2, contactY);
  }

  return canvas.toDataURL("image/jpeg", 0.95);
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
