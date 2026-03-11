"use client";
import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError("");
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        // Full page navigation so the session cookie is sent with the next request
        window.location.href = "/dashboard";
      } else {
        setError("Sign in incomplete. Please try again.");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0b1220",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "400px",
        background: "#111827",
        borderRadius: 16,
        padding: "40px 32px",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo-icon.png" alt="AI Social Helper" style={{ width: 48, height: 48, marginBottom: 12 }} />
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Sign in</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginTop: 6 }}>Welcome back to AI Social Helper</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#fff",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#fff",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              padding: "10px 14px",
              color: "#f87171",
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isLoaded}
            style={{
              width: "100%",
              padding: "12px",
              background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: 4,
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 24 }}>
          Don&apos;t have an account?{" "}
          <a href="/sign-up" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 600 }}>
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
