"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";

type PlanId = "free" | "basic" | "pro" | "premium";

const PLANS: Array<{
  id: PlanId;
  name: string;
  price: number;
  tokens: number;
  features: string[];
  highlighted: boolean;
  badge: string | null;
}> = [
  {
    id: "premium",
    name: "Premium",
    price: 39,
    tokens: 120,
    features: [
      "120 AI-generated posts per month",
      "Full 5-pillar weekly plan covered",
      "Brand profile support",
      "AI image generation",
      "Smart captions & hashtags",
      "Priority generation speed",
      "Early access to new features",
    ],
    highlighted: true,
    badge: "Best Value",
  },
  {
    id: "pro",
    name: "Pro",
    price: 19,
    tokens: 60,
    features: [
      "60 AI-generated posts per month",
      "Full 5-pillar weekly plan covered",
      "Brand profile support",
      "AI image generation",
      "Smart captions & hashtags",
      "Priority generation speed",
    ],
    highlighted: false,
    badge: "Most Popular",
  },
  {
    id: "basic",
    name: "Basic",
    price: 9,
    tokens: 30,
    features: [
      "30 AI-generated posts per month",
      "Full 5-pillar weekly plan covered",
      "Brand profile support",
      "AI image generation",
      "Smart captions & hashtags",
    ],
    highlighted: false,
    badge: null,
  },
];

function SubscribeContent() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");
  const subSuccess = searchParams.get("sub") === "success";
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  // null = not yet determined — prevents Stripe pricing from flashing before we
  // know if we're on native iOS (where no purchase UI is shown at all).
  const [isNative, setIsNative] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const native = Capacitor.isNativePlatform();
    setIsNative(native);
    // On iOS the app has no purchase UI — silently redirect to dashboard.
    // Subscriptions are handled on the web (same model as Netflix).
    if (native) router.replace("/dashboard");
  }, [router]);

  // null = loading, false = never selected a plan (show Start Free), true = already has a plan
  const [hasPlan, setHasPlan] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/tokens")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setHasPlan(data.plan !== null);
      })
      .catch(() => {
        setHasPlan(false);
      });
  }, []);

  // After successful web checkout, give Clerk time to re-establish session
  useEffect(() => {
    if (subSuccess) {
      const timer = setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [subSuccess, router]);

  const handleSubscribe = async (plan: PlanId) => {
    setLoadingPlan(plan);
    try {
      if (plan === "free") {
        const res = await fetch("/api/select-free-plan", { method: "POST" });
        if (res.ok) {
          router.push("/dashboard");
        } else {
          alert("Failed to activate free plan. Please try again.");
          setLoadingPlan(null);
        }
        return;
      }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout session");
        setLoadingPlan(null);
      }
    } catch {
      alert("Failed to create checkout session");
      setLoadingPlan(null);
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0b1220 0%, #0d1829 50%, #111827 100%)",
      color: "#e6edf7",
      fontFamily: "Verdana, Geneva, sans-serif",
      padding: "60px 20px 80px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    },
    header: {
      textAlign: "center" as const,
      marginBottom: 48,
      maxWidth: 600,
      paddingTop: 40,
    },
    title: {
      fontSize: 40,
      fontWeight: 800,
      lineHeight: 1.2,
      marginBottom: 16,
      background: "linear-gradient(135deg, #ffffff 0%, #e6edf7 50%, #7eb3ff 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    subtitle: {
      fontSize: 16,
      color: "#8fa3bf",
      lineHeight: 1.6,
      margin: 0,
    },
    canceledBanner: {
      background: "rgba(239, 68, 68, 0.1)",
      border: "1px solid rgba(239, 68, 68, 0.3)",
      borderRadius: 12,
      padding: "14px 20px",
      marginBottom: 32,
      color: "#f87171",
      fontSize: 14,
      maxWidth: 600,
      width: "100%",
      textAlign: "center" as const,
    },
    cardsRow: {
      display: "flex",
      gap: 24,
      justifyContent: "center",
      flexWrap: "wrap" as const,
      maxWidth: 1060,
      width: "100%",
    },
    card: {
      flex: "1",
      minWidth: 280,
      maxWidth: 320,
      background: "linear-gradient(135deg, #15233d 0%, #101a33 100%)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 20,
      padding: "36px 28px 28px",
      display: "flex",
      flexDirection: "column" as const,
      position: "relative" as const,
      transition: "all 0.2s ease",
    },
    cardHighlighted: {
      border: "2px solid #2c6bed",
      background: "linear-gradient(135deg, #192a4a 0%, #101a33 100%)",
      boxShadow:
        "0 0 40px rgba(44, 107, 237, 0.15), 0 8px 32px rgba(0,0,0,0.3)",
      transform: "scale(1.04)",
    },
    badge: {
      position: "absolute" as const,
      top: -14,
      left: "50%",
      transform: "translateX(-50%)",
      background: "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)",
      color: "#fff",
      padding: "6px 18px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: "nowrap" as const,
      letterSpacing: 0.5,
    },
    planName: { fontSize: 20, fontWeight: 700, marginBottom: 8 },
    priceRow: {
      display: "flex",
      alignItems: "baseline",
      gap: 4,
      marginBottom: 4,
    },
    price: { fontSize: 44, fontWeight: 800, lineHeight: 1 },
    pricePeriod: { fontSize: 16, color: "#8fa3bf", fontWeight: 500 },
    tokens: {
      fontSize: 14,
      color: "#8fa3bf",
      marginBottom: 24,
      paddingBottom: 24,
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    },
    featureList: {
      listStyle: "none",
      padding: 0,
      margin: "0 0 28px 0",
      flex: 1,
    },
    featureItem: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 14,
      color: "#c5d0e0",
      marginBottom: 12,
      lineHeight: 1.4,
    },
    checkmark: {
      width: 18,
      height: 18,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    btn: {
      width: "100%",
      padding: "14px 20px",
      borderRadius: 12,
      fontSize: 15,
      fontWeight: 700,
      cursor: "pointer",
      transition: "all 0.2s ease",
      fontFamily: "Verdana, Geneva, sans-serif",
      letterSpacing: 0.3,
    },
    btnPrimary: {
      background: "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)",
      border: "none",
      color: "#fff",
      boxShadow: "0 4px 16px rgba(44, 107, 237, 0.3)",
    },
    btnSecondary: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.15)",
      color: "#e6edf7",
    },
    btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
    footer: { textAlign: "center" as const, marginTop: 40, maxWidth: 500 },
    footerText: { fontSize: 13, color: "#5a6a80", lineHeight: 1.6 },
  };

  // Blank screen while we detect platform (prevents Stripe pricing from flashing on iOS)
  if (isNative === null) {
    return (
      <div style={{ minHeight: "100vh", background: "#0b1220" }} />
    );
  }

  // Show success screen while Clerk re-establishes session (web only)
  if (subSuccess) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #0b1220 0%, #0d1829 50%, #111827 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#e6edf7",
          fontFamily: "Verdana, Geneva, sans-serif",
          gap: 24,
          padding: 20,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 64 }}>🎉</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>
          You&apos;re subscribed!
        </h1>
        <p style={{ fontSize: 16, color: "#8fa3bf", margin: 0 }}>
          Taking you to your dashboard...
        </p>
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid rgba(44,107,237,0.3)",
            borderTop: "3px solid #2c6bed",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── Web: Stripe checkout ────────────────────────────────────────────────────
  // (iOS is handled above: it redirects to /dashboard and never reaches here)
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Choose Your Plan</h1>
        <p style={styles.subtitle}>
          AI-powered content tailored to your niche — captions, hashtags,
          images, and a full content calendar — ready in seconds.
        </p>
      </div>

      {canceled && (
        <div style={styles.canceledBanner}>
          Checkout was canceled. You can try again when you&apos;re ready.
        </div>
      )}

      <div style={styles.cardsRow} className="tier-cards-row">
        {PLANS.map((plan) => {
          const isHighlighted = plan.highlighted;
          const isLoading = loadingPlan === plan.id;
          const isDisabled = loadingPlan !== null;

          return (
            <div
              key={plan.id}
              style={{
                ...styles.card,
                ...(isHighlighted ? styles.cardHighlighted : {}),
              }}
              className={
                isHighlighted ? "tier-card tier-card-highlighted" : "tier-card"
              }
            >
              {plan.badge && <div style={styles.badge}>{plan.badge}</div>}
              <div style={styles.planName}>{plan.name}</div>
              <div style={styles.priceRow}>
                <span
                  style={{
                    ...styles.price,
                    color: isHighlighted ? "#2c6bed" : "#e6edf7",
                  }}
                >
                  ${plan.price}
                </span>
                <span style={styles.pricePeriod}>/mo</span>
              </div>
              <div style={styles.tokens}>{plan.tokens} tokens / month</div>
              <ul style={styles.featureList}>
                {plan.features.map((feature) => (
                  <li key={feature} style={styles.featureItem}>
                    <div
                      style={{
                        ...styles.checkmark,
                        background: isHighlighted
                          ? "rgba(44, 107, 237, 0.2)"
                          : "rgba(34, 197, 94, 0.15)",
                      }}
                    >
                      <svg
                        width="10"
                        height="10"
                        fill="none"
                        stroke={isHighlighted ? "#7eb3ff" : "#22c55e"}
                        strokeWidth="3"
                        viewBox="0 0 24 24"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                style={{
                  ...styles.btn,
                  ...(isHighlighted ? styles.btnPrimary : styles.btnSecondary),
                  ...(isDisabled ? styles.btnDisabled : {}),
                }}
                onClick={() => handleSubscribe(plan.id)}
                disabled={isDisabled}
                className={
                  isHighlighted ? "subscribe-btn-primary" : "subscribe-btn"
                }
              >
                {isLoading ? "Redirecting to checkout..." : `Get ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>


      <div style={styles.footer}>
        <p style={styles.footerText}>
          Paid plans are billed monthly. Cancel anytime from your dashboard.
          <br />
          Secure payment powered by Stripe.
        </p>
      </div>

      <style>{`
        .tier-card:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.2) !important; }
        .tier-card-highlighted:hover { transform: scale(1.04) translateY(-4px) !important; }
        .subscribe-btn-primary:hover { filter: brightness(1.1); box-shadow: 0 6px 24px rgba(44,107,237,0.5); }
        .subscribe-btn:hover { background: rgba(255,255,255,0.1) !important; border-color: rgba(255,255,255,0.25) !important; }
        @media (max-width: 900px) {
          .tier-cards-row { flex-direction: column !important; align-items: center !important; }
          .tier-card { max-width: 400px !important; width: 100% !important; }
          .tier-card-highlighted { transform: none !important; }
          .tier-card-highlighted:hover { transform: translateY(-4px) !important; }
        }
        @media (max-width: 480px) { .tier-card { min-width: unset !important; padding: 28px 20px 24px !important; } }
      `}</style>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "#0b1220",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8fa3bf",
            fontFamily: "Verdana, Geneva, sans-serif",
            fontSize: 16,
          }}
        >
          Loading...
        </div>
      }
    >
      <SubscribeContent />
    </Suspense>
  );
}
