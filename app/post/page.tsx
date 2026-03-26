"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveImage, deleteImage } from "../lib/imageStorage";
import { applyBrandOverlay, CONTACT_POST_TYPES } from "../lib/imageOverlay";
import { useTokenBalance } from "../lib/useTokenBalance";
import { useToast } from "../_components/ToastProvider";
import OutOfTokensModal from "../_components/OutOfTokensModal";
import { useInstagram } from "../lib/useInstagram";
import { useFacebook } from "../lib/useFacebook";
import {
  convertToInstagramFormat,
  type InstagramFormat,
  applyBrandingWithPhotoAndText,
  applyPhotoWithText,
} from "../lib/photoTreatments";

// Idempotency utilities
function createRequestId(payload: any): string {
  const normalizedPayload = {
    niche: payload.niche?.trim().toLowerCase(),
    audience: payload.audience?.trim().toLowerCase(),
    postType: payload.postType,
    tone: payload.tone,
    imageStyle: payload.imageStyle,
    specificRequest: payload.specificRequest?.trim(),
    captionLength: payload.captionLength,
    hashtagCount: payload.hashtagCount,
    primaryColor: payload.primaryColor,
    secondaryColor: payload.secondaryColor,
    dayContext: payload.dayContext,
    profileId: payload.profileId || "default",
  };

  // Simple hash function (no external dependency needed)
  let hash = 0;
  const str = JSON.stringify(normalizedPayload);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

function getStoredGeneration(requestId: string) {
  try {
    const stored = localStorage.getItem(`generated:${requestId}`);
    console.log("🔍 Checking storage for:", requestId, "Found:", !!stored);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function storeGeneration(requestId: string, result: any) {
  try {
    const dataToStore = {
      ...result,
      createdAt: Date.now(),
    };
    localStorage.setItem(`generated:${requestId}`, JSON.stringify(dataToStore));
    console.log("💾 Stored generation result for:", requestId);
  } catch {}
}

function clearGeneratingFlag(requestId: string) {
  try {
    localStorage.removeItem(`generating:${requestId}`);
  } catch {}
}

function isCurrentlyGenerating(requestId: string): boolean {
  try {
    const generating = localStorage.getItem(`generating:${requestId}`);
    if (!generating) return false;

    // Check if the generating flag is stale (older than 5 minutes)
    const timestamp = parseInt(generating);
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    if (timestamp < fiveMinutesAgo) {
      // Remove stale flag
      localStorage.removeItem(`generating:${requestId}`);
      console.log("🧹 Cleared stale generating flag for:", requestId);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function setGeneratingFlag(requestId: string) {
  try {
    localStorage.setItem(`generating:${requestId}`, Date.now().toString());
  } catch {}
}

// Hard lock functions for genId-based deduplication
function generateGenId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

function getStoredPostResult(genId: string): PostResult | null {
  try {
    // Check sessionStorage first (persists across refreshes within the same tab)
    const stored = sessionStorage.getItem(`postResult:${genId}`)
      ?? localStorage.getItem(`postResult:${genId}`); // legacy fallback
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function storePostResult(genId: string, result: PostResult): void {
  try {
    // Use sessionStorage — handles large base64 images without hitting
    // localStorage's 5MB quota, and persists across refreshes in the same tab
    sessionStorage.setItem(
      `postResult:${genId}`,
      JSON.stringify({
        ...result,
        savedAt: Date.now(),
      })
    );
  } catch {
    // sessionStorage full — store without the image so at least text is preserved
    try {
      const { imageBase64: _, ...textOnly } = result;
      sessionStorage.setItem(
        `postResult:${genId}`,
        JSON.stringify({ ...textOnly, savedAt: Date.now() })
      );
    } catch {}
  }
}

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
  const router = useRouter();
  const hasStarted = useRef(false);
  const tokenBalance = useTokenBalance();
  const { addToast } = useToast();
  const [isFromCache, setIsFromCache] = useState(false);
  const [showOutOfTokens, setShowOutOfTokens] = useState(false);

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
    month?: string;
    year?: string;
  } | null>(null);
  const [post, setPost] = useState<PostResult | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [pillarType, setPillarType] = useState<string>("");
  const [userThought, setUserThought] = useState<string>("");
  const [imageDescription, setImageDescription] = useState<string>("");
  const [formReady, setFormReady] = useState(false);
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

  const instagram = useInstagram();
  const [igPostStatus, setIgPostStatus] = useState<"idle" | "posting" | "success" | "error">("idle");
  const facebook = useFacebook();
  const [fbPostStatus, setFbPostStatus] = useState<"idle" | "posting" | "success" | "error">("idle");
  const [selectedFormat, setSelectedFormat] = useState<InstagramFormat>("square");
  const [formattedImage, setFormattedImage] = useState<string | null>(null);

  const SHOW_DEBUG_PROMPT = false;

  // Scroll to top on page load and cleanup stale flags
  useEffect(() => {
    window.scrollTo(0, 0);

    // Cleanup any stale generating flags on page load
    try {
      const keys = Object.keys(localStorage);
      const generatingKeys = keys.filter((key) =>
        key.startsWith("generating:")
      );
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

      generatingKeys.forEach((key) => {
        const timestamp = parseInt(localStorage.getItem(key) || "0");
        if (timestamp < fiveMinutesAgo) {
          localStorage.removeItem(key);
          console.log("🧹 Cleaned up stale generating flag:", key);
        }
      });
    } catch {}
  }, []);

  // Warn user before leaving/refreshing while generation is in progress
  useEffect(() => {
    if (!isLoading) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return "";
    };

    // Browser refresh / close / back-forward navigation
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Push a dummy history entry so browser back triggers beforeunload
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      // Re-push so the user stays on the page if they dismiss the dialog
      window.history.pushState(null, "", window.location.href);
      if (
        window.confirm(
          "Your post is still generating. Leaving now will lose your generation and still use a token.\n\nAre you sure you want to leave?"
        )
      ) {
        // User confirmed — actually go back
        window.removeEventListener("popstate", handlePopState);
        window.removeEventListener("beforeunload", handleBeforeUnload);
        window.history.go(-2);
      }
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isLoading]);

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
        detail = params.get("detail"),
        month = params.get("month"),
        year = params.get("year");
      if (day && title && detail) setDayContext({ day, title, detail, ...(month ? { month } : {}), ...(year ? { year } : {}) });

      const pillar = params.get("pillarType");
      if (pillar) setPillarType(pillar);

      const userThoughtParam = params.get("userThought");
      if (userThoughtParam) setUserThought(userThoughtParam);

      const imageDescriptionParam = params.get("imageDescription");
      if (imageDescriptionParam) setImageDescription(imageDescriptionParam);

      // Mark form as ready after URL params are loaded
      setFormReady(true);
    } catch {}
  }, []);

  // Auto-generate with genId hard lock
  useEffect(() => {
    // Wait for form to be ready from URL params and prevent double execution in strict mode
    if (!formReady || hasStarted.current) return;

    const params = new URLSearchParams(window.location.search);
    const autogen = params.get("autogen") === "1";

    // If no autogen flag but genId exists, the user navigated back to a completed post.
    // Restore from cache so they see the result instead of a blank page.
    if (!autogen) {
      const backGenId = params.get("genId");
      if (backGenId) {
        const cached = getStoredPostResult(backGenId);
        if (cached) {
          console.log("↩️ Back navigation: restoring cached post for genId:", backGenId);
          setPost(cached);
          setIsFromCache(true);
          hasStarted.current = true;
          return;
        }
      }
      // No autogen and no restorable cache — nothing to do.
      return;
    }

    if (!form.niche.trim() || !form.audience.trim()) return;

    hasStarted.current = true;

    let genId = params.get("genId");

    // If genId is missing, generate one and update URL
    if (!genId) {
      genId = generateGenId();
      const newParams = new URLSearchParams(window.location.search);
      newParams.set("genId", genId);
      router.replace(`/post?${newParams.toString()}`);
      console.log("🆔 Generated new genId:", genId);
      return; // Let the URL update trigger the effect again
    }

    console.log("🔍 Hard lock check for genId:", genId);

    // Immediately remove autogen from URL to prevent re-triggering on refresh
    try {
      const cleanParams = new URLSearchParams(window.location.search);
      cleanParams.delete("autogen");
      window.history.replaceState({}, "", `/post?${cleanParams.toString()}`);
    } catch {}

    // Check if already generated with this genId
    const existingResult = getStoredPostResult(genId);
    if (existingResult) {
      console.log("✅ Found existing post result, using cached version");
      setPost(existingResult);
      setIsFromCache(true);
      return;
    }

    // Prevent auto-generation if no tokens remaining
    if (!tokenBalance.isLoading && tokenBalance.tokensRemaining === 0) {
      console.log("❌ No tokens remaining, skipping auto-generation");
      setErrorMsg(
        "You've hit your token limit for this month. Resets on the 1st of next month."
      );
      setShowOutOfTokens(true);
      addToast("You've used all your tokens this month.", "warning");
      return;
    }

    // Start new generation
    console.log("🚀 Starting new generation for genId:", genId);
    generatePost();
  }, [
    form.niche,
    form.audience,
    form.postType,
    form.tone,
    form.imageStyle,
    dayContext,
    formReady,
    router,
    tokenBalance.tokensRemaining,
    tokenBalance.isLoading,
  ]);

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

  // Convert image to selected format whenever image or format changes
  useEffect(() => {
    if (!post?.imageBase64) { setFormattedImage(null); return; }
    if (selectedFormat === "square") { setFormattedImage(post.imageBase64); return; }
    let cancelled = false;
    convertToInstagramFormat(post.imageBase64, selectedFormat).then((result) => {
      if (!cancelled) setFormattedImage(result);
    });
    return () => { cancelled = true; };
  }, [post?.imageBase64, selectedFormat]);

  const activeImage = formattedImage ?? post?.imageBase64 ?? null;

  const canRefine = useMemo(
    () => !!post && !hasRefined && refinementText.trim().length > 0,
    [post, hasRefined, refinementText]
  );

  async function generatePost(refinementOverride?: string) {
    if (isLoading) return;

    // Check tokens before starting generation (skip for refinements)
    if (
      !refinementOverride &&
      !tokenBalance.isLoading &&
      tokenBalance.tokensRemaining === 0
    ) {
      setErrorMsg(
        "You've hit your token limit for this month. Resets on the 1st of next month."
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setStatusMsg(refinementOverride ? "Regenerating…" : "Generating…");
    setLoadingProgress(5);
    setLoadingStage("Starting generation...");

    // Get active profile ID consistently
    let activeProfileId: string | undefined;
    try {
      const activeProfile = localStorage.getItem("ath_active_brand_profile");
      if (activeProfile) {
        activeProfileId = JSON.parse(activeProfile).profileId;
      }
    } catch {}

    const payload = {
      ...form,
      dayContext,
      goal: form.postType,
      callToAction: "Comment, Share, Like, Follow, DM us",
      referenceImageDataUrl: uploadRef?.dataUrl || null,
      referenceImageName: uploadRef?.name || null,
      referenceImageMime: uploadRef?.mime || null,
      profileId: activeProfileId || "default",
      ...(pillarType ? { pillarType } : {}),
      ...(userThought ? { userThought } : {}),
      ...(imageDescription ? { imageDescription } : {}),
      ...(refinementOverride
        ? {
            refinementText: refinementOverride,
            previousCaption: post?.caption,
            previousHashtags: post?.hashtags,
          }
        : {}),
    };

    const requestId = currentRequestId || createRequestId(payload);
    if (!currentRequestId) setCurrentRequestId(requestId);

    console.log("🎯 Generate payload:", {
      requestId,
      profileId: payload.profileId,
    });

    // Set generating flag if not refinement
    if (!refinementOverride) {
      setGeneratingFlag(requestId);
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          requestId: refinementOverride ? undefined : requestId,
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

      let result = data?.result as PostResult | undefined;
      if (!result || !result.caption || !result.hashtags) {
        console.error("Unexpected API shape:", data);
        throw new Error("API returned an unexpected response shape.");
      }

      // Apply text + brand overlay based on image style
      if (result.imageBase64) {
        try {
          const activeBrandRaw = localStorage.getItem("ath_active_brand_profile");
          const brand = activeBrandRaw ? JSON.parse(activeBrandRaw) : null;
          const primaryColor = brand?.primaryColor || form.primaryColor || "#000000";
          const secondaryColor = brand?.secondaryColor || form.secondaryColor || "#ffffff";
          const includeContact = CONTACT_POST_TYPES.has(form.postType);

          const isBrandingText =
            form.imageStyle === "branding_text_photo" ||
            form.imageStyle === "branded_text_photo";
          const isLifestyleText = form.imageStyle === "lifestyle_photo_text";

          if (isBrandingText) {
            // Canvas renders text + scrim + border + logo — no separate brand overlay needed
            result = {
              ...result,
              imageBase64: await applyBrandingWithPhotoAndText(
                result.imageBase64,
                result.caption,
                {
                  primaryColor,
                  secondaryColor,
                  logoBase64: brand?.logoBase64 || undefined,
                  website: includeContact ? brand?.website || undefined : undefined,
                  phone: includeContact ? brand?.phone || undefined : undefined,
                }
              ),
            };
          } else if (isLifestyleText) {
            // Canvas adds text scrim — then brand overlay adds logo on top
            result = {
              ...result,
              imageBase64: await applyPhotoWithText(result.imageBase64, result.caption),
            };
            if (brand?.logoBase64 || brand?.website || brand?.phone) {
              result = {
                ...result,
                imageBase64: await applyBrandOverlay(result.imageBase64, {
                  logoBase64: brand.logoBase64 || undefined,
                  primaryColor,
                  secondaryColor,
                  website: brand.website || undefined,
                  phone: brand.phone || undefined,
                  includeContact,
                }),
              };
            }
          } else if (brand?.logoBase64 || brand?.website || brand?.phone) {
            // All other styles: just apply brand logo/contact overlay
            result = {
              ...result,
              imageBase64: await applyBrandOverlay(result.imageBase64, {
                logoBase64: brand.logoBase64 || undefined,
                primaryColor,
                secondaryColor,
                website: brand.website || undefined,
                phone: brand.phone || undefined,
                includeContact,
              }),
            };
          }
        } catch {
          // Overlay failed — use original image
        }
      }

      setPost(result);
      setLoadingProgress(100);
      if (refinementOverride) setHasRefined(true);
      setStatusMsg("Done ✅");
      addToast(refinementOverride ? "Post refined!" : "Post generated successfully!", "success");

      // Store result with genId for hard lock (only for new generations, not refinements)
      if (!refinementOverride) {
        const params = new URLSearchParams(window.location.search);
        const genId = params.get("genId");
        if (genId) {
          storePostResult(genId, result);
        }
      }

      // Save to database via API
      try {
        const postId = Date.now().toString();

        // Get active profile ID
        let activeProfileId: string | undefined;
        try {
          const activeProfile = localStorage.getItem("ath_active_brand_profile");
          if (activeProfile) {
            activeProfileId = JSON.parse(activeProfile).profileId;
          }
        } catch {}

        const newPost = {
          id: postId,
          profileId: activeProfileId,
          hasImage: !!result.imageBase64,
          imageBase64: result.imageBase64,
          caption: result.caption,
          hashtags: result.hashtags,
          postType: form.postType,
          imageStyle: form.imageStyle,
          tone: form.tone,
          niche: form.niche,
          audience: form.audience,
          calendarDay: dayContext?.day ? parseInt(dayContext.day) : undefined,
          month: dayContext?.day
            ? (dayContext.year && dayContext.month
                ? `${dayContext.year}-${String(dayContext.month).padStart(2, "0")}`
                : new Date().toISOString().slice(0, 7))
            : undefined,
          createdAt: new Date().toISOString(),
        };

        // Save to DB
        await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newPost),
        });

        // Also cache image locally for fast access on this device
        if (result.imageBase64) {
          await saveImage(postId, result.imageBase64);
        }

        // If scheduled from calendar, redirect back so they can see it on the calendar
        const returnTo = new URLSearchParams(window.location.search).get("returnTo");
        if (returnTo === "calendar") {
          addToast("Post scheduled and saved to your calendar!", "success");
          window.location.href = "/calendar";
          return;
        }
      } catch {}
    } catch (err: any) {
      setStatusMsg("");
      setErrorMsg(err?.message || "Something went wrong.");
      addToast("Generation failed. Please try again.", "error");
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMsg(""), 1500);

      // Clear generating flag
      if (currentRequestId) {
        clearGeneratingFlag(currentRequestId);
      }
    }
  }

  async function refineOnce() {
    if (canRefine) await generatePost(refinementText.trim());
  }

  function downloadImage() {
    if (!activeImage) return;
    const a = document.createElement("a");
    a.href = activeImage;
    a.download = `ai-social-helper-${selectedFormat}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast("Image downloaded!", "success");
  }

  async function copyCaptionAndHashtags() {
    const text = `${editedCaption}\n\n${editedHashtags}`.trim();
    try {
      await navigator.clipboard.writeText(text);
      addToast("Caption and hashtags copied!", "success");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      addToast("Caption and hashtags copied!", "success");
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
      paddingTop: 50,
    },
    title: {
      fontSize: 34,
      fontWeight: 800,
      letterSpacing: 1,
      margin: 0,
      background:
        "linear-gradient(135deg, #22c55e 0%, #4ade80 50%, #7eb3ff 100%)",
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
      boxShadow:
        "0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)",
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
            {post ? <span style={{ fontSize: 18 }}>✨</span> : <img src="/logo-icon.png" alt="AI Social Helper" style={{ width: 28, height: 28, objectFit: "contain" }} />}
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
          {isFromCache && (
            <div
              style={{
                background: "rgba(249, 115, 22, 0.1)",
                border: "1px solid rgba(249, 115, 22, 0.3)",
                borderRadius: 10,
                padding: "10px 16px",
                fontSize: 13,
                color: "#f59e0b",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16 }}>⚠️</span>
              This post was already generated. Showing your saved result.
            </div>
          )}
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
                    {isLoading && refinementText.trim().length > 0 ? "Refining…" : "Refine"}
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
              {activeImage ? (
                <img
                  src={activeImage}
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

            {/* Format toggle */}
            {post?.imageBase64 && (
              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" as const }}>
                {([
                  { key: "square",    label: "1:1",     hint: "Square" },
                  { key: "portrait",  label: "4:5",     hint: "Portrait" },
                  { key: "landscape", label: "1.91:1",  hint: "Landscape" },
                  { key: "stories",   label: "9:16",    hint: "Stories" },
                ] as const).map(({ key, label, hint }) => (
                  <button
                    key={key}
                    title={hint}
                    onClick={() => setSelectedFormat(key)}
                    className="hover-btn"
                    style={{
                      padding: "5px 12px",
                      borderRadius: 20,
                      border: selectedFormat === key
                        ? "1px solid rgba(44,107,237,0.6)"
                        : "1px solid rgba(255,255,255,0.12)",
                      background: selectedFormat === key
                        ? "rgba(44,107,237,0.15)"
                        : "rgba(255,255,255,0.04)",
                      color: selectedFormat === key ? "#7eb3ff" : "rgba(255,255,255,0.55)",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={styles.buttonRow} className="ath-buttonRow">
              <button
                style={{
                  ...styles.secondaryBtn,
                  opacity: activeImage ? 1 : 0.5,
                  cursor: activeImage ? "pointer" : "not-allowed",
                }}
                onClick={downloadImage}
                disabled={!activeImage}
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
              {instagram.connected && (
                <button
                  style={{
                    ...styles.secondaryBtn,
                    opacity: activeImage && igPostStatus !== "posting" && igPostStatus !== "success" ? 1 : 0.7,
                    cursor: activeImage && igPostStatus !== "posting" && igPostStatus !== "success" ? "pointer" : "not-allowed",
                    background: igPostStatus === "success"
                      ? "rgba(34, 197, 94, 0.15)"
                      : "linear-gradient(135deg, rgba(131,58,180,0.2), rgba(253,29,29,0.2), rgba(252,176,69,0.2))",
                    border: igPostStatus === "success"
                      ? "1px solid rgba(34, 197, 94, 0.4)"
                      : "1px solid rgba(253,29,29,0.3)",
                  }}
                  onClick={async () => {
                    if (!activeImage || igPostStatus === "posting" || igPostStatus === "success") return;
                    setIgPostStatus("posting");
                    try {
                      await instagram.publish(activeImage, editedCaption, editedHashtags);
                      setIgPostStatus("success");
                      addToast(`Posted to @${instagram.username}!`, "success");
                    } catch (err: any) {
                      setIgPostStatus("error");
                      addToast(err?.message || "Failed to post to Instagram", "error");
                      setTimeout(() => setIgPostStatus("idle"), 3000);
                    }
                  }}
                  disabled={!activeImage || igPostStatus === "posting" || igPostStatus === "success"}
                  className="hover-btn"
                >
                  {igPostStatus === "posting"
                    ? "Posting..."
                    : igPostStatus === "success"
                    ? "Posted to Instagram!"
                    : "Post to Instagram"}
                </button>
              )}
              {facebook.connected && (
                <button
                  style={{
                    ...styles.secondaryBtn,
                    opacity: activeImage && fbPostStatus !== "posting" && fbPostStatus !== "success" ? 1 : 0.7,
                    cursor: activeImage && fbPostStatus !== "posting" && fbPostStatus !== "success" ? "pointer" : "not-allowed",
                    background: fbPostStatus === "success"
                      ? "rgba(34, 197, 94, 0.15)"
                      : "rgba(24,119,242,0.15)",
                    border: fbPostStatus === "success"
                      ? "1px solid rgba(34, 197, 94, 0.4)"
                      : "1px solid rgba(24,119,242,0.3)",
                  }}
                  onClick={async () => {
                    if (!activeImage || fbPostStatus === "posting" || fbPostStatus === "success") return;
                    setFbPostStatus("posting");
                    try {
                      await facebook.publish(activeImage, editedCaption, editedHashtags);
                      setFbPostStatus("success");
                      addToast(`Posted to ${facebook.pageName}!`, "success");
                    } catch (err: any) {
                      setFbPostStatus("error");
                      addToast(err?.message || "Failed to post to Facebook", "error");
                      setTimeout(() => setFbPostStatus("idle"), 3000);
                    }
                  }}
                  disabled={!post?.imageBase64 || fbPostStatus === "posting" || fbPostStatus === "success"}
                  className="hover-btn"
                >
                  {fbPostStatus === "posting"
                    ? "Posting..."
                    : fbPostStatus === "success"
                    ? "Posted to Facebook!"
                    : "Post to Facebook"}
                </button>
              )}
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

            </div>
          )}
        </div>
      </div>

      <style>{`
        .hover-btn:hover { background: rgba(255,255,255,0.12) !important; }
        @media (max-width: 920px) {
          body { margin: 0; }
          .ath-page { padding: 10px !important; }
          .ath-grid { grid-template-columns: 1fr !important; }
          .ath-imageFrame { min-height: 220px !important; }
          .ath-buttonRow button { flex: 1 1 100% !important; }
        }
        @media (max-width: 420px) { .ath-imageFrame { min-height: 180px !important; } }
        @keyframes athSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <OutOfTokensModal
        isOpen={showOutOfTokens}
        onClose={() => setShowOutOfTokens(false)}
        tokensUsed={tokenBalance.tokensUsed}
        totalTokens={tokenBalance.totalMonthlyTokens}
      />
    </div>
  );
}
