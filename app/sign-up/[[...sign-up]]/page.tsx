"use client";
import { useSignUp, useSignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import BackButton from "../../_components/BackButton";

interface SignInWithApplePlugin {
  authorize(): Promise<{ response: { user: string; email: string; givenName: string; familyName: string; identityToken: string; authorizationCode: string } }>;
}
const SignInWithAppleNative = registerPlugin<SignInWithApplePlugin>("SignInWithApple");

type Step = "sign_up" | "verify_code";

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { signIn } = useSignIn();
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [step, setStep] = useState<Step>("sign_up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  useEffect(() => {
    if (isSignedIn) router.push("/dashboard");
  }, [isSignedIn, router]);

  const handleAppleSignUp = async () => {
    if (!isLoaded) return;
    setAppleLoading(true);
    setError("");

    if (!isNative) {
      try {
        await signUp.authenticateWithRedirect({
          strategy: "oauth_apple",
          redirectUrl: "/sign-in/sso-callback",
          redirectUrlComplete: "/dashboard",
        });
      } catch (err: any) {
        setError(err.errors?.[0]?.message || "Apple sign in failed.");
        setAppleLoading(false);
      }
      return;
    }

    // Native iOS: use the native Apple Sign In sheet (no external browser)
    try {
      const result = await SignInWithAppleNative.authorize();

      const res = await fetch("/api/auth/apple-native", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityToken: result.response.identityToken,
          authorizationCode: result.response.authorizationCode,
          email: result.response.email,
          givenName: result.response.givenName,
          familyName: result.response.familyName,
          user: result.response.user,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Sign in failed. Please try again.");
      }

      const { ticket } = await res.json();

      const signInResult = await signIn!.create({ strategy: "ticket", ticket });
      if (signInResult.status === "complete") {
        await setActive({ session: signInResult.createdSessionId });
        router.push("/dashboard");
      } else {
        throw new Error("Sign in incomplete. Please try again.");
      }
    } catch (err: any) {
      const msg: string = err?.message || err?.errors?.[0]?.message || "Apple sign in failed.";
      if (msg.toLowerCase().includes("already signed in") || err?.errors?.[0]?.code === "session_exists") {
        router.push("/dashboard");
        return;
      }
      if (!msg.toLowerCase().includes("cancel") && !msg.toLowerCase().includes("dismiss")) {
        setError(msg);
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!isLoaded) return;
    setGoogleLoading(true);
    setError("");
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sign-in/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Google sign in failed.");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError("");
    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      } else {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setStep("verify_code");
      }
    } catch (err: any) {
      const code = err.errors?.[0]?.code ?? "";
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || "";
      if (
        code === "form_identifier_exists" ||
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("no sign up attempt") ||
        msg.toLowerCase().includes("get request")
      ) {
        setError("An account with this email already exists. Please sign in instead.");
      } else {
        setError(msg || "Sign up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      } else {
        setError(`Verification incomplete (${result.status}). Please try again.`);
      }
    } catch (err: any) {
      setError(
        err.errors?.[0]?.longMessage ||
          err.errors?.[0]?.message ||
          "Invalid code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#fff",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  };

  const socialBtnStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 8,
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px", marginBottom: 16 }}>
        <BackButton href="/get-started" />
      </div>
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#111827",
          borderRadius: 16,
          padding: "40px 32px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img
            src="/logo-icon.png"
            alt="AI Social Helper"
            style={{ width: 48, height: 48, display: "block", margin: "0 auto 12px" }}
          />
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>
            {step === "verify_code" ? "Check your email" : "Create account"}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginTop: 6 }}>
            {step === "verify_code"
              ? `We sent a verification code to ${email}`
              : "Get started with AI Social Helper"}
          </p>
        </div>

        {/* Verify code step */}
        {step === "verify_code" && (
          <form onSubmit={handleVerifyCode} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoFocus
                style={{ ...inputStyle, letterSpacing: 4, textAlign: "center", fontSize: 20 }}
                placeholder="000000"
              />
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 14 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
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
              }}
            >
              {loading ? "Verifying…" : "Verify & Continue"}
            </button>

            <button
              type="button"
              onClick={() => { setStep("sign_up"); setError(""); setCode(""); }}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer", textAlign: "center" }}
            >
              ← Back
            </button>
          </form>
        )}

        {/* Sign up step */}
        {step === "sign_up" && (
          <>
            {/* Sign in with Apple — iOS native only */}
            {isNative && (
              <button
                onClick={handleAppleSignUp}
                disabled={appleLoading || !isLoaded}
                style={{ ...socialBtnStyle, opacity: appleLoading ? 0.6 : 1, cursor: appleLoading ? "not-allowed" : "pointer" }}
              >
                {!appleLoading && (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M12.3 0c.1 1.4-.4 2.7-1.2 3.7-.8.9-2 1.6-3.2 1.5-.1-1.3.5-2.7 1.3-3.6C10 .6 11.3 0 12.3 0zM16.5 12.4c-.5 1.1-1 2-1.7 2.8-.7.9-1.5 1.8-2.6 1.8-1 0-1.4-.6-2.6-.6-1.2 0-1.7.6-2.7.6-1.1 0-1.9-.9-2.7-1.9C2.9 13.5 1.5 11 1.5 8.6c0-3.6 2.3-5.5 4.6-5.5 1.2 0 2.2.7 3 .7.7 0 2-.8 3.4-.7.6 0 2.2.2 3.3 1.7-.1.1-2 1.1-2 3.4 0 2.6 2.3 3.5 2.7 3.5-.1.3-.2.5-.3.7z" fill="#fff" />
                  </svg>
                )}
                {appleLoading ? "Signing in…" : "Continue with Apple"}
              </button>
            )}

            {/* Google — web only (Google blocks OAuth in WKWebView) */}
            {!isNative && <button
              onClick={handleGoogleSignUp}
              disabled={googleLoading || !isLoaded}
              style={{ ...socialBtnStyle, opacity: googleLoading ? 0.6 : 1, cursor: googleLoading ? "not-allowed" : "pointer", marginBottom: 20 }}
            >
              {!googleLoading && (
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
                </svg>
              )}
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </button>}

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    First name
                  </label>
                  <input
                    type="text"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={inputStyle}
                    placeholder="Jane"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Last name
                  </label>
                  <input
                    type="text"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={inputStyle}
                    placeholder="Doe"
                  />
                </div>
              </div>

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
                  style={inputStyle}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={inputStyle}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 14 }}>
                  {error}
                  {error.includes("already exists") && (
                    <div style={{ marginTop: 8 }}>
                      <a href="/sign-in" style={{ color: "#818cf8", fontWeight: 600, textDecoration: "none" }}>
                        Go to sign in →
                      </a>
                    </div>
                  )}
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
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>

            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 24 }}>
              Already have an account?{" "}
              <a href="/sign-in" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 600 }}>
                Sign in
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
