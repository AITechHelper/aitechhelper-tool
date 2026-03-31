"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useBrandProfiles } from "../lib/useBrandProfiles";
import { useInstagram } from "../lib/useInstagram";
import { useFacebook } from "../lib/useFacebook";
import { useToast } from "../_components/ToastProvider";
import { useTokenBalance } from "../lib/useTokenBalance";
import OutOfTokensModal from "../_components/OutOfTokensModal";

type AspectRatio  = "9:16" | "1:1" | "16:9";
type Mood         = "cinematic" | "bright-airy" | "high-energy" | "luxury";
type CaptionLen   = "Short" | "Medium" | "Long";
type VideoState   = "idle" | "generating" | "completed" | "failed";

const FORMAT_OPTIONS: { ratio: AspectRatio; label: string; sublabel: string; recommended?: boolean }[] = [
  { ratio: "9:16",  label: "9:16 Reels",     sublabel: "Instagram & TikTok", recommended: true },
  { ratio: "1:1",   label: "1:1 Square",     sublabel: "Instagram Feed"                        },
  { ratio: "16:9",  label: "16:9 Landscape", sublabel: "Facebook & YouTube"                    },
];

const MOOD_OPTIONS: { value: Mood; emoji: string; label: string; description: string }[] = [
  { value: "cinematic",   emoji: "🎬", label: "Cinematic",     description: "Dramatic, moody, film-like"  },
  { value: "bright-airy", emoji: "☀️", label: "Bright & Airy", description: "Clean, lifestyle, natural"   },
  { value: "high-energy", emoji: "⚡", label: "High Energy",   description: "Dynamic, bold, fast motion"  },
  { value: "luxury",      emoji: "💎", label: "Luxury",        description: "Elegant, rich, slow reveal"  },
];

const TONE_OPTIONS = [
  "Confident", "Friendly", "Professional", "Luxury",
  "Bold", "Inspirational", "Energetic", "Warm",
];

const CAPTION_LENGTH_OPTIONS: { value: CaptionLen; label: string; sub: string }[] = [
  { value: "Short",  label: "Short",  sub: "~160 chars" },
  { value: "Medium", label: "Medium", sub: "~240 chars" },
  { value: "Long",   label: "Long",   sub: "~360 chars" },
];

const HASHTAG_COUNTS = [0, 5, 10, 15, 20, 30];

const G1 = "#10b981";
const G2 = "#059669";
const TOTAL_STEPS = 4;

export default function GenerateVideoPage() {
  const router       = useRouter();
  const { addToast } = useToast();
  const { profiles, activeProfileId } = useBrandProfiles();
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;
  const instagram     = useInstagram();
  const facebook      = useFacebook();

  const tokenBalance = useTokenBalance();
  const [showOutOfTokens, setShowOutOfTokens] = useState(false);

  // Step state
  const [currentStep,    setCurrentStep]    = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");

  // Form state
  const [niche,         setNiche]         = useState("");
  const [audience,      setAudience]      = useState("");
  const [topic,         setTopic]         = useState("");
  const [aspectRatio,   setAspectRatio]   = useState<AspectRatio>("9:16");
  const [mood,          setMood]          = useState<Mood>("cinematic");
  const [tone,          setTone]          = useState("Confident");
  const [captionLength, setCaptionLength] = useState<CaptionLen>("Medium");
  const [hashtagCount,  setHashtagCount]  = useState(12);

  // Result state
  const [videoState,     setVideoState]     = useState<VideoState>("idle");
  const [videoUrl,       setVideoUrl]       = useState<string | null>(null);
  const [enrichedPrompt, setEnrichedPrompt] = useState<string | null>(null);
  const [caption,        setCaption]        = useState<string | null>(null);
  const [hashtags,       setHashtags]       = useState<string | null>(null);
  const [errorMsg,       setErrorMsg]       = useState<string | null>(null);

  // Post state
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [igPublished,    setIgPublished]    = useState(false);
  const [fbPublished,    setFbPublished]    = useState(false);
  const [igPosting,      setIgPosting]      = useState(false);
  const [fbPosting,      setFbPosting]      = useState(false);

  // Copy state
  const [captionCopied,  setCaptionCopied]  = useState(false);
  const [hashtagsCopied, setHashtagsCopied] = useState(false);

  const pollIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const generationIdRef  = useRef<string | null>(null);
  const tempBlobUrlRef   = useRef<string | null>(null);

  useEffect(() => {
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  useEffect(() => {
    if (activeProfile?.niche)    setNiche(activeProfile.niche);
    if (activeProfile?.audience) setAudience(activeProfile.audience);
    if (activeProfile?.tone)     setTone(activeProfile.tone);
  }, [activeProfile?.niche, activeProfile?.audience, activeProfile?.tone]);

  function goNext() {
    if (currentStep < TOTAL_STEPS - 1) {
      setSlideDirection("right");
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goBack() {
    if (currentStep > 0) {
      setSlideDirection("left");
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleGenerate() {
    if (!topic.trim()) { addToast("Please describe what your video is about.", "error"); return; }
    if (!hasTokens) { setShowOutOfTokens(true); return; }

    setVideoState("generating");
    setVideoUrl(null);
    setEnrichedPrompt(null);
    setCaption(null);
    setHashtags(null);
    setErrorMsg(null);
    setSavedToLibrary(false);
    setIgPublished(false);
    setFbPublished(false);

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: topic,
          aspectRatio,
          mood,
          tone,
          captionLength,
          hashtagCount,
          brandContext: {
            niche:          niche,
            audience:       audience,
            tone:           tone,
            name:           activeProfile?.name ?? "",
            website:        (activeProfile as any)?.website ?? "",
            primaryColor:   (activeProfile as any)?.primaryColor ?? "",
            secondaryColor: (activeProfile as any)?.secondaryColor ?? "",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start video generation");

      generationIdRef.current = data.generationId;
      tempBlobUrlRef.current  = data.tempBlobUrl ?? null;
      if (data.enrichedPrompt) setEnrichedPrompt(data.enrichedPrompt);
      if (data.caption)        setCaption(data.caption);
      if (data.hashtags)       setHashtags(data.hashtags);

      pollIntervalRef.current = setInterval(pollStatus, 5000);
    } catch (err: any) {
      setVideoState("failed");
      setErrorMsg(err.message ?? "Something went wrong");
    }
  }

  async function pollStatus() {
    const id = generationIdRef.current;
    if (!id) return;
    const q = tempBlobUrlRef.current ? `&tempBlobUrl=${encodeURIComponent(tempBlobUrlRef.current)}` : "";
    try {
      const res  = await fetch(`/api/video-status/${id}?${q}`);
      const data = await res.json();
      if (data.status === "completed") {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setVideoUrl(data.videoUrl);
        setVideoState("completed");
      } else if (data.status === "failed") {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setVideoState("failed");
        setErrorMsg(data.reason ?? "Video generation failed");
      }
    } catch { /* network hiccup — keep polling */ }
  }

  function buildFullCaption() {
    const parts: string[] = [];
    if (caption)  parts.push(caption);
    if (hashtags) parts.push(hashtags);
    return parts.join("\n\n");
  }

  async function copyText(text: string, onDone: () => void) {
    try {
      await navigator.clipboard.writeText(text);
      onDone();
      setTimeout(onDone, 2000);
    } catch { addToast("Could not copy to clipboard", "error"); }
  }

  async function handleSaveToLibrary() {
    if (!videoUrl) return;
    try {
      const res = await fetch("/api/media-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetType: "video", videoUrl, aspectRatio, name: topic.slice(0, 60) || "AI Video" }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSavedToLibrary(true);
      addToast("Video saved to your library!", "success");
    } catch { addToast("Could not save to library", "error"); }
  }

  async function handlePostInstagram() {
    if (!videoUrl) return;
    setIgPosting(true);
    try {
      const res  = await fetch("/api/instagram/publish-reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, caption: buildFullCaption() || topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIgPublished(true);
      addToast(data.message ?? "Posted to Instagram Reels!", "success");
    } catch (err: any) { addToast(err.message ?? "Instagram post failed", "error"); }
    finally { setIgPosting(false); }
  }

  async function handlePostFacebook() {
    if (!videoUrl) return;
    setFbPosting(true);
    try {
      const res  = await fetch("/api/facebook/publish-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, caption: buildFullCaption() || topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFbPublished(true);
      addToast(data.message ?? "Posted to Facebook!", "success");
    } catch (err: any) { addToast(err.message ?? "Facebook post failed", "error"); }
    finally { setFbPosting(false); }
  }

  function handleReset() {
    setVideoState("idle");
    setVideoUrl(null);
    setEnrichedPrompt(null);
    setCaption(null);
    setHashtags(null);
    setErrorMsg(null);
    setSavedToLibrary(false);
    setIgPublished(false);
    setFbPublished(false);
    generationIdRef.current = null;
    tempBlobUrlRef.current  = null;
    setCurrentStep(0);
  }

  const hasTokens = !tokenBalance.isLoading && tokenBalance.tokensRemaining >= 2;
  const canGenerate = topic.trim().length > 0 && hasTokens;

  // ── Shared styles ──────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "linear-gradient(135deg, #15233d 0%, #101a33 100%)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)",
    marginBottom: 16,
  };
  const cardTitle: React.CSSProperties = {
    margin: "0 0 4px 0", fontSize: 16, fontWeight: 700,
    letterSpacing: 0.5, textTransform: "uppercase",
  };
  const cardHint: React.CSSProperties = {
    margin: "0 0 20px 0", opacity: 0.6, fontSize: 13,
  };
  const stepNav: React.CSSProperties = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)",
  };
  const backBtn: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8, padding: "10px 16px", color: "#e6edf7",
    cursor: "pointer", fontSize: 13, fontWeight: 600,
  };
  const nextBtn: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6,
    background: `linear-gradient(135deg, ${G1} 0%, ${G2} 100%)`,
    border: "none", borderRadius: 10, padding: "12px 24px",
    color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700,
    boxShadow: `0 4px 14px rgba(16,185,129,0.4)`,
  };
  const nextBtnDisabled: React.CSSProperties = {
    background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.4)",
    cursor: "not-allowed", boxShadow: "none",
  };
  const stepIndicator: React.CSSProperties = { display: "flex", gap: 6, alignItems: "center" };
  const stepDot: React.CSSProperties = {
    width: 10, height: 10, borderRadius: "50%",
    background: "rgba(255,255,255,0.15)", transition: "all 0.2s ease",
  };
  const stepDotActive: React.CSSProperties = {
    background: `linear-gradient(135deg, ${G1} 0%, #34d399 100%)`,
    width: 32, borderRadius: 6, boxShadow: `0 2px 10px rgba(16,185,129,0.4)`,
  };
  const stepDotCompleted: React.CSSProperties = {
    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
    boxShadow: "0 2px 8px rgba(34,197,94,0.3)",
  };

  function StepDots() {
    return (
      <div style={stepIndicator}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} style={{ ...stepDot, ...(i === currentStep ? stepDotActive : {}), ...(i < currentStep ? stepDotCompleted : {}) }} />
        ))}
      </div>
    );
  }

  const slideClass = `slide-card ${slideDirection === "right" ? "slide-from-right" : "slide-from-left"}`;

  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", color: "#e6edf7", fontFamily: "Verdana, Geneva, sans-serif", padding: "0 20px 80px", boxSizing: "border-box" }}>

      {/* ── Header ── */}
      <div style={{ maxWidth: 900, margin: "0 auto 16px auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const, paddingTop: 50 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: 1, margin: 0, textTransform: "uppercase" as const, background: `linear-gradient(135deg, ${G1} 0%, #34d399 50%, #6ee7b7 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            New Video
          </h1>
          <p style={{ margin: "6px 0 0 0", opacity: 0.75, fontSize: 14 }}>
            🎬 AI-powered 5-second branded video
          </p>
          {activeProfile?.niche && (
            <div style={{ marginTop: 8 }}>
              <span style={{ background: `rgba(16,185,129,0.15)`, border: `1px solid rgba(16,185,129,0.3)`, borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "#34d399", fontWeight: 600 }}>
                for {activeProfile.niche}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/dashboard" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 14px", color: "#e6edf7", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Dashboard
          </a>
        </div>
      </div>

      {/* ── Main container ── */}
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* ── Step form (idle / failed) ── */}
        {(videoState === "idle" || videoState === "failed") && (
          <>
            {/* Step 0: Your Business */}
            {currentStep === 0 && (
              <div className={slideClass}>
                <div style={card} className="hover-card">
                  <h2 style={cardTitle}>Your Business</h2>
                  <p style={cardHint}>Tell us about your business and audience</p>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      Your Niche
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "rgba(44,107,237,0.2)", color: "#7eb3ff", fontWeight: 600 }}>Required</span>
                    </div>
                    <input
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      placeholder='e.g., "Real Estate Agent", "Fitness Coach", "Restaurant Owner"'
                      style={{ width: "100%", background: "#0b1220", color: "#e6edf7", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", fontSize: 14, boxSizing: "border-box" as const, outline: "none", fontFamily: "inherit" }}
                    />
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      Audience
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "rgba(44,107,237,0.2)", color: "#7eb3ff", fontWeight: 600 }}>Required</span>
                    </div>
                    <input
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      placeholder='e.g., "local homeowners", "busy moms", "small business owners"'
                      style={{ width: "100%", background: "#0b1220", color: "#e6edf7", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", fontSize: 14, boxSizing: "border-box" as const, outline: "none", fontFamily: "inherit" }}
                    />
                  </div>

                  <div style={stepNav}>
                    <div />
                    <StepDots />
                    <button style={{ ...nextBtn, ...(!niche.trim() || !audience.trim() ? nextBtnDisabled : {}) }} onClick={() => { if (niche.trim() && audience.trim()) goNext(); }} disabled={!niche.trim() || !audience.trim()}>
                      Next
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Your Video */}
            {currentStep === 1 && (
              <div className={slideClass}>
                <div style={card} className="hover-card">
                  <h2 style={cardTitle}>Your Video</h2>
                  <p style={cardHint}>Tell us what this video is about</p>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      What&apos;s this video about?
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: `rgba(16,185,129,0.2)`, color: "#34d399", fontWeight: 600 }}>Required</span>
                    </div>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder={niche
                        ? `e.g. Showcase a beautiful ${niche} space with morning light…`
                        : "e.g. A sleek modern office at golden hour, warm light streaming through the windows…"}
                      rows={5}
                      style={{ width: "100%", background: "#0b1220", color: "#e6edf7", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", fontSize: 14, resize: "vertical" as const, fontFamily: "inherit", boxSizing: "border-box" as const, outline: "none" }}
                    />
                  </div>

                  {videoState === "failed" && errorMsg && (
                    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, color: "#fca5a5", fontSize: 13 }}>
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <div style={stepNav}>
                    <button style={backBtn} onClick={goBack}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Back
                    </button>
                    <StepDots />
                    <button style={{ ...nextBtn, ...(!topic.trim() ? nextBtnDisabled : {}) }} onClick={() => { if (topic.trim()) goNext(); }} disabled={!topic.trim()}>
                      Next
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Format & Style */}
            {currentStep === 2 && (

              <div className={slideClass}>
                <div style={card} className="hover-card">
                  <h2 style={cardTitle}>Format & Style</h2>
                  <p style={cardHint}>Choose your video format and visual mood</p>

                  {/* Format */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, opacity: 0.6, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Format</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                      {FORMAT_OPTIONS.map((opt) => {
                        const sel = aspectRatio === opt.ratio;
                        return (
                          <button key={opt.ratio} onClick={() => setAspectRatio(opt.ratio)} style={{ background: sel ? `rgba(16,185,129,0.15)` : "rgba(255,255,255,0.03)", border: sel ? `2px solid ${G1}` : "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 10px", cursor: "pointer", textAlign: "center" as const, color: "#e6edf7", position: "relative" as const, transition: "all 0.15s ease" }}>
                            {opt.recommended && <div style={{ position: "absolute" as const, top: 7, right: 10, fontSize: 9, fontWeight: 700, color: G1, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Best</div>}
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{opt.label}</div>
                            <div style={{ fontSize: 11, opacity: 0.6 }}>{opt.sublabel}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mood */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, opacity: 0.6, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Visual Mood</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                      {MOOD_OPTIONS.map((opt) => {
                        const sel = mood === opt.value;
                        return (
                          <button key={opt.value} onClick={() => setMood(opt.value)} style={{ background: sel ? `rgba(16,185,129,0.15)` : "rgba(255,255,255,0.03)", border: sel ? `2px solid ${G1}` : "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 8px", cursor: "pointer", textAlign: "center" as const, color: "#e6edf7", transition: "all 0.15s ease" }}>
                            <div style={{ fontSize: 20, marginBottom: 5 }}>{opt.emoji}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{opt.label}</div>
                            <div style={{ fontSize: 10, opacity: 0.6, lineHeight: 1.3 }}>{opt.description}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={stepNav}>
                    <button style={backBtn} onClick={goBack}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Back
                    </button>
                    <StepDots />
                    <button style={nextBtn} onClick={goNext}>
                      Next
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Caption */}
            {currentStep === 3 && (
              <div className={slideClass}>
                <div style={card} className="hover-card">
                  <h2 style={cardTitle}>Caption</h2>
                  <p style={cardHint}>Set the tone, length, and hashtag count for your caption</p>

                  {/* Caption Tone */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, opacity: 0.6, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Caption Tone</div>
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                      {TONE_OPTIONS.map((t) => {
                        const sel = tone === t;
                        return (
                          <button key={t} onClick={() => setTone(t)} style={{ background: sel ? `rgba(16,185,129,0.18)` : "rgba(255,255,255,0.04)", border: sel ? `1.5px solid ${G1}` : "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "7px 16px", fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? "#34d399" : "#b0bec5", cursor: "pointer", transition: "all 0.15s ease" }}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Caption Length + Hashtag Count */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, opacity: 0.6, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Caption Length</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {CAPTION_LENGTH_OPTIONS.map((opt) => {
                          const sel = captionLength === opt.value;
                          return (
                            <button key={opt.value} onClick={() => setCaptionLength(opt.value)} style={{ flex: 1, background: sel ? `rgba(16,185,129,0.15)` : "rgba(255,255,255,0.03)", border: sel ? `2px solid ${G1}` : "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 8px", cursor: "pointer", textAlign: "center" as const, color: "#e6edf7", transition: "all 0.15s ease" }}>
                              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{opt.label}</div>
                              <div style={{ fontSize: 10, opacity: 0.55 }}>{opt.sub}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, opacity: 0.6, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Hashtag Count</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                        {HASHTAG_COUNTS.map((n) => {
                          const sel = hashtagCount === n;
                          return (
                            <button key={n} onClick={() => setHashtagCount(n)} style={{ background: sel ? `rgba(16,185,129,0.18)` : "rgba(255,255,255,0.04)", border: sel ? `1.5px solid ${G1}` : "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? "#34d399" : "#b0bec5", cursor: "pointer", minWidth: 40, transition: "all 0.15s ease" }}>
                              {n === 0 ? "None" : n}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div style={stepNav}>
                    <button style={backBtn} onClick={goBack}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Back
                    </button>
                    <StepDots />
                    <button
                      onClick={handleGenerate}
                      disabled={!canGenerate}
                      style={{ ...nextBtn, ...(!canGenerate ? nextBtnDisabled : {}) }}
                    >
                      Generate Video (2 tokens)
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Generating ── */}
        {videoState === "generating" && (
          <div style={{ background: "#101a33", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "48px 24px", textAlign: "center" as const }}>
            <div style={{ fontSize: 40, marginBottom: 16, display: "inline-block", animation: "spin 2s linear infinite" }}>🎬</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Crafting your video…</div>
            <div style={{ opacity: 0.7, fontSize: 14, marginBottom: 4 }}>Writing a cinematic prompt and generating your video.</div>
            <div style={{ opacity: 0.5, fontSize: 13, marginBottom: 28 }}>Usually takes 1–2 minutes. Hang tight.</div>
            {enrichedPrompt && (
              <div style={{ background: `rgba(16,185,129,0.07)`, border: `1px solid rgba(16,185,129,0.2)`, borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#6ee7b7", textAlign: "left" as const, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 24px" }}>
                {enrichedPrompt}
              </div>
            )}
            {caption && (
              <div style={{ background: `rgba(16,185,129,0.05)`, border: `1px solid rgba(16,185,129,0.15)`, borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#a7f3d0", textAlign: "left" as const, lineHeight: 1.6, maxWidth: 560, margin: "16px auto 24px" }}>
                <span style={{ fontWeight: 700, color: "#34d399" }}>Caption ready: </span>{caption}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
              {[0,1,2].map((i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: G1, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Completed ── */}
        {videoState === "completed" && videoUrl && (
          <div>
            <div style={{ background: "#101a33", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", marginBottom: 16, display: "flex", justifyContent: "center" }}>
              <video
                src={videoUrl}
                autoPlay loop muted playsInline controls
                style={{
                  display: "block",
                  width: aspectRatio === "16:9" ? "100%" : "auto",
                  maxWidth: "100%",
                  maxHeight: aspectRatio === "16:9" ? 420 : aspectRatio === "1:1" ? 520 : 640,
                  objectFit: "contain",
                }}
              />
            </div>

            {enrichedPrompt && (
              <div style={{ background: `rgba(16,185,129,0.07)`, border: `1px solid rgba(16,185,129,0.15)`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#6ee7b7", lineHeight: 1.6 }}>
                {enrichedPrompt}
              </div>
            )}

            {(caption || hashtags) && (
              <div style={{ background: "#101a33", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 24px", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, opacity: 0.6, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Generated Caption</div>
                {caption && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, opacity: 0.5 }}>Caption</span>
                      <button onClick={() => copyText(caption, () => setCaptionCopied(true))} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "4px 12px", fontSize: 11, color: captionCopied ? "#34d399" : "#b0bec5", cursor: "pointer", fontWeight: 600 }}>
                        {captionCopied ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                    <div style={{ background: "#0b1220", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 14px", fontSize: 14, lineHeight: 1.6, color: "#e6edf7", whiteSpace: "pre-wrap" as const }}>
                      {caption}
                    </div>
                  </div>
                )}
                {hashtags && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, opacity: 0.5 }}>Hashtags</span>
                      <button onClick={() => copyText(hashtags, () => setHashtagsCopied(true))} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "4px 12px", fontSize: 11, color: hashtagsCopied ? "#34d399" : "#b0bec5", cursor: "pointer", fontWeight: 600 }}>
                        {hashtagsCopied ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                    <div style={{ background: "#0b1220", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", fontSize: 13, lineHeight: 1.8, color: "#60a5fa", wordBreak: "break-word" as const }}>
                      {hashtags}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ background: "#101a33", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                {instagram.connected && (
                  <button onClick={handlePostInstagram} disabled={igPosting || igPublished} style={{ background: igPublished ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)", border: igPublished ? "1px solid rgba(16,185,129,0.3)" : "none", borderRadius: 10, color: "#fff", padding: "13px 16px", fontSize: 13, fontWeight: 700, cursor: igPosting || igPublished ? "default" : "pointer", transition: "all 0.15s ease" }}>
                    {igPublished ? "✓ Posted to Reels" : igPosting ? "Posting…" : "Post to Instagram Reels"}
                  </button>
                )}
                {facebook.connected && (
                  <button onClick={handlePostFacebook} disabled={fbPosting || fbPublished} style={{ background: fbPublished ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg, #1877f2, #166fe5)", border: fbPublished ? "1px solid rgba(16,185,129,0.3)" : "none", borderRadius: 10, color: "#fff", padding: "13px 16px", fontSize: 13, fontWeight: 700, cursor: fbPosting || fbPublished ? "default" : "pointer", transition: "all 0.15s ease" }}>
                    {fbPublished ? "✓ Posted to Facebook" : fbPosting ? "Posting…" : "Post to Facebook"}
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={handleSaveToLibrary} disabled={savedToLibrary} style={{ background: savedToLibrary ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)", border: savedToLibrary ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: savedToLibrary ? "#6ee7b7" : "#e6edf7", padding: "13px 16px", fontSize: 13, fontWeight: 600, cursor: savedToLibrary ? "default" : "pointer", transition: "all 0.15s ease" }}>
                  {savedToLibrary ? "✓ Saved to Library" : "Save to Library"}
                </button>
                <button onClick={async () => {
                  if (!videoUrl) return;
                  const res = await fetch(videoUrl);
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `video-${Date.now()}.mp4`;
                  a.click();
                  URL.revokeObjectURL(url);
                }} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#e6edf7", padding: "13px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Download MP4
                </button>
              </div>
              <button onClick={handleReset} style={{ marginTop: 12, width: "100%", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "rgba(255,255,255,0.5)", padding: "12px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                ↩ Generate Another Video
              </button>
            </div>

            {!instagram.connected && !facebook.connected && (
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 16px", marginTop: 12, fontSize: 13, opacity: 0.7 }}>
                💡 Connect Instagram or Facebook from the{" "}
                <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: "#34d399", cursor: "pointer", padding: 0, fontSize: 13 }}>dashboard</button>{" "}
                to post directly.
              </div>
            )}
          </div>
        )}
      </div>

      <OutOfTokensModal
        isOpen={showOutOfTokens}
        onClose={() => setShowOutOfTokens(false)}
        tokensUsed={tokenBalance.tokensUsed}
        totalTokens={tokenBalance.totalMonthlyTokens}
      />

      <style>{`
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        .slide-card { animation-duration: 0.25s; animation-fill-mode: both; animation-timing-function: ease-out; }
        .slide-from-right { animation-name: slideInRight; }
        .slide-from-left  { animation-name: slideInLeft; }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(32px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInLeft  { from { opacity: 0; transform: translateX(-32px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}
