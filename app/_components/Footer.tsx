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
        <img src="/logo-icon.png" alt="AI Social Helper" style={{ width: 40, height: 40, objectFit: "contain" }} />
        <span style={{ fontSize: 16, fontWeight: 700 }}>AI Social Helper</span>
      </div>
      <p style={{ fontSize: 13, opacity: 0.5, marginBottom: 4 }}>
        AISocialHelper is a product of{" "}
        <a href="https://aitechhelper.com" target="_blank" rel="noopener noreferrer" style={{ color: "#e6edf7", textDecoration: "underline" }}>
          AI Tech Helper LLC
        </a>
      </p>
      <p style={{ fontSize: 13, opacity: 0.5, marginBottom: 12 }}>
        &copy; 2025 AI Tech Helper LLC. All rights reserved.
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
        <a href="/privacy" style={{ fontSize: 11, opacity: 0.4, color: "#e6edf7", textDecoration: "none" }}>
          Privacy Policy
        </a>
        <a href="/terms" style={{ fontSize: 11, opacity: 0.4, color: "#e6edf7", textDecoration: "none" }}>
          Terms of Service
        </a>
      </div>
    </footer>
  );
}
