"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";

const HIDE_ON_PATHS = ["/get-started", "/sign-in", "/sign-up", "/landing", "/privacy", "/terms"];

export default function UpgradeButton() {
  const [isNative, setIsNative] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  useEffect(() => {
    if (!isNative) return;
    fetch("/api/check-subscription")
      .then((r) => r.json())
      .then((d) => setPlan(d.plan ?? null))
      .catch(() => {});
  }, [isNative]);

  const hidden = HIDE_ON_PATHS.some((p) => pathname?.startsWith(p));

  if (!isNative || hidden || plan !== "free") return null;

  return (
    <button
      onClick={() => window.open("https://www.aisocialhelper.com/subscribe", "_system")}
      style={{
        position: "fixed",
        top: 56,
        right: 16,
        zIndex: 1000,
        background: "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)",
        border: "none",
        borderRadius: 20,
        padding: "8px 16px",
        color: "#fff",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "0 4px 16px rgba(44, 107, 237, 0.4)",
        fontFamily: "Verdana, Geneva, sans-serif",
        letterSpacing: "0.02em",
      }}
    >
      ⚡ Upgrade
    </button>
  );
}
