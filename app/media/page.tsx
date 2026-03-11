"use client";

import React, { useState, useEffect, useRef } from "react";
import { useToast } from "../_components/ToastProvider";
import { resizePhotoForStorage } from "../lib/photoTreatments";
import { saveImage } from "../lib/imageStorage";

type MediaAsset = {
  id: string;
  name: string | null;
  imageBase64: string;
  createdAt: string;
};

type BrandProfile = {
  id: string;
  name: string;
  niche: string;
  audience: string;
  tone: string;
  captionLength: string;
  hashtagCount: number;
  primaryColor: string;
  secondaryColor: string;
  logoBase64?: string;
  website?: string;
  phone?: string;
};

const nicheOptions = [
  { value: "Real Estate Agent", label: "Real Estate Agent" },
  { value: "Fitness Coach", label: "Fitness Coach" },
  { value: "Restaurant Owner", label: "Restaurant Owner" },
];

const toneOptions = [
  "Confident","Friendly","Playful","Professional","Luxury","Minimal","Bold",
  "Witty","Inspirational","Educational","Direct","Warm","Energetic","Casual","Storytelling",
];

const TREATMENT_OPTIONS = [
  {
    id: "raw",
    label: "Raw Photo",
    desc: "Your photo as-is. No overlays.",
    icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    id: "photo_text",
    label: "Photo + Text",
    desc: "Your photo with a caption preview overlay.",
    icon: "M4 6h16M4 12h16M4 18h7",
  },
  {
    id: "branding_photo",
    label: "Lifestyle + Branding",
    desc: "Your photo with your logo and contact info. No text overlay.",
    icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
  },
  {
    id: "brand_photo_text",
    label: "Branding + Photo + Text",
    desc: "Your photo with brand colors, logo, and text.",
    icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
  },
];

export default function MediaPage() {
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Plan Post modal state
  const [planAsset, setPlanAsset] = useState<MediaAsset | null>(null);
  const [planStep, setPlanStep] = useState(1); // 1=details, 2=schedule, 3=treatment
  const [planNiche, setPlanNiche] = useState("Real Estate Agent");
  const [planAudience, setPlanAudience] = useState("");
  const [planTone, setPlanTone] = useState("Confident");
  const [planTopic, setPlanTopic] = useState("");
  const [planDay, setPlanDay] = useState<number | null>(null);
  const [planCaptionLength, setPlanCaptionLength] = useState("Medium");
  const [planHashtagCount, setPlanHashtagCount] = useState(12);
  const [planTreatment, setPlanTreatment] = useState("raw");
  const [planGenerating, setPlanGenerating] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);
  const [planSavedDay, setPlanSavedDay] = useState<number | null>(null);
  const [activeBrandProfile, setActiveBrandProfile] = useState<BrandProfile | null>(null);
  const today = new Date();
  const todayDay = today.getDate();

  // Load assets
  useEffect(() => {
    fetchAssets();
    loadBrandProfile();
  }, []);

  function loadBrandProfile() {
    try {
      const raw = localStorage.getItem("ath_active_brand_profile");
      if (raw) {
        const p = JSON.parse(raw);
        setActiveBrandProfile(p);
        setPlanNiche(p.niche || "Real Estate Agent");
        setPlanAudience(p.audience || "");
        setPlanTone(p.tone || "Confident");
        setPlanCaptionLength(p.captionLength || "Medium");
        setPlanHashtagCount(p.hashtagCount ?? 12);
      }
    } catch {}
  }

  async function fetchAssets() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/media-assets");
      const data = await res.json();
      setAssets(data.assets ?? []);
    } catch {
      addToast("Failed to load media library", "error");
    } finally {
      setIsLoading(false);
    }
  }

  const MAX_PHOTOS = 10;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;

    const slotsAvailable = MAX_PHOTOS - assets.length;
    if (slotsAvailable <= 0) {
      addToast(`You've reached the 10-photo limit. Delete some photos to upload more.`, "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const toUpload = files.slice(0, slotsAvailable);
    if (files.length > slotsAvailable) {
      addToast(`Only ${slotsAvailable} slot${slotsAvailable !== 1 ? "s" : ""} remaining — uploading first ${slotsAvailable}.`, "warning");
    }

    setIsUploading(true);
    let succeeded = 0;
    try {
      for (const file of toUpload) {
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              const raw = ev.target?.result as string;
              const resized = await resizePhotoForStorage(raw);
              const res = await fetch("/api/media-assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: file.name.replace(/\.[^.]+$/, ""), imageBase64: resized }),
              });
              if (res.ok) succeeded++;
            } catch {}
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }
      await fetchAssets();
      if (succeeded > 0) addToast(`${succeeded} photo${succeeded !== 1 ? "s" : ""} uploaded!`, "success");
      if (succeeded < toUpload.length) addToast("Some uploads failed. Please try again.", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/media-assets/${id}`, { method: "DELETE" });
      setAssets((prev) => prev.filter((a) => a.id !== id));
      addToast("Photo deleted", "success");
    } catch {
      addToast("Delete failed", "error");
    } finally {
      setDeletingId(null);
    }
  }

  function openPlanModal(asset: MediaAsset) {
    setPlanAsset(asset);
    setPlanStep(1);
    setPlanTopic("");
    setPlanDay(null);
    setPlanTreatment("raw");
    setPlanSaved(false);
    setPlanSavedDay(null);
    loadBrandProfile();
  }

  function closePlanModal() {
    setPlanAsset(null);
    setPlanStep(1);
    setPlanSaved(false);
    setPlanSavedDay(null);
  }

  async function handleSaveToCalendar() {
    if (!planAsset) return;
    setPlanGenerating(true);
    try {
      const postId = `media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // 1. Save raw photo to IndexedDB so calendar can display it
      await saveImage(postId, planAsset.imageBase64);

      // 2. Build the planned post record
      const plannedPost = {
        id: postId,
        calendarDay: planDay ?? undefined,
        month,
        hasImage: true,
        caption: planTopic,  // topic stored in caption field
        hashtags: JSON.stringify({ captionLength: planCaptionLength, hashtagCount: planHashtagCount }),
        postType: "Media: Planned",
        imageStyle: planTreatment,
        tone: planTone,
        niche: planNiche,
        audience: planAudience,
        createdAt: now.toISOString(),
      };

      // 3. Save to localStorage gallery so calendar shows it immediately
      if (planDay) {
        try {
          const gallery: any[] = JSON.parse(localStorage.getItem("ath_gallery") || "[]");
          // Remove any existing post for this day+month so planned post replaces it
          const filtered = gallery.filter(
            (p) => !(p.calendarDay === planDay && p.month === month)
          );
          filtered.unshift(plannedPost);
          localStorage.setItem("ath_gallery", JSON.stringify(filtered));
        } catch {}
      }

      // 4. Persist to DB (imageBase64 included for cross-device access)
      const saveRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...plannedPost, imageBase64: planAsset.imageBase64 }),
      });
      if (!saveRes.ok) throw new Error("Failed to save post");

      setPlanSavedDay(planDay);
      setPlanSaved(true);
    } catch (err: any) {
      addToast(err?.message || "Something went wrong", "error");
    } finally {
      setPlanGenerating(false);
    }
  }

  const s = styles;

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Media Library</h1>
          <p style={s.subtitle}>Upload your photos and plan posts from them</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/dashboard" style={s.dashBtn}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </a>
          <a href="/calendar" style={{ ...s.dashBtn, color: "#a78bfa", borderColor: "rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.1)" }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Calendar
          </a>
          <button
            style={{ ...s.uploadBtn, opacity: (isUploading || assets.length >= 10) ? 0.6 : 1 }}
            onClick={() => {
              if (assets.length >= 10) {
                addToast("You've reached the 10-photo limit. Delete some photos to upload more.", "error");
                return;
              }
              fileInputRef.current?.click();
            }}
            disabled={isUploading}
          >
            {isUploading ? "Uploading…" : (
              <>
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {assets.length >= 10 ? "Limit Reached (10/10)" : `Upload Photos (${assets.length}/10)`}
              </>
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFileChange} />
        </div>
      </div>

      {/* Grid */}
      <div style={s.container}>
        {isLoading ? (
          <div style={s.empty}>Loading your photos…</div>
        ) : assets.length === 0 ? (
          <div style={s.emptyCard}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🖼️</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No photos yet</div>
            <div style={{ opacity: 0.6, marginBottom: 20 }}>Upload your first photo to get started</div>
            <button style={s.uploadBtn} onClick={() => fileInputRef.current?.click()}>
              Upload Photos
            </button>
          </div>
        ) : (
          <div style={s.grid}>
            {assets.map((asset) => (
              <div key={asset.id} style={s.card}>
                <div style={s.imgWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.imageBase64} alt={asset.name ?? "photo"} style={s.img} />
                </div>
                <div style={s.cardBody}>
                  <div style={s.cardName}>{asset.name ?? "Untitled"}</div>
                  <div style={s.cardDate}>{new Date(asset.createdAt).toLocaleDateString()}</div>
                  <div style={s.cardActions}>
                    <button style={s.planBtn} onClick={() => openPlanModal(asset)}>
                      Plan Post
                    </button>
                    <button
                      style={s.deleteBtn}
                      onClick={() => handleDelete(asset.id)}
                      disabled={deletingId === asset.id}
                      title="Delete"
                    >
                      {deletingId === asset.id ? "…" : (
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan Post Modal */}
      {planAsset && (
        <div style={s.overlay} onClick={closePlanModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div style={s.modalHeader}>
              <div>
                <div style={s.modalTitle}>Plan a Post</div>
                <div style={s.modalStepLabel}>Step {planStep} of 3</div>
              </div>
              <button style={s.closeBtn} onClick={closePlanModal}>×</button>
            </div>

            {/* Step dots */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {[1, 2, 3].map((n) => (
                <div key={n} style={{
                  width: n === planStep ? 28 : 10, height: 10, borderRadius: 6,
                  background: n < planStep ? "linear-gradient(135deg,#22c55e,#16a34a)" :
                    n === planStep ? "linear-gradient(135deg,#2c6bed,#7c3aed)" :
                    "rgba(255,255,255,0.15)",
                  transition: "all 0.2s",
                }} />
              ))}
            </div>

            {/* Step 1: Post Details */}
            {planStep === 1 && !planSaved && (
              <div>
                <div style={s.modalSection}>
                  <div style={s.fieldLabel}>
                    What is this post about? <span style={{ fontWeight: 400, opacity: 0.5, textTransform: "none" as const, letterSpacing: 0 }}>(optional)</span>
                  </div>
                  <textarea
                    style={s.textarea}
                    value={planTopic}
                    onChange={(e) => setPlanTopic(e.target.value)}
                    placeholder='Leave blank and AI will write something great for your niche, or add a specific angle e.g. "Just closed on a 3-bedroom home in downtown"'
                    rows={4}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  <div>
                    <div style={s.fieldLabel}>Audience</div>
                    <input style={s.input} value={planAudience} onChange={(e) => setPlanAudience(e.target.value)} placeholder='e.g., "local homeowners"' />
                  </div>
                  <div>
                    <div style={s.fieldLabel}>Tone</div>
                    <select style={s.select} value={planTone} onChange={(e) => setPlanTone(e.target.value)}>
                      {toneOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                {activeBrandProfile && (
                  <div style={{ fontSize: 11, opacity: 0.45, marginBottom: 14, display: "flex", alignItems: "center", gap: 5 }}>
                    <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Using <strong style={{ opacity: 0.75 }}>{activeBrandProfile.name}</strong> brand profile — niche &amp; colors applied automatically
                  </div>
                )}
                <button
                  style={{ ...s.nextBtn, width: "100%" }}
                  onClick={() => setPlanStep(2)}
                >
                  Next →
                </button>
              </div>
            )}

            {/* Step 2: Schedule */}
            {planStep === 2 && !planSaved && (
              <div>
                <div style={s.modalSection}>
                  <div style={s.fieldLabel}>Assign to calendar day <span style={{ fontWeight: 400, opacity: 0.5 }}>(optional)</span></div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, marginBottom: 8 }}>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                      const isPast = day < todayDay;
                      const isToday = day === todayDay;
                      const isSelected = planDay === day;
                      return (
                        <button
                          key={day}
                          disabled={isPast}
                          style={{
                            padding: "8px 4px", borderRadius: 8,
                            cursor: isPast ? "not-allowed" : "pointer",
                            border: isSelected
                              ? "1.5px solid rgba(44,107,237,0.7)"
                              : isToday
                              ? "1.5px solid rgba(124,58,237,0.5)"
                              : "1px solid rgba(255,255,255,0.1)",
                            background: isSelected
                              ? "rgba(44,107,237,0.2)"
                              : isToday
                              ? "rgba(124,58,237,0.12)"
                              : isPast
                              ? "rgba(255,255,255,0.01)"
                              : "rgba(255,255,255,0.04)",
                            color: isPast ? "rgba(255,255,255,0.2)" : isToday ? "#c4b5fd" : "#e6edf7",
                            fontSize: 12,
                            fontWeight: isSelected ? 700 : isToday ? 700 : 400,
                            transition: "all 0.15s",
                          }}
                          onClick={() => !isPast && setPlanDay(planDay === day ? null : day)}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.45, textAlign: "center" as const }}>
                    {planDay ? `Assigned to Day ${planDay}` : "Leave unset to save without a calendar day"}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  <div>
                    <div style={s.fieldLabel}>Caption Length</div>
                    <select style={s.select} value={planCaptionLength} onChange={(e) => setPlanCaptionLength(e.target.value)}>
                      <option value="Short">Short (1-2 sentences)</option>
                      <option value="Medium">Medium (3-4 sentences)</option>
                      <option value="Long">Long (5-7 sentences)</option>
                    </select>
                  </div>
                  <div>
                    <div style={s.fieldLabel}>Hashtags: {planHashtagCount}</div>
                    <input type="range" min={0} max={30} value={planHashtagCount} onChange={(e) => setPlanHashtagCount(Number(e.target.value))} style={{ width: "100%", accentColor: "#2c6bed", marginTop: 8 }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={s.backBtn} onClick={() => setPlanStep(1)}>← Back</button>
                  <button style={{ ...s.nextBtn, flex: 1 }} onClick={() => setPlanStep(3)}>Next →</button>
                </div>
              </div>
            )}

            {/* Step 3: Image Treatment */}
            {planStep === 3 && !planSaved && (
              <div>
                {/* Photo preview */}
                <div style={{ marginBottom: 16, borderRadius: 10, overflow: "hidden", maxHeight: 180, display: "flex", justifyContent: "center", background: "#0b1220" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={planAsset.imageBase64} alt="preview" style={{ maxHeight: 180, maxWidth: "100%", objectFit: "contain" }} />
                </div>
                <div style={s.fieldLabel}>How should the image look?</div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginBottom: 20 }}>
                  {TREATMENT_OPTIONS.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                        border: planTreatment === t.id ? "1.5px solid rgba(44,107,237,0.6)" : "1px solid rgba(255,255,255,0.1)",
                        background: planTreatment === t.id ? "rgba(44,107,237,0.12)" : "rgba(255,255,255,0.03)",
                        transition: "all 0.15s",
                      }}
                      onClick={() => setPlanTreatment(t.id)}
                    >
                      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ opacity: 0.8, flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                      </svg>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                        <div style={{ fontSize: 12, opacity: 0.55 }}>{t.desc}</div>
                      </div>
                      {planTreatment === t.id && (
                        <div style={{ marginLeft: "auto", width: 18, height: 18, borderRadius: "50%", background: "#2c6bed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                  {(planTreatment === "brand_photo_text" || planTreatment === "branding_photo") && !activeBrandProfile && (
                    <div style={{ fontSize: 12, color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8, padding: "8px 12px" }}>
                      No active brand profile found. Activate one on the Dashboard to use branding overlays.
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={s.backBtn} onClick={() => setPlanStep(2)}>← Back</button>
                  <button
                    style={{ ...s.generateBtn, flex: 1, opacity: planGenerating ? 0.7 : 1 }}
                    onClick={handleSaveToCalendar}
                    disabled={planGenerating}
                  >
                    {planGenerating ? "Saving…" : "Save to Calendar"}
                    {!planGenerating && (
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}
            {/* Success state */}
            {planSaved && (
              <div style={{ textAlign: "center" as const, padding: "10px 0 6px" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Post Planned!</div>
                <div style={{ opacity: 0.65, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                  {planSavedDay
                    ? <>Added to <strong>Day {planSavedDay}</strong> of your calendar. Head over to generate the caption when you're ready.</>
                    : <>Saved to your calendar without a specific day. You can assign it later.</>}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={{ ...s.backBtn, flex: 1 }} onClick={closePlanModal}>Close</button>
                  <a
                    href="/calendar"
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      background: "linear-gradient(135deg,#7c3aed,#2c6bed)", border: "none",
                      borderRadius: 10, padding: "12px 16px", color: "#fff",
                      fontSize: 14, fontWeight: 700, textDecoration: "none",
                      boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
                    }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    View Calendar →
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0b1220",
    color: "#e6edf7",
    fontFamily: "Verdana, Geneva, sans-serif",
    padding: 20,
    paddingBottom: 80,
    boxSizing: "border-box",
  },
  header: {
    maxWidth: 960,
    margin: "0 auto 24px auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap" as const,
    gap: 12,
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    margin: 0,
    background: "linear-gradient(135deg, #2c6bed 0%, #7eb3ff 50%, #a78bfa 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    letterSpacing: 0.5,
  },
  subtitle: { margin: "6px 0 0 0", opacity: 0.65, fontSize: 14 },
  container: { maxWidth: 960, margin: "0 auto" },
  dashBtn: {
    display: "flex", alignItems: "center", gap: 6,
    background: "rgba(44,107,237,0.12)", border: "1px solid rgba(44,107,237,0.3)",
    borderRadius: 10, padding: "10px 16px", color: "#7eb3ff",
    fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none",
    transition: "all 0.15s",
  },
  uploadBtn: {
    display: "flex", alignItems: "center", gap: 6,
    background: "linear-gradient(135deg,#2c6bed,#1e4fc2)", border: "none",
    borderRadius: 10, padding: "10px 18px", color: "#fff",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
    boxShadow: "0 4px 14px rgba(44,107,237,0.35)",
    transition: "all 0.15s",
  },
  empty: { textAlign: "center" as const, opacity: 0.5, padding: "60px 0", fontSize: 15 },
  emptyCard: {
    textAlign: "center" as const,
    padding: "60px 24px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 16,
  },
  card: {
    background: "linear-gradient(135deg,#15233d,#101a33)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  },
  imgWrap: { width: "100%", aspectRatio: "1", overflow: "hidden", background: "#0b1220" },
  img: { width: "100%", height: "100%", objectFit: "cover" as const },
  cardBody: { padding: 12 },
  cardName: { fontSize: 13, fontWeight: 700, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  cardDate: { fontSize: 11, opacity: 0.45, marginBottom: 10 },
  cardActions: { display: "flex", gap: 8 },
  planBtn: {
    flex: 1, padding: "8px 0", borderRadius: 8, cursor: "pointer",
    background: "linear-gradient(135deg,#2c6bed,#1e4fc2)", border: "none",
    color: "#fff", fontSize: 12, fontWeight: 700, transition: "all 0.15s",
  },
  deleteBtn: {
    width: 34, height: 34, borderRadius: 8, cursor: "pointer",
    background: "rgba(255,99,99,0.1)", border: "1px solid rgba(255,99,99,0.25)",
    color: "#ff9a9a", display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, transition: "all 0.15s",
  },

  // Modal
  overlay: {
    position: "fixed" as const, inset: 0,
    background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
    zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
  },
  modal: {
    background: "linear-gradient(135deg,#15233d,#101a33)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 20, padding: 24, width: "100%", maxWidth: 520,
    maxHeight: "90vh", overflowY: "auto" as const,
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 800, marginBottom: 2 },
  modalStepLabel: { fontSize: 12, opacity: 0.5 },
  closeBtn: { background: "none", border: "none", color: "#e6edf7", fontSize: 26, cursor: "pointer", lineHeight: 1, padding: 0, marginTop: -2 },
  modalSection: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.8, opacity: 0.55, marginBottom: 8 },
  textarea: {
    width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, padding: "10px 12px", color: "#e6edf7",
    fontFamily: "Verdana, Geneva, sans-serif", fontSize: 13, resize: "none" as const, outline: "none",
    boxSizing: "border-box" as const, lineHeight: 1.5,
  },
  input: {
    width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, padding: "10px 12px", color: "#e6edf7",
    fontFamily: "Verdana, Geneva, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" as const,
  },
  select: {
    width: "100%", background: "#0b1220", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, padding: "10px 12px", color: "#e6edf7",
    fontFamily: "Verdana, Geneva, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" as const,
  },
  nextBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    background: "linear-gradient(135deg,#2c6bed,#1e4fc2)", border: "none",
    borderRadius: 10, padding: "12px 20px", color: "#fff",
    fontSize: 14, fontWeight: 700, cursor: "pointer",
    boxShadow: "0 4px 14px rgba(44,107,237,0.35)", transition: "all 0.15s",
  },
  backBtn: {
    display: "flex", alignItems: "center", gap: 6,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, padding: "12px 16px", color: "#e6edf7",
    fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
  },
  generateBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    background: "linear-gradient(135deg,#10b981,#059669)", border: "none",
    borderRadius: 10, padding: "13px 20px", color: "#fff",
    fontSize: 15, fontWeight: 800, cursor: "pointer",
    boxShadow: "0 4px 14px rgba(16,185,129,0.35)", transition: "all 0.15s",
  },
};
