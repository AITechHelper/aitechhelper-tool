"use client";

import React, { useEffect, useMemo, useState } from "react";

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
  dataUrl: string; // base64 data URL
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

  // Refinement (one-time)
  const [refinementText, setRefinementText] = useState("");
  const [hasRefined, setHasRefined] = useState(false);

  const SHOW_DEBUG_PROMPT = false;

  // Restore from URL params + localStorage
  useEffect(() => {
    try {
      // 1) Start with localStorage saved form (if any)
      const saved = localStorage.getItem("ath_form");
      if (saved) {
        const parsed = JSON.parse(saved);
        setForm((prev) => ({ ...prev, ...parsed }));
      }

      // 2) Restore upload ref (if any)
      const savedUpload = localStorage.getItem("ath_upload_ref");
      if (savedUpload) {
        const parsedUpload = JSON.parse(savedUpload);
        if (parsedUpload?.dataUrl) setUploadRef(parsedUpload);
      }

      // 3) URL params override (most current)
      const params = new URLSearchParams(window.location.search);

      const niche = params.get("niche");
      const audience = params.get("audience");
      const tone = params.get("tone");

      const postType = params.get("postType") || params.get("goal"); // backward compat
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

      const day = params.get("day");
      const title = params.get("title");
      const detail = params.get("detail");
      if (day && title && detail) setDayContext({ day, title, detail });

      // eslint-disable-next-line no-empty
    } catch {}
  }, []);

  // Auto-generate ONCE when autogen=1 and required fields exist
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autogen = params.get("autogen") === "1";

    if (!autogen) return;
    if (post) return; // already generated
    if (!form.niche.trim() || !form.audience.trim()) return;

    generatePost();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.niche, form.audience]);

  const canRefine = useMemo(() => {
    return !!post && !hasRefined && refinementText.trim().length > 0;
  }, [post, hasRefined, refinementText]);

  async function generatePost(refinementOverride?: string) {
    if (isLoading) return;

    setIsLoading(true);
    setErrorMsg("");
    setStatusMsg(refinementOverride ? "Regenerating…" : "Generating…");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dayContext,

          // ✅ keep backward compatibility with backend that expects "goal"
          goal: form.postType,

          // ✅ auto CTA (generic, no UI)
          callToAction: "Comment, Share, Like, Follow, DM us",

          // ✅ reference image fields
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
          `API did not return valid JSON.\n\nStatus: ${
            res.status
          }\n\nRaw response:\n${text.slice(0, 800)}`
        );
      }

      if (!res.ok || data?.error) {
        const message =
          data?.message ||
          `Request failed with status ${res.status}. See details in console.`;
        console.error("API error details:", data);
        throw new Error(message);
      }

      const result = data?.result as PostResult | undefined;
      if (!result || !result.caption || !result.hashtags) {
        console.error("Unexpected API shape:", data);
        throw new Error("API returned an unexpected response shape.");
      }

      setPost(result);

      if (refinementOverride) setHasRefined(true);

      setStatusMsg("Done ✅");
    } catch (err: any) {
      setStatusMsg("");
      setErrorMsg(err?.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMsg(""), 1500);
    }
  }

  async function refineOnce() {
    if (!canRefine) return;
    await generatePost(refinementText.trim());
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
    if (!post) return;
    const text = `${post.caption}\n\n${post.hashtags}`.trim();
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
      fontSize: 35,
      fontWeight: 600,
      letterSpacing: 1,
      margin: 0,
      textTransform: "uppercase",
    },
    subtitle: {
      margin: 0,
      opacity: 0.75,
      fontSize: 15,
      fontWeight: 400,
    },
    grid: {
      maxWidth: 1100,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "1fr 1.15fr",
      gap: 16,
    },
    card: {
      background: "#101a33",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      padding: 16,
      boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
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
    buttonRow: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      marginTop: 8,
    },
    secondaryBtn: {
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(255,255,255,0.06)",
      color: "#e6edf7",
      padding: "10px 14px",
      fontWeight: 800,
      cursor: "pointer",
      flex: "1 1 160px",
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
    outputWrap: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
    },
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
    img: {
      width: "100%",
      height: "auto",
      display: "block",
    },
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
    textTitle: {
      margin: 0,
      fontSize: 14,
      fontWeight: 800,
      opacity: 0.95,
    },
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
    loadingOverlay: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      background: "rgba(11, 18, 32, 0.65)",
      backdropFilter: "blur(4px)",
      zIndex: 5,
    },
    spinner: {
      width: 56,
      height: 56,
      borderRadius: "50%",
      border: "6px solid rgba(255,255,255,0.18)",
      borderTopColor: "rgba(255,255,255,0.85)",
      animation: "athSpin 0.9s linear infinite",
    },
    loadingText: {
      fontSize: 14,
      fontWeight: 800,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      opacity: 0.9,
    },
  };

  return (
    <div style={styles.page} className="ath-page">
      <div style={styles.header} className="ath-header">
        <div>
          <h1 style={styles.title}>Generating</h1>
          <p style={styles.subtitle}>
            Your post is being created. You can refine once after it finishes.
          </p>
        </div>

        <a
          href="/"
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
          }}
        >
          Back
        </a>
      </div>

      <div style={{ ...styles.grid }} className="ath-grid">
        {/* LEFT: Output */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Output</h2>
          <p style={styles.cardHint}>
            Image + caption + hashtags appear here after generation.
          </p>

          <div style={styles.outputWrap}>
            {/* Refinement */}
            {post ? (
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
                    placeholder='e.g., "Bright modern café, warm tones, candid moment"'
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
                  >
                    Refine once
                  </button>
                </div>

                {hasRefined ? (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                    Refinement used.
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Image */}
            <div
              style={{ ...styles.imageFrame, position: "relative" }}
              className="ath-imageFrame"
            >
              {isLoading ? (
                <div style={styles.loadingOverlay}>
                  <div style={styles.spinner} />
                  <div style={styles.loadingText}>
                    {statusMsg || "Generating…"}
                  </div>
                </div>
              ) : null}

              {post?.imageBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
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
              >
                Copy caption + hashtags
              </button>
            </div>

            {/* Caption/hashtags */}
            <div style={styles.textBox}>
              <div style={styles.textHeader}>
                <h3 style={styles.textTitle}>Caption</h3>
                <span style={styles.pill}>
                  {post?.caption ? `${post.caption.length} chars` : "—"}
                </span>
              </div>
              <p style={styles.text}>
                {post?.caption ? post.caption : "Waiting for generation…"}
              </p>

              <div style={styles.divider} />

              <div style={styles.textHeader}>
                <h3 style={styles.textTitle}>Hashtags</h3>
                <span style={styles.pill}>
                  {post?.hashtags ? "Ready" : "—"}
                </span>
              </div>
              <p style={styles.hashtags}>
                {post?.hashtags ? post.hashtags : "Waiting for generation…"}
              </p>

              {SHOW_DEBUG_PROMPT && post?.imagePrompt ? (
                <>
                  <div style={styles.divider} />
                  <div style={styles.textHeader}>
                    <h3 style={styles.textTitle}>Debug: Image prompt</h3>
                    <span style={styles.pill}>Dev</span>
                  </div>
                  <p style={styles.hashtags}>{post.imagePrompt}</p>
                </>
              ) : null}
            </div>

            {statusMsg ? <div style={styles.status}>{statusMsg}</div> : null}
            {errorMsg ? <div style={styles.danger}>{errorMsg}</div> : null}
          </div>
        </div>

        {/* RIGHT: Context (read-only) */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Inputs</h2>
          <p style={styles.cardHint}>
            Read-only summary of what was generated.
          </p>

          <div style={{ fontSize: 13, lineHeight: 1.55, opacity: 0.92 }}>
            <div>
              <strong>Niche:</strong> {form.niche || "—"}
            </div>
            <div>
              <strong>Audience:</strong> {form.audience || "—"}
            </div>
            <div>
              <strong>Post type:</strong> {form.postType || "—"}
            </div>
            <div>
              <strong>Specific request:</strong>{" "}
              {form.specificRequest?.trim() ? form.specificRequest : "BLANK"}
            </div>
            <div>
              <strong>Image style:</strong> {form.imageStyle || "—"}
            </div>
            <div>
              <strong>Tone:</strong> {form.tone || "—"}
            </div>
            <div>
              <strong>Caption length:</strong> {form.captionLength || "—"}
            </div>
            <div>
              <strong>Hashtag count:</strong> {String(form.hashtagCount)}
            </div>
            <div>
              <strong>Primary color:</strong> {form.primaryColor || "—"}
            </div>
            <div>
              <strong>Secondary color:</strong> {form.secondaryColor || "—"}
            </div>
            <div>
              <strong>Reference image:</strong> {uploadRef ? "Yes" : "No"}
            </div>

            {dayContext ? (
              <div style={{ marginTop: 10, opacity: 0.95 }}>
                <div style={{ fontWeight: 800, textTransform: "uppercase" }}>
                  Day context
                </div>
                <div>
                  Day {dayContext.day} — {dayContext.title}
                </div>
                <div style={{ opacity: 0.85 }}>{dayContext.detail}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Responsive overrides (ONLY layout responsiveness) */}
      <style>{`
        @media (max-width: 920px) {
          body { margin: 0; }
          .ath-page { padding: 12px !important; }
          .ath-grid { grid-template-columns: 1fr !important; }
          .ath-imageFrame { min-height: 220px !important; }
          .ath-buttonRow button { flex: 1 1 100% !important; }
        }

        @media (max-width: 420px) {
          .ath-imageFrame { min-height: 180px !important; }
        }

        @keyframes athSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
