"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useBrandProfiles } from "../lib/useBrandProfiles";
import { useInstagram } from "../lib/useInstagram";
import { useFacebook } from "../lib/useFacebook";
import { useToast } from "../_components/ToastProvider";

type AspectRatio = "9:16" | "1:1" | "16:9";
type Mood = "cinematic" | "bright-airy" | "high-energy" | "luxury";
type VideoState = "idle" | "generating" | "completed" | "failed";

const FORMAT_OPTIONS: { ratio: AspectRatio; label: string; sublabel: string; recommended?: boolean }[] = [
  { ratio: "9:16", label: "9:16 Reels",     sublabel: "Instagram & TikTok", recommended: true },
  { ratio: "1:1",  label: "1:1 Square",     sublabel: "Instagram Feed"                        },
  { ratio: "16:9", label: "16:9 Landscape", sublabel: "Facebook & YouTube"                    },
];

const MOOD_OPTIONS: { value: Mood; emoji: string; label: string; description: string }[] = [
  { value: "cinematic",   emoji: "🎬", label: "Cinematic",     description: "Dramatic, moody, film-like"   },
  { value: "bright-airy", emoji: "☀️", label: "Bright & Airy", description: "Clean, lifestyle, natural"    },
  { value: "high-energy", emoji: "⚡", label: "High Energy",   description: "Dynamic, bold, fast motion"   },
  { value: "luxury",      emoji: "💎", label: "Luxury",        description: "Elegant, rich, slow reveal"   },
];

// Purple accent for video page — distinct from image generator green
const VIDEO_PRIMARY   = "#7c3aed";
const VIDEO_SECONDARY = "#6d28d9";

export default function GenerateVideoPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const brandProfiles = useBrandProfiles();
  const { profiles, activeProfileId } = brandProfiles;
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;
  const instagram = useInstagram();
  const facebook = useFacebook();

  const [topic, setTopic]           = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [mood, setMood]             = useState<Mood>("cinematic");
  const [videoState, setVideoState] = useState<VideoState>("idle");
  const [videoUrl, setVideoUrl]     = useState<string | null>(null);
  const [enrichedPrompt, setEnrichedPrompt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [igPublished, setIgPublished] = useState(false);
  const [fbPublished, setFbPublished] = useState(false);
  const [igPosting, setIgPosting]   = useState(false);
  const [fbPosting, setFbPosting]   = useState(false);

  const pollIntervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const generationIdRef    = useRef<string | null>(null);
  const tempBlobUrlRef     = useRef<string | null>(null);

  useEffect(() => {
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  async function handleGenerate() {
    if (!topic.trim()) {
      addToast("Please describe what your video is about.", "error");
      return;
    }

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
            ? {
                niche:    activeProfile.niche,
                audience: activeProfile.audience,
                tone:     activeProfile.tone,
                name:     activeProfile.name,
                website:  (activeProfile as any).website ?? "",
              }
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

    const tempUrl = tempBlobUrlRef.current
      ? `&tempBlobUrl=${encodeURIComponent(tempBlobUrlRef.current)}`
      : "";

    try {
      const res  = await fetch(`/api/video-status/${id}?${tempUrl}`);
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
    } catch {
      // network hiccup — keep polling
    }
  }

  async function handleSaveToLibrary() {
    if (!videoUrl) return;
    try {
      const res = await fetch("/api/media-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetType: "video",
          videoUrl,
          aspectRatio,
          name: topic.slice(0, 60) || "AI Video",
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSavedToLibrary(true);
      addToast("Video saved to your library!", "success");
    } catch {
      addToast("Could not save to library", "error");
    }
  }

  async function handlePostInstagram() {
    if (!videoUrl) return;
    setIgPosting(true);
    try {
      const res = await fetch("/api/instagram/publish-reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, caption: topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIgPublished(true);
      addToast(data.message ?? "Posted to Instagram Reels!", "success");
    } catch (err: any) {
      addToast(err.message ?? "Instagram post failed", "error");
    } finally {
      setIgPosting(false);
    }
  }

  async function handlePostFacebook() {
    if (!videoUrl) return;
    setFbPosting(true);
    try {
      const res = await fetch("/api/facebook/publish-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, caption: topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFbPublished(true);
      addToast(data.message ?? "Posted to Facebook!", "success");
    } catch (err: any) {
      addToast(err.message ?? "Facebook post failed", "error");
    } finally {
      setFbPosting(false);
    }
  }

  function handleReset() {
    setVideoState("idle");
    setVideoUrl(null);
    setEnrichedPrompt(null);
    setErrorMsg(null);
    setSavedToLibrary(false);
    setIgPublished(false);
    setFbPublished(false);
    generationIdRef.current = null;
    tempBlobUrlRef.current  = null;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d0b1a", color: "#fff", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#130f2a", borderBottom: "1px solid rgba(124,58,237,0.2)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={() => router.push("/dashboard")}
          style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#aab4cc", padding: "6px 14px", cursor: "pointer", fontSize: 13 }}
        >
          ← Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🎬</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Generate a Branded Video</div>
            <div style={{ fontSize: 12, color: "#a78bfa" }}>Powered by Luma Dream Machine · 5 seconds · 2 tokens</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 60px" }}>

        {/* Active Brand Profile */}
        {activeProfile && (
          <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: VIDEO_PRIMARY, flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: "#aab4cc" }}>
              <span style={{ fontWeight: 600, color: "#fff" }}>{activeProfile.name}</span>
              {activeProfile.niche    ? ` · ${activeProfile.niche}`    : ""}
              {activeProfile.audience ? ` · ${activeProfile.audience}` : ""}
            </div>
          </div>
        )}

        {/* Format Picker */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#aab4cc", marginBottom: 10, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
            Format
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {FORMAT_OPTIONS.map((opt) => {
              const selected = aspectRatio === opt.ratio;
              return (
                <button
                  key={opt.ratio}
                  onClick={() => setAspectRatio(opt.ratio)}
                  style={{
                    background: selected ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)",
                    border: selected ? `2px solid ${VIDEO_PRIMARY}` : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    padding: "14px 10px",
                    cursor: "pointer",
                    textAlign: "center" as const,
                    color: "#fff",
                    position: "relative" as const,
                    transition: "all 0.15s ease",
                  }}
                >
                  {opt.recommended && (
                    <div style={{ position: "absolute" as const, top: 6, right: 8, fontSize: 9, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                      Best
                    </div>
                  )}
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: "#aab4cc" }}>{opt.sublabel}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mood Picker */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#aab4cc", marginBottom: 10, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
            Visual Mood
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {MOOD_OPTIONS.map((opt) => {
              const selected = mood === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setMood(opt.value)}
                  style={{
                    background: selected ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)",
                    border: selected ? `2px solid ${VIDEO_PRIMARY}` : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    padding: "12px 8px",
                    cursor: "pointer",
                    textAlign: "center" as const,
                    color: "#fff",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 5 }}>{opt.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{opt.label}</div>
                  <div style={{ fontSize: 10, color: "#aab4cc", lineHeight: 1.3 }}>{opt.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Topic Input */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#aab4cc", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
            What&apos;s this video about?
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={
              activeProfile?.niche
                ? `e.g. Showcase a beautiful ${activeProfile.niche} space with morning light…`
                : "e.g. A sleek modern office at golden hour, empty desk, warm light streaming in…"
            }
            rows={4}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(124,58,237,0.2)",
              borderRadius: 10,
              color: "#fff",
              padding: "12px 14px",
              fontSize: 14,
              resize: "vertical" as const,
              fontFamily: "inherit",
              boxSizing: "border-box" as const,
              outline: "none",
            }}
            disabled={videoState === "generating"}
          />
        </div>

        {/* Generate Button */}
        {(videoState === "idle" || videoState === "failed") && (
          <button
            onClick={handleGenerate}
            disabled={!topic.trim()}
            style={{
              width: "100%",
              background: !topic.trim()
                ? "rgba(255,255,255,0.1)"
                : `linear-gradient(135deg, ${VIDEO_PRIMARY}, ${VIDEO_SECONDARY})`,
              border: "none",
              borderRadius: 12,
              color: "#fff",
              padding: "16px 24px",
              fontSize: 16,
              fontWeight: 700,
              cursor: !topic.trim() ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
              marginBottom: 20,
            }}
          >
            🎬 Generate Video (2 tokens)
          </button>
        )}

        {/* Error */}
        {videoState === "failed" && errorMsg && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "14px 16px", marginBottom: 20, color: "#fca5a5", fontSize: 14 }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Generating */}
        {videoState === "generating" && (
          <div style={{ textAlign: "center" as const, padding: "40px 20px", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 36, marginBottom: 16, animation: "spin 2s linear infinite" }}>🎬</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Crafting your video…</div>
            <div style={{ color: "#a78bfa", fontSize: 13, marginBottom: 4 }}>Writing a cinematic prompt, then generating with Luma.</div>
            <div style={{ color: "#7c6aaa", fontSize: 12, marginBottom: 20 }}>Usually takes 1–2 minutes. Hang tight.</div>
            {enrichedPrompt && (
              <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#c4b5fd", textAlign: "left" as const, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, color: "#a78bfa" }}>Prompt sent to Luma: </span>{enrichedPrompt}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: VIDEO_PRIMARY,
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {videoState === "completed" && videoUrl && (
          <div style={{ marginBottom: 24 }}>

            {/* Video Player */}
            <div style={{ borderRadius: 16, overflow: "hidden", background: "#000", marginBottom: 16, border: "1px solid rgba(124,58,237,0.2)" }}>
              <video
                src={videoUrl}
                autoPlay
                loop
                muted
                playsInline
                controls
                style={{ width: "100%", display: "block", maxHeight: aspectRatio === "16:9" ? 380 : 560 }}
              />
            </div>

            {/* Enriched prompt display */}
            {enrichedPrompt && (
              <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#c4b5fd", lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, color: "#a78bfa" }}>Luma prompt: </span>{enrichedPrompt}
              </div>
            )}

            {/* Social buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              {instagram.connected && (
                <button
                  onClick={handlePostInstagram}
                  disabled={igPosting || igPublished}
                  style={{
                    background: igPublished ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
                    border: igPublished ? "1px solid rgba(16,185,129,0.3)" : "none",
                    borderRadius: 10, color: "#fff", padding: "13px 16px",
                    fontSize: 13, fontWeight: 700,
                    cursor: igPosting || igPublished ? "default" : "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {igPublished ? "✓ Posted to Reels" : igPosting ? "Posting…" : "Post to Instagram Reels"}
                </button>
              )}
              {facebook.connected && (
                <button
                  onClick={handlePostFacebook}
                  disabled={fbPosting || fbPublished}
                  style={{
                    background: fbPublished ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg, #1877f2, #166fe5)",
                    border: fbPublished ? "1px solid rgba(16,185,129,0.3)" : "none",
                    borderRadius: 10, color: "#fff", padding: "13px 16px",
                    fontSize: 13, fontWeight: 700,
                    cursor: fbPosting || fbPublished ? "default" : "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {fbPublished ? "✓ Posted to Facebook" : fbPosting ? "Posting…" : "Post to Facebook"}
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                onClick={handleSaveToLibrary}
                disabled={savedToLibrary}
                style={{
                  background: savedToLibrary ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.07)",
                  border: savedToLibrary ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10, color: savedToLibrary ? "#6ee7b7" : "#fff",
                  padding: "13px 16px", fontSize: 13, fontWeight: 600,
                  cursor: savedToLibrary ? "default" : "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {savedToLibrary ? "✓ Saved to Library" : "Save to Library"}
              </button>
              <a
                href={videoUrl}
                download={`video-${Date.now()}.mp4`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10, color: "#fff", padding: "13px 16px",
                  fontSize: 13, fontWeight: 600, textDecoration: "none",
                  textAlign: "center" as const, transition: "all 0.15s ease",
                }}
              >
                Download MP4
              </a>
            </div>

            <button
              onClick={handleReset}
              style={{
                marginTop: 16, width: "100%", background: "none",
                border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
                color: "#aab4cc", padding: "12px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              ↩ Generate Another Video
            </button>
          </div>
        )}

        {/* No social accounts notice */}
        {videoState === "completed" && !instagram.connected && !facebook.connected && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#aab4cc" }}>
            💡 Connect Instagram or Facebook from the{" "}
            <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer", padding: 0, fontSize: 13 }}>
              dashboard
            </button>{" "}
            to post directly.
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
