import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Allow your app to be embedded in an iframe
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },

          // IMPORTANT: explicitly override X-Frame-Options
          // (Some platforms set DENY by default)
          { key: "X-Frame-Options", value: "ALLOWALL" },
        ],
      },
    ];
  },
};

export default nextConfig;
