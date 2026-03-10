// Client-side canvas utility for applying brand overlays to generated post images.
// Logo always appears in the bottom-right corner.
// Contact info (website/phone) appears in a bottom bar only for promotional post types.

type OverlayOptions = {
  logoBase64?: string;
  primaryColor: string;
  secondaryColor: string;
  website?: string;
  phone?: string;
  includeContact?: boolean;
};

// Post types where website/phone should appear on the image
export const CONTACT_POST_TYPES = new Set([
  "Promotion / Offer",
  "Announcement",
]);

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16) || 0;
  const g = parseInt(cleaned.slice(2, 4), 16) || 0;
  const b = parseInt(cleaned.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
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

export async function applyBrandOverlay(
  imageBase64: string,
  options: OverlayOptions
): Promise<string> {
  const { logoBase64, primaryColor, secondaryColor, website, phone, includeContact } = options;

  const hasLogo = !!logoBase64;
  const hasContact = !!(includeContact && (website || phone));

  if (!hasLogo && !hasContact) return imageBase64;

  try {
    const mainImg = await loadImage(imageBase64);

    const canvas = document.createElement("canvas");
    canvas.width = mainImg.width;
    canvas.height = mainImg.height;
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(mainImg, 0, 0);

    const w = canvas.width;
    const h = canvas.height;

    // — Contact strip at bottom (only for promotional post types) —
    let contactStripH = 0;
    if (hasContact) {
      contactStripH = Math.round(h * 0.072);
      const pad = Math.round(w * 0.032);
      const fontSize = Math.round(contactStripH * 0.44);

      ctx.fillStyle = hexToRgba(primaryColor, 0.9);
      ctx.fillRect(0, h - contactStripH, w, contactStripH);

      ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = secondaryColor;
      ctx.textBaseline = "middle";
      const midY = h - contactStripH / 2;

      if (phone) {
        ctx.textAlign = "left";
        ctx.fillText(phone, pad, midY);
      }
      if (website) {
        ctx.textAlign = "right";
        ctx.fillText(website, w - pad, midY);
      }
    }

    // — Logo badge (bottom-right corner) —
    if (hasLogo) {
      try {
        const logoImg = await loadImage(logoBase64!);

        const badgeSize = Math.round(w * 0.16);
        const margin = Math.round(w * 0.028);
        const bx = w - badgeSize - margin;
        const by = h - badgeSize - margin - contactStripH;
        const radius = Math.round(badgeSize * 0.12);

        // Badge background
        ctx.fillStyle = hexToRgba(primaryColor, 0.92);
        drawRoundRect(ctx, bx, by, badgeSize, badgeSize, radius);
        ctx.fill();

        // Badge border with secondary color
        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = Math.round(w * 0.003);
        drawRoundRect(ctx, bx, by, badgeSize, badgeSize, radius);
        ctx.stroke();

        // Draw logo inside badge, maintaining aspect ratio
        const padding = badgeSize * 0.14;
        const maxLogoSize = badgeSize - padding * 2;
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

    return canvas.toDataURL("image/png");
  } catch {
    // If anything fails, return the original image unchanged
    return imageBase64;
  }
}

// Resize and compress a logo image to a safe size for storage (~200x200 max).
// Returns a base64 PNG string.
export function resizeLogoForStorage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 200;
      let w = img.width;
      let h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) {
          h = Math.round((h * MAX) / w);
          w = MAX;
        } else {
          w = Math.round((w * MAX) / h);
          h = MAX;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/png", 0.9));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
