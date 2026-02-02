"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";

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

// Common niche suggestions
const nicheSuggestions = [
  "Coffee Shop", "Restaurant", "Personal Trainer", "Real Estate Agent", "Hair Salon",
  "Dentist", "Chiropractor", "Law Firm", "Accounting Firm", "Marketing Agency",
  "Web Design Agency", "Photography Studio", "Yoga Studio", "Gym", "Spa",
  "Auto Repair Shop", "Landscaping", "Plumber", "Electrician", "HVAC",
  "Pet Grooming", "Veterinarian", "Bakery", "Food Truck", "Catering",
  "Clothing Boutique", "Jewelry Store", "Florist", "Interior Designer", "Architect",
  "Life Coach", "Business Consultant", "Financial Advisor", "Insurance Agent", "Mortgage Broker",
  "AI Agency", "SaaS Company", "E-commerce Store", "Podcast", "YouTube Channel"
];

// Image styles with icons (SVG paths)
const imageStyles = [
  { value: "lifestyle", name: "Natural Lifestyle", description: "Authentic photo, minimal branding.", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", tooltip: "Best for authentic, relatable content. Shows real scenes without heavy branding." },
  { value: "branded_photo", name: "Branded Photo", description: "Photo with brand color frames/accents.", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z", tooltip: "Real photo with decorative frames and accents in your brand colors. No text overlay." },
  { value: "branded_text_photo", name: "Branded + Text", description: "Photo + graphic design + headline.", icon: "M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm2 3v2h2V8H6zm0 4v2h8v-2H6zm10-4v6h2V8h-2z", tooltip: "Maximum brand impact. Combines photo with graphic elements and text overlay." },
  { value: "branded_text_only", name: "Graphic Design", description: "Typography-driven, no photo.", icon: "M4 6h16M4 12h16m-7 6h7M4 18h4", tooltip: "Pure typography and graphics. Great for quotes, announcements, or bold statements." },
];

// Post types with icons and short descriptions
const postTypes = [
  { value: "Basic Post", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", desc: "Simple, general content", tooltip: "A straightforward post about your business. Good for everyday content." },
  { value: "Promotion / Offer", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", desc: "Sales, discounts, deals", tooltip: "Highlight a sale, discount, or special offer to drive conversions." },
  { value: "Service or Product Highlight", icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z", desc: "Showcase what you offer", tooltip: "Feature a specific product or service with details and benefits." },
  { value: "Educational / Tips", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", desc: "Teach your audience", tooltip: "Share knowledge, tips, or how-to content that provides value." },
  { value: "Problem → Solution", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", desc: "Pain point + fix", tooltip: "Identify a common problem your audience faces, then present your solution." },
  { value: "Before & After / Transformation", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4", desc: "Show the change", tooltip: "Showcase results and transformations to demonstrate your impact." },
  { value: "Testimonial / Social Proof", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", desc: "Customer reviews", tooltip: "Share customer feedback, reviews, or success stories to build trust." },
  { value: "Behind the Scenes", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z", desc: "Show your process", tooltip: "Give a peek behind the curtain at how you work. Builds connection." },
  { value: "Announcement / Update", icon: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z", desc: "News & updates", tooltip: "Share news, updates, new launches, or important announcements." },
  { value: "Engagement / Conversation Starter", icon: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z", desc: "Start a conversation", tooltip: "Ask questions or spark discussion to boost engagement and comments." },
  { value: "Seasonal / Timely", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", desc: "Holiday & events", tooltip: "Tie your content to holidays, seasons, or current events." },
  { value: "Authority / Credibility", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z", desc: "Build trust", tooltip: "Establish expertise with credentials, awards, or industry knowledge." },
  { value: "Custom (Advanced)", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", desc: "Full control", tooltip: "Write your own detailed instructions for maximum customization." },
];

const toneOptions = [
  "Confident", "Friendly", "Playful", "Professional", "Luxury", "Minimal",
  "Bold", "Witty", "Inspirational", "Educational", "Direct", "Warm",
  "Premium", "Cozy", "Energetic", "Modern", "Rustic", "Casual",
  "Hype (but not cringe)", "Storytelling",
];

const MAX_SPECIFIC_REQUEST_CHARS = 180;

function getSpecificRequestUI(postType: string) {
  switch (postType) {
    case "Promotion / Offer": return { show: true, label: "What is your promotion?", placeholder: `e.g., "Buy 2 get 1 free" or "20% off this week"`, helper: "Leave blank for a generic promotion." };
    case "Testimonial / Social Proof": return { show: true, label: "Paste the testimonial", placeholder: `e.g., "Best service we've ever had!"`, helper: "We'll format it naturally." };
    case "Announcement / Update": return { show: true, label: "What are you announcing?", placeholder: `e.g., "New location opening Feb 10"`, helper: "Details go in caption, image stays branded." };
    case "Seasonal / Timely": return { show: true, label: "What season/event?", placeholder: `e.g., "Valentine's Day", "Spring cleaning"`, helper: "We'll keep it timely." };
    case "Educational / Tips": return { show: true, label: "Specific tip to share?", placeholder: `e.g., "Simple maintenance tip"`, helper: "Leave blank for generic educational post." };
    case "Problem → Solution": return { show: true, label: "What problem to call out?", placeholder: `e.g., "leaky faucet", "slow website"`, helper: "Leave blank for common pain point." };
    case "Before & After / Transformation": return { show: true, label: "What transformation?", placeholder: `e.g., "messy → organized closet"`, helper: "We'll generate a safe visual." };
    case "Custom (Advanced)": return { show: true, label: "Describe exactly what you want", placeholder: `e.g., "Girl serving coffee, warm lighting, mention buy 2 get 1"`, helper: "Full control over caption + image." };
    default: return { show: true, label: "Anything specific?", placeholder: `e.g., "Mention free inspection"`, helper: "Leave blank to keep it clean and generic." };
  }
}

// Tooltip component
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 8, background: "#1a2744", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 12px", fontSize: 12, lineHeight: 1.4, width: 200, zIndex: 1000, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
          {text}
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid #1a2744" }} />
        </div>
      )}
    </span>
  );
}

export default function Page() {
  const [form, setForm] = useState<FormState>({
    niche: "", audience: "", postType: "Basic Post", specificRequest: "", tone: "Confident",
    captionLength: "Medium", hashtagCount: 12, imageStyle: "lifestyle", primaryColor: "#000000", secondaryColor: "#ffffff",
  });

  const [uploadRef, setUploadRef] = useState<UploadRef | null>(null);
  const [uploadError, setUploadError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [dayContext, setDayContext] = useState<{ day: string; title: string; detail: string } | null>(null);
  const [autogenRequested, setAutogenRequested] = useState(false);

  // Niche autocomplete
  const [showNicheSuggestions, setShowNicheSuggestions] = useState(false);
  const [filteredNiches, setFilteredNiches] = useState<string[]>([]);
  const nicheInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Load saved form from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ath_form");
      if (saved) setForm((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}
  }, []);

  // Save form to localStorage
  useEffect(() => {
    try { localStorage.setItem("ath_form", JSON.stringify(form)); } catch {}
  }, [form]);

  // Read URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("autogen") === "1") setAutogenRequested(true);
    const updates: Partial<FormState> = {};
    if (params.get("niche")) updates.niche = params.get("niche")!;
    if (params.get("audience")) updates.audience = params.get("audience")!;
    if (params.get("tone")) updates.tone = params.get("tone")!;
    if (params.get("postType") || params.get("goal")) updates.postType = (params.get("postType") || params.get("goal"))!;
    if (params.get("specificRequest")) updates.specificRequest = params.get("specificRequest")!;
    if (params.get("captionLength")) updates.captionLength = params.get("captionLength") as FormState["captionLength"];
    if (params.get("hashtagCount")) updates.hashtagCount = Number(params.get("hashtagCount"));
    if (params.get("imageStyle")) updates.imageStyle = params.get("imageStyle")!;
    if (params.get("primaryColor")) updates.primaryColor = params.get("primaryColor")!;
    if (params.get("secondaryColor")) updates.secondaryColor = params.get("secondaryColor")!;
    if (Object.keys(updates).length) setForm((prev) => ({ ...prev, ...updates }));
    const day = params.get("day"), title = params.get("title"), detail = params.get("detail");
    if (day && title && detail) setDayContext({ day, title, detail });
  }, []);

  // Fire autogen
  useEffect(() => {
    if (!autogenRequested || !dayContext || !form.niche.trim() || !form.audience.trim()) return;
    setAutogenRequested(false);
    generatePost();
  }, [autogenRequested, dayContext, form.niche, form.audience]);

  // Filter niche suggestions
  useEffect(() => {
    if (form.niche.length > 0) {
      const filtered = nicheSuggestions.filter(n => n.toLowerCase().includes(form.niche.toLowerCase())).slice(0, 6);
      setFilteredNiches(filtered);
    } else {
      setFilteredNiches(nicheSuggestions.slice(0, 6));
    }
  }, [form.niche]);

  const canGenerate = useMemo(() => form.niche.trim().length > 0 && form.audience.trim().length > 0, [form.niche, form.audience]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Handle file from input or drop
  function handleFile(file: File) {
    setUploadError("");
    if (!file.type.startsWith("image/")) { setUploadError("Please upload an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setUploadError("Image too large. Max 2MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setUploadRef({ name: file.name, mime: file.type, dataUrl: String(reader.result || "") });
    reader.onerror = () => setUploadError("Failed to read image.");
    reader.readAsDataURL(file);
  }

  async function handleUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  // Drag and drop handlers
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave(e: React.DragEvent) { e.preventDefault(); setIsDragging(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function generatePost() {
    setIsLoading(true);
    setErrorMsg("");
    setStatusMsg("Redirecting…");
    try {
      const sp = new URLSearchParams();
      sp.set("niche", form.niche);
      sp.set("audience", form.audience);
      sp.set("postType", form.postType);
      sp.set("goal", form.postType);
      if (form.specificRequest) sp.set("specificRequest", form.specificRequest);
      sp.set("tone", form.tone);
      sp.set("captionLength", form.captionLength);
      sp.set("hashtagCount", String(form.hashtagCount));
      sp.set("imageStyle", form.imageStyle);
      sp.set("primaryColor", form.primaryColor);
      sp.set("secondaryColor", form.secondaryColor);
      if (dayContext?.day) sp.set("day", dayContext.day);
      if (dayContext?.title) sp.set("title", dayContext.title);
      if (dayContext?.detail) sp.set("detail", dayContext.detail);
      if (uploadRef?.dataUrl) {
        try {
          sessionStorage.setItem("ath_reference_image_dataurl", uploadRef.dataUrl);
          sessionStorage.setItem("ath_reference_image_name", uploadRef.name || "");
          sessionStorage.setItem("ath_reference_image_mime", uploadRef.mime || "");
          sp.set("hasRef", "1");
        } catch {}
      } else {
        try {
          sessionStorage.removeItem("ath_reference_image_dataurl");
          sessionStorage.removeItem("ath_reference_image_name");
          sessionStorage.removeItem("ath_reference_image_mime");
        } catch {}
      }
      sp.set("autogen", "1");
      window.location.href = `/post?${sp.toString()}`;
    } catch (err: any) {
      setStatusMsg("");
      setErrorMsg(err?.message || "Failed to redirect.");
      setIsLoading(false);
    }
  }

  const specificUI = getSpecificRequestUI(form.postType);
  const getHashtagLabel = (count: number) => {
    if (count === 0) return "None";
    if (count <= 5) return "Few";
    if (count <= 12) return "Standard";
    if (count <= 20) return "Many";
    return "Maximum";
  };

  // Character count color
  const getCharCountColor = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio >= 1) return "#ff6b6b";
    if (ratio >= 0.8) return "#ffd93d";
    return "rgba(255,255,255,0.5)";
  };

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#0b1220", color: "#e6edf7", padding: 20, paddingBottom: 100, boxSizing: "border-box", fontFamily: "Verdana, Geneva, sans-serif" },
    header: { maxWidth: 900, margin: "0 auto 16px auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
    title: { fontSize: 28, fontWeight: 600, letterSpacing: 1, margin: 0, textTransform: "uppercase" },
    subtitle: { margin: 0, opacity: 0.75, fontSize: 14, fontWeight: 400 },
    helpBtn: { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 14px", color: "#e6edf7", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s ease" },
    container: { maxWidth: 900, margin: "0 auto" },
    card: { background: "#101a33", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.28)", marginBottom: 16, transition: "all 0.15s ease" },
    cardTitle: { margin: "0 0 4px 0", fontSize: 16, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 },
    cardHint: { margin: "0 0 16px 0", opacity: 0.6, fontSize: 13 },
    field: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: 700, marginBottom: 8, opacity: 0.9, display: "flex", alignItems: "center", gap: 8 },
    pill: { fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "rgba(44, 107, 237, 0.2)", color: "#7eb3ff", fontWeight: 600 },
    input: { width: "100%", background: "#0b1220", color: "#e6edf7", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", outline: "none", fontSize: 14, boxSizing: "border-box", transition: "border-color 0.15s ease" },
    select: { width: "100%", background: "#0b1220", color: "#e6edf7", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", outline: "none", fontSize: 14, boxSizing: "border-box" },
    row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },

    // Autocomplete
    autocompleteWrap: { position: "relative" as const },
    suggestions: { position: "absolute" as const, top: "100%", left: 0, right: 0, background: "#1a2744", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, marginTop: 4, zIndex: 50, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" },
    suggestionItem: { padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.08)", transition: "background 0.1s ease" },
    suggestionHint: { padding: "8px 14px", fontSize: 11, opacity: 0.6, background: "rgba(0,0,0,0.2)" },

    // Post type cards
    postTypeGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 },
    postTypeCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 10px", cursor: "pointer", transition: "all 0.15s ease", textAlign: "center" as const },
    postTypeCardSelected: { background: "rgba(44, 107, 237, 0.15)", border: "1px solid rgba(44, 107, 237, 0.5)" },
    postTypeIcon: { width: 24, height: 24, margin: "0 auto 6px auto", opacity: 0.8 },
    postTypeName: { fontSize: 11, fontWeight: 600, lineHeight: 1.2, color: "#e6edf7" },

    // Image style cards
    styleCardGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
    styleCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14, cursor: "pointer", transition: "all 0.15s ease", textAlign: "center" as const, position: "relative" as const },
    styleCardSelected: { background: "rgba(44, 107, 237, 0.15)", border: "1px solid rgba(44, 107, 237, 0.5)" },
    styleCardIcon: { width: 32, height: 32, margin: "0 auto 8px auto", opacity: 0.9 },
    styleCardName: { fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#e6edf7" },
    styleCardDesc: { fontSize: 10, opacity: 0.6, lineHeight: 1.3 },
    checkmark: { position: "absolute" as const, top: 8, right: 8, width: 18, height: 18, background: "#2c6bed", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },

    // Color picker
    colorPickerRow: { display: "flex", alignItems: "center", gap: 8 },
    colorSwatch: { width: 42, height: 42, borderRadius: 8, border: "2px solid rgba(255,255,255,0.15)", cursor: "pointer", flexShrink: 0 },
    colorInput: { flex: 1, background: "#0b1220", color: "#e6edf7", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 12px", fontSize: 14 },

    // Hashtag slider
    sliderContainer: { marginTop: 8 },
    sliderLabels: { display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.5, marginBottom: 4 },
    slider: { width: "100%", accentColor: "#2c6bed" },
    sliderValue: { textAlign: "center" as const, marginTop: 4, fontSize: 13, fontWeight: 600 },

    // Drag and drop
    dropZone: { border: "2px dashed rgba(255,255,255,0.2)", borderRadius: 12, padding: 24, textAlign: "center" as const, cursor: "pointer", transition: "all 0.15s ease", background: "rgba(255,255,255,0.02)" },
    dropZoneActive: { borderColor: "#2c6bed", background: "rgba(44, 107, 237, 0.1)" },

    // Buttons
    primaryBtn: { width: "100%", borderRadius: 12, border: "none", background: canGenerate ? "#2c6bed" : "rgba(255,255,255,0.10)", color: canGenerate ? "#ffffff" : "rgba(255,255,255,0.4)", padding: "16px 20px", fontWeight: 800, fontSize: 16, cursor: canGenerate ? "pointer" : "not-allowed", transition: "all 0.15s ease" },
    secondaryBtn: { borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#e6edf7", padding: "10px 14px", fontWeight: 600, cursor: "pointer", fontSize: 13, transition: "all 0.15s ease" },
    danger: { marginTop: 12, border: "1px solid rgba(255, 99, 99, 0.35)", background: "rgba(255, 99, 99, 0.12)", color: "#ffd7d7", borderRadius: 10, padding: "10px 12px", fontSize: 13 },
    status: { marginTop: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#e6edf7", borderRadius: 10, padding: "10px 12px", fontSize: 13 },

    // Sticky footer
    stickyFooter: { position: "fixed" as const, bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, #0b1220 20%)", padding: "20px 20px 20px 20px", zIndex: 100 },
    stickyInner: { maxWidth: 900, margin: "0 auto" },

    // Modal
    instructionsOverlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    instructionsModal: { background: "#101a33", borderRadius: 16, padding: 24, maxWidth: 500, width: "100%", maxHeight: "80vh", overflow: "auto" },
    instructionsClose: { float: "right" as const, background: "none", border: "none", color: "#e6edf7", fontSize: 24, cursor: "pointer", padding: 0, lineHeight: 1 },
    step: { display: "flex", gap: 12, marginBottom: 16 },
    stepNum: { width: 28, height: 28, borderRadius: "50%", background: "#2c6bed", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 },
    stepContent: { flex: 1 },
    stepTitle: { fontWeight: 700, marginBottom: 4 },
    stepText: { fontSize: 13, opacity: 0.8, lineHeight: 1.4 },

    // Preview
    previewCard: { background: "rgba(44, 107, 237, 0.08)", border: "1px solid rgba(44, 107, 237, 0.2)", borderRadius: 12, padding: 16, marginBottom: 20 },
    previewTitle: { fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 12, opacity: 0.8 },
    previewGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 },
    previewItem: { fontSize: 12 },
    previewLabel: { opacity: 0.6, marginBottom: 2 },
    previewValue: { fontWeight: 600 },

    // Tooltip icon
    tooltipIcon: { width: 16, height: 16, opacity: 0.5, cursor: "help", marginLeft: 4 },
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Generate a Post</h1>
          <p style={styles.subtitle}>AI-powered image + caption + hashtags</p>
        </div>
        <button style={styles.helpBtn} onClick={() => setShowInstructions(true)} className="hover-btn">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          How it works
        </button>
      </div>

      <div style={styles.container}>
        {/* Main Form */}
        <div style={styles.card} className="hover-card">
          <h2 style={styles.cardTitle}>Your Business</h2>
          <p style={styles.cardHint}>Tell us about your business and audience</p>

          <div style={styles.row2} className="ath-row2">
            <div style={styles.field}>
              <div style={styles.label}>
                Niche <span style={styles.pill}>Required</span>
                <Tooltip text="Your business type or industry. Be specific for better results.">
                  <svg style={styles.tooltipIcon} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Tooltip>
              </div>
              <div style={styles.autocompleteWrap}>
                <input
                  ref={nicheInputRef}
                  style={styles.input}
                  value={form.niche}
                  onChange={(e) => updateForm("niche", e.target.value)}
                  onFocus={() => setShowNicheSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowNicheSuggestions(false), 150)}
                  placeholder='Type or select a niche...'
                  className="hover-input"
                />
                {showNicheSuggestions && filteredNiches.length > 0 && (
                  <div style={styles.suggestions}>
                    <div style={styles.suggestionHint}>Suggestions (or type your own)</div>
                    {filteredNiches.map((n) => (
                      <div key={n} style={styles.suggestionItem} className="hover-suggestion" onMouseDown={() => { updateForm("niche", n); setShowNicheSuggestions(false); }}>{n}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={styles.field}>
              <div style={styles.label}>
                Audience <span style={styles.pill}>Required</span>
                <Tooltip text="Who you're trying to reach. The more specific, the better your content.">
                  <svg style={styles.tooltipIcon} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Tooltip>
              </div>
              <input style={styles.input} value={form.audience} onChange={(e) => updateForm("audience", e.target.value)} placeholder='e.g., "local homeowners", "busy moms"' className="hover-input" />
            </div>
          </div>
        </div>

        {/* Post Type Cards */}
        <div style={styles.card} className="hover-card">
          <h2 style={styles.cardTitle}>Post Type</h2>
          <p style={styles.cardHint}>What kind of post do you want to create?</p>
          <div style={styles.postTypeGrid} className="ath-postTypeGrid">
            {postTypes.map((pt) => (
              <Tooltip key={pt.value} text={pt.tooltip}>
                <div
                  style={{ ...styles.postTypeCard, ...(form.postType === pt.value ? styles.postTypeCardSelected : {}) }}
                  onClick={() => updateForm("postType", pt.value)}
                  className="hover-card-item"
                >
                  <svg style={styles.postTypeIcon} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={pt.icon} /></svg>
                  <div style={styles.postTypeName}>{pt.value.split(" / ")[0]}</div>
                </div>
              </Tooltip>
            ))}
          </div>

          {specificUI.show && (
            <div style={{ ...styles.field, marginTop: 16 }}>
              <div style={styles.label}>
                {specificUI.label}
                <span style={{ ...styles.pill, background: "rgba(255,255,255,0.1)", color: getCharCountColor(form.specificRequest.length, MAX_SPECIFIC_REQUEST_CHARS) }}>
                  {form.specificRequest.length}/{MAX_SPECIFIC_REQUEST_CHARS}
                </span>
              </div>
              <input style={styles.input} value={form.specificRequest} onChange={(e) => updateForm("specificRequest", e.target.value.slice(0, MAX_SPECIFIC_REQUEST_CHARS))} placeholder={specificUI.placeholder} className="hover-input" />
              <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6 }}>{specificUI.helper}</div>
            </div>
          )}
        </div>

        {/* Image Style */}
        <div style={styles.card} className="hover-card">
          <h2 style={styles.cardTitle}>Image Style</h2>
          <p style={styles.cardHint}>Choose how your image will look</p>
          <div style={styles.styleCardGrid} className="ath-styleCardGrid">
            {imageStyles.map((s) => (
              <Tooltip key={s.value} text={s.tooltip}>
                <div
                  style={{ ...styles.styleCard, ...(form.imageStyle === s.value ? styles.styleCardSelected : {}) }}
                  onClick={() => updateForm("imageStyle", s.value)}
                  className="hover-card-item"
                >
                  {form.imageStyle === s.value && (
                    <div style={styles.checkmark}>
                      <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                  <svg style={styles.styleCardIcon} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={s.icon} /></svg>
                  <div style={styles.styleCardName}>{s.name}</div>
                  <div style={styles.styleCardDesc}>{s.description}</div>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Caption Settings */}
        <div style={styles.card} className="hover-card">
          <h2 style={styles.cardTitle}>Caption Settings</h2>
          <p style={styles.cardHint}>Customize your caption and hashtags</p>
          <div style={styles.row2} className="ath-row2">
            <div style={styles.field}>
              <div style={styles.label}>
                Tone
                <Tooltip text="The voice and personality of your caption. Match it to your brand.">
                  <svg style={styles.tooltipIcon} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Tooltip>
              </div>
              <select style={styles.select} value={form.tone} onChange={(e) => updateForm("tone", e.target.value)}>
                {toneOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <div style={styles.label}>
                Caption Length
                <Tooltip text="Short for quick hits, Long for storytelling or detailed info.">
                  <svg style={styles.tooltipIcon} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Tooltip>
              </div>
              <select style={styles.select} value={form.captionLength} onChange={(e) => updateForm("captionLength", e.target.value as FormState["captionLength"])}>
                <option value="Short">Short (1-2 sentences)</option>
                <option value="Medium">Medium (3-4 sentences)</option>
                <option value="Long">Long (5+ sentences)</option>
              </select>
            </div>
          </div>
          <div style={styles.field}>
            <div style={styles.label}>
              Hashtag Count
              <Tooltip text="More hashtags = more reach, but can look spammy. 10-15 is usually ideal.">
                <svg style={styles.tooltipIcon} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Tooltip>
            </div>
            <div style={styles.sliderContainer}>
              <div style={styles.sliderLabels}><span>None</span><span>Few</span><span>Standard</span><span>Many</span><span>Max</span></div>
              <input style={styles.slider} type="range" min={0} max={30} value={form.hashtagCount} onChange={(e) => updateForm("hashtagCount", Number(e.target.value))} />
              <div style={styles.sliderValue}>{form.hashtagCount} hashtags ({getHashtagLabel(form.hashtagCount)})</div>
            </div>
          </div>
        </div>

        {/* Brand Colors */}
        <div style={styles.card} className="hover-card">
          <h2 style={styles.cardTitle}>Brand Colors</h2>
          <p style={styles.cardHint}>Used for branded image styles</p>
          <div style={styles.row2} className="ath-row2">
            <div style={styles.field}>
              <div style={styles.label}>Primary Color</div>
              <div style={styles.colorPickerRow}>
                <input type="color" value={form.primaryColor} onChange={(e) => updateForm("primaryColor", e.target.value)} style={{ ...styles.colorSwatch, background: form.primaryColor }} />
                <input type="text" value={form.primaryColor} onChange={(e) => updateForm("primaryColor", e.target.value)} style={styles.colorInput} placeholder="#000000" />
              </div>
            </div>
            <div style={styles.field}>
              <div style={styles.label}>Secondary Color</div>
              <div style={styles.colorPickerRow}>
                <input type="color" value={form.secondaryColor} onChange={(e) => updateForm("secondaryColor", e.target.value)} style={{ ...styles.colorSwatch, background: form.secondaryColor }} />
                <input type="text" value={form.secondaryColor} onChange={(e) => updateForm("secondaryColor", e.target.value)} style={styles.colorInput} placeholder="#ffffff" />
              </div>
            </div>
          </div>
        </div>

        {/* Reference Image - Drag & Drop */}
        <div style={styles.card} className="hover-card">
          <h2 style={styles.cardTitle}>Reference Image</h2>
          <p style={styles.cardHint}>Optional: Upload an image for visual inspiration</p>

          <div
            ref={dropRef}
            style={{ ...styles.dropZone, ...(isDragging ? styles.dropZoneActive : {}) }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input id="file-input" type="file" accept="image/*" onChange={handleUploadChange} style={{ display: "none" }} />
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ opacity: 0.5, marginBottom: 8 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              {isDragging ? "Drop image here" : "Drag & drop an image here"}
            </div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>or click to browse (max 2MB)</div>
          </div>

          {uploadRef && (
            <div style={{ marginTop: 12 }}>
              <img src={uploadRef.dataUrl} alt="Reference" style={{ width: "100%", maxHeight: 150, objectFit: "cover", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)" }} />
              <button style={{ ...styles.secondaryBtn, marginTop: 8, width: "100%" }} onClick={() => setUploadRef(null)} className="hover-btn">Remove</button>
            </div>
          )}
          {uploadError && <div style={styles.danger}>{uploadError}</div>}
        </div>

        {dayContext && (
          <div style={{ ...styles.card, background: "rgba(44, 107, 237, 0.1)" }}>
            <strong>Calendar: Day {dayContext.day}</strong><br />{dayContext.title} — {dayContext.detail}
          </div>
        )}

        {statusMsg && <div style={styles.status}>{statusMsg}</div>}
        {errorMsg && <div style={styles.danger}>{errorMsg}</div>}

        {/* Live Preview - moved to bottom */}
        <div style={styles.previewCard}>
          <div style={styles.previewTitle}>Your settings summary</div>
          <div style={styles.previewGrid}>
            <div style={styles.previewItem}><div style={styles.previewLabel}>Post Type</div><div style={styles.previewValue}>{form.postType}</div></div>
            <div style={styles.previewItem}><div style={styles.previewLabel}>Image Style</div><div style={styles.previewValue}>{imageStyles.find(s => s.value === form.imageStyle)?.name}</div></div>
            <div style={styles.previewItem}><div style={styles.previewLabel}>Tone</div><div style={styles.previewValue}>{form.tone}</div></div>
            <div style={styles.previewItem}><div style={styles.previewLabel}>Caption</div><div style={styles.previewValue}>{form.captionLength} · {form.hashtagCount} hashtags</div></div>
          </div>
        </div>
      </div>

      {/* Sticky Generate Button */}
      <div style={styles.stickyFooter}>
        <div style={styles.stickyInner}>
          <button style={styles.primaryBtn} onClick={generatePost} disabled={!canGenerate || isLoading} className="hover-btn-primary">
            {isLoading ? "Generating…" : canGenerate ? "Generate Post" : "Fill in Niche & Audience to Generate"}
          </button>
        </div>
      </div>

      {/* Instructions Modal */}
      {showInstructions && (
        <div style={styles.instructionsOverlay} onClick={() => setShowInstructions(false)}>
          <div style={styles.instructionsModal} onClick={(e) => e.stopPropagation()}>
            <button style={styles.instructionsClose} onClick={() => setShowInstructions(false)}>×</button>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 20 }}>How it works</h2>
            <div style={styles.step}><div style={styles.stepNum}>1</div><div style={styles.stepContent}><div style={styles.stepTitle}>Enter your business info</div><div style={styles.stepText}>Add your niche and target audience. These are required.</div></div></div>
            <div style={styles.step}><div style={styles.stepNum}>2</div><div style={styles.stepContent}><div style={styles.stepTitle}>Choose your post type</div><div style={styles.stepText}>Pick what kind of content you want. Add specific details if needed.</div></div></div>
            <div style={styles.step}><div style={styles.stepNum}>3</div><div style={styles.stepContent}><div style={styles.stepTitle}>Customize the style</div><div style={styles.stepText}>Select image style, tone, and brand colors.</div></div></div>
            <div style={styles.step}><div style={styles.stepNum}>4</div><div style={styles.stepContent}><div style={styles.stepTitle}>Generate & refine</div><div style={styles.stepText}>Click generate. You get one refinement per post if needed.</div></div></div>
            <div style={{ marginTop: 20, padding: 12, background: "rgba(255,255,255,0.05)", borderRadius: 8, fontSize: 12, opacity: 0.8 }}>
              <strong>Tip:</strong> Leave "specific request" blank to keep posts generic and safe (no invented discounts or claims).
            </div>
          </div>
        </div>
      )}

      {/* CSS for hover effects and animations */}
      <style>{`
        .hover-card:hover { border-color: rgba(255,255,255,0.15); transform: translateY(-1px); }
        .hover-card-item:hover { background: rgba(255,255,255,0.08) !important; transform: scale(1.02); }
        .hover-btn:hover { background: rgba(255,255,255,0.12) !important; }
        .hover-btn-primary:hover { background: #3d7cf7 !important; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(44, 107, 237, 0.4); }
        .hover-input:focus { border-color: rgba(44, 107, 237, 0.5) !important; }
        .hover-suggestion:hover { background: rgba(44, 107, 237, 0.2) !important; }

        @media (max-width: 768px) {
          .ath-row2 { grid-template-columns: 1fr !important; }
          .ath-styleCardGrid { grid-template-columns: repeat(2, 1fr) !important; }
          .ath-postTypeGrid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .ath-postTypeGrid { grid-template-columns: repeat(2, 1fr) !important; }
          .ath-styleCardGrid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
