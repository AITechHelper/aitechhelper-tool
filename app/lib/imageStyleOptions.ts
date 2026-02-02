export type ImageStyleValue =
  | "lifestyle_photo"
  | "branding_photo"
  | "branding_text_photo"
  | "branding_text_only";

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
];

export function getImageStyleOption(
  value: ImageStyleValue
): ImageStyleOption | undefined {
  return imageStyles.find((option) => option.value === value);
}
