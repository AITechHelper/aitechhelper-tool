"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ href }: { href?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => href ? router.push(href) : router.back()}
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        padding: "8px 14px",
        color: "#e6edf7",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "Verdana, Geneva, sans-serif",
      }}
    >
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );
}
