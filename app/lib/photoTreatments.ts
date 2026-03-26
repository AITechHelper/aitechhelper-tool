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
// Deep gradient scrim + large bold uppercase headline, two-line max.
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
    const fontSize = Math.round(h * 0.068);
    const bottomPad = Math.round(h * 0.06);

    // Deep gradient scrim — transparent from ~38% down, near-black at bottom
    const scrimY = Math.round(h * 0.36);
    const grad = ctx.createLinearGradient(0, scrimY, 0, h);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.42, "rgba(0,0,0,0.52)");
    grad.addColorStop(1, "rgba(0,0,0,0.91)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, scrimY, w, h - scrimY);

    // Headline: uppercase, bold, left-aligned, 2 lines max
    const rawText = (caption.split(/[.!?\n]/)[0]?.trim() ?? caption).toUpperCase();
    ctx.font = `900 ${fontSize}px 'Impact', 'Arial Black', 'Arial', sans-serif`;
    const lines = wrapTextToLines(ctx, rawText, w - pad * 2, 2);

    const lineH = Math.round(fontSize * 1.1);
    const totalH = lines.length * lineH;
    const textStartY = h - bottomPad - totalH;

    // Short accent rule above headline
    const ruleH = Math.max(3, Math.round(h * 0.004));
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(pad, textStartY - Math.round(h * 0.024), Math.round(w * 0.10), ruleH);

    // Text: line 1 bright white, line 2 softer off-white
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    lines.forEach((line, i) => {
      ctx.fillStyle = i === 0 ? "#ffffff" : "rgba(255,255,255,0.78)";
      ctx.fillText(line, pad, textStartY + i * lineH);
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

// Treatment 3: Branding + photo + editorial overlay.
// Layout: deep gradient scrim, large two-tone headline (white + brand accent),
// accent rule, circular logo badge top-left, website pill top-right.
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
    ctx.drawImage(img, 0, 0);

    const w = canvas.width;
    const h = canvas.height;
    const pad = Math.round(w * 0.055);
    const bottomPad = Math.round(h * 0.065);

    // ── Deep gradient scrim ───────────────────────────────────────────────────
    const scrimY = Math.round(h * 0.34);
    const grad = ctx.createLinearGradient(0, scrimY, 0, h);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.38, "rgba(0,0,0,0.48)");
    grad.addColorStop(1, "rgba(0,0,0,0.93)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, scrimY, w, h - scrimY);

    // ── Headline text — auto-scale font + lines based on length ──────────────
    const rawText = (caption.split(/[.!?\n]/)[0]?.trim() ?? caption).toUpperCase();
    const wordCount = rawText.split(" ").length;
    const fontSize = wordCount <= 5
      ? Math.round(h * 0.082)   // short: big and bold
      : wordCount <= 8
      ? Math.round(h * 0.068)   // medium
      : Math.round(h * 0.054);  // long: smaller to fit 3 lines
    const maxLines = wordCount <= 5 ? 2 : 3;
    ctx.font = `900 ${fontSize}px 'Impact', 'Arial Black', 'Arial', sans-serif`;
    const lines = wrapTextToLines(ctx, rawText, w - pad * 2, maxLines);

    const lineH = Math.round(fontSize * 1.12);
    const totalTextH = lines.length * lineH;
    const textStartY = h - bottomPad - totalTextH;

    // Thin accent rule — brand primary color, sits just above headline
    const ruleH = Math.max(3, Math.round(h * 0.004));
    const ruleW = Math.round(w * 0.13);
    const ruleY = textStartY - Math.round(h * 0.026);
    ctx.fillStyle = brandOptions.primaryColor;
    ctx.fillRect(pad, ruleY, ruleW, ruleH);

    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    if (lines.length === 1) {
      // Single line: split words ~60/40 — first chunk white, rest brand accent
      const words = lines[0].split(" ");
      const splitAt = Math.max(1, Math.ceil(words.length * 0.6));
      const part1 = words.slice(0, splitAt).join(" ");
      const part2 = words.slice(splitAt).join(" ");

      ctx.fillStyle = "#ffffff";
      ctx.fillText(part1, pad, textStartY);

      if (part2) {
        const part1Width = ctx.measureText(part1 + " ").width;
        ctx.fillStyle = brandOptions.primaryColor;
        ctx.fillText(part2, pad + part1Width, textStartY);
      }
    } else {
      // Two lines: line 1 white, line 2 brand accent
      lines.forEach((line, i) => {
        ctx.fillStyle = i === 0 ? "#ffffff" : brandOptions.primaryColor;
        ctx.fillText(line, pad, textStartY + i * lineH);
      });
    }

    // ── Graphic elements: thin inset border + top accent bar ──────────────────
    const borderW = Math.max(3, Math.round(w * 0.005));
    const borderInset = Math.round(w * 0.016);
    ctx.strokeStyle = hexToRgba(brandOptions.primaryColor, 0.8);
    ctx.lineWidth = borderW;
    ctx.strokeRect(
      borderInset + borderW / 2,
      borderInset + borderW / 2,
      w - (borderInset + borderW / 2) * 2,
      h - (borderInset + borderW / 2) * 2
    );

    // Bold top accent bar — full width, sits at very top edge
    const accentBarH = Math.max(5, Math.round(h * 0.008));
    ctx.fillStyle = hexToRgba(brandOptions.primaryColor, 0.9);
    ctx.fillRect(0, 0, w, accentBarH);

    // ── Raw logo — top-left, no background or clip ────────────────────────────
    if (brandOptions.logoBase64) {
      try {
        const logoImg = await loadImage(brandOptions.logoBase64);
        const logoSize = Math.round(w * 0.13);
        const margin = Math.round(w * 0.038);
        const ar = logoImg.width / logoImg.height;
        let lw = logoSize, lh = logoSize;
        if (ar > 1) lh = logoSize / ar;
        else lw = logoSize * ar;
        ctx.drawImage(logoImg, margin, margin + accentBarH, lw, lh);
      } catch {
        // Logo load failed — skip gracefully
      }
    }

    // ── Website / phone pill — top-right ──────────────────────────────────────
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

      // Semi-transparent dark pill background
      ctx.fillStyle = "rgba(0,0,0,0.52)";
      drawRoundRect(ctx, px, py, pillW, pillH, pillR);
      ctx.fill();

      // Pill border — brand secondary subtle
      ctx.strokeStyle = hexToRgba(brandOptions.secondaryColor, 0.4);
      ctx.lineWidth = Math.max(1, Math.round(w * 0.0015));
      drawRoundRect(ctx, px, py, pillW, pillH, pillR);
      ctx.stroke();

      // Pill text — brand secondary color
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

export type InstagramFormat = "square" | "portrait" | "landscape" | "stories";

// Converts an existing image to an Instagram-compatible aspect ratio using canvas.
// No API calls — runs entirely client-side. Free to use on any already-generated image.
export async function convertToInstagramFormat(
  imageBase64: string,
  format: InstagramFormat
): Promise<string> {
  if (format === "square") return imageBase64;

  const img = await loadImage(imageBase64);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

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

  // Blurred background — draw only the top 60% of the source image as the fill
  // so any Canvas text baked into the bottom never shows in the blur bars
  const bgScale = Math.max(canvasW / srcW, canvasH / srcH);
  const bgW = srcW * bgScale;
  const bgH = srcH * bgScale;
  const bgX = (canvasW - bgW) / 2;
  const bgY = (canvasH - bgH) / 2;
  ctx.filter = "blur(36px) brightness(0.5)";
  ctx.drawImage(img, 0, 0, srcW, srcH * 0.6, bgX, bgY, bgW, bgH * 0.6);
  ctx.filter = "none";

  // Original image centered (contain fit)
  const fgScale = Math.min(canvasW / srcW, canvasH / srcH);
  const fgW = srcW * fgScale;
  const fgH = srcH * fgScale;
  const fgX = (canvasW - fgW) / 2;
  const fgY = (canvasH - fgH) / 2;
  ctx.drawImage(img, fgX, fgY, fgW, fgH);

  return canvas.toDataURL("image/jpeg", 0.92);
}
