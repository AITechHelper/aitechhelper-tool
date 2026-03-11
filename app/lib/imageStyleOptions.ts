export type ImageStyleValue =
  | "lifestyle_photo"
  | "lifestyle_photo_text"
  | "branding_photo"
  | "branding_text_photo"
  | "branding_text_only"
  | "raw"
  | "photo_text"
  | "brand_photo_text";

export interface ImageStyleOption {
  value: ImageStyleValue;
  name: string;
  description: string;
  icon: string;
  tooltip: string;
}

export const imageStyles: ImageStyleOption[] = [
  {
    value: "lifestyle_photo",
    name: "Natural Lifestyle",
    description: "Authentic photo, minimal branding.",
    icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    tooltip:
      "Best for authentic, relatable content. Shows real scenes without heavy branding.",
  },
  {
    value: "lifestyle_photo_text",
    name: "Natural Lifestyle + Text",
    description: "Lifestyle photo with a bold text headline.",
    icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    tooltip:
      "Natural lifestyle photo with a bold white headline in the lower third. Great for storytelling.",
  },
  {
    value: "branding_photo",
    name: "Branded Photo",
    description: "Photo with brand color frames/accents.",
    icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
    tooltip:
      "Real photo with decorative frames and accents in your brand colors. No text overlay.",
  },
  {
    value: "branding_text_photo",
    name: "Branded + Text",
    description: "Photo + graphic design + headline.",
    icon: "M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm2 3v2h2V8H6zm0 4v2h8v-2H6zm10-4v6h2V8h-2z",
    tooltip:
      "Maximum brand impact. Combines photo with graphic elements and text overlay.",
  },
  {
    value: "branding_text_only",
    name: "Graphic Design",
    description: "Typography-driven, no photo.",
    icon: "M4 6h16M4 12h16m-7 6h7M4 18h4",
    tooltip:
      "Pure typography and graphics. Great for quotes, announcements, or bold statements.",
  },
  // Media-library-only styles (user-uploaded photos)
  {
    value: "raw",
    name: "Raw Photo",
    description: "Your photo as-is. No overlays.",
    icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    tooltip: "Your uploaded photo with no overlays or branding applied.",
  },
  {
    value: "photo_text",
    name: "Photo + Text",
    description: "Your photo with a text overlay.",
    icon: "M4 6h16M4 12h16M4 18h7",
    tooltip: "Your uploaded photo with a caption text overlay. No branding elements.",
  },
  {
    value: "brand_photo_text",
    name: "Branded + Photo + Text",
    description: "Your photo with brand colors, logo, and text.",
    icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
    tooltip: "Your uploaded photo with brand colors, logo, and a text overlay applied.",
  },
];

// The 5 styles shown in the AI generator (AI-generated images only)
export const GENERATOR_STYLE_VALUES: ImageStyleValue[] = [
  "lifestyle_photo",
  "lifestyle_photo_text",
  "branding_photo",
  "branding_text_photo",
  "branding_text_only",
];

export function getImageStyleOption(
  value: ImageStyleValue
): ImageStyleOption | undefined {
  return imageStyles.find((option) => option.value === value);
}
