"use client";

import React, { useMemo, useState } from "react";

type FormState = {
  niche: string;
  audience: string;
  tone: string;
  goal: string;
  captionLength: "Short" | "Medium" | "Long";
  hashtagCount: number;
  imageStyle: string;
};

type PostResult = {
  caption: string;
  hashtags: string;
  why?: string; // API still returns it, but we don't use it in the UI
  imageBase64: string;
  imagePrompt?: string; // optional debug
};

const imageStyles = [
  { label: "Realistic photo", value: "realistic_photo" },
  { label: "Cinematic photo", value: "cinematic_photo" },
  { label: "Product photo", value: "product_photo" },
  { label: "Minimal illustration", value: "minimal_illustration" },
  { label: "3D render", value: "3d_render" },
  { label: "Flat vector", value: "flat_vector" },
];

export default function Page() {
  const [form, setForm] = useState<FormState>({
    niche: "",
    audience: "",
    tone: "Confident",
    goal: "Get more engagement",
    captionLength: "Medium",
    hashtagCount: 12,
    imageStyle: "realistic_photo",
  });

  const [post, setPost] = useState<PostResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Optional: turn this on if you want to show imagePrompt for debugging.
  const SHOW_DEBUG_PROMPT = false;

  const canGenerate = useMemo(() => {
    // Keep it beginner-friendly: only require niche + audience.
    return form.niche.trim().length > 0 && form.audience.trim().length > 0;
  }, [form.niche, form.audience]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function generatePost() {
    setIsLoading(true);
    setErrorMsg("");
    setStatusMsg("Generating…");
    // Optional: clear previous result so the UI feels "fresh"
    // setPost(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const text = await res.text();

      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        // This protects you from HTML/empty responses.
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
      setStatusMsg("Done ✅");
    } catch (err: any) {
      setStatusMsg("");
      setErrorMsg(err?.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
      // Clear the status after a moment (optional)
      setTimeout(() => setStatusMsg(""), 1500);
    }
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
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      alert("Copied caption + hashtags!");
    }
  }

  // ------- Styles (inline, simple, readable) -------
  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background: "#0b1220",
      color: "#e6edf7",
      padding: 20,
      boxSizing: "border-box",
      fontFamily: 'fontFamily: "Verdana, Geneva, sans-serif"',
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
    field: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      marginBottom: 12,
    },
    labelRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    label: {
      fontSize: 16,
      fontWeight: 700,
      opacity: 0.9,
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
    select: {
      width: "100%",
      background: "#0b1220",
      color: "#e6edf7",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 10,
      padding: "10px 12px",
      outline: "none",
      fontSize: 14,
      boxSizing: "border-box",
      appearance: "none",
    },
    row2: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
    },
    row3: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 10,
    },
    sliderRow: {
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    slider: {
      width: "100%",
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
    buttonRow: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      marginTop: 8,
    },
    primaryBtn: {
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.18)",
      background: canGenerate ? "#2c6bed" : "rgba(255,255,255,0.10)",
      color: canGenerate ? "#ffffff" : "rgba(255,255,255,0.55)",
      padding: "10px 14px",
      fontWeight: 800,
      cursor: canGenerate ? "pointer" : "not-allowed",
      flex: "1 1 160px",
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
    footerNote: {
      marginTop: 12,
      opacity: 0.6,
      fontSize: 12,
      lineHeight: 1.4,
    },
    mobile: {
      display: "none",
    },
  };

  return (
    <div style={styles.page} className="ath-page">
      <div style={styles.header} className="ath-header">
        <div>
          <h1 style={styles.title}>Generate a Post</h1>
          <p style={styles.subtitle}>
            Generate a post image + caption + hashtags fast (V1).
          </p>
        </div>
      </div>

      <div style={{ ...styles.grid }} className="ath-grid">
        {/* LEFT: FORM */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Post generator</h2>
          <p style={styles.cardHint}>
            Fill in the basics, choose a style, then hit Generate.
          </p>

          <div style={styles.field}>
            <div style={styles.labelRow}>
              <div style={styles.label}>Niche</div>
              <div style={styles.pill}>Required</div>
            </div>
            <input
              style={styles.input}
              value={form.niche}
              onChange={(e) => updateForm("niche", e.target.value)}
              placeholder='e.g., "AI tools for freelancers"'
            />
          </div>

          <div style={styles.field}>
            <div style={styles.labelRow}>
              <div style={styles.label}>Audience</div>
              <div style={styles.pill}>Required</div>
            </div>
            <input
              style={styles.input}
              value={form.audience}
              onChange={(e) => updateForm("audience", e.target.value)}
              placeholder='e.g., "solo founders on Instagram"'
            />
          </div>

          <div style={styles.row2} className="ath-row2">
            <div style={styles.field}>
              <div style={styles.labelRow}>
                <div style={styles.label}>Tone</div>
              </div>
              <input
                style={styles.input}
                value={form.tone}
                onChange={(e) => updateForm("tone", e.target.value)}
                placeholder='e.g., "Playful, confident"'
              />
            </div>

            <div style={styles.field}>
              <div style={styles.labelRow}>
                <div style={styles.label}>Goal</div>
              </div>
              <input
                style={styles.input}
                value={form.goal}
                onChange={(e) => updateForm("goal", e.target.value)}
                placeholder='e.g., "Get more saves"'
              />
            </div>
          </div>

          <div style={styles.row2} className="ath-row2">
            <div style={styles.field}>
              <div style={styles.labelRow}>
                <div style={styles.label}>Caption length</div>
              </div>
              <select
                style={styles.select}
                value={form.captionLength}
                onChange={(e) =>
                  updateForm(
                    "captionLength",
                    e.target.value as FormState["captionLength"]
                  )
                }
              >
                <option value="Short">Short</option>
                <option value="Medium">Medium</option>
                <option value="Long">Long</option>
              </select>
            </div>

            <div style={styles.field}>
              <div style={styles.labelRow}>
                <div style={styles.label}>Image style</div>
              </div>
              <select
                style={styles.select}
                value={form.imageStyle}
                onChange={(e) => updateForm("imageStyle", e.target.value)}
              >
                {imageStyles.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.field}>
            <div style={styles.labelRow}>
              <div style={styles.label}>Hashtag count</div>
              <div style={styles.pill}>{form.hashtagCount}</div>
            </div>
            <div style={styles.sliderRow}>
              <input
                style={styles.slider}
                type="range"
                min={0}
                max={30}
                value={form.hashtagCount}
                onChange={(e) =>
                  updateForm("hashtagCount", Number(e.target.value))
                }
              />
            </div>
          </div>

          <div style={styles.buttonRow} className="ath-buttonRow">
            <button
              style={{
                ...styles.primaryBtn,
                opacity: isLoading ? 0.8 : 1,
              }}
              onClick={generatePost}
              disabled={!canGenerate || isLoading}
              title={
                !canGenerate ? "Please fill niche + audience" : "Generate post"
              }
            >
              {isLoading ? "Generating…" : "Generate"}
            </button>
          </div>

          {statusMsg ? <div style={styles.status}>{statusMsg}</div> : null}
          {errorMsg ? <div style={styles.danger}>{errorMsg}</div> : null}
        </div>

        {/* RIGHT: OUTPUT PANEL */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Output</h2>
          <p style={styles.cardHint}>
            Image + caption + hashtags will appear here after you generate.
          </p>

          <div style={styles.outputWrap}>
            <div style={styles.imageFrame} className="ath-imageFrame">
              {post?.imageBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.imageBase64}
                  alt="Generated post image"
                  style={styles.img}
                />
              ) : (
                <div style={styles.placeholder}>
                  Nothing generated yet.
                  <br />
                  Fill the form and click <b>Generate</b>.
                </div>
              )}
            </div>

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

            <div style={styles.textBox}>
              <div style={styles.textHeader}>
                <h3 style={styles.textTitle}>Caption</h3>
                <span style={styles.pill}>
                  {post?.caption ? `${post.caption.length} chars` : "—"}
                </span>
              </div>
              <p style={styles.text}>
                {post?.caption ? post.caption : "Generate to see caption here."}
              </p>

              <div style={styles.divider} />

              <div style={styles.textHeader}>
                <h3 style={styles.textTitle}>Hashtags</h3>
                <span style={styles.pill}>
                  {post?.hashtags ? "Ready" : "—"}
                </span>
              </div>
              <p style={styles.hashtags}>
                {post?.hashtags
                  ? post.hashtags
                  : "Generate to see hashtags here."}
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
          </div>
        </div>
      </div>

      {/* Responsive overrides (ONLY layout responsiveness) */}
      <style>{`
        @media (max-width: 920px) {
          body { margin: 0; }
          .ath-page { padding: 12px !important; }
          .ath-grid { grid-template-columns: 1fr !important; }
          .ath-localPill { width: 100% !important; text-align: left !important; }
          .ath-row2 { grid-template-columns: 1fr !important; }
          .ath-buttonRow button { flex: 1 1 100% !important; }
          .ath-imageFrame { min-height: 220px !important; }
        }

        @media (max-width: 420px) {
          .ath-imageFrame { min-height: 180px !important; }
        }
      `}</style>
    </div>
  );
}
