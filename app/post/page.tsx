"use client";

import React, { useEffect, useMemo, useState } from "react";
import { saveImage } from "../lib/imageStorage";

type FormState = {
  niche: string;
  audience: string;
  postType: string;
  specificRequest: string;
  tone: string;
  captionLength: "Short" | "Medium" | "Long";
  hashtagCount: number;
  imageStyle: string;
  primaryColor: string;
  secondaryColor: string;
};

type UploadRef = {
  name: string;
  mime: string;
  dataUrl: string;
};

type PostResult = {
  caption: string;
  hashtags: string;
  why?: string;
  imageBase64: string;
  imagePrompt?: string;
};

export default function PostPage() {
  const [form, setForm] = useState<FormState>({
    niche: "",
    audience: "",
    postType: "Basic Post",
    specificRequest: "",
    tone: "Confident",
    captionLength: "Medium",
    hashtagCount: 12,
    imageStyle: "lifestyle_photo",
    primaryColor: "#000000",
    secondaryColor: "#ffffff",
  });

  const [uploadRef, setUploadRef] = useState<UploadRef | null>(null);
  const [dayContext, setDayContext] = useState<{
    day: string;
    title: string;
    detail: string;
  } | null>(null);
  const [post, setPost] = useState<PostResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("Preparing…");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [refinementText, setRefinementText] = useState("");
  const [hasRefined, setHasRefined] = useState(false);

  // Editable caption/hashtags
  const [editedCaption, setEditedCaption] = useState("");
  const [editedHashtags, setEditedHashtags] = useState("");
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [isEditingHashtags, setIsEditingHashtags] = useState(false);

  // Right panel tab: 'preview' or 'inputs'
  const [rightTab, setRightTab] = useState<"preview" | "inputs">("preview");

  // Loading progress simulation
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState("Initializing...");

  const SHOW_DEBUG_PROMPT = false;

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Update edited values when post changes
  useEffect(() => {
    if (post?.caption) setEditedCaption(post.caption);
    if (post?.hashtags) setEditedHashtags(post.hashtags);
  }, [post]);

  // Restore from URL params + localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ath_form");
      if (saved) setForm((prev) => ({ ...prev, ...JSON.parse(saved) }));

      const savedUpload = localStorage.getItem("ath_upload_ref");
      if (savedUpload) {
        const parsedUpload = JSON.parse(savedUpload);
        if (parsedUpload?.dataUrl) setUploadRef(parsedUpload);
      }

      const params = new URLSearchParams(window.location.search);
      const niche = params.get("niche"),
        audience = params.get("audience"),
        tone = params.get("tone");
      const postType = params.get("postType") || params.get("goal");
      const specificRequest = params.get("specificRequest");
      const captionLength = params.get("captionLength") as
        | FormState["captionLength"]
        | null;
      const hashtagCount = params.get("hashtagCount");
      const imageStyle = params.get("imageStyle");
      const primaryColor = params.get("primaryColor");
      const secondaryColor = params.get("secondaryColor");

      setForm((prev) => ({
        ...prev,
        ...(niche ? { niche } : {}),
        ...(audience ? { audience } : {}),
        ...(tone ? { tone } : {}),
        ...(postType ? { postType } : {}),
        ...(specificRequest ? { specificRequest } : {}),
        ...(captionLength ? { captionLength } : {}),
        ...(hashtagCount ? { hashtagCount: Number(hashtagCount) } : {}),
        ...(imageStyle ? { imageStyle } : {}),
        ...(primaryColor ? { primaryColor } : {}),
        ...(secondaryColor ? { secondaryColor } : {}),
      }));

      const day = params.get("day"),
        title = params.get("title"),
        detail = params.get("detail");
      if (day && title && detail) setDayContext({ day, title, detail });
    } catch {}
  }, []);

  // Auto-generate
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autogen = params.get("autogen") === "1";
    if (!autogen || post || !form.niche.trim() || !form.audience.trim()) return;
    generatePost();
  }, [form.niche, form.audience]);

  // Loading progress simulation
  useEffect(() => {
    if (!isLoading) {
      setLoadingProgress(0);
      return;
    }

    const stages = [
      { progress: 15, stage: "Analyzing your request..." },
      { progress: 30, stage: "Crafting your caption..." },
      { progress: 50, stage: "Generating hashtags..." },
      { progress: 70, stage: "Creating your image..." },
      { progress: 85, stage: "Applying final touches..." },
      { progress: 95, stage: "Almost there..." },
    ];

    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setLoadingProgress(stages[currentStage].progress);
        setLoadingStage(stages[currentStage].stage);
        currentStage++;
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isLoading]);

  const canRefine = useMemo(
    () => !!post && !hasRefined && refinementText.trim().length > 0,
    [post, hasRefined, refinementText]
  );

  async function generatePost(refinementOverride?: string) {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMsg("");
    setStatusMsg(refinementOverride ? "Regenerating…" : "Generating…");
    setLoadingProgress(5);
    setLoadingStage("Starting generation...");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dayContext,
          goal: form.postType,
          callToAction: "Comment, Share, Like, Follow, DM us",
          referenceImageDataUrl: uploadRef?.dataUrl || null,
          referenceImageName: uploadRef?.name || null,
          referenceImageMime: uploadRef?.mime || null,
          ...(refinementOverride
            ? {
                refinementText: refinementOverride,
                previousCaption: post?.caption,
                previousHashtags: post?.hashtags,
              }
            : {}),
        }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `API did not return valid JSON.\n\nStatus: ${res.status}\n\nRaw response:\n${text.slice(0, 800)}`
        );
      }
      if (!res.ok || data?.error) {
        console.error("API error details:", data);
        throw new Error(
          data?.message ||
            `Request failed with status ${res.status}. See details in console.`
        );
      }

      const result = data?.result as PostResult | undefined;
      if (!result || !result.caption || !result.hashtags) {
        console.error("Unexpected API shape:", data);
        throw new Error("API returned an unexpected response shape.");
      }

      setPost(result);
      setLoadingProgress(100);
      if (refinementOverride) setHasRefined(true);
      setStatusMsg("Done ✅");

      // Save to gallery (metadata in localStorage, image in IndexedDB)
      try {
        const postId = Date.now().toString();

        // Save image to IndexedDB
        if (result.imageBase64) {
          await saveImage(postId, result.imageBase64);
        }

        // Get active profile ID
        let activeProfileId: string | undefined;
        try {
          const activeProfile = localStorage.getItem("ath_active_brand_profile");
          if (activeProfile) {
            activeProfileId = JSON.parse(activeProfile).profileId;
          }
        } catch {}

        // Save metadata to localStorage
        const savedPosts = localStorage.getItem("ath_gallery");
        const posts = savedPosts ? JSON.parse(savedPosts) : [];
        const newPost = {
          id: postId,
          profileId: activeProfileId,
          hasImage: !!result.imageBase64,
          caption: result.caption,
          hashtags: result.hashtags,
          postType: form.postType,
          imageStyle: form.imageStyle,
          tone: form.tone,
          niche: form.niche,
          audience: form.audience,
          calendarDay: dayContext?.day ? parseInt(dayContext.day) : undefined,
          month: dayContext?.day
            ? new Date().toISOString().slice(0, 7)
            : undefined,
          createdAt: new Date().toISOString(),
        };
        posts.unshift(newPost);
        localStorage.setItem("ath_gallery", JSON.stringify(posts.slice(0, 50)));
      } catch {}
    } catch (err: any) {
      setStatusMsg("");
      setErrorMsg(err?.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMsg(""), 1500);
    }
  }

  async function refineOnce() {
    if (canRefine) await generatePost(refinementText.trim());
  }

  function downloadImage() {
    if (!post?.imageBase64) return;
    const a = document.createElement("a");
    a.href = post.imageBase64;
    a.download = "ai-tech-helper.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function copyCaptionAndHashtags() {
    const text = `${editedCaption}\n\n${editedHashtags}`.trim();
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied caption + hashtags!");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      alert("Copied caption + hashtags!");
    }
  }

  const username =
    form.niche.toLowerCase().replace(/\s+/g, "_").slice(0, 20) ||
    "your_business";

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background: "#0b1220",
      color: "#e6edf7",
      padding: 20,
      boxSizing: "border-box",
      fontFamily: "Verdana, Geneva, sans-serif",
    },
    header: {
      maxWidth: 1100,
      margin: "0 auto 16px auto",
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
    },
    title: {
      fontSize: 34,
      fontWeight: 800,
      letterSpacing: 1,
      margin: 0,
      background: "linear-gradient(135deg, #22c55e 0%, #4ade80 50%, #7eb3ff 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    subtitle: {
      margin: "8px 0 0 0",
      opacity: 0.8,
      fontSize: 15,
      fontWeight: 500,
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    grid: {
      maxWidth: 1100,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16,
    },
    card: {
      background: "linear-gradient(135deg, #15233d 0%, #101a33 100%)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 20,
      padding: 20,
      boxShadow: "0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)",
    },
    cardTitle: {
      margin: 0,
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    cardHint: {
      marginTop: 6,
      marginBottom: 12,
      opacity: 0.7,
      fontSize: 14,
      lineHeight: 1.4,
    },
    buttonRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 },
    secondaryBtn: {
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(255,255,255,0.06)",
      color: "#e6edf7",
      padding: "10px 14px",
      fontWeight: 800,
      cursor: "pointer",
      flex: "1 1 160px",
      transition: "all 0.15s ease",
      fontSize: 13,
    },
    danger: {
      marginTop: 10,
      border: "1px solid rgba(255, 99, 99, 0.35)",
      background: "rgba(255, 99, 99, 0.12)",
      color: "#ffd7d7",
      borderRadius: 12,
      padding: "10px 12px",
      fontSize: 13,
      whiteSpace: "pre-wrap",
      lineHeight: 1.35,
    },
    status: {
      marginTop: 10,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      color: "#e6edf7",
      borderRadius: 12,
      padding: "10px 12px",
      fontSize: 13,
    },
    outputWrap: { display: "flex", flexDirection: "column", gap: 14 },
    imageFrame: {
      background: "#0b1220",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 14,
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 280,
    },
    img: { width: "100%", height: "auto", display: "block" },
    placeholder: {
      padding: 18,
      textAlign: "center",
      opacity: 0.7,
      fontSize: 13,
      lineHeight: 1.4,
      maxWidth: 420,
    },
    textBox: {
      background: "#0b1220",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 14,
      padding: 12,
    },
    textHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 8,
    },
    textTitle: { margin: 0, fontSize: 14, fontWeight: 800, opacity: 0.95 },
    text: {
      margin: 0,
      whiteSpace: "pre-wrap",
      fontSize: 14,
      lineHeight: 1.5,
      color: "#e6edf7",
    },
    hashtags: {
      margin: 0,
      whiteSpace: "pre-wrap",
      fontSize: 13,
      lineHeight: 1.45,
      color: "rgba(230,237,247,0.9)",
    },
    divider: {
      height: 1,
      background: "rgba(255,255,255,0.10)",
      margin: "10px 0",
    },
    input: {
      width: "100%",
      background: "#0b1220",
      color: "#e6edf7",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 10,
      padding: "10px 12px",
      outline: "none",
      fontSize: 14,
      boxSizing: "border-box",
    },
    pill: {
      fontSize: 14,
      padding: "4px 8px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      color: "#e6edf7",
      whiteSpace: "nowrap",
    },
    editBtn: {
      fontSize: 11,
      padding: "4px 10px",
      borderRadius: 6,
      border: "1px solid rgba(255,255,255,0.2)",
      background: "rgba(255,255,255,0.08)",
      color: "#e6edf7",
      cursor: "pointer",
      fontWeight: 600,
    },

    // Loading overlay
    loadingOverlay: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      background: "rgba(11, 18, 32, 0.85)",
      backdropFilter: "blur(8px)",
      zIndex: 5,
    },
    progressBar: {
      width: "80%",
      maxWidth: 300,
      height: 6,
      background: "rgba(255,255,255,0.1)",
      borderRadius: 10,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      background: "linear-gradient(90deg, #2c6bed, #7eb3ff)",
      borderRadius: 10,
      transition: "width 0.5s ease",
    },
    loadingText: {
      fontSize: 14,
      fontWeight: 600,
      letterSpacing: 0.4,
      opacity: 0.9,
    },
    loadingStage: { fontSize: 12, opacity: 0.6 },

    // Tabs
    tabRow: { display: "flex", gap: 0, marginBottom: 16 },
    tab: {
      flex: 1,
      padding: "12px 16px",
      background: "rgba(255,255,255,0.04)",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "rgba(255,255,255,0.08)",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
      textAlign: "center" as const,
      transition: "all 0.15s ease",
    },
    tabActive: {
      background: "rgba(44, 107, 237, 0.15)",
      borderColor: "rgba(44, 107, 237, 0.4)",
      color: "#7eb3ff",
    },
    tabLeft: { borderRadius: "10px 0 0 10px" },
    tabRight: { borderRadius: "0 10px 10px 0", borderLeftWidth: 0 },

    // Phone in Hand Preview
    phoneContainer: {
      position: "relative" as const,
      width: "100%",
      maxWidth: 500,
      margin: "0 auto",
    },
    phoneTemplate: {
      width: "100%",
      height: "auto",
      display: "block" as const,
    },
    imageSlot: {
      position: "absolute" as const,
      // Image 4260x6390, red box +1px each side
      top: "25.58%",
      left: "28.40%",
      width: "44.06%",
      height: "29.56%",
      overflow: "hidden",
      zIndex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    slotImage: { width: "100%", height: "100%", objectFit: "cover" as const },
    slotPlaceholder: {
      color: "#8e8e8e",
      fontSize: 11,
      textAlign: "center" as const,
    },

    // Inputs panel
    inputsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    inputItem: {
      background: "rgba(255,255,255,0.04)",
      borderRadius: 8,
      padding: 10,
    },
    inputLabel: {
      fontSize: 10,
      textTransform: "uppercase",
      opacity: 0.5,
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    inputValue: { fontSize: 13, fontWeight: 600 },
  };

  return (
    <div style={styles.page} className="ath-page">
      <div style={styles.header} className="ath-header">
        <div>
          <h1 style={styles.title}>{post ? "Your Post" : "Generating"}</h1>
          <p style={styles.subtitle}>
            <span style={{ fontSize: 18 }}>{post ? "✨" : "⚡"}</span>
            {post
              ? "Edit your caption and copy to clipboard"
              : "Your post is being created. You can refine once after it finishes."}
          </p>
        </div>
        <a
          href="/dashboard"
          style={{
            display: "inline-block",
            textAlign: "center",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.06)",
            color: "#e6edf7",
            padding: "10px 14px",
            fontWeight: 800,
            textDecoration: "none",
            textTransform: "uppercase",
            fontSize: 12,
            letterSpacing: 0.6,
            transition: "all 0.15s ease",
          }}
          className="hover-btn"
        >
          Dashboard
        </a>
      </div>

      <div style={styles.grid} className="ath-grid">
        {/* LEFT: Output */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Output</h2>
          <p style={styles.cardHint}>
            Image + caption + hashtags appear here after generation.
          </p>

          <div style={styles.outputWrap}>
            {/* Refinement */}
            {post && (
              <div
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    textTransform: "uppercase",
                  }}
                >
                  One-time refinement
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    opacity: 0.8,
                    lineHeight: 1.4,
                  }}
                >
                  Be specific — subject, setting, lighting, mood. This runs
                  once.
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                  <input
                    style={styles.input}
                    value={refinementText}
                    onChange={(e) => setRefinementText(e.target.value)}
                    placeholder='e.g., "Bright modern café, warm tones"'
                    disabled={isLoading || hasRefined}
                  />
                  <button
                    style={{
                      ...styles.secondaryBtn,
                      opacity: canRefine ? 1 : 0.5,
                      cursor: canRefine ? "pointer" : "not-allowed",
                      flex: "0 0 auto",
                      whiteSpace: "nowrap",
                    }}
                    disabled={!canRefine || isLoading || hasRefined}
                    onClick={refineOnce}
                    className="hover-btn"
                  >
                    Refine
                  </button>
                </div>
                {hasRefined && (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                    Refinement used.
                  </div>
                )}
              </div>
            )}

            {/* Image */}
            <div
              style={{ ...styles.imageFrame, position: "relative" }}
              className="ath-imageFrame"
            >
              {isLoading && (
                <div style={styles.loadingOverlay}>
                  <div style={{ width: 60, height: 60, position: "relative" }}>
                    <svg
                      viewBox="0 0 60 60"
                      style={{
                        width: 60,
                        height: 60,
                        animation: "athSpin 1.2s linear infinite",
                      }}
                    >
                      <circle
                        cx="30"
                        cy="30"
                        r="26"
                        fill="none"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="4"
                      />
                      <circle
                        cx="30"
                        cy="30"
                        r="26"
                        fill="none"
                        stroke="#2c6bed"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="120"
                        strokeDashoffset={120 - (loadingProgress / 100) * 120}
                        style={{ transition: "stroke-dashoffset 0.5s ease" }}
                      />
                    </svg>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {loadingProgress}%
                    </div>
                  </div>
                  <div style={styles.loadingText}>
                    {statusMsg || "Generating…"}
                  </div>
                  <div style={styles.loadingStage}>{loadingStage}</div>
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${loadingProgress}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {post?.imageBase64 ? (
                <img
                  src={post.imageBase64}
                  alt="Generated post image"
                  style={styles.img}
                />
              ) : (
                <div style={styles.placeholder}>
                  {errorMsg
                    ? "Generation failed. Fix the issue and try again from the dashboard."
                    : "Generating your post now…"}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={styles.buttonRow} className="ath-buttonRow">
              <button
                style={{
                  ...styles.secondaryBtn,
                  opacity: post?.imageBase64 ? 1 : 0.5,
                  cursor: post?.imageBase64 ? "pointer" : "not-allowed",
                }}
                onClick={downloadImage}
                disabled={!post?.imageBase64}
                className="hover-btn"
              >
                Download image
              </button>
              <button
                style={{
                  ...styles.secondaryBtn,
                  opacity: post ? 1 : 0.5,
                  cursor: post ? "pointer" : "not-allowed",
                }}
                onClick={copyCaptionAndHashtags}
                disabled={!post}
                className="hover-btn"
              >
                Copy caption + hashtags
              </button>
            </div>

            {/* Caption/hashtags - EDITABLE */}
            <div style={styles.textBox}>
              <div style={styles.textHeader}>
                <h3 style={styles.textTitle}>Caption</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={styles.pill}>
                    {editedCaption ? `${editedCaption.length} chars` : "—"}
                  </span>
                  {post && (
                    <button
                      style={styles.editBtn}
                      onClick={() => setIsEditingCaption(!isEditingCaption)}
                    >
                      {isEditingCaption ? "Done" : "Edit"}
                    </button>
                  )}
                </div>
              </div>
              {isEditingCaption ? (
                <textarea
                  style={{
                    ...styles.input,
                    minHeight: 100,
                    resize: "vertical",
                  }}
                  value={editedCaption}
                  onChange={(e) => setEditedCaption(e.target.value)}
                />
              ) : (
                <p style={styles.text}>
                  {editedCaption || "Waiting for generation…"}
                </p>
              )}

              <div style={styles.divider} />

              <div style={styles.textHeader}>
                <h3 style={styles.textTitle}>Hashtags</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={styles.pill}>
                    {editedHashtags ? "Ready" : "—"}
                  </span>
                  {post && (
                    <button
                      style={styles.editBtn}
                      onClick={() => setIsEditingHashtags(!isEditingHashtags)}
                    >
                      {isEditingHashtags ? "Done" : "Edit"}
                    </button>
                  )}
                </div>
              </div>
              {isEditingHashtags ? (
                <textarea
                  style={{ ...styles.input, minHeight: 60, resize: "vertical" }}
                  value={editedHashtags}
                  onChange={(e) => setEditedHashtags(e.target.value)}
                />
              ) : (
                <p style={styles.hashtags}>
                  {editedHashtags || "Waiting for generation…"}
                </p>
              )}

              {SHOW_DEBUG_PROMPT && post?.imagePrompt && (
                <>
                  <div style={styles.divider} />
                  <div style={styles.textHeader}>
                    <h3 style={styles.textTitle}>Debug: Image prompt</h3>
                    <span style={styles.pill}>Dev</span>
                  </div>
                  <p style={styles.hashtags}>{post.imagePrompt}</p>
                </>
              )}
            </div>

            {statusMsg && <div style={styles.status}>{statusMsg}</div>}
            {errorMsg && <div style={styles.danger}>{errorMsg}</div>}
          </div>
        </div>

        {/* RIGHT: Preview & Inputs */}
        <div style={styles.card}>
          {/* Tabs */}
          <div style={styles.tabRow}>
            <div
              style={{
                ...styles.tab,
                ...styles.tabLeft,
                ...(rightTab === "preview" ? styles.tabActive : {}),
              }}
              onClick={() => setRightTab("preview")}
            >
              📱 Preview
            </div>
            <div
              style={{
                ...styles.tab,
                ...styles.tabRight,
                ...(rightTab === "inputs" ? styles.tabActive : {}),
              }}
              onClick={() => setRightTab("inputs")}
            >
              ⚙️ Inputs
            </div>
          </div>

          {rightTab === "preview" ? (
            /* Phone in Hand Preview - Real photo mockup */
            <div style={styles.phoneContainer}>
              {/* Dynamic image slot - positioned over the phone screen */}
              <div style={styles.imageSlot}>
                {post?.imageBase64 ? (
                  <img
                    src={post.imageBase64}
                    alt="Your post"
                    style={styles.slotImage}
                  />
                ) : (
                  <div style={styles.slotPlaceholder}>
                    {isLoading ? "Generating..." : "Your image"}
                  </div>
                )}
              </div>

              {/* Phone mockup image */}
              <img
                src="/phone-mockup.png"
                alt="Phone preview"
                style={styles.phoneTemplate}
              />
            </div>
          ) : (
            /* Inputs Tab */
            <div>
              <h2 style={{ ...styles.cardTitle, marginBottom: 12 }}>
                Generation Inputs
              </h2>
              <div style={styles.inputsGrid}>
                <div style={styles.inputItem}>
                  <div style={styles.inputLabel}>Niche</div>
                  <div style={styles.inputValue}>{form.niche || "—"}</div>
                </div>
                <div style={styles.inputItem}>
                  <div style={styles.inputLabel}>Audience</div>
                  <div style={styles.inputValue}>{form.audience || "—"}</div>
                </div>
                <div style={styles.inputItem}>
                  <div style={styles.inputLabel}>Post Type</div>
                  <div style={styles.inputValue}>{form.postType || "—"}</div>
                </div>
                <div style={styles.inputItem}>
                  <div style={styles.inputLabel}>Tone</div>
                  <div style={styles.inputValue}>{form.tone || "—"}</div>
                </div>
                <div style={styles.inputItem}>
                  <div style={styles.inputLabel}>Image Style</div>
                  <div style={styles.inputValue}>{form.imageStyle || "—"}</div>
                </div>
                <div style={styles.inputItem}>
                  <div style={styles.inputLabel}>Caption Length</div>
                  <div style={styles.inputValue}>
                    {form.captionLength || "—"}
                  </div>
                </div>
                <div style={styles.inputItem}>
                  <div style={styles.inputLabel}>Hashtag Count</div>
                  <div style={styles.inputValue}>{form.hashtagCount}</div>
                </div>
                <div style={styles.inputItem}>
                  <div style={styles.inputLabel}>Reference Image</div>
                  <div style={styles.inputValue}>
                    {uploadRef ? "Yes" : "No"}
                  </div>
                </div>
              </div>

              {form.specificRequest && (
                <div style={{ ...styles.inputItem, marginTop: 12 }}>
                  <div style={styles.inputLabel}>Specific Request</div>
                  <div style={styles.inputValue}>{form.specificRequest}</div>
                </div>
              )}

              {/* Colors */}
              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <div
                  style={{
                    ...styles.inputItem,
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: form.primaryColor,
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  />
                  <div>
                    <div style={styles.inputLabel}>Primary</div>
                    <div style={{ ...styles.inputValue, fontSize: 11 }}>
                      {form.primaryColor}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    ...styles.inputItem,
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: form.secondaryColor,
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  />
                  <div>
                    <div style={styles.inputLabel}>Secondary</div>
                    <div style={{ ...styles.inputValue, fontSize: 11 }}>
                      {form.secondaryColor}
                    </div>
                  </div>
                </div>
              </div>

              {dayContext && (
                <div
                  style={{
                    ...styles.inputItem,
                    marginTop: 12,
                    background: "rgba(44, 107, 237, 0.1)",
                    border: "1px solid rgba(44, 107, 237, 0.2)",
                  }}
                >
                  <div style={styles.inputLabel}>Calendar Context</div>
                  <div style={styles.inputValue}>
                    Day {dayContext.day} — {dayContext.title}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                    {dayContext.detail}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .hover-btn:hover { background: rgba(255,255,255,0.12) !important; }
        @media (max-width: 920px) {
          body { margin: 0; }
          .ath-page { padding: 12px !important; }
          .ath-grid { grid-template-columns: 1fr !important; }
          .ath-imageFrame { min-height: 220px !important; }
          .ath-buttonRow button { flex: 1 1 100% !important; }
        }
        @media (max-width: 420px) { .ath-imageFrame { min-height: 180px !important; } }
        @keyframes athSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
