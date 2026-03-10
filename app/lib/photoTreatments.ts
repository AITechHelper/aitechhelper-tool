// Client-side canvas utilities for applying treatments to user-uploaded photos.

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
// Single-pass layout: brand-colored bar at the bottom with logo on the left,
// caption + website stacked in the remaining space. No separate overlay step.
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
    const barH = Math.round(h * 0.18);   // tall enough for logo + two text lines
    const pad = Math.round(w * 0.035);
    const barY = h - barH;

    // Solid brand-colored bottom bar
    ctx.fillStyle = brandOptions.primaryColor;
    ctx.fillRect(0, barY, w, barH);

    // Load logo
    let logoImg: HTMLImageElement | null = null;
    if (brandOptions.logoBase64) {
      try { logoImg = await loadImage(brandOptions.logoBase64); } catch {}
    }

    // Logo: square on the left side of the bar, vertically centred, with inner padding
    let textStartX = pad;
    if (logoImg) {
      const logoSize = Math.round(barH * 0.72);
      const lx = pad;
      const ly = barY + (barH - logoSize) / 2;
      const logoAR = logoImg.width / logoImg.height;
      let lw = logoSize;
      let lh = logoSize;
      if (logoAR > 1) lh = Math.round(logoSize / logoAR);
      else lw = Math.round(logoSize * logoAR);
      ctx.drawImage(logoImg, lx + (logoSize - lw) / 2, ly + (logoSize - lh) / 2, lw, lh);
      textStartX = pad + logoSize + pad;
    }

    // Text area: from textStartX to right edge minus pad
    const textAreaW = w - textStartX - pad;
    const hasWebsite = !!(brandOptions.website || brandOptions.phone);

    if (hasWebsite) {
      // Two lines: caption (bold, larger) then website (smaller, 70% opacity)
      const captionFontSize = Math.round(barH * 0.30);
      const subFontSize = Math.round(barH * 0.20);

      // Caption line — first sentence, truncated to fit
      const firstLine = caption.split(/[.!?\n]/)[0]?.trim() ?? caption;
      const maxChars = Math.floor(textAreaW / (captionFontSize * 0.55));
      const displayCaption = firstLine.length > maxChars
        ? firstLine.slice(0, maxChars - 1) + "…"
        : firstLine;

      ctx.font = `bold ${captionFontSize}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = brandOptions.secondaryColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(displayCaption, textStartX, barY + barH * 0.50);

      // Website / phone line
      const contactText = [brandOptions.website, brandOptions.phone].filter(Boolean).join("  ·  ");
      ctx.font = `${subFontSize}px Arial, Helvetica, sans-serif`;
      ctx.globalAlpha = 0.75;
      ctx.fillText(contactText, textStartX, barY + barH * 0.80);
      ctx.globalAlpha = 1;
    } else {
      // Single centred caption line
      const captionFontSize = Math.round(barH * 0.33);
      const firstLine = caption.split(/[.!?\n]/)[0]?.trim() ?? caption;
      const maxChars = Math.floor(textAreaW / (captionFontSize * 0.55));
      const displayCaption = firstLine.length > maxChars
        ? firstLine.slice(0, maxChars - 1) + "…"
        : firstLine;

      ctx.font = `bold ${captionFontSize}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = brandOptions.secondaryColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(displayCaption, textStartX, barY + barH / 2);
    }

    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return imageBase64;
  }
}
