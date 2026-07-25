"use client";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "40px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <img src="/logo-icon.png" alt="AI Social Media Helper" style={{ width: 40, height: 40, objectFit: "contain" }} />
        <span style={{ fontSize: 16, fontWeight: 700, color: "#e6edf7" }}>AI Social Media Helper</span>
      </div>
      <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 4, color: "#e6edf7" }}>
        AI Social Media Helper is a product of{" "}
        <a href="https://aitechhelper.com" target="_blank" rel="noopener noreferrer" style={{ color: "#7eb3ff", textDecoration: "underline" }}>
          AI Tech Helper LLC
        </a>
      </p>
      <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 12, color: "#e6edf7" }}>
        &copy; 2026 AI Tech Helper LLC. All rights reserved.
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
        <a href="/privacy" style={{ fontSize: 11, opacity: 0.65, color: "#e6edf7", textDecoration: "none" }}>
          Privacy Policy
        </a>
        <a href="/terms" style={{ fontSize: 11, opacity: 0.65, color: "#e6edf7", textDecoration: "none" }}>
          Terms of Service
        </a>
      </div>
    </footer>
  );
}
