"use client";

import React, { useMemo, useState, useEffect } from "react";

type FormState = {
  niche: string;
  audience: string;

  // ✅ main post decision
  postType: string;

  // Optional: appears dynamically depending on postType
  specificRequest: string;

  // Dropdown fields
  tone: string;

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
  { label: "Lifestyle photo (minimal branding)", value: "lifestyle_min_brand" },
  { label: "Branding + photo (no text)", value: "branding_photo_no_text" },
  { label: "Branding + text + photo", value: "branding_text_photo" },
  { label: "Branding + text (no photo)", value: "branding_text_only" },
];

// ✅ Post Types (Option 1 = Basic Post)
const postTypeOptions = [
  "Basic Post",
  "Promotion / Offer",
  "Service or Product Highlight",
  "Educational / Tips",
  "Problem → Solution",
  "Before & After / Transformation",
  "Testimonial / Social Proof",
  "Behind the Scenes",
  "Announcement / Update",
  "Engagement / Conversation Starter",
  "Seasonal / Timely",
  "Authority / Credibility",
  "Custom (Advanced)",
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

// ✅ bounded “specific request” textbox
const MAX_SPECIFIC_REQUEST_CHARS = 180;

function getSpecificRequestUI(postType: string) {
  // show + label/placeholder varies based on postType
  switch (postType) {
    case "Promotion / Offer":
      return {
        show: true,
        label: "What is your promotion? (recommended)",
        placeholder: `e.g., "Buy 2 bags get 1 free" or "20% off this week"`,
        helper: "If you leave this blank, we’ll generate a generic promotion.",
      };
    case "Testimonial / Social Proof":
      return {
        show: true,
        label: "Paste the testimonial (recommended)",
        placeholder: `e.g., "Best service we’ve ever had — fast, friendly, and affordable."`,
        helper:
          "We’ll format it cleanly and make it sound natural (no emojis).",
      };
    case "Announcement / Update":
      return {
        show: true,
        label: "What are you announcing? (recommended)",
        placeholder: `e.g., "Now offering free inspections" or "New location opening Feb 10"`,
        helper:
          "The caption will carry the details; the image stays brand-forward.",
      };
    case "Seasonal / Timely":
      return {
        show: true,
        label: "What season / event is this for? (recommended)",
        placeholder: `e.g., "Valentine’s Day", "Spring cleaning", "Back to school"`,
        helper: "We’ll keep it timely without going off-topic.",
      };
    case "Educational / Tips":
      return {
        show: true,
        label: "Specific request (optional)",
        placeholder: `e.g., "Share a simple maintenance tip" or "Explain one beginner mistake"`,
        helper:
          "Leave blank to generate a safe, generic educational post for your niche.",
      };
    case "Problem → Solution":
      return {
        show: true,
        label: "Optional: What problem should we call out?",
        placeholder: `e.g., "leaky faucet", "low gym motivation", "slow website"`,
        helper: "Leave blank for a common pain point in your niche.",
      };
    case "Before & After / Transformation":
      return {
        show: true,
        label: "Optional: What transformation is it about?",
        placeholder: `e.g., "messy → organized closet" or "weak → strong (fitness)"`,
        helper: "We’ll generate a safe, generic transformation visual.",
      };
    case "Custom (Advanced)":
      return {
        show: true,
        label: "Describe exactly what you want (recommended)",
        placeholder:
          'e.g., "Girl serving coffee to a group, warm lighting, mention buy 2 get 1 free"',
        helper:
          "This gives the model the strongest direction for both caption + image.",
      };
    default:
      // Basic Post + most others: optional
      return {
        show: true,
        label: "Anything specific to include? (optional)",
        placeholder: `e.g., "Mention free inspection" or "Include a short callout about booking"`,
        helper: "If blank, we’ll keep it clean and generic (no random claims).",
      };
  }
}

export default function Page() {
  const [form, setForm] = useState<FormState>({
    niche: "",
    audience: "",

    postType: "Basic Post",
    specificRequest: "",

    tone: "Confident",

    captionLength: "Medium",
    hashtagCount: 12,
    imageStyle: "lifestyle_min_brand",

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

    const postType = params.get("postType") || params.get("goal"); // ✅ backward compat if backend used "goal"
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
    // keep existing loading UX
    setIsLoading(true);
    setErrorMsg("");
    setStatusMsg("Redirecting…");

    try {
      const sp = new URLSearchParams();

      // required
      sp.set("niche", form.niche);
      sp.set("audience", form.audience);

      // main decision
      sp.set("postType", form.postType);
      sp.set("goal", form.postType); // backward compat
      if (form.specificRequest) sp.set("specificRequest", form.specificRequest);

      // settings
      sp.set("tone", form.tone);
      sp.set("captionLength", form.captionLength);
      sp.set("hashtagCount", String(form.hashtagCount));
      sp.set("imageStyle", form.imageStyle);
      sp.set("primaryColor", form.primaryColor);
      sp.set("secondaryColor", form.secondaryColor);

      // calendar context (if present)
      if (dayContext?.day) sp.set("day", dayContext.day);
      if (dayContext?.title) sp.set("title", dayContext.title);
      if (dayContext?.detail) sp.set("detail", dayContext.detail);

      // optional ref image (pass via sessionStorage to avoid huge URL)
      if (uploadRef?.dataUrl) {
        try {
          sessionStorage.setItem(
            "ath_reference_image_dataurl",
            uploadRef.dataUrl
          );
          sessionStorage.setItem(
            "ath_reference_image_name",
            uploadRef.name || ""
          );
          sessionStorage.setItem(
            "ath_reference_image_mime",
            uploadRef.mime || ""
          );
          sp.set("hasRef", "1");
        } catch {}
      } else {
        try {
          sessionStorage.removeItem("ath_reference_image_dataurl");
          sessionStorage.removeItem("ath_reference_image_name");
          sessionStorage.removeItem("ath_reference_image_mime");
        } catch {}
      }

      // tell /post to auto-generate immediately
      sp.set("autogen", "1");

      // redirect to generating page
      window.location.href = `/post?${sp.toString()}`;
    } catch (err: any) {
      setStatusMsg("");
      setErrorMsg(err?.message || "Failed to redirect.");
      setIsLoading(false);
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

          // ✅ keep backward compatibility with backend that expects "goal"
          goal: form.postType,

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

  const specificUI = getSpecificRequestUI(form.postType);

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

    // ✅ OUTER GRID: LEFT 33% instructions, RIGHT 66% content
    grid: {
      maxWidth: 1100,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "0.5fr 1fr",
      gap: 16,
      alignItems: "start",
    },

    // ✅ RIGHT SIDE: keep your existing 2-column layout (form + output)
    innerGrid: {
      display: "grid",
      gridTemplateColumns: "1fr",
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

    // ✅ instructions styles (layout-only additions)
    stepsWrap: {
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      borderRadius: 14,
      padding: 12,
      lineHeight: 1.5,
      fontSize: 13,
      opacity: 0.92,
    },
    stepTitle: {
      fontWeight: 800,
      textTransform: "uppercase",
      fontSize: 12,
      letterSpacing: 0.6,
      opacity: 0.95,
    },
    stepText: {
      marginTop: 6,
      opacity: 0.9,
    },
    stepDivider: {
      height: 1,
      background: "rgba(255,255,255,0.10)",
      margin: "10px 0",
    },
    tip: {
      marginTop: 12,
      fontSize: 12,
      opacity: 0.75,
      lineHeight: 1.4,
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

      {/* ✅ OUTER: 33% instructions (left) + 66% content (right) */}
      <div style={{ ...styles.grid }} className="ath-grid">
        {/* LEFT: INSTRUCTIONS */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>How it works</h2>
          <p style={styles.cardHint}>
            Fill the form on the right. Generate creates your image + caption +
            hashtags. You get one refinement per post.
          </p>

          <div style={styles.stepsWrap}>
            <div style={styles.stepTitle}>Step 1</div>
            <div style={styles.stepText}>
              Enter your <b>Niche</b> and <b>Audience</b> (required).
            </div>

            <div style={styles.stepDivider} />

            <div style={styles.stepTitle}>Step 2</div>
            <div style={styles.stepText}>
              Choose a <b>Post type</b>. Use “Specific request” only if you have
              real details.
            </div>

            <div style={styles.stepDivider} />

            <div style={styles.stepTitle}>Step 3</div>
            <div style={styles.stepText}>
              Click <b>Generate</b> to create the post.
            </div>

            <div style={styles.stepDivider} />

            <div style={styles.stepTitle}>Step 4</div>
            <div style={styles.stepText}>
              After it generates, you can refine the image <b>once</b>.
            </div>
          </div>

          <div style={styles.tip}>
            Tip: If “Specific request” is blank, we stay generic and safe (no
            invented discounts, dates, or claims).
          </div>
        </div>

        {/* RIGHT: keep your existing two cards (FORM + OUTPUT) */}
        <div style={{ width: "100%" }}>
          <div style={styles.innerGrid} className="ath-innerGrid">
            {/* LEFT (inside right): FORM */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Post generator</h2>
              <p style={styles.cardHint}>
                Start with niche + post type. Add specifics only if you need
                them.
              </p>

              {/* 1) NICHE (first) */}
              {/* Row 1: Niche + Post type (50/50) */}
              <div style={styles.row2} className="ath-row2">
                <div style={styles.field}>
                  {/* 1) NICHE (first) */}
                  <div style={styles.labelRow}>
                    <div style={styles.label}>Niche</div>
                    <div style={styles.pill}>Required</div>
                  </div>
                  <input
                    style={styles.input}
                    value={form.niche}
                    onChange={(e) => updateForm("niche", e.target.value)}
                    placeholder='e.g., "Coffee shop", "Personal trainer", "AI agency"'
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.field}>
                    <div style={styles.labelRow}>
                      <div style={styles.label}>Post type</div>
                      <div style={styles.pill}>Main</div>
                    </div>
                    <select
                      style={styles.select}
                      value={form.postType}
                      onChange={(e) => {
                        updateForm("postType", e.target.value);
                        // optional: clear the specific request when changing types
                        setForm((prev) => ({
                          ...prev,
                          postType: e.target.value,
                        }));
                      }}
                    >
                      {postTypeOptions.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Specific Request (dynamic label) */}
              {specificUI.show ? (
                <div style={styles.field}>
                  <div style={styles.labelRow}>
                    <div style={styles.label}>{specificUI.label}</div>
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
                    placeholder={specificUI.placeholder}
                  />
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                    {specificUI.helper}
                  </div>
                </div>
              ) : null}

              {/* 4) AUDIENCE (required) */}
              <div style={styles.field}>
                <div style={styles.labelRow}>
                  <div style={styles.label}>Audience</div>
                  <div style={styles.pill}>Required</div>
                </div>
                <input
                  style={styles.input}
                  value={form.audience}
                  onChange={(e) => updateForm("audience", e.target.value)}
                  placeholder='e.g., "local homeowners", "gym beginners", "busy moms"'
                />
              </div>

              {/* Tone + Caption length */}
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
              </div>

              {/* Image style + Hashtag count */}
              <div style={styles.row2} className="ath-row2">
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
              </div>

              {/* Brand colors */}
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
                    onChange={(e) =>
                      updateForm("secondaryColor", e.target.value)
                    }
                    style={{ ...styles.input, padding: 4, height: 42 }}
                  />
                  <input
                    type="text"
                    value={form.secondaryColor}
                    onChange={(e) =>
                      updateForm("secondaryColor", e.target.value)
                    }
                    style={{ ...styles.input, marginTop: 6 }}
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              {/* Upload reference image */}
              <div style={styles.field}>
                <div style={styles.labelRow}>
                  <div style={styles.label}>
                    Upload reference image (optional)
                  </div>
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
                  We’ll use this only as a visual reference (colors/vibe). No
                  exact copying.
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
                    !canGenerate
                      ? "Please fill niche + audience"
                      : "Generate post"
                  }
                >
                  {isLoading ? "Generating…" : "Generate"}
                </button>
              </div>

              {statusMsg ? <div style={styles.status}>{statusMsg}</div> : null}
              {errorMsg ? <div style={styles.danger}>{errorMsg}</div> : null}
            </div>
          </div>
        </div>
      </div>

      {/* Responsive overrides (ONLY layout responsiveness) */}
      <style>{`
        @media (max-width: 920px) {
          body { margin: 0; }
          .ath-page { padding: 12px !important; }
          .ath-grid { grid-template-columns: 1fr !important; }      /* ✅ outer stack */
          .ath-innerGrid { grid-template-columns: 1fr !important; } /* ✅ inner stack */
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
