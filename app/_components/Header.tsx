"use client";

import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  return (
    <header
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        zIndex: 1000,
      }}
    >
      <a
        href="https://aitechhelper.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          transition: "opacity 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        <img
          src="/logo.svg"
          alt="AI Tech Helper"
          style={{
            height: 40,
            width: "auto",
          }}
        />
      </a>
    </header>
  );
}
