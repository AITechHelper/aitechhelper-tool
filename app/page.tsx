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
  const menuRef = useRef<HTMLDivElement>(null);

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
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
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
  const fullCaption =
    "Start your week right! Nothing beats Monday morning at your neighborhood spot.";
  const fullHashtags =
    "#LocalBusiness #CoffeeShop #SmallBizLove #CommunityFirst #ShopLocal";

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
          // Animate cursor movement to button center
          setCursorPosition({ x: 130, y: 560 });
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
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 40px",
          maxWidth: 1400,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            ⚡
          </div>
          <span style={{ fontSize: 18, fontWeight: 800 }}>AI Tech Helper</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {isSignedIn ? (
            <>
              <button
                onClick={() => router.push("/dashboard")}
                style={{
                  background: "linear-gradient(135deg, #2c6bed 0%, #1e4fc2 100%)",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 24px",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(44, 107, 237, 0.3)",
                  transition: "all 0.2s ease",
                }}
                className="nav-cta"
              >
                Go to Dashboard
              </button>
              <div ref={menuRef} style={{ position: "relative" }}>
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
                      right: 0,
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
            </>
          ) : (
            <>
              <button
                onClick={() => router.push("/sign-in")}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 10,
                  padding: "12px 24px",
                  color: "#8fa3bf",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                className="nav-signin"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                style={{
                  background: "linear-gradient(135deg, #2c6bed 0%, #1e4fc2 100%)",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 24px",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(44, 107, 237, 0.3)",
                  transition: "all 0.2s ease",
                }}
                className="nav-cta"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "80px 40px 80px",
        }}
      >
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
          <div>
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
                AI-Powered Content Creation
              </span>
            </div>

            <h1
              style={{
                fontSize: 56,
                fontWeight: 800,
                lineHeight: 1.1,
                marginBottom: 24,
                background:
                  "linear-gradient(135deg, #ffffff 0%, #e6edf7 50%, #7eb3ff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Your AI
              <br />
              Social Media
              <br />
              Manager
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
              Stop spending hours on social media content. Generate stunning
              branded posts, engaging captions, and perfect hashtags in seconds
              with the power of AI.
            </p>

            {/* Feature Pills */}
            <div
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
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <button
                onClick={() => router.push("/dashboard")}
                style={{
                  background:
                    "linear-gradient(135deg, #2c6bed 0%, #1e4fc2 100%)",
                  border: "none",
                  borderRadius: 14,
                  padding: "18px 36px",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 8px 32px rgba(44, 107, 237, 0.4)",
                  transition: "all 0.2s ease",
                }}
                className="hero-cta-primary"
              >
                {isSignedIn ? "Go to Dashboard →" : "Start Creating Free →"}
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
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background:
                      "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  ⚡
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.9 }}>
                  AI Tech Helper
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
                      src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop&q=80"
                      alt="Coffee shop"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    {/* Warm overlay effect */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.3) 100%)",
                      }}
                    />
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
      </section>

      {/* Features Section */}
      <section
        style={{
          background:
            "linear-gradient(180deg, rgba(44, 107, 237, 0.05) 0%, transparent 100%)",
          padding: "80px 40px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2
              style={{
                fontSize: 36,
                fontWeight: 800,
                marginBottom: 16,
              }}
            >
              Everything You Need to Dominate Social Media
            </h2>
            <p
              style={{
                fontSize: 16,
                opacity: 0.7,
                maxWidth: 600,
                margin: "0 auto",
              }}
            >
              Create professional content that converts, without the
              professional price tag
            </p>
          </div>

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
                icon: "🖼️",
                title: "AI Image Generation",
                desc: "Generate stunning, on-brand images tailored to your business in seconds",
                color: "#2c6bed",
              },
              {
                icon: "✍️",
                title: "Smart Captions",
                desc: "AI writes engaging captions that match your brand voice and resonate with your audience",
                color: "#7c3aed",
              },
              {
                icon: "#️⃣",
                title: "Optimized Hashtags",
                desc: "Get relevant hashtags that increase reach and engagement automatically",
                color: "#ec4899",
              },
              {
                icon: "🎨",
                title: "Brand Profiles",
                desc: "Save your brand colors, tone, and style for consistent content every time",
                color: "#22c55e",
              },
              {
                icon: "📅",
                title: "Content Calendar",
                desc: "Plan and schedule your posts to stay consistent and organized",
                color: "#f59e0b",
              },
              {
                icon: "⚡",
                title: "Instant Results",
                desc: "No more staring at a blank screen. Get professional posts in under 30 seconds",
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
        style={{
          padding: "80px 40px",
          textAlign: "center",
        }}
      >
        <div
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
            Ready to Transform Your Social Media?
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
            Join thousands of businesses creating stunning content in seconds.
            No design skills required.
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
                onClick={() => router.push("/dashboard")}
                style={{
                  background: "linear-gradient(135deg, #2c6bed 0%, #1e4fc2 100%)",
                  border: "none",
                  borderRadius: 14,
                  padding: "20px 48px",
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 8px 32px rgba(44, 107, 237, 0.5)",
                  transition: "all 0.2s ease",
                }}
                className="final-cta"
              >
                Go to Dashboard →
              </button>
            ) : (
              <>
                <button
                  onClick={() => router.push("/sign-in")}
                  style={{
                    background: "transparent",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderRadius: 14,
                    padding: "20px 48px",
                    color: "#8fa3bf",
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  className="final-signin"
                >
                  Sign In
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  style={{
                    background: "linear-gradient(135deg, #2c6bed 0%, #1e4fc2 100%)",
                    border: "none",
                    borderRadius: 14,
                    padding: "20px 48px",
                    color: "#fff",
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 8px 32px rgba(44, 107, 237, 0.5)",
                    transition: "all 0.2s ease",
                  }}
                  className="final-cta"
                >
                  Get Started Free →
                </button>
              </>
            )}
          </div>
          <p style={{ fontSize: 13, opacity: 0.5, marginTop: 16 }}>
            {isSignedIn ? "Welcome back! Your dashboard is ready." : "No credit card required"}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "40px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            ⚡
          </div>
          <span style={{ fontSize: 16, fontWeight: 700 }}>AI Tech Helper</span>
        </div>
        <p style={{ fontSize: 13, opacity: 0.5 }}>
          © 2025 AI Tech Helper. All rights reserved.
        </p>
      </footer>

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
              padding: 20px !important;
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
