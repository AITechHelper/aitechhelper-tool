"use client";

import React, { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

type OutOfTokensModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tokensUsed: number;
  totalTokens: number;
};

const UPGRADE_PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: 9,
    tokens: 30,
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 19,
    tokens: 60,
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: 39,
    tokens: 120,
    popular: false,
  },
];

function getPlanName(totalTokens: number): string {
  if (totalTokens <= 2) return "Free";
  if (totalTokens <= 30) return "Basic";
  if (totalTokens <= 60) return "Pro";
  return "Premium";
}

export default function OutOfTokensModal({
  isOpen,
  onClose,
  tokensUsed,
  totalTokens,
}: OutOfTokensModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  if (!isOpen) return null;

  const pct = totalTokens > 0 ? Math.min((tokensUsed / totalTokens) * 100, 100) : 100;
  const currentPlanName = getPlanName(totalTokens);
  const upgradePlans = UPGRADE_PLANS.filter((p) => p.tokens > totalTokens);
  const isAtMax = upgradePlans.length === 0;

  async function handleUpgrade(planId: string) {
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout. Please try again.");
        setLoadingPlan(null);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setLoadingPlan(null);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.80)",
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
          background: "linear-gradient(160deg, #13213d 0%, #0e1a30 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 24,
          padding: "36px 32px 28px",
          maxWidth: upgradePlans.length > 1 ? 580 : 440,
          width: "100%",
          textAlign: "center" as const,
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
          fontFamily: "Verdana, Geneva, sans-serif",
          color: "#e6edf7",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(124,58,237,0.2) 100%)",
            border: "2px solid rgba(239,68,68,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 30,
          }}
        >
          🔒
        </div>

        {/* Headline */}
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>
          You're out of tokens
        </h2>
        <p style={{ fontSize: 13, opacity: 0.55, margin: "0 0 20px", lineHeight: 1.5 }}>
          {currentPlanName} plan · {tokensUsed} / {totalTokens} tokens used this month
        </p>

        {/* Usage bar */}
        <div
          style={{
            background: "rgba(255,255,255,0.07)",
            borderRadius: 8,
            height: 8,
            marginBottom: 28,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)",
              height: "100%",
              width: `${pct}%`,
              borderRadius: 8,
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {isNative ? (
          /* On iOS — direct to website for payments */
          <>
            <p style={{ fontSize: 14, opacity: 0.8, margin: "0 0 8px", lineHeight: 1.6 }}>
              To upgrade your plan, visit us on the web:
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#7eb3ff", margin: "0 0 24px" }}>
              aisocialhelper.com
            </p>
            <button
              onClick={onClose}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 12,
                padding: "13px 24px",
                color: "#e6edf7",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Verdana, Geneva, sans-serif",
              }}
            >
              Got it
            </button>
          </>
        ) : isAtMax ? (
          /* Premium users — no upgrade available */
          <>
            <p style={{ fontSize: 14, opacity: 0.7, margin: "0 0 24px", lineHeight: 1.6 }}>
              You're on our top plan. Your tokens reset on the
              <strong style={{ color: "#7eb3ff" }}> 1st of each month</strong>.
            </p>
            <button
              onClick={onClose}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 12,
                padding: "13px 24px",
                color: "#e6edf7",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Verdana, Geneva, sans-serif",
              }}
            >
              Got it
            </button>
          </>
        ) : (
          /* Show upgrade plan cards */
          <>
            <div style={{ marginBottom: 20, fontSize: 13, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.8, opacity: 0.5 }}>
              Upgrade to keep generating
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                marginBottom: 24,
                flexWrap: "wrap" as const,
              }}
            >
              {upgradePlans.map((plan) => {
                const isLoading = loadingPlan === plan.id;
                const isDisabled = loadingPlan !== null;
                return (
                  <div
                    key={plan.id}
                    style={{
                      flex: "1 1 140px",
                      maxWidth: 180,
                      background: plan.popular
                        ? "linear-gradient(135deg, rgba(44,107,237,0.2) 0%, rgba(124,58,237,0.2) 100%)"
                        : "rgba(255,255,255,0.05)",
                      border: plan.popular
                        ? "1.5px solid rgba(44,107,237,0.55)"
                        : "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 16,
                      padding: "18px 14px 14px",
                      position: "relative" as const,
                      textAlign: "center" as const,
                    }}
                  >
                    {plan.popular && (
                      <div
                        style={{
                          position: "absolute" as const,
                          top: -11,
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)",
                          color: "#fff",
                          padding: "4px 14px",
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          whiteSpace: "nowrap" as const,
                        }}
                      >
                        MOST POPULAR
                      </div>
                    )}

                    {/* Plan name */}
                    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>
                      {plan.name}
                    </div>

                    {/* Price */}
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 28, fontWeight: 800, color: plan.popular ? "#7eb3ff" : "#e6edf7" }}>
                        ${plan.price}
                      </span>
                      <span style={{ fontSize: 12, opacity: 0.5 }}>/mo</span>
                    </div>

                    {/* Tokens */}
                    <div
                      style={{
                        fontSize: 12,
                        color: "#22c55e",
                        fontWeight: 700,
                        marginBottom: 14,
                        background: "rgba(34,197,94,0.1)",
                        borderRadius: 6,
                        padding: "4px 8px",
                        display: "inline-block",
                      }}
                    >
                      {plan.tokens} tokens / mo
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isDisabled}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        fontFamily: "Verdana, Geneva, sans-serif",
                        border: "none",
                        background: plan.popular
                          ? "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)"
                          : "rgba(255,255,255,0.12)",
                        color: "#fff",
                        opacity: isDisabled ? 0.6 : 1,
                        transition: "all 0.15s ease",
                        boxShadow: plan.popular ? "0 4px 14px rgba(44,107,237,0.4)" : "none",
                      }}
                    >
                      {isLoading ? "Redirecting…" : `Get ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Reset note + close */}
            <p style={{ fontSize: 12, opacity: 0.45, margin: "0 0 16px", lineHeight: 1.5 }}>
              Tokens reset on the 1st of each month · Billed monthly · Cancel anytime
            </p>

            <button
              onClick={onClose}
              style={{
                width: "100%",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "11px 24px",
                color: "rgba(230,237,247,0.5)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Verdana, Geneva, sans-serif",
              }}
            >
              Maybe later
            </button>
          </>
        )}
      </div>
    </div>
  );
}

