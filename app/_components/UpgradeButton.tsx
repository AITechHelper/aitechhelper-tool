"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

export default function UpgradeButton() {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  if (!isNative) return null;

  const handleUpgrade = () => {
    // Open subscribe page in external browser — payments are web-only
    window.open("https://www.aisocialhelper.com/subscribe", "_system");
  };

  return (
    <button
      onClick={handleUpgrade}
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
