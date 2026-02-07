"use client";

import React from "react";

type OutOfTokensModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tokensUsed: number;
  totalTokens: number;
};

export default function OutOfTokensModal({
  isOpen,
  onClose,
  tokensUsed,
  totalTokens,
}: OutOfTokensModalProps) {
  if (!isOpen) return null;

  const pct = totalTokens > 0 ? Math.min((tokensUsed / totalTokens) * 100, 100) : 100;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#101a33",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          padding: 32,
          maxWidth: 440,
          width: "100%",
          textAlign: "center" as const,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          fontFamily: "Verdana, Geneva, sans-serif",
          color: "#e6edf7",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.15)",
            border: "2px solid rgba(239, 68, 68, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 28,
          }}
        >
          ⚠️
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
          You've used all your tokens
        </h2>

        <p style={{ fontSize: 14, opacity: 0.7, margin: "0 0 24px", lineHeight: 1.5 }}>
          {tokensUsed} / {totalTokens} tokens used this month
        </p>

        {/* Usage bar */}
        <div
          style={{
            background: "rgba(255,255,255,0.08)",
            borderRadius: 8,
            height: 10,
            marginBottom: 24,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              height: "100%",
              width: `${pct}%`,
              borderRadius: 8,
              transition: "width 0.3s ease",
            }}
          />
        </div>

        <p style={{ fontSize: 13, opacity: 0.6, margin: "0 0 28px", lineHeight: 1.5 }}>
          Your tokens reset on the 1st of each month.
          <br />
          Upgrade your plan for more tokens.
        </p>

        {/* CTAs */}
        <a
          href="/subscribe"
          style={{
            display: "block",
            background: "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)",
            color: "#fff",
            padding: "14px 28px",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 700,
            textDecoration: "none",
            textTransform: "uppercase" as const,
            letterSpacing: 0.5,
            marginBottom: 12,
            transition: "all 0.15s ease",
          }}
        >
          Upgrade Your Plan
        </a>

        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            padding: "12px 24px",
            color: "#e6edf7",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
