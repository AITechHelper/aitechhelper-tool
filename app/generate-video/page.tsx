"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useBrandProfiles } from "../lib/useBrandProfiles";
import { useInstagram } from "../lib/useInstagram";
import { useFacebook } from "../lib/useFacebook";
import { useToast } from "../_components/ToastProvider";

type AspectRatio = "9:16" | "1:1" | "16:9";
type Mood        = "cinematic" | "bright-airy" | "high-energy" | "luxury";
type VideoState  = "idle" | "generating" | "completed" | "failed";

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

// Green to match the dashboard video card
const G1 = "#10b981";
const G2 = "#059669";

export default function GenerateVideoPage() {
  const router       = useRouter();
  const { addToast } = useToast();
  const { profiles, activeProfileId } = useBrandProfiles();
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;
  const instagram     = useInstagram();
  const facebook      = useFacebook();

  const [topic,       setTopic]       = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [mood,        setMood]        = useState<Mood>("cinematic");
  const [videoState,  setVideoState]  = useState<VideoState>("idle");
  const [videoUrl,    setVideoUrl]    = useState<string | null>(null);
  const [enrichedPrompt, setEnrichedPrompt] = useState<string | null>(null);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [igPublished, setIgPublished] = useState(false);
  const [fbPublished, setFbPublished] = useState(false);
  const [igPosting,   setIgPosting]   = useState(false);
  const [fbPosting,   setFbPosting]   = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generationIdRef = useRef<string | null>(null);
  const tempBlobUrlRef  = useRef<string | null>(null);

  useEffect(() => {
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  async function handleGenerate() {
    if (!topic.trim()) { addToast("Please describe what your video is about.", "error"); return; }

    setVideoState("generating");
    setVideoUrl(null);
    setEnrichedPrompt(null);
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
          brandContext: activeProfile
            ? { niche: activeProfile.niche, audience: activeProfile.audience, tone: activeProfile.tone, name: activeProfile.name, website: (activeProfile as any).website ?? "" }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start video generation");

      generationIdRef.current = data.generationId;
      tempBlobUrlRef.current  = data.tempBlobUrl ?? null;
      if (data.enrichedPrompt) setEnrichedPrompt(data.enrichedPrompt);

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

  async function handleSaveToLibrary() {
    if (!videoUrl) return;
    try {
      const res = await fetch("/api/media-assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetType: "video", videoUrl, aspectRatio, name: topic.slice(0, 60) || "AI Video" }) });
      if (!res.ok) throw new Error("Failed to save");
      setSavedToLibrary(true);
      addToast("Video saved to your library!", "success");
    } catch { addToast("Could not save to library", "error"); }
  }

  async function handlePostInstagram() {
    if (!videoUrl) return;
    setIgPosting(true);
    try {
      const res  = await fetch("/api/instagram/publish-reel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ videoUrl, caption: topic }) });
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
      const res  = await fetch("/api/facebook/publish-video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ videoUrl, caption: topic }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFbPublished(true);
      addToast(data.message ?? "Posted to Facebook!", "success");
    } catch (err: any) { addToast(err.message ?? "Facebook post failed", "error"); }
    finally { setFbPosting(false); }
  }

  function handleReset() {
    setVideoState("idle"); setVideoUrl(null); setEnrichedPrompt(null); setErrorMsg(null);
    setSavedToLibrary(false); setIgPublished(false); setFbPublished(false);
    generationIdRef.current = null; tempBlobUrlRef.current = null;
  }

  const canGenerate = topic.trim().length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", color: "#e6edf7", fontFamily: "system-ui, sans-serif", padding: "0 20px 80px" }}>

      {/* ── Header ── */}
      <div style={{ maxWidth: 900, margin: "0 auto 24px auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const, paddingTop: 50 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: 1, margin: 0, background: `linear-gradient(135deg, ${G1} 0%, #34d399 50%, #6ee7b7 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Generate a Video
          </h1>
          <p style={{ margin: "8px 0 0 0", opacity: 0.8, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🎬</span>
            AI-powered 5-second branded video
          </p>
          {activeProfile?.niche && (
            <div style={{ marginTop: 8 }}>
              <span style={{ background: `rgba(16,185,129,0.15)`, border: `1px solid rgba(16,185,129,0.3)`, borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "#34d399", fontWeight: 600 }}>
                for {activeProfile.niche}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/dashboard" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.1) 100%)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "10px 16px", color: "#34d399", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Dashboard
          </a>
        </div>
      </div>

      {/* ── Main container ── */}
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* ── Settings card (idle / failed) ── */}
        {(videoState === "idle" || videoState === "failed") && (
          <div style={{ background: "#101a33", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "24px 24px" }}>

            <h2 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" as const, display: "flex", alignItems: "center", gap: 8 }}>
              Video Settings
            </h2>
            <p style={{ margin: "0 0 24px 0", opacity: 0.6, fontSize: 13 }}>Choose your format, mood, and topic</p>

            {/* Format */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, opacity: 0.9 }}>Format</div>
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
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, opacity: 0.9 }}>Visual Mood</div>
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

            {/* Topic */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, opacity: 0.9, display: "flex", alignItems: "center", gap: 8 }}>
                What&apos;s this video about?
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: `rgba(16,185,129,0.2)`, color: "#34d399", fontWeight: 600 }}>Required</span>
              </div>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={activeProfile?.niche ? `e.g. Showcase a beautiful ${activeProfile.niche} space with morning light…` : "e.g. A sleek modern office at golden hour, warm light streaming through the windows…"}
                rows={4}
                style={{ width: "100%", background: "#0b1220", color: "#e6edf7", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", fontSize: 14, resize: "vertical" as const, fontFamily: "inherit", boxSizing: "border-box" as const, outline: "none" }}
              />
            </div>

            {/* Error */}
            {videoState === "failed" && errorMsg && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 14px", marginBottom: 20, color: "#fca5a5", fontSize: 13 }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Step nav */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              {/* Progress dots */}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ width: 32, height: 10, borderRadius: 6, background: `linear-gradient(135deg, ${G1} 0%, ${G2} 100%)`, boxShadow: `0 2px 10px rgba(16,185,129,0.4)` }} />
              </div>
              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                style={{ display: "flex", alignItems: "center", gap: 6, background: canGenerate ? `linear-gradient(135deg, ${G1} 0%, ${G2} 100%)` : "rgba(255,255,255,0.10)", border: "none", borderRadius: 10, padding: "12px 24px", color: canGenerate ? "#fff" : "rgba(255,255,255,0.4)", cursor: canGenerate ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700, transition: "all 0.15s ease", boxShadow: canGenerate ? `0 4px 14px rgba(16,185,129,0.4)` : "none" }}
              >
                Generate Video (2 tokens)
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* ── Generating ── */}
        {videoState === "generating" && (
          <div style={{ background: "#101a33", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "48px 24px", textAlign: "center" as const }}>
            <div style={{ fontSize: 40, marginBottom: 16, display: "inline-block", animation: "spin 2s linear infinite" }}>🎬</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Crafting your video…</div>
            <div style={{ opacity: 0.7, fontSize: 14, marginBottom: 4 }}>Writing a cinematic prompt, then generating with Luma.</div>
            <div style={{ opacity: 0.5, fontSize: 13, marginBottom: 28 }}>Usually takes 1–2 minutes. Hang tight.</div>
            {enrichedPrompt && (
              <div style={{ background: `rgba(16,185,129,0.07)`, border: `1px solid rgba(16,185,129,0.2)`, borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#6ee7b7", textAlign: "left" as const, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 24px" }}>
                <span style={{ fontWeight: 700, color: "#34d399" }}>Prompt sent to Luma: </span>{enrichedPrompt}
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
            {/* Video player card */}
            <div style={{ background: "#101a33", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
              <video src={videoUrl} autoPlay loop muted playsInline controls style={{ width: "100%", display: "block", maxHeight: aspectRatio === "16:9" ? 420 : 600 }} />
            </div>

            {/* Enriched prompt */}
            {enrichedPrompt && (
              <div style={{ background: `rgba(16,185,129,0.07)`, border: `1px solid rgba(16,185,129,0.15)`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#6ee7b7", lineHeight: 1.6 }}>
                <span style={{ fontWeight: 700, color: "#34d399" }}>Luma prompt: </span>{enrichedPrompt}
              </div>
            )}

            {/* Action card */}
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
                <a href={videoUrl} download={`video-${Date.now()}.mp4`} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#e6edf7", padding: "13px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none", textAlign: "center" as const }}>
                  Download MP4
                </a>
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

      <style>{`
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
      `}</style>
    </div>
  );
}
