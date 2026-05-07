"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";

type SubscriptionData = {
  status: string;
  plan: string | null;
  currentPeriodEnd: string | null;
};

type TokenData = {
  tokensUsed: number;
  totalTokens: number;
  remaining: number;
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
  premium: "Premium",
};

const PLAN_TOKENS: Record<string, number> = {
  free: 2,
  basic: 30,
  pro: 60,
  premium: 120,
};

export default function ManagePage() {
  const router = useRouter();
  const { signOut } = useClerk();

  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [tokens, setTokens] = useState<TokenData | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/check-subscription")
      .then((r) => r.json())
      .then(setSub)
      .catch(() => {});

    fetch("/api/tokens")
      .then((r) => r.json())
      .then(setTokens)
      .catch(() => {});
  }, []);

  async function handlePortal() {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Could not open billing portal. Please try again.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoadingPortal(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/delete-account", { method: "DELETE" });
      if (res.ok) {
        await signOut();
        router.replace("/");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete account. Please try again.");
        setDeleteStep(0);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setDeleteStep(0);
    } finally {
      setDeleting(false);
    }
  }

  const planKey = sub?.plan ?? "free";
  const planLabel = PLAN_LABELS[planKey] ?? planKey;
  const isPaid = planKey !== "free" && planKey !== null;
  const totalTokens = PLAN_TOKENS[planKey] ?? 2;
  const tokensUsed = tokens?.tokensUsed ?? 0;
  const tokenPct = totalTokens > 0 ? Math.min((tokensUsed / totalTokens) * 100, 100) : 0;

  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0a1628 0%, #0e1a30 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 20px 80px",
        fontFamily: "Verdana, Geneva, sans-serif",
        color: "#e6edf7",
      }}
    >
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 520, marginBottom: 40 }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            color: "rgba(230,237,247,0.5)",
            fontSize: 14,
            cursor: "pointer",
            padding: 0,
            fontFamily: "Verdana, Geneva, sans-serif",
            marginBottom: 24,
          }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Manage Account</h1>
        <p style={{ fontSize: 14, opacity: 0.5, margin: "6px 0 0" }}>
          View your plan, token usage, and account settings
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Plan card */}
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: "24px 28px",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, opacity: 0.45, textTransform: "uppercase", marginBottom: 14 }}>
            Current Plan
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{planLabel}</div>
              {periodEnd && (
                <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>
                  Renews {periodEnd}
                </div>
              )}
              {!isPaid && (
                <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>
                  {totalTokens} posts / month
                </div>
              )}
            </div>
            <a
              href="/subscribe"
              style={{
                background: "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)",
                border: "none",
                borderRadius: 12,
                padding: "10px 20px",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              {isPaid ? "Change Plan" : "Upgrade"}
            </a>
          </div>
        </div>

        {/* Token usage card */}
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: "24px 28px",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, opacity: 0.45, textTransform: "uppercase", marginBottom: 14 }}>
            Token Usage This Month
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>{tokensUsed} used</span>
            <span style={{ fontSize: 14, opacity: 0.5 }}>{totalTokens} total</span>
          </div>

          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, height: 8, overflow: "hidden" }}>
            <div
              style={{
                background: tokenPct >= 100
                  ? "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)"
                  : "linear-gradient(90deg, #2c6bed 0%, #7c3aed 100%)",
                height: "100%",
                width: `${tokenPct}%`,
                borderRadius: 8,
                transition: "width 0.3s ease",
              }}
            />
          </div>

          <div style={{ fontSize: 12, opacity: 0.4, marginTop: 10 }}>
            Tokens reset on the 1st of each month
          </div>
        </div>

        {/* Billing portal (paid users only) */}
        {isPaid && (
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              padding: "24px 28px",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, opacity: 0.45, textTransform: "uppercase", marginBottom: 14 }}>
              Billing
            </div>

            <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 16, lineHeight: 1.6 }}>
              Update payment method, view invoices, or cancel your subscription.
            </div>

            <button
              onClick={handlePortal}
              disabled={loadingPortal}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 12,
                padding: "12px 24px",
                color: "#e6edf7",
                fontSize: 14,
                fontWeight: 600,
                cursor: loadingPortal ? "not-allowed" : "pointer",
                fontFamily: "Verdana, Geneva, sans-serif",
                opacity: loadingPortal ? 0.6 : 1,
              }}
            >
              {loadingPortal ? "Opening…" : "Manage Billing"}
            </button>
          </div>
        )}

        {/* Delete account */}
        <div
          style={{
            background: "rgba(239,68,68,0.05)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 20,
            padding: "24px 28px",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, opacity: 0.45, textTransform: "uppercase", marginBottom: 14, color: "#ef4444" }}>
            Danger Zone
          </div>

          {deleteStep === 0 && (
            <>
              <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 16, lineHeight: 1.6 }}>
                Permanently delete your account and all data. This cannot be undone.
              </div>
              <button
                onClick={() => setDeleteStep(1)}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "1px solid rgba(239,68,68,0.4)",
                  borderRadius: 12,
                  padding: "12px 24px",
                  color: "#ef4444",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "Verdana, Geneva, sans-serif",
                }}
              >
                Delete Account
              </button>
            </>
          )}

          {deleteStep === 1 && (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                Are you sure?
              </div>
              <div style={{ fontSize: 13, opacity: 0.65, marginBottom: 20, lineHeight: 1.6 }}>
                All your brand profiles, generated posts, scheduled content, and account data will be permanently deleted. Your subscription will also be cancelled.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setDeleteStep(0)}
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    color: "#e6edf7",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "Verdana, Geneva, sans-serif",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    background: "#ef4444",
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 16px",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: deleting ? "not-allowed" : "pointer",
                    fontFamily: "Verdana, Geneva, sans-serif",
                    opacity: deleting ? 0.6 : 1,
                  }}
                >
                  {deleting ? "Deleting…" : "Yes, Delete"}
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
