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
    const barH = Math.round(h * 0.18);
    const fontSize = Math.round(h * 0.038);
    const pad = Math.round(w * 0.04);

    // Dark gradient bar
    const grad = ctx.createLinearGradient(0, h - barH * 1.4, 0, h);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - barH * 1.4, w, barH * 1.4);

    // Caption text (first sentence only, truncated)
    const firstLine = caption.split(/[.!?\n]/)[0]?.trim() ?? caption;
    const maxChars = Math.floor(w / (fontSize * 0.55));
    const displayText = firstLine.length > maxChars
      ? firstLine.slice(0, maxChars - 1) + "…"
      : firstLine;

    ctx.font = `${fontSize}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(displayText, pad, h - Math.round(h * 0.04));

    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return imageBase64;
  }
}

// Treatment 3: Branding + photo + text.
// Adds a brand-colored bottom bar with logo + contact info on top of the photo.
// Delegates to applyBrandOverlay from imageOverlay.ts after adding the text bar.
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
    const barH = Math.round(h * 0.12);
    const pad = Math.round(w * 0.04);
    const fontSize = Math.round(barH * 0.38);

    // Brand-colored bottom bar
    ctx.fillStyle = brandOptions.primaryColor + "e6"; // ~90% opacity
    ctx.fillRect(0, h - barH, w, barH);

    // Caption first line in secondary color
    const firstLine = caption.split(/[.!?\n]/)[0]?.trim() ?? caption;
    const maxChars = Math.floor(w / (fontSize * 0.55));
    const displayText = firstLine.length > maxChars
      ? firstLine.slice(0, maxChars - 1) + "…"
      : firstLine;

    ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = brandOptions.secondaryColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(displayText, pad, h - barH / 2);

    const withBar = canvas.toDataURL("image/jpeg", 0.92);

    // Apply brand overlay (logo + contact) on top
    const { applyBrandOverlay } = await import("./imageOverlay");
    return applyBrandOverlay(withBar, {
      logoBase64: brandOptions.logoBase64,
      primaryColor: brandOptions.primaryColor,
      secondaryColor: brandOptions.secondaryColor,
      website: brandOptions.website,
      phone: brandOptions.phone,
      includeContact: !!(brandOptions.website || brandOptions.phone),
    });
  } catch {
    return imageBase64;
  }
}
