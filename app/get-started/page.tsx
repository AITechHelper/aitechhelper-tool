"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const isSignedIn = isLoaded && !!user;
  const [menuOpen, setMenuOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [loadingBtn, setLoadingBtn] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const navigateTo = (route: string, btnId: string) => {
    setLoadingBtn(btnId);
    router.push(route);
  };

  const Spinner = () => (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: "2px solid rgba(255,255,255,0.35)",
        borderTopColor: "#fff",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        verticalAlign: "middle",
      }}
    />
  );

  // Close menu on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscKey);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [menuOpen]);

  const handleBilling = async () => {
    setBillingLoading(true);
    setMenuOpen(false);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (res.status === 404) {
        // No subscription — redirect to subscribe page
        window.location.href = "/subscribe";
      }
    } catch {
      // silently fail on landing page
    } finally {
      setBillingLoading(false);
    }
  };

  // Demo animation state
  const [demoPhase, setDemoPhase] = useState<
    | "idle"
    | "cursor-moving"
    | "cursor-click"
    | "loading"
    | "image"
    | "caption"
    | "hashtags"
    | "hold"
  >("idle");
  const [demoCaption, setDemoCaption] = useState("");
  const [demoHashtags, setDemoHashtags] = useState("");
  const [cursorPosition, setCursorPosition] = useState({ x: 20, y: 20 });
  const demoPhoneRef = useRef<HTMLDivElement>(null);
  const demoBtnRef = useRef<HTMLButtonElement>(null);
  const fullCaption =
    "Most buyers are waiting for rates to drop. Here's the truth: by the time rates fall, prices will already be up. The window is now — and I can help you move with confidence. 🏡";
  const fullHashtags =
    "#RealEstate #HousingMarket #MarketUpdate #Homebuying #RealEstateAgent";

  // Demo animation sequence
  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];

    const runAnimation = () => {
      // Reset - cursor starts outside top-left
      setDemoPhase("idle");
      setDemoCaption("");
      setDemoHashtags("");
      setCursorPosition({ x: -10, y: -10 });

      // Phase 0: After 0.5s, cursor appears and starts moving toward button
      timeouts.push(
        setTimeout(() => {
          setDemoPhase("cursor-moving");
          // Calculate button position relative to phone frame
          let targetX = 130;
          let targetY = 560;
          if (demoBtnRef.current && demoPhoneRef.current) {
            const phoneRect = demoPhoneRef.current.getBoundingClientRect();
            const btnRect = demoBtnRef.current.getBoundingClientRect();
            targetX = btnRect.left - phoneRect.left + btnRect.width / 2 - 16;
            targetY = btnRect.top - phoneRect.top + btnRect.height / 2 - 16;
          }
          setCursorPosition({ x: targetX, y: targetY });
        }, 500)
      );

      // Phase 1: Cursor arrives at button, click effect
      timeouts.push(
        setTimeout(() => {
          setDemoPhase("cursor-click");
        }, 1500)
      );

      // Phase 2: Start loading after click
      timeouts.push(
        setTimeout(() => {
          setDemoPhase("loading");
        }, 1800)
      );

      // Phase 3: Loading for 1.2s, then show image
      timeouts.push(
        setTimeout(() => {
          setDemoPhase("image");
        }, 3000)
      );

      // Phase 4: Image shown for 0.4s, then start typing caption
      timeouts.push(
        setTimeout(() => {
          setDemoPhase("caption");
          // Type out caption character by character
          let i = 0;
          const typeCaption = () => {
            if (i < fullCaption.length) {
              setDemoCaption(fullCaption.slice(0, i + 1));
              i++;
              timeouts.push(setTimeout(typeCaption, 18));
            }
          };
          typeCaption();
        }, 3400)
      );

      // Phase 5: After caption done, type hashtags
      timeouts.push(
        setTimeout(() => {
          setDemoPhase("hashtags");
          let j = 0;
          const typeHashtags = () => {
            if (j < fullHashtags.length) {
              setDemoHashtags(fullHashtags.slice(0, j + 1));
              j++;
              timeouts.push(setTimeout(typeHashtags, 12));
            }
          };
          typeHashtags();
        }, 5200)
      );

      // Phase 6: Hold for 2s, then restart
      timeouts.push(
        setTimeout(() => {
          setDemoPhase("hold");
        }, 6200)
      );

      // Restart the animation
      timeouts.push(
        setTimeout(() => {
          runAnimation();
        }, 8500)
      );
    };

    runAnimation();

    return () => {
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #0b1220 0%, #0d1829 50%, #111827 100%)",
        color: "#e6edf7",
        fontFamily: "Verdana, Geneva, sans-serif",
        overflowX: "hidden",
      }}
    >
      {/* Navigation */}
      <nav className="landing-nav" style={{ padding: "20px 40px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <img src="/logo-icon.png" alt="AI Social Helper" style={{ width: 48, height: 48, objectFit: "contain" }} />
          <span className="nav-brand-text" style={{ fontSize: 18, fontWeight: 800 }}>AI Social Helper</span>
        </div>
        <div className="nav-right" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {isSignedIn ? (
            <>
              <div ref={menuRef} className="nav-email-pill" style={{ position: "relative" }}>
                <div
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{
                    background: "rgba(44, 107, 237, 0.1)",
                    border: "1px solid rgba(44, 107, 237, 0.2)",
                    borderRadius: 20,
                    padding: "6px 14px",
                    fontSize: 12,
                    color: "#7eb3ff",
                    fontWeight: 600,
                    fontFamily: "Verdana, Geneva, sans-serif",
                    maxWidth: 220,
                    cursor: "pointer",
                    transition: "opacity 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <span
                    style={{
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {user.primaryEmailAddress?.emailAddress || user.username || "Signed in"}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      transition: "transform 0.2s ease",
                      transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
                      flexShrink: 0,
                    }}
                  >
                    ▼
                  </span>
                </div>

                {menuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: 48,
                      left: 0,
                      background: "rgba(10, 18, 32, 0.98)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 14,
                      minWidth: 200,
                      boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
                      padding: 8,
                      zIndex: 50,
                    }}
                  >
                    <button
                      onClick={handleBilling}
                      disabled={billingLoading}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        color: "#ffffff",
                        padding: "10px 12px",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: billingLoading ? "not-allowed" : "pointer",
                        textAlign: "left" as const,
                        transition: "background 0.2s ease",
                        fontFamily: "Verdana, Geneva, sans-serif",
                      }}
                      onMouseEnter={(e) =>
                        !billingLoading &&
                        (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      {billingLoading ? "Loading..." : "Manage Billing"}
                    </button>

                    <SignOutButton redirectUrl="/">
                      <button
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          color: "#ffffff",
                          padding: "10px 12px",
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: "pointer",
                          textAlign: "left" as const,
                          transition: "background 0.2s ease",
                          fontFamily: "Verdana, Geneva, sans-serif",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        Sign Out
                      </button>
                    </SignOutButton>
                  </div>
                )}
              </div>
              <button
                onClick={() => navigateTo("/dashboard", "nav-dashboard")}
                disabled={loadingBtn === "nav-dashboard"}
                style={{
                  background: "linear-gradient(135deg, #2c6bed 0%, #1e4fc2 100%)",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 24px",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loadingBtn === "nav-dashboard" ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(44, 107, 237, 0.3)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: loadingBtn === "nav-dashboard" ? 0.8 : 1,
                }}
                className="nav-cta"
              >
                {loadingBtn === "nav-dashboard" ? <><Spinner /> Loading...</> : "Go to Dashboard"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigateTo("/sign-in", "nav-signin")}
                disabled={loadingBtn === "nav-signin"}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 10,
                  padding: "12px 24px",
                  color: "#8fa3bf",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loadingBtn === "nav-signin" ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: loadingBtn === "nav-signin" ? 0.7 : 1,
                }}
                className="nav-signin"
              >
                {loadingBtn === "nav-signin" ? <><Spinner /> Loading...</> : "Sign In"}
              </button>
              <button
                onClick={() => navigateTo("/dashboard", "nav-getstarted")}
                disabled={loadingBtn === "nav-getstarted"}
                style={{
                  background: "linear-gradient(135deg, #2c6bed 0%, #1e4fc2 100%)",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 24px",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loadingBtn === "nav-getstarted" ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(44, 107, 237, 0.3)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: loadingBtn === "nav-getstarted" ? 0.8 : 1,
                }}
                className="nav-cta"
              >
                {loadingBtn === "nav-getstarted" ? <><Spinner /> Loading...</> : "Get Started"}
              </button>
            </>
          )}
        </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section" style={{ padding: "80px 40px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 60,
            alignItems: "center",
          }}
          className="hero-grid"
        >
          {/* Left Side - Hero Text */}
          <div className="hero-left">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(34, 197, 94, 0.15)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                borderRadius: 100,
                padding: "8px 16px",
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#22c55e",
                  animation: "pulse-dot 2s ease-in-out infinite",
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#22c55e" }}>
                Built for Your Niche
              </span>
            </div>

            <h1
              style={{
                fontSize: 56,
                fontWeight: 800,
                lineHeight: 1.1,
                marginBottom: 24,
                paddingBottom: 8,
              }}
            >
              <span
                style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #e6edf7 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Social Media
                <br />
                Built for
                <br />
              </span>
              <span
                style={{
                  background: "linear-gradient(135deg, #7eb3ff 0%, #2c6bed 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Your Business
              </span>
            </h1>

            <p
              style={{
                fontSize: 18,
                lineHeight: 1.7,
                opacity: 0.8,
                marginBottom: 32,
                maxWidth: 500,
              }}
            >
              Your business already demands everything you&apos;ve got. Stop
              spending your evenings writing captions and wondering what to
              post. Generate niche-specific content — promotions, updates,
              client stories — in seconds and reclaim your time.
            </p>

            {/* Feature Pills */}
            <div
              className="hero-feature-pills"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 40,
              }}
            >
              {[
                { icon: "🖼️", text: "AI Image Generation" },
                { icon: "✍️", text: "Smart Captions" },
                { icon: "#️⃣", text: "Optimized Hashtags" },
                { icon: "🎨", text: "Brand Matching" },
              ].map((feature, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(44, 107, 237, 0.1)",
                    border: "1px solid rgba(44, 107, 237, 0.2)",
                    borderRadius: 100,
                    padding: "10px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <span>{feature.icon}</span>
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="hero-cta-row" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <button
                onClick={() => navigateTo("/dashboard", "hero-cta")}
                disabled={loadingBtn === "hero-cta"}
                style={{
                  background: "linear-gradient(135deg, #2c6bed 0%, #1e4fc2 100%)",
                  border: "none",
                  borderRadius: 14,
                  padding: "18px 36px",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: loadingBtn === "hero-cta" ? "not-allowed" : "pointer",
                  boxShadow: "0 8px 32px rgba(44, 107, 237, 0.4)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  opacity: loadingBtn === "hero-cta" ? 0.85 : 1,
                }}
                className="hero-cta-primary"
              >
                {loadingBtn === "hero-cta"
                  ? <><Spinner /> Loading...</>
                  : (isSignedIn ? "Go to Dashboard →" : "Start Creating Free →")}
              </button>
            </div>
          </div>

          {/* Right Side - Animated Demo */}
          <div
            id="demo-section"
            style={{
              position: "relative",
            }}
          >
            {/* Glow Effect */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "120%",
                height: "120%",
                background:
                  "radial-gradient(circle, rgba(44, 107, 237, 0.15) 0%, transparent 60%)",
                pointerEvents: "none",
              }}
            />

            {/* Phone/App Frame */}
            <div
              style={{
                background: "#0b1220",
                borderRadius: 24,
                padding: 20,
                border: "2px solid rgba(255,255,255,0.1)",
                boxShadow:
                  "0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(44, 107, 237, 0.15)",
                maxWidth: 360,
                margin: "0 auto",
                position: "relative",
                overflow: "visible",
              }}
              className="demo-phone-frame"
              ref={demoPhoneRef}
            >
              {/* App Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 20,
                  paddingBottom: 16,
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <img src="/logo-icon.png" alt="AI Social Helper" style={{ width: 40, height: 40, objectFit: "contain" }} />
                <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.9 }}>
                  AI Social Helper
                </span>
                <div
                  style={{
                    marginLeft: "auto",
                    background: "rgba(34, 197, 94, 0.2)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    borderRadius: 100,
                    padding: "4px 10px",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#22c55e",
                  }}
                >
                  LIVE DEMO
                </div>
              </div>

              {/* Image Area */}
              <div
                style={{
                  aspectRatio: "1",
                  borderRadius: 14,
                  marginBottom: 16,
                  position: "relative",
                  overflow: "hidden",
                  background: "#151f32",
                }}
              >
                {/* Placeholder state */}
                {(demoPhase === "idle" ||
                  demoPhase === "cursor-moving" ||
                  demoPhase === "cursor-click") && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <svg
                      width="56"
                      height="56"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    <span style={{ fontSize: 12, opacity: 0.4 }}>
                      Your image here
                    </span>
                  </div>
                )}

                {/* Loading spinner */}
                {demoPhase === "loading" && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#151f32",
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        border: "3px solid rgba(44, 107, 237, 0.2)",
                        borderTopColor: "#2c6bed",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                  </div>
                )}

                {/* Generated image - real photo */}
                {(demoPhase === "image" ||
                  demoPhase === "caption" ||
                  demoPhase === "hashtags" ||
                  demoPhase === "hold") && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      animation: "fadeIn 0.5s ease",
                    }}
                  >
                    <img
                      src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=400&fit=crop&q=80"
                      alt="Luxury home exterior"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center 60%",
                      }}
                    />
                    {/* Brand color overlay */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(135deg, rgba(44,107,237,0.18) 0%, rgba(124,58,237,0.12) 100%)",
                      }}
                    />
                    {/* Bottom gradient for text */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(0deg, rgba(6,10,20,0.88) 0%, rgba(6,10,20,0.35) 55%, transparent 100%)",
                      }}
                    />
                    {/* Branded text overlay */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: "16px 14px 14px",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-block",
                          background: "rgba(44,107,237,0.95)",
                          borderRadius: 6,
                          padding: "3px 8px",
                          fontSize: 9,
                          fontWeight: 700,
                          color: "#fff",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase" as const,
                          marginBottom: 7,
                        }}
                      >
                        Market Insight
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#fff",
                          lineHeight: 1.35,
                        }}
                      >
                        Rates are shifting. Here&apos;s what every buyer needs to know right now.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Caption Area */}
              <div style={{ marginBottom: 12, minHeight: 60 }}>
                {(demoPhase === "caption" ||
                  demoPhase === "hashtags" ||
                  demoPhase === "hold") && (
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "#e6edf7",
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                    }}
                  >
                    {demoCaption}
                    {demoPhase === "caption" &&
                      demoCaption.length < fullCaption.length && (
                        <span
                          style={{
                            display: "inline-block",
                            width: 2,
                            height: 16,
                            background: "#2c6bed",
                            marginLeft: 2,
                            verticalAlign: "middle",
                            animation: "blink 0.5s step-end infinite",
                          }}
                        />
                      )}
                  </div>
                )}
              </div>

              {/* Hashtags */}
              <div style={{ minHeight: 40 }}>
                {(demoPhase === "hashtags" || demoPhase === "hold") && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#7eb3ff",
                      lineHeight: 1.6,
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                    }}
                  >
                    {demoHashtags}
                    {demoPhase === "hashtags" &&
                      demoHashtags.length < fullHashtags.length && (
                        <span
                          style={{
                            display: "inline-block",
                            width: 2,
                            height: 14,
                            background: "#7eb3ff",
                            marginLeft: 2,
                            verticalAlign: "middle",
                            animation: "blink 0.5s step-end infinite",
                          }}
                        />
                      )}
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                ref={demoBtnRef}
                className="demo-generate-btn"
                style={{
                  width: "100%",
                  marginTop: 20,
                  background:
                    demoPhase === "cursor-click"
                      ? "linear-gradient(135deg, #1e4fc2 0%, #1a3fa0 100%)"
                      : "linear-gradient(135deg, #2c6bed 0%, #1e4fc2 100%)",
                  border: "none",
                  borderRadius: 12,
                  padding: "14px 18px",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "default",
                  transition: "all 0.15s ease",
                  transform:
                    demoPhase === "cursor-click" ? "scale(0.97)" : "scale(1)",
                  boxShadow:
                    demoPhase === "cursor-click"
                      ? "0 2px 8px rgba(44, 107, 237, 0.3)"
                      : "0 4px 12px rgba(44, 107, 237, 0.3)",
                }}
              >
                Generate Post ✨
              </button>

              {/* Animated Cursor */}
              {(demoPhase === "idle" ||
                demoPhase === "cursor-moving" ||
                demoPhase === "cursor-click") && (
                <div
                  style={{
                    position: "absolute",
                    left: cursorPosition.x,
                    top: cursorPosition.y,
                    width: 32,
                    height: 32,
                    pointerEvents: "none",
                    zIndex: 20,
                    transition:
                      demoPhase === "idle"
                        ? "none"
                        : "left 1s cubic-bezier(0.4, 0, 0.2, 1), top 1s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s ease",
                    transform:
                      demoPhase === "cursor-click" ? "scale(0.8)" : "scale(1)",
                    opacity: demoPhase === "idle" ? 0 : 1,
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="#fff"
                    style={{
                      filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85a.5.5 0 0 0-.85.36z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Posting Calendar Section */}
      <section
        className="calendar-niche-section"
        style={{
          padding: "80px 40px",
          background:
            "linear-gradient(180deg, transparent 0%, rgba(124, 58, 237, 0.06) 50%, transparent 100%)",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 64,
              alignItems: "center",
            }}
            className="calendar-section-grid"
          >
            {/* Left: Text */}
            <div className="calendar-text-col">
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(124, 58, 237, 0.15)",
                  border: "1px solid rgba(124, 58, 237, 0.3)",
                  borderRadius: 100,
                  padding: "8px 16px",
                  marginBottom: 24,
                }}
              >
                <span style={{ fontSize: 14 }}>🗓️</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa" }}>
                  Example: Real Estate Agents
                </span>
              </div>

              <h2
                style={{
                  fontSize: 40,
                  fontWeight: 800,
                  lineHeight: 1.2,
                  marginBottom: 20,
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #e6edf7 60%, #c4b5fd 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                A 5-Pillar Weekly Plan Built for Your Niche
              </h2>

              <p
                style={{
                  fontSize: 16,
                  lineHeight: 1.75,
                  opacity: 0.75,
                  marginBottom: 32,
                  maxWidth: 460,
                }}
              >
                No more guessing what to post. AI Social Helper generates a
                complete 5-day content plan built around how top professionals grow on
                social — authority, showcase, education, social proof,
                and community. Here&apos;s an example for real estate agents:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  {
                    icon: "📊",
                    label: "Monday — Market Authority",
                    desc: "Interest rates, inventory trends, buyer & seller insights",
                  },
                  {
                    icon: "🏡",
                    label: "Tuesday — Active Listings",
                    desc: "Showcase properties and drive showing requests",
                  },
                  {
                    icon: "💡",
                    label: "Wednesday — Education",
                    desc: "Buyer tips, seller strategies, mortgage FAQs",
                  },
                  {
                    icon: "⭐",
                    label: "Thursday — Social Proof",
                    desc: "Client wins, closed escrows, testimonials",
                  },
                ].map((niche, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "12px 16px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12,
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{niche.icon}</span>
                    <div>
                      <div
                        style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}
                      >
                        {niche.label}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.5 }}>
                        {niche.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Calendar Visual */}
            <div style={{ position: "relative" }}>
              {/* Glow */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "110%",
                  height: "110%",
                  background:
                    "radial-gradient(circle, rgba(124, 58, 237, 0.18) 0%, transparent 65%)",
                  pointerEvents: "none",
                }}
              />

              {/* Calendar Card */}
              <div
                style={{
                  background: "#0b1220",
                  borderRadius: 24,
                  padding: 28,
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow:
                    "0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(124, 58, 237, 0.12)",
                  position: "relative",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 22,
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}
                    >
                      March 2026
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.4, fontWeight: 500 }}>
                      Weekly Content Plan
                    </div>
                  </div>
                  <div
                    style={{
                      background: "rgba(124, 58, 237, 0.2)",
                      border: "1px solid rgba(124, 58, 237, 0.4)",
                      borderRadius: 100,
                      padding: "5px 12px",
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#c4b5fd",
                      letterSpacing: "0.06em",
                    }}
                  >
                    REALTOR EXAMPLE
                  </div>
                </div>

                {/* Day headers */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  {["MON", "TUE", "WED", "THU", "FRI"].map((day) => (
                    <div
                      key={day}
                      style={{
                        textAlign: "center",
                        fontSize: 9,
                        fontWeight: 700,
                        opacity: 0.4,
                        letterSpacing: "0.08em",
                        paddingBottom: 4,
                      }}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Date row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  {[3, 4, 5, 6, 7].map((date) => (
                    <div
                      key={date}
                      style={{
                        textAlign: "center",
                        fontSize: 12,
                        fontWeight: 600,
                        color: date === 3 ? "#7eb3ff" : "#e6edf7",
                        opacity: date === 3 ? 1 : 0.55,
                      }}
                    >
                      {date}
                    </div>
                  ))}
                </div>

                {/* Post cards — week 1 */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 8,
                  }}
                >
                  {[
                    {
                      icon: "📊",
                      type: "Market Update",
                      snippet: "Home prices up 3.2% this month",
                      color: "#2c6bed",
                      bg: "rgba(44,107,237,0.13)",
                    },
                    {
                      icon: "🏡",
                      type: "New Listing",
                      snippet: "4 bed · 3 bath · Chef's kitchen",
                      color: "#22c55e",
                      bg: "rgba(34,197,94,0.13)",
                    },
                    {
                      icon: "💡",
                      type: "Buyer Tip",
                      snippet: "5 things to check at every showing",
                      color: "#f59e0b",
                      bg: "rgba(245,158,11,0.13)",
                    },
                    {
                      icon: "⭐",
                      type: "Client Story",
                      snippet: "The Johnsons found their dream home",
                      color: "#ec4899",
                      bg: "rgba(236,72,153,0.13)",
                    },
                    {
                      icon: "🚪",
                      type: "Open House",
                      snippet: "Sunday 1–4pm · Don't miss this",
                      color: "#06b6d4",
                      bg: "rgba(6,182,212,0.13)",
                    },
                  ].map((post, i) => (
                    <div
                      key={i}
                      style={{
                        background: post.bg,
                        border: `1px solid ${post.color}40`,
                        borderRadius: 12,
                        padding: "10px 6px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                      }}
                    >
                      <div style={{ fontSize: 18, textAlign: "center" }}>
                        {post.icon}
                      </div>
                      <div
                        style={{
                          fontSize: 8,
                          fontWeight: 800,
                          textAlign: "center",
                          color: post.color,
                          letterSpacing: "0.04em",
                          lineHeight: 1.3,
                          textTransform: "uppercase",
                        }}
                      >
                        {post.type}
                      </div>
                      <div
                        style={{
                          fontSize: 8,
                          opacity: 0.5,
                          textAlign: "center",
                          lineHeight: 1.4,
                        }}
                      >
                        {post.snippet}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Week 2 — faded preview */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 8,
                    marginTop: 8,
                    opacity: 0.28,
                  }}
                >
                  {[
                    { color: "#2c6bed", bg: "rgba(44,107,237,0.1)" },
                    { color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
                    { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
                    { color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
                    { color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
                  ].map((post, i) => (
                    <div
                      key={i}
                      style={{
                        background: post.bg,
                        border: `1px solid ${post.color}25`,
                        borderRadius: 12,
                        height: 52,
                      }}
                    />
                  ))}
                </div>

                {/* Footer */}
                <div
                  style={{
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: "1px solid rgba(255,255,255,0.07)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: 11, opacity: 0.4 }}>
                    Auto-generated for your niche
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[
                      "#2c6bed",
                      "#22c55e",
                      "#f59e0b",
                      "#ec4899",
                      "#06b6d4",
                    ].map((c, i) => (
                      <div
                        key={i}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: c,
                          opacity: 0.7,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        style={{
          background:
            "linear-gradient(180deg, rgba(44, 107, 237, 0.05) 0%, transparent 100%)",
          padding: "80px 40px",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>

          {/* Section Header */}
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2
              style={{
                fontSize: 36,
                fontWeight: 800,
                marginBottom: 16,
                background: "linear-gradient(135deg, #ffffff 0%, #e6edf7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Everything You Need to Win on Social
            </h2>
            <p
              style={{
                fontSize: 16,
                opacity: 0.7,
                maxWidth: 580,
                margin: "0 auto",
                lineHeight: 1.7,
              }}
            >
              Stop losing evenings to content creation. Get a full week of
              posts done in minutes — so you can focus on what
              actually matters.
            </p>
          </div>

          {/* Contractor Image Banner */}
          <div
            className="image-banner-wrapper"
            style={{
              position: "relative",
              borderRadius: 24,
              overflow: "hidden",
              marginBottom: 56,
              height: 420,
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1280&h=420&fit=crop&q=80"
              alt="Contractor using AI Social Helper"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center 30%",
              }}
            />
            {/* Dark gradient overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(6,10,20,0.85) 0%, rgba(6,10,20,0.4) 55%, rgba(6,10,20,0.15) 100%)",
              }}
            />
            {/* Left text content */}
            <div
              className="banner-text-left"
              style={{
                position: "absolute",
                left: 48,
                top: "50%",
                transform: "translateY(-50%)",
                maxWidth: 480,
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(44, 107, 237, 0.25)",
                  border: "1px solid rgba(44, 107, 237, 0.5)",
                  borderRadius: 100,
                  padding: "6px 14px",
                  marginBottom: 20,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: "#7eb3ff", letterSpacing: "0.06em" }}>
                  BUILT FOR YOUR NICHE
                </span>
              </div>
              <p
                className="banner-quote-text"
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  lineHeight: 1.45,
                  color: "#ffffff",
                  marginBottom: 20,
                }}
              >
                You didn&apos;t start your business to spend your nights
                writing captions. AI Social Helper gives you a full week
                of content in minutes — so you can get back to
                doing what you love.
              </p>
              <div className="banner-author-row" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #2c6bed, #7c3aed)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  ✦
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                    AI Social Helper
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6, color: "#e6edf7" }}>
                    AI social media for your niche
                  </div>
                </div>
              </div>
            </div>

            {/* Right floating stat cards */}
            <div
              style={{
                position: "absolute",
                right: 48,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
              className="banner-stats"
            >
              {[
                { value: "5×", label: "More posts per week" },
                { value: "10 min", label: "Full week of content" },
                { value: "100%", label: "Niche-specific copy" },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(11,18,32,0.85)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 14,
                    padding: "14px 20px",
                    backdropFilter: "blur(10px)",
                    minWidth: 160,
                  }}
                >
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      background: "linear-gradient(135deg, #7eb3ff 0%, #2c6bed 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      lineHeight: 1.1,
                      marginBottom: 4,
                    }}
                  >
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Cards Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
            }}
            className="features-grid"
          >
            {[
              {
                icon: "⚡",
                title: "Content Ready in Seconds",
                desc: "Turn any promotion, update, or client win into a compelling social post — caption, hashtags, and image ready to publish.",
                color: "#2c6bed",
              },
              {
                icon: "📊",
                title: "Authority Content",
                desc: "Position yourself as the go-to expert in your industry with educational posts that build trust and attract your ideal clients.",
                color: "#7c3aed",
              },
              {
                icon: "🗓️",
                title: "Smart Content Calendar",
                desc: "A structured 5-day posting plan built for your niche. Authority, showcase, tips, stories, and community — done for you.",
                color: "#ec4899",
              },
              {
                icon: "🎨",
                title: "Brand Profiles",
                desc: "Your colors, tone, and style saved once. Every post looks like you — consistent and professional.",
                color: "#22c55e",
              },
              {
                icon: "✍️",
                title: "Captions & Hashtags",
                desc: "Niche-specific copy and optimized hashtags generated instantly. No more blank screen at the end of a long, busy day.",
                color: "#f59e0b",
              },
              {
                icon: "🕐",
                title: "Reclaim Your Evenings",
                desc: "Top creators post 5× a week without spending hours on content. Set up once, generate in seconds, get back to what you do best.",
                color: "#06b6d4",
              },
            ].map((feature, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 20,
                  padding: 28,
                  transition: "all 0.3s ease",
                }}
                className="feature-card"
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: `${feature.color}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    marginBottom: 20,
                  }}
                >
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: 14, opacity: 0.7, lineHeight: 1.6 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="cta-section"
        style={{
          padding: "80px 40px",
          textAlign: "center",
        }}
      >
        <div
          className="cta-box"
          style={{
            maxWidth: 800,
            margin: "0 auto",
            background:
              "linear-gradient(135deg, rgba(44, 107, 237, 0.15) 0%, rgba(124, 58, 237, 0.1) 100%)",
            border: "1px solid rgba(44, 107, 237, 0.25)",
            borderRadius: 32,
            padding: "60px 40px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Glow */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "80%",
              height: "2px",
              background:
                "linear-gradient(90deg, transparent, #2c6bed, transparent)",
            }}
          />

          <h2
            style={{
              fontSize: 40,
              fontWeight: 800,
              marginBottom: 20,
              background: "linear-gradient(135deg, #ffffff 0%, #7eb3ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Ready to Get Your Time Back?
          </h2>
          <p
            style={{
              fontSize: 18,
              opacity: 0.8,
              marginBottom: 32,
              maxWidth: 500,
              margin: "0 auto 32px",
            }}
          >
            Top agents post 5x a week without spending hours on content.
            Set up your brand profile once, generate in seconds.
          </p>
          <div
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {isSignedIn ? (
              <button
                onClick={() => navigateTo("/dashboard", "final-dashboard")}
                disabled={loadingBtn === "final-dashboard"}
                style={{
                  background: "linear-gradient(135deg, #2c6bed 0%, #1e4fc2 100%)",
                  border: "none",
                  borderRadius: 14,
                  padding: "20px 48px",
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: loadingBtn === "final-dashboard" ? "not-allowed" : "pointer",
                  boxShadow: "0 8px 32px rgba(44, 107, 237, 0.5)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  opacity: loadingBtn === "final-dashboard" ? 0.85 : 1,
                }}
                className="final-cta"
              >
                {loadingBtn === "final-dashboard" ? <><Spinner /> Loading...</> : "Go to Dashboard →"}
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigateTo("/sign-in", "final-signin")}
                  disabled={loadingBtn === "final-signin"}
                  style={{
                    background: "transparent",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderRadius: 14,
                    padding: "20px 48px",
                    color: "#8fa3bf",
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: loadingBtn === "final-signin" ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    opacity: loadingBtn === "final-signin" ? 0.7 : 1,
                  }}
                  className="final-signin"
                >
                  {loadingBtn === "final-signin" ? <><Spinner /> Loading...</> : "Sign In"}
                </button>
                <button
                  onClick={() => navigateTo("/dashboard", "final-getstarted")}
                  disabled={loadingBtn === "final-getstarted"}
                  style={{
                    background: "linear-gradient(135deg, #2c6bed 0%, #1e4fc2 100%)",
                    border: "none",
                    borderRadius: 14,
                    padding: "20px 48px",
                    color: "#fff",
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: loadingBtn === "final-getstarted" ? "not-allowed" : "pointer",
                    boxShadow: "0 8px 32px rgba(44, 107, 237, 0.5)",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    opacity: loadingBtn === "final-getstarted" ? 0.85 : 1,
                  }}
                  className="final-cta"
                >
                  {loadingBtn === "final-getstarted" ? <><Spinner /> Loading...</> : "Get Started Free →"}
                </button>
              </>
            )}
          </div>
          <p style={{ fontSize: 13, opacity: 0.5, marginTop: 16 }}>
            {isSignedIn ? "Welcome back! Your dashboard is ready." : "No credit card required"}
          </p>
        </div>
      </section>


      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .nav-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(44, 107, 237, 0.4);
        }

        .hero-cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(44, 107, 237, 0.5);
        }

        .hero-cta-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .feature-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-4px);
        }

        .final-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(44, 107, 237, 0.6);
        }

        @media (max-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
            text-align: center;
          }
          .calendar-section-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
          .calendar-section-grid > div:first-child {
            text-align: center;
          }
          .calendar-section-grid > div:first-child p {
            margin-left: auto;
            margin-right: auto;
          }
          .hero-grid > div:first-child {
            order: 1;
          }
          .hero-grid > div:last-child {
            order: 0;
          }
          .hero-grid p {
            margin-left: auto;
            margin-right: auto;
          }
        }

        @media (max-width: 900px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (max-width: 600px) {
          .landing-nav {
            padding: 12px 10px !important;
            gap: 8px;
          }
          .nav-brand-text {
            display: none !important;
          }
          .nav-cta {
            padding: 10px 16px !important;
            font-size: 13px !important;
          }
          .features-grid {
            grid-template-columns: 1fr !important;
          }
          .demo-phone-frame {
            max-width: 300px !important;
          }
          .nav-user-name {
            display: none !important;
          }
          
          /* Mobile center alignment */
          @media (max-width: 768px) {
            .landing-container {
              text-align: center !important;
              padding: 10px !important;
            }
            .landing-section {
              text-align: center !important;
              align-items: center !important;
            }
            .landing-content {
              text-align: center !important;
              margin: 0 auto !important;
            }
          }
        }
      `}</style>
    </div>
  );
}
