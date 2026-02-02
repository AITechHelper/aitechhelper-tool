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
        <div style={{ fontSize: 24, marginBottom: 8 }}>Loading...</div>
        <div style={{ opacity: 0.6, fontSize: 14 }}>Redirecting to dashboard</div>
      </div>
    </div>
  );
}
