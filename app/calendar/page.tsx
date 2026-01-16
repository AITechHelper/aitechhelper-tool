"use client";

import React from "react";
import Link from "next/link";

export default function CalendarPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        color: "#e6edf7",
        padding: 20,
        fontFamily: "Verdana, Geneva, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: 1,
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              Monthly Calendar
            </h1>
            <p style={{ margin: 0, opacity: 0.75, fontSize: 15 }}>
              Your plan will live here. (V1 placeholder)
            </p>
          </div>

          <Link
            href="/"
            style={{
              color: "#e6edf7",
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
              padding: "10px 14px",
              borderRadius: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              fontSize: 13,
            }}
          >
            Back to Generator
          </Link>
        </div>

        <div
          style={{
            background: "#101a33",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 16,
            boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
          }}
        >
          <p style={{ margin: 0, lineHeight: 1.6, fontSize: 14 }}>
            Next step: we’ll generate a simple 30-day plan (post types) and show
            it as a calendar grid. Then you’ll click a day to generate that
            day’s post.
          </p>
        </div>
      </div>
    </div>
  );
}
