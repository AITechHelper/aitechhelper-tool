"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#e6edf7",
        fontFamily: "Verdana, Geneva, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 12,
            background: "linear-gradient(135deg, #2c6bed 0%, #7c3aed 50%, #ec4899 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          AI Tech Helper
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            margin: "0 auto 16px",
            border: "3px solid rgba(44, 107, 237, 0.3)",
            borderTopColor: "#2c6bed",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <div style={{ opacity: 0.7, fontSize: 14 }}>Loading your dashboard...</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
