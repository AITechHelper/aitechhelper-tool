"use client";

import React, { useMemo, useState, useEffect } from "react";

type FormState = {
  niche: string;
  audience: string;

  // ✅ dropdown fields that matter
  tone: string;
  goal: string;

  // ✅ new: specific request (client promo / details)
  specificRequest: string;

  captionLength: "Short" | "Medium" | "Long";
  hashtagCount: number;
  imageStyle: string;

  // brand colors
  primaryColor: string;
  secondaryColor: string;
};

// Optional upload (reference image)
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

const imageStyles = [
  { label: "Realistic photo", value: "realistic_photo" },
  { label: "Cinematic photo", value: "cinematic_photo" },
  { label: "Product photo", value: "product_photo" },
  { label: "Minimal illustration", value: "minimal_illustration" },
  { label: "3D render", value: "3d_render" },
  { label: "Flat vector", value: "flat_vector" },
];

// ✅ Tone dropdown (AI-friendly options)
const toneOptions = [
  "Confident",
  "Friendly",
  "Playful",
  "Professional",
  "Luxury",
  "Minimal",
  "Bold",
  "Witty",
  "Inspirational",
  "Educational",
  "Direct",
  "Warm",
  "Premium",
  "Cozy",
  "Energetic",
  "Modern",
  "Rustic",
  "Casual",
  "Hype (but not cringe)",
  "Storytelling",
];

// ✅ Goal dropdown (clear intent)
const goalOptions = [
  "Get more engagement",
  "Get more saves",
  "Get more shares",
  "Get more comments",
  "Drive profile visits",
  "Drive website clicks",
  "Get more DMs",
  "Promote a product",
  "Announce something new",
  "Build brand awareness",
  "Educate the audience",
  "Convert viewers to customers",
];

// ✅ bounded “specific request” textbox
const MAX_SPECIFIC_REQUEST_CHARS = 180;

export default function Page() {
  const [form, setForm] = useState<FormState>({
    niche: "",
    audience: "",

    tone: "Confident",
    goal: "Get more engagement",

    specificRequest: "",

    captionLength: "Medium",
    hashtagCount: 12,
    imageStyle: "realistic_photo",

    primaryColor: "#000000",
    secondaryColor: "#ffffff",
  });

  // Optional upload (reference image)
  const [uploadRef, setUploadRef] = useState<UploadRef | null>(null);
  const [uploadError, setUploadError] = useState<string>("");

  // Refinement (one-time)
  const [refinementText, setRefinementText] = useState("");
  const [hasRefined, setHasRefined] = useState(false);

  // Load saved form from localStorage (once)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ath_form");
      if (saved) {
        const parsed = JSON.parse(saved);
        setForm((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  // Save form to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem("ath_form", JSON.stringify(form));
    } catch {}
  }, [form]);

  const [post, setPost] = useState<PostResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [dayContext, setDayContext] = useState<{
    day: string;
    title: string;
    detail: string;
  } | null>(null);
  const [autogenRequested, setAutogenRequested] = useState(false);

  // Read URL params (restore form + set dayContext + request autogen)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const autogen = params.get("autogen");
    if (autogen === "1") setAutogenRequested(true);

    const niche = params.get("niche");
    const audience = params.get("audience");
    const tone = params.get("tone");
    const goal = params.get("goal");
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
      ...(goal ? { goal } : {}),
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire autogen ONLY after form is restored + dayContext exists + required fields exist
  useEffect(() => {
    if (!autogenRequested) return;
    if (!dayContext) return;
    if (!form.niche.trim() || !form.audience.trim()) return;

    setAutogenRequested(false);
    generatePost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autogenRequested, dayContext, form.niche, form.audience]);

  const SHOW_DEBUG_PROMPT = false;

  const canGenerate = useMemo(() => {
    return form.niche.trim().length > 0 && form.audience.trim().length > 0;
  }, [form.niche, form.audience]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Upload handler (reference image)
  async function handleUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file (PNG/JPG/WebP).");
      e.target.value = "";
      return;
    }

    const maxBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxBytes) {
      setUploadError("Image is too large. Please upload a file under 2MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setUploadRef({ name: file.name, mime: file.type, dataUrl });
    };
    reader.onerror = () =>
      setUploadError("Failed to read the image. Try again.");
    reader.readAsDataURL(file);
  }

  async function generatePost() {
    setIsLoading(true);
    setErrorMsg("");
    setStatusMsg("Generating…");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dayContext,

          // ✅ auto CTA (generic, no UI)
          callToAction: "Comment, Share, Like, Follow, DM us",

          // ✅ reference image fields
          referenceImageDataUrl: uploadRef?.dataUrl || null,
          referenceImageName: uploadRef?.name || null,
          referenceImageMime: uploadRef?.mime || null,
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

      // reset refinement each new generation
      setRefinementText("");
      setHasRefined(false);

      setStatusMsg("Done ✅");
    } catch (err: any) {
      setStatusMsg("");
      setErrorMsg(err?.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMsg(""), 1500);
    }
  }

  // one-time refinement regeneration (bounded)
  async function regenerateOnce() {
    if (!post) return;
    if (hasRefined) return;

    const refined = refinementText.trim();
    if (!refined) return;

    setIsLoading(true);
    setErrorMsg("");
    setStatusMsg("Regenerating…");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dayContext,

          // ✅ auto CTA (generic, no UI)
          callToAction: "Comment, Share, Like, Follow, DM us",

          // ✅ reference image fields (keep for refinement too)
          referenceImageDataUrl: uploadRef?.dataUrl || null,
          referenceImageName: uploadRef?.name || null,
          referenceImageMime: uploadRef?.mime || null,

          refinementText: refined,
          previousCaption: post.caption,
          previousHashtags: post.hashtags,
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
      setHasRefined(true);
      setStatusMsg("Done ✅");
    } catch (err: any) {
      setStatusMsg("");
      setErrorMsg(err?.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
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

          {/* ✅ Tone + Goal dropdowns */}
          <div style={styles.row2} className="ath-row2">
            <div style={styles.field}>
              <div style={styles.labelRow}>
                <div style={styles.label}>Tone</div>
              </div>
              <select
                style={styles.select}
                value={form.tone}
                onChange={(e) => updateForm("tone", e.target.value)}
              >
                {toneOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <div style={styles.labelRow}>
                <div style={styles.label}>Goal</div>
              </div>
              <select
                style={styles.select}
                value={form.goal}
                onChange={(e) => updateForm("goal", e.target.value)}
              >
                {goalOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ✅ Specific request (bounded) */}
          <div style={styles.field}>
            <div style={styles.labelRow}>
              <div style={styles.label}>Specific request (optional)</div>
              <div style={styles.pill}>
                {form.specificRequest.length}/{MAX_SPECIFIC_REQUEST_CHARS}
              </div>
            </div>
            <input
              style={styles.input}
              value={form.specificRequest}
              onChange={(e) => {
                const next = e.target.value.slice(
                  0,
                  MAX_SPECIFIC_REQUEST_CHARS
                );
                updateForm("specificRequest", next);
              }}
              placeholder='e.g., "Mention February special: buy 1 get 1 free"'
            />
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                opacity: 0.75,
                lineHeight: 1.35,
              }}
            >
              Add promo details, offers, dates, or anything the caption must
              mention.
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

          <div style={styles.row2} className="ath-row2">
            <div style={styles.field}>
              <div style={styles.labelRow}>
                <div style={styles.label}>Primary brand color</div>
              </div>
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => updateForm("primaryColor", e.target.value)}
                style={{ ...styles.input, padding: 4, height: 42 }}
              />
              <input
                type="text"
                value={form.primaryColor}
                onChange={(e) => updateForm("primaryColor", e.target.value)}
                style={{ ...styles.input, marginTop: 6 }}
                placeholder="#000000"
              />
            </div>

            <div style={styles.field}>
              <div style={styles.labelRow}>
                <div style={styles.label}>Secondary brand color</div>
              </div>
              <input
                type="color"
                value={form.secondaryColor}
                onChange={(e) => updateForm("secondaryColor", e.target.value)}
                style={{ ...styles.input, padding: 4, height: 42 }}
              />
              <input
                type="text"
                value={form.secondaryColor}
                onChange={(e) => updateForm("secondaryColor", e.target.value)}
                style={{ ...styles.input, marginTop: 6 }}
                placeholder="#ffffff"
              />
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

          {/* Upload reference image */}
          <div style={styles.field}>
            <div style={styles.labelRow}>
              <div style={styles.label}>Upload reference image (optional)</div>
              <div style={styles.pill}>1 image</div>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={handleUploadChange}
              style={styles.input}
            />

            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                opacity: 0.75,
                lineHeight: 1.35,
              }}
            >
              We’ll use this only as a visual reference (colors/product vibe).
              No exact copying.
            </div>

            {uploadRef ? (
              <div style={{ marginTop: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadRef.dataUrl}
                  alt="Uploaded reference"
                  style={{
                    width: "100%",
                    maxHeight: 180,
                    objectFit: "cover",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                />
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                  {uploadRef.name}
                </div>

                <button
                  type="button"
                  style={{ ...styles.secondaryBtn, marginTop: 8 }}
                  onClick={() => {
                    setUploadRef(null);
                    setUploadError("");
                  }}
                >
                  Remove upload
                </button>
              </div>
            ) : null}

            {uploadError ? (
              <div style={styles.danger}>{uploadError}</div>
            ) : null}
          </div>

          {dayContext ? (
            <div
              style={{
                marginBottom: 12,
                padding: 12,
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              <strong>Selected day {dayContext.day}</strong>
              <br />
              dayContext.title — {dayContext.detail}
            </div>
          ) : null}

          <div style={styles.buttonRow} className="ath-buttonRow">
            <button
              style={{ ...styles.primaryBtn, opacity: isLoading ? 0.8 : 1 }}
              onClick={generatePost}
              disabled={!canGenerate || isLoading}
              title={
                !canGenerate ? "Please fill niche + audience" : "Generate post"
              }
            >
              {isLoading ? "Generating…" : "Generate"}
            </button>
          </div>

          <a
            href={`/calendar?niche=${encodeURIComponent(
              form.niche
            )}&audience=${encodeURIComponent(
              form.audience
            )}&tone=${encodeURIComponent(form.tone)}&goal=${encodeURIComponent(
              form.goal
            )}&specificRequest=${encodeURIComponent(
              form.specificRequest
            )}&captionLength=${encodeURIComponent(
              form.captionLength
            )}&hashtagCount=${
              form.hashtagCount
            }&imageStyle=${encodeURIComponent(
              form.imageStyle
            )}&primaryColor=${encodeURIComponent(
              form.primaryColor
            )}&secondaryColor=${encodeURIComponent(form.secondaryColor)}`}
            style={{
              display: "block",
              textAlign: "center",
              marginTop: 10,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
              color: "#e6edf7",
              padding: "10px 14px",
              fontWeight: 800,
              textDecoration: "none",
              textTransform: "uppercase",
              fontSize: 13,
            }}
          >
            Plan Your Month
          </a>

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
            {/* Refinement box ABOVE results */}
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
                  Want a better image? Be as specific as possible — subject,
                  setting, lighting, mood. This runs once.
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                  <input
                    style={styles.input}
                    value={refinementText}
                    onChange={(e) => setRefinementText(e.target.value)}
                    placeholder='e.g., "Make the barista a woman, bright natural light, modern café"'
                    disabled={isLoading || hasRefined}
                  />
                  <button
                    style={{
                      ...styles.secondaryBtn,
                      opacity: !refinementText.trim() || hasRefined ? 0.5 : 1,
                      cursor:
                        !refinementText.trim() || hasRefined
                          ? "not-allowed"
                          : "pointer",
                    }}
                    disabled={!refinementText.trim() || isLoading || hasRefined}
                    onClick={regenerateOnce}
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

            <div
              style={{ ...styles.imageFrame, position: "relative" }}
              className="ath-imageFrame"
            >
              {isLoading ? (
                <div style={styles.loadingOverlay}>
                  <div style={styles.spinner} />
                  <div style={styles.loadingText}>Generating…</div>
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

        @keyframes athSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
