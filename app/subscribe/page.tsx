"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "#0b1220",
    color: "#e6edf7",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
  },
  card: {
    background: "linear-gradient(135deg, #1a2332 0%, #0f1926 100%)",
    borderRadius: "16px",
    padding: "48px",
    maxWidth: "600px",
    width: "100%",
    textAlign: "center" as const,
    border: "1px solid rgba(255,255,255,0.1)",
  },
  title: {
    fontSize: "32px",
    fontWeight: 700,
    marginBottom: "12px",
  },
  subtitle: {
    fontSize: "16px",
    color: "#8fa3bf",
    marginBottom: "40px",
  },
  plansContainer: {
    display: "flex",
    gap: "20px",
    marginBottom: "24px",
    flexWrap: "wrap" as const,
    justifyContent: "center",
  },
  planCard: {
    flex: "1",
    minWidth: "220px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "12px",
    padding: "24px",
    border: "1px solid rgba(255,255,255,0.1)",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  planCardSelected: {
    border: "2px solid #2c6bed",
    background: "rgba(44,107,237,0.1)",
  },
  planName: {
    fontSize: "18px",
    fontWeight: 600,
    marginBottom: "8px",
  },
  planPrice: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#2c6bed",
  },
  planPeriod: {
    fontSize: "14px",
    color: "#8fa3bf",
  },
  savingsBadge: {
    background: "#22c55e",
    color: "#fff",
    fontSize: "12px",
    padding: "4px 8px",
    borderRadius: "4px",
    marginTop: "8px",
    display: "inline-block",
  },
  button: {
    background: "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "16px 32px",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    marginTop: "16px",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  canceledMessage: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "24px",
    color: "#f87171",
  },
};

export default function SubscribePage() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout session");
        setLoading(false);
      }
    } catch {
      alert("Failed to create checkout session");
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Subscribe to AI Tech Helper</h1>
        <p style={styles.subtitle}>
          Unlock unlimited AI-powered social media content generation
        </p>

        {canceled && (
          <div style={styles.canceledMessage}>
            Checkout was canceled. You can try again when you&apos;re ready.
          </div>
        )}

        <div style={styles.plansContainer}>
          <div
            style={{
              ...styles.planCard,
              ...(selectedPlan === "monthly" ? styles.planCardSelected : {}),
            }}
            onClick={() => setSelectedPlan("monthly")}
          >
            <div style={styles.planName}>Monthly</div>
            <div style={styles.planPrice}>$19</div>
            <div style={styles.planPeriod}>per month</div>
          </div>

          <div
            style={{
              ...styles.planCard,
              ...(selectedPlan === "yearly" ? styles.planCardSelected : {}),
            }}
            onClick={() => setSelectedPlan("yearly")}
          >
            <div style={styles.planName}>Yearly</div>
            <div style={styles.planPrice}>$190</div>
            <div style={styles.planPeriod}>per year</div>
            <div style={styles.savingsBadge}>Save $38/year</div>
          </div>
        </div>

        <button
          style={{
            ...styles.button,
            ...(loading ? styles.buttonDisabled : {}),
          }}
          onClick={handleSubscribe}
          disabled={loading}
        >
          {loading ? "Redirecting to checkout..." : `Subscribe ${selectedPlan === "monthly" ? "Monthly" : "Yearly"}`}
        </button>
      </div>
    </div>
  );
}
