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

// Resize an uploaded photo to max 1024px on the longest side, JPEG at 0.85 quality.
// Keeps file sizes manageable for base64 DB storage.
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

// Treatment 2: Photo + text overlay.
// Adds a semi-transparent dark bar at the bottom with the first line of the caption.
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
    const gradH = Math.round(h * 0.30);  // gradient zone covers bottom 30%
    const fontSize = Math.round(h * 0.042);
    const pad = Math.round(w * 0.04);

    // Dark gradient scrim — smooth fade from transparent to semi-opaque
    const grad = ctx.createLinearGradient(0, h - gradH, 0, h);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - gradH, w, gradH);

    // Caption text (first sentence, truncated), sitting above the very bottom edge
    const firstLine = caption.split(/[.!?\n]/)[0]?.trim() ?? caption;
    const maxChars = Math.floor(w / (fontSize * 0.58));
    const displayText = firstLine.length > maxChars
      ? firstLine.slice(0, maxChars - 1) + "…"
      : firstLine;

    ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(displayText, pad, h - Math.round(h * 0.05));

    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return imageBase64;
  }
}

// Treatment 3: Branding + photo + text.
// Layout: brand-colored bar at bottom with caption centered, logo badge in top-right corner.
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
    const barH = Math.round(h * 0.18);
    const barY = h - barH;
    const pad = Math.round(w * 0.04);

    // Solid brand-colored bottom bar
    ctx.fillStyle = brandOptions.primaryColor;
    ctx.fillRect(0, barY, w, barH);

    // Centered text in the bottom bar
    const hasWebsite = !!(brandOptions.website || brandOptions.phone);
    const firstLine = caption.split(/[.!?\n]/)[0]?.trim() ?? caption;

    if (hasWebsite) {
      // Two lines: caption (bold, larger) then website/phone (smaller, 75% opacity)
      const captionFontSize = Math.round(barH * 0.30);
      const subFontSize = Math.round(barH * 0.20);

      const maxChars = Math.floor(w / (captionFontSize * 0.55));
      const displayCaption = firstLine.length > maxChars
        ? firstLine.slice(0, maxChars - 1) + "…"
        : firstLine;

      ctx.font = `bold ${captionFontSize}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = brandOptions.secondaryColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(displayCaption, w / 2, barY + barH * 0.50);

      const contactText = [brandOptions.website, brandOptions.phone].filter(Boolean).join("  ·  ");
      ctx.font = `${subFontSize}px Arial, Helvetica, sans-serif`;
      ctx.globalAlpha = 0.75;
      ctx.fillText(contactText, w / 2, barY + barH * 0.80);
      ctx.globalAlpha = 1;
    } else {
      // Single centered caption line, vertically centered in bar
      const captionFontSize = Math.round(barH * 0.33);
      const maxChars = Math.floor(w / (captionFontSize * 0.55));
      const displayCaption = firstLine.length > maxChars
        ? firstLine.slice(0, maxChars - 1) + "…"
        : firstLine;

      ctx.font = `bold ${captionFontSize}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = brandOptions.secondaryColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(displayCaption, w / 2, barY + barH / 2);
    }

    // Logo badge — top-right corner
    if (brandOptions.logoBase64) {
      try {
        const logoImg = await loadImage(brandOptions.logoBase64);
        const badgeSize = Math.round(w * 0.14);
        const margin = Math.round(w * 0.028);
        const bx = w - badgeSize - margin;
        const by = margin;
        const radius = Math.round(badgeSize * 0.12);

        // Badge background
        ctx.fillStyle = hexToRgba(brandOptions.primaryColor, 0.92);
        drawRoundRect(ctx, bx, by, badgeSize, badgeSize, radius);
        ctx.fill();

        // Badge border
        ctx.strokeStyle = brandOptions.secondaryColor;
        ctx.lineWidth = Math.round(w * 0.003);
        drawRoundRect(ctx, bx, by, badgeSize, badgeSize, radius);
        ctx.stroke();

        // Logo inside badge, maintaining aspect ratio
        const innerPad = badgeSize * 0.14;
        const maxLogoSize = badgeSize - innerPad * 2;
        const ar = logoImg.width / logoImg.height;
        let lw = maxLogoSize;
        let lh = maxLogoSize;
        if (ar > 1) lh = maxLogoSize / ar;
        else lw = maxLogoSize * ar;
        const lx = bx + (badgeSize - lw) / 2;
        const ly = by + (badgeSize - lh) / 2;
        ctx.drawImage(logoImg, lx, ly, lw, lh);
      } catch {
        // Logo failed to load — skip it, image is still usable
      }
    }

    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return imageBase64;
  }
}
