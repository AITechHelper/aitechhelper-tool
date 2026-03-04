"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { imageStyles } from "../lib/imageStyleOptions";
import { useTokenBalance } from "../lib/useTokenBalance";
import { useToast } from "../_components/ToastProvider";
import OutOfTokensModal from "../_components/OutOfTokensModal";

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
  "Coffee Shop",
  "Restaurant",
  "Personal Trainer",
  "Real Estate Agent",
  "Hair Salon",
  "Dentist",
  "Chiropractor",
  "Law Firm",
  "Accounting Firm",
  "Marketing Agency",
  "Web Design Agency",
  "Photography Studio",
  "Yoga Studio",
  "Gym",
  "Spa",
  "Auto Repair Shop",
  "Landscaping",
  "Plumber",
  "Electrician",
  "HVAC",
  "Pet Grooming",
  "Veterinarian",
  "Bakery",
  "Food Truck",
  "Catering",
  "Clothing Boutique",
  "Jewelry Store",
  "Florist",
  "Interior Designer",
  "Architect",
  "Life Coach",
  "Business Consultant",
  "Financial Advisor",
  "Insurance Agent",
  "Mortgage Broker",
  "AI Agency",
  "SaaS Company",
  "E-commerce Store",
  "Podcast",
  "YouTube Channel",
];

// Post types with icons and short descriptions
const postTypes = [
  {
    value: "Everyday Post",
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    desc: "Daily brand presence",
    tooltip:
      "Keeps your brand visible and relatable day-to-day. No specific hook needed — AI handles the rest.",
  },
  {
    value: "Promotion / Offer",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    desc: "Sales, discounts, deals",
    tooltip:
      "Announce a sale, discount, or special offer. AI creates promotional energy without needing real product photos.",
  },
  {
    value: "Educational Tip",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
    desc: "Teach your audience",
    tooltip:
      "Share a tip, insight, or how-to that positions you as the go-to expert in your field.",
  },
  {
    value: "Hot Take",
    icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
    desc: "Bold industry opinion",
    tooltip:
      "Drop a bold, counterintuitive take that stops the scroll. Builds thought leadership and sparks real conversation.",
  },
  {
    value: "Myth Buster",
    icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
    desc: "Debunk misconceptions",
    tooltip:
      "Call out a common myth in your industry and set the record straight. Great for building authority.",
  },
  {
    value: "Problem / Solution",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    desc: "Pain point + fix",
    tooltip:
      "Call out a real problem your audience faces and show how you solve it. Highly relatable and drives inquiries.",
  },
  {
    value: "Announcement",
    icon: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
    desc: "News & updates",
    tooltip:
      "Share a launch, event, change, or exciting update. AI generates a bold branded announcement visual.",
  },
  {
    value: "Engagement Question",
    icon: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z",
    desc: "Get the comments going",
    tooltip:
      "Post a question that gets your audience talking. Boosts reach by driving comments and saves.",
  },
  {
    value: "Seasonal / Timely",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    desc: "Holiday & events",
    tooltip:
      "Tie your brand to a season, holiday, or timely moment. AI creates a themed visual without needing real photos.",
  },
  {
    value: "Custom (Advanced)",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    desc: "Full control",
    tooltip:
      "Write your own detailed instructions for maximum customization. Best for experienced users with a specific vision.",
  },
];

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

const MAX_SPECIFIC_REQUEST_CHARS = 180;

function getSpecificRequestUI(postType: string) {
  switch (postType) {
    case "Promotion / Offer":
      return {
        show: true,
        label: "What's the offer?",
        placeholder: `e.g., "Buy 2 get 1 free" or "20% off this week only"`,
        helper: "Leave blank for a generic promotion post.",
      };
    case "Educational Tip":
      return {
        show: true,
        label: "Share a tip or fact you know is true",
        placeholder: `e.g., "Most people don't know that X actually causes Y"`,
        helper: "Your real expertise makes the best content — or leave blank.",
      };
    case "Hot Take":
      return {
        show: true,
        label: "What's your hot take?",
        placeholder: `e.g., "Most [niche] advice is actually backwards"`,
        helper: "Bold, opinionated, counterintuitive — this is your soapbox.",
      };
    case "Myth Buster":
      return {
        show: true,
        label: "What myth are you busting?",
        placeholder: `e.g., "Myth: You need X to get Y result"`,
        helper: "State the myth — we'll flip it on its head.",
      };
    case "Problem / Solution":
      return {
        show: true,
        label: "What real problem do you solve?",
        placeholder: `e.g., "Clients come to us frustrated by X — we fix it with Y"`,
        helper: "Your actual client pain points work best.",
      };
    case "Announcement":
      return {
        show: true,
        label: "What are you announcing?",
        placeholder: `e.g., "New location opening March 15" or "We just launched..."`,
        helper: "Details go in the caption, image stays bold and branded.",
      };
    case "Engagement Question":
      return {
        show: true,
        label: "What do you want to ask?",
        placeholder: `e.g., "What's the biggest mistake you see in [niche]?"`,
        helper: "Leave blank and we'll write one for you.",
      };
    case "Seasonal / Timely":
      return {
        show: true,
        label: "What season or event?",
        placeholder: `e.g., "Valentine's Day", "Back to school", "Tax season"`,
        helper: "We'll tie your brand to the moment.",
      };
    case "Custom (Advanced)":
      return {
        show: true,
        label: "Describe exactly what you want",
        placeholder: `e.g., "Show a woman getting a facial, warm lighting, mention our new membership deal"`,
        helper: "Full control over caption + image direction.",
      };
    default:
      return {
        show: true,
        label: "Anything specific to include?",
        placeholder: `e.g., "Mention our free consultation" or "Focus on our weekend hours"`,
        helper: "Optional — leave blank and we'll handle it.",
      };
  }
}

// Tooltip component
function Tooltip({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{
        position: "relative",
        display: "block",
        width: "100%",
        height: "100%",
      }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: 8,
            background: "#1a2744",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            lineHeight: 1.4,
            width: 200,
            maxWidth: "90vw",
            zIndex: 1000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {text}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid #1a2744",
            }}
          />
        </div>
      )}
    </span>
  );
}

export default function Page() {
  const tokenBalance = useTokenBalance();
  const { addToast } = useToast();
  const [showOutOfTokens, setShowOutOfTokens] = useState(false);
  const [form, setForm] = useState<FormState>({
    niche: "",
    audience: "",
    postType: "Everyday Post",
    specificRequest: "",
    tone: "Confident",
    captionLength: "Medium",
    hashtagCount: 12,
    imageStyle: "lifestyle_photo",
    primaryColor: "#000000",
    secondaryColor: "#ffffff",
  });

  const [uploadRef, setUploadRef] = useState<UploadRef | null>(null);
  const [uploadError, setUploadError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [dayContext, setDayContext] = useState<{
    day: string;
    title: string;
    detail: string;
  } | null>(null);
  const [autogenRequested, setAutogenRequested] = useState(false);

  // Step navigation
  const [currentStep, setCurrentStep] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">(
    "left"
  );

  // Niche autocomplete
  const [showNicheSuggestions, setShowNicheSuggestions] = useState(false);
  const [filteredNiches, setFilteredNiches] = useState<string[]>([]);
  const nicheInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Specific request input ref + pulse animation
  const specificRequestRef = useRef<HTMLInputElement>(null);
  const specificRequestWrapRef = useRef<HTMLDivElement>(null);
  const [inputPulse, setInputPulse] = useState(false);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load saved form from localStorage
  useEffect(() => {
    try {
      // Start with any existing form data
      let formData = {};
      try {
        const existing = localStorage.getItem("ath_form");
        if (existing) formData = JSON.parse(existing);
      } catch {}

      // Load component state with existing form data
      if (Object.keys(formData).length > 0) {
        setForm((prev) => ({ ...prev, ...formData }));
      }
    } catch {}
  }, []);

  // Save form to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("ath_form", JSON.stringify(form));
    } catch {}
  }, [form]);

  // Read URL params and apply active brand profile precedence
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("autogen") === "1") setAutogenRequested(true);

    // Start with URL param updates
    const updates: Partial<FormState> = {};
    if (params.get("postType") || params.get("goal"))
      updates.postType = (params.get("postType") || params.get("goal"))!;
    if (params.get("specificRequest"))
      updates.specificRequest = params.get("specificRequest")!;
    if (params.get("captionLength"))
      updates.captionLength = params.get(
        "captionLength"
      ) as FormState["captionLength"];
    if (params.get("hashtagCount"))
      updates.hashtagCount = Number(params.get("hashtagCount"));
    if (params.get("imageStyle"))
      updates.imageStyle = params.get("imageStyle")!;

    // Add URL brand data ONLY if no active profile exists
    const activeBrand = localStorage.getItem("ath_active_brand_profile");
    if (!activeBrand) {
      // No active profile - use URL params or existing form data
      if (params.get("niche")) updates.niche = params.get("niche")!;
      if (params.get("audience")) updates.audience = params.get("audience")!;
      if (params.get("tone")) updates.tone = params.get("tone")!;
      if (params.get("primaryColor"))
        updates.primaryColor = params.get("primaryColor")!;
      if (params.get("secondaryColor"))
        updates.secondaryColor = params.get("secondaryColor")!;
    } else {
      // Active profile exists - ALWAYS use profile data, ignore URL brand params
      try {
        const brandData = JSON.parse(activeBrand);
        updates.niche = brandData.niche || "";
        updates.audience = brandData.audience || "";
        updates.tone = brandData.tone || "Confident";
        updates.primaryColor = brandData.primaryColor || "#000000";
        updates.secondaryColor = brandData.secondaryColor || "#ffffff";
        // Also update other profile fields if available
        if (brandData.captionLength)
          updates.captionLength = brandData.captionLength;
        if (brandData.hashtagCount)
          updates.hashtagCount = brandData.hashtagCount;
        if (brandData.imageStyle) updates.imageStyle = brandData.imageStyle;
      } catch {}
    }

    // Apply all updates if any exist
    if (Object.keys(updates).length > 0) {
      setForm((prev) => ({ ...prev, ...updates }));
    }

    // Set day context for calendar generation
    const day = params.get("day"),
      title = params.get("title"),
      detail = params.get("detail");
    if (day && title && detail) setDayContext({ day, title, detail });
  }, []);

  // Fire autogen
  useEffect(() => {
    if (
      !autogenRequested ||
      !dayContext ||
      !form.niche.trim() ||
      !form.audience.trim()
    )
      return;
    setAutogenRequested(false);
    generatePost();
  }, [autogenRequested, dayContext, form.niche, form.audience]);

  // Filter niche suggestions
  useEffect(() => {
    if (form.niche.length > 0) {
      const filtered = nicheSuggestions
        .filter((n) => n.toLowerCase().includes(form.niche.toLowerCase()))
        .slice(0, 6);
      setFilteredNiches(filtered);
    } else {
      setFilteredNiches(nicheSuggestions.slice(0, 6));
    }
  }, [form.niche]);

  const canGenerate = useMemo(() => {
    const hasRequiredFields =
      form.niche.trim().length > 0 && form.audience.trim().length > 0;
    const hasTokens =
      !tokenBalance.isLoading && tokenBalance.tokensRemaining > 0;
    return hasRequiredFields && hasTokens;
  }, [
    form.niche,
    form.audience,
    tokenBalance.isLoading,
    tokenBalance.tokensRemaining,
  ]);

  // Step definitions: 0=Business, 1=PostType, 2=ImageStyle, 3=CaptionSettings, 4=BrandColors, 5=ReferenceImage
  const totalSteps = 6;

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 0:
        return form.niche.trim().length > 0 && form.audience.trim().length > 0;
      case 1:
        return form.postType.length > 0;
      case 2:
        return form.imageStyle.length > 0;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const scrollToTopInParent = () => {
    window.scrollTo(0, 0);
    if (window.self !== window.top) {
      try {
        window.parent.postMessage({ type: "AIT_HELPER_SCROLL_TOP" }, "*");
      } catch (error) {
        // Silently fail if blocked
      }
    }
  };

  const goToNextStep = () => {
    if (currentStep < totalSteps - 1 && isStepComplete(currentStep)) {
      setSlideDirection("left");
      setCurrentStep(currentStep + 1);
      scrollToTopInParent();
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 0) {
      setSlideDirection("right");
      setCurrentStep(currentStep - 1);
      scrollToTopInParent();
    }
  };

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePostTypeSelect(value: string) {
    updateForm("postType", value);
    // Scroll to + focus the specific request input so users fill it out
    setTimeout(() => {
      const wrap = specificRequestWrapRef.current;
      const input = specificRequestRef.current;
      if (wrap) {
        wrap.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      if (input) {
        input.focus();
        setInputPulse(true);
        setTimeout(() => setInputPulse(false), 700);
      }
    }, 60);
  }

  // Handle file from input or drop
  function handleFile(file: File) {
    setUploadError("");
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Image too large. Max 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setUploadRef({
        name: file.name,
        mime: file.type,
        dataUrl: String(reader.result || ""),
      });
    reader.onerror = () => setUploadError("Failed to read image.");
    reader.readAsDataURL(file);
  }

  async function handleUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  // Drag and drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }
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
      sp.set("autogen", "1");
      // Generate unique genId for this post generation
      const genId =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      sp.set("genId", genId);
      window.location.href = `/post?${sp.toString()}`;
    } catch (err: any) {
      setStatusMsg("");
      setErrorMsg(err?.message || "Failed to redirect.");
      addToast("Failed to start generation. Please try again.", "error");
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
    page: {
      minHeight: "100vh",
      background: "#0b1220",
      color: "#e6edf7",
      padding: 20,
      paddingBottom: 100,
      boxSizing: "border-box",
      fontFamily: "Verdana, Geneva, sans-serif",
    },
    header: {
      maxWidth: 900,
      margin: "0 auto 16px auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
      paddingTop: 50,
    },
    title: {
      fontSize: 28,
      fontWeight: 600,
      letterSpacing: 1,
      margin: 0,
      textTransform: "uppercase",
    },
    subtitle: { margin: 0, opacity: 0.75, fontSize: 14, fontWeight: 400 },
    helpBtn: {
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: 8,
      padding: "8px 14px",
      color: "#e6edf7",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: 6,
      transition: "all 0.15s ease",
      width: "fit-content",
      flexShrink: 0,
    },
    container: { maxWidth: 900, margin: "0 auto" },
    card: {
      background: "linear-gradient(135deg, #15233d 0%, #101a33 100%)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 20,
      padding: 24,
      boxShadow:
        "0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)",
      marginBottom: 16,
      transition: "all 0.15s ease",
    },
    cardTitle: {
      margin: "0 0 4px 0",
      fontSize: 16,
      fontWeight: 700,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    cardHint: { margin: "0 0 16px 0", opacity: 0.6, fontSize: 13 },
    field: { marginBottom: 20 },
    label: {
      fontSize: 14,
      fontWeight: 700,
      marginBottom: 8,
      opacity: 0.9,
      display: "flex",
      alignItems: "center",
      gap: 8,
      whiteSpace: "nowrap" as const,
    },
    pill: {
      fontSize: 11,
      padding: "2px 8px",
      borderRadius: 999,
      background: "rgba(44, 107, 237, 0.2)",
      color: "#7eb3ff",
      fontWeight: 600,
    },
    input: {
      width: "100%",
      background: "#0b1220",
      color: "#e6edf7",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 10,
      padding: "12px 14px",
      outline: "none",
      fontSize: 14,
      boxSizing: "border-box",
      transition: "border-color 0.15s ease",
    },
    select: {
      width: "100%",
      background: "#0b1220",
      color: "#e6edf7",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 10,
      padding: "12px 14px",
      outline: "none",
      fontSize: 14,
      boxSizing: "border-box",
    },
    row2: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      alignItems: "start",
    },

    // Autocomplete
    autocompleteWrap: { position: "relative" as const, zIndex: 100 },
    suggestions: {
      position: "absolute" as const,
      top: "100%",
      left: 0,
      right: 0,
      background: "#1a2744",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: 10,
      marginTop: 4,
      zIndex: 100,
      overflow: "hidden",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    },
    suggestionItem: {
      padding: "10px 14px",
      cursor: "pointer",
      fontSize: 13,
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      transition: "background 0.1s ease",
    },
    suggestionHint: {
      padding: "8px 14px",
      fontSize: 11,
      opacity: 0.6,
      background: "rgba(0,0,0,0.2)",
    },

    // Post type cards
    postTypeGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
      gap: 8,
      gridAutoRows: "112px",
      alignItems: "stretch",
    },
    postTypeCard: {
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10,
      padding: "12px 10px",
      cursor: "pointer",
      transition: "all 0.15s ease",
      textAlign: "center" as const,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: "100%",
      boxSizing: "border-box",
      alignSelf: "stretch",
      minHeight: 0,
    },
    postTypeCardSelected: {
      background: "rgba(44, 107, 237, 0.15)",
      border: "1px solid rgba(44, 107, 237, 0.5)",
    },
    postTypeIcon: {
      width: 24,
      height: 24,
      opacity: 0.8,
      flexShrink: 0,
      marginBottom: 6,
    },
    postTypeName: {
      fontSize: 11,
      fontWeight: 600,
      lineHeight: 1.15,
      color: "#e6edf7",
      overflow: "hidden",
      textOverflow: "ellipsis",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      whiteSpace: "normal",
      overflowWrap: "anywhere",
      maxHeight: "2.4em",
    },

    // Image style cards
    styleCardGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 10,
    },
    styleCard: {
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: 14,
      cursor: "pointer",
      transition: "all 0.15s ease",
      textAlign: "center" as const,
      position: "relative" as const,
    },
    styleCardSelected: {
      background: "rgba(44, 107, 237, 0.15)",
      border: "1px solid rgba(44, 107, 237, 0.5)",
    },
    styleCardIcon: {
      width: 32,
      height: 32,
      margin: "0 auto 8px auto",
      opacity: 0.9,
    },
    styleCardName: {
      fontSize: 12,
      fontWeight: 700,
      marginBottom: 4,
      color: "#e6edf7",
    },
    styleCardDesc: { fontSize: 10, opacity: 0.6, lineHeight: 1.3 },
    checkmark: {
      position: "absolute" as const,
      top: 8,
      right: 8,
      width: 18,
      height: 18,
      background: "#2c6bed",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },

    // Color picker
    colorPickerRow: { display: "flex", alignItems: "center", gap: 8 },
    colorSwatch: {
      width: 42,
      height: 42,
      borderRadius: 8,
      border: "2px solid rgba(255,255,255,0.15)",
      cursor: "pointer",
      flexShrink: 0,
    },
    colorInput: {
      flex: 1,
      background: "#0b1220",
      color: "#e6edf7",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 8,
      padding: "10px 12px",
      fontSize: 14,
    },

    // Hashtag slider
    sliderContainer: {
      marginTop: 8,
      width: "100%",
      maxWidth: "680px",
      marginLeft: "auto",
      marginRight: "auto",
    },
    sliderLabels: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 10,
      opacity: 0.5,
      marginBottom: 4,
    },
    slider: { width: "100%", accentColor: "#2c6bed" },
    sliderValue: {
      textAlign: "center" as const,
      marginTop: 4,
      fontSize: 13,
      fontWeight: 600,
    },

    // Drag and drop
    dropZone: {
      border: "2px dashed rgba(255,255,255,0.2)",
      borderRadius: 12,
      padding: 24,
      textAlign: "center" as const,
      cursor: "pointer",
      transition: "all 0.15s ease",
      background: "rgba(255,255,255,0.02)",
    },
    dropZoneActive: {
      borderColor: "#2c6bed",
      background: "rgba(44, 107, 237, 0.1)",
    },

    // Buttons
    primaryBtn: {
      width: "100%",
      borderRadius: 12,
      border: "none",
      background: canGenerate ? "#2c6bed" : "rgba(255,255,255,0.10)",
      color: canGenerate ? "#ffffff" : "rgba(255,255,255,0.4)",
      padding: "16px 20px",
      fontWeight: 800,
      fontSize: 16,
      cursor: canGenerate ? "pointer" : "not-allowed",
      transition: "all 0.15s ease",
    },
    secondaryBtn: {
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.04)",
      color: "#e6edf7",
      padding: "10px 14px",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: 13,
      transition: "all 0.15s ease",
    },
    danger: {
      marginTop: 12,
      border: "1px solid rgba(255, 99, 99, 0.35)",
      background: "rgba(255, 99, 99, 0.12)",
      color: "#ffd7d7",
      borderRadius: 10,
      padding: "10px 12px",
      fontSize: 13,
    },
    status: {
      marginTop: 12,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.04)",
      color: "#e6edf7",
      borderRadius: 10,
      padding: "10px 12px",
      fontSize: 13,
    },

    // Sticky footer
    stickyFooter: {
      position: "fixed" as const,
      bottom: 0,
      left: 0,
      right: 0,
      background: "linear-gradient(transparent, #0b1220 20%)",
      padding: "20px 20px 20px 20px",
      zIndex: 100,
    },
    stickyInner: { maxWidth: 900, margin: "0 auto" },

    // Modal
    instructionsOverlay: {
      position: "fixed" as const,
      inset: 0,
      background: "rgba(0,0,0,0.7)",
      zIndex: 200,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    instructionsModal: {
      background: "#101a33",
      borderRadius: 16,
      padding: 24,
      maxWidth: 500,
      width: "100%",
      maxHeight: "80vh",
      overflow: "auto",
    },
    instructionsClose: {
      float: "right" as const,
      background: "none",
      border: "none",
      color: "#e6edf7",
      fontSize: 24,
      cursor: "pointer",
      padding: 0,
      lineHeight: 1,
    },
    step: { display: "flex", gap: 12, marginBottom: 16 },
    stepNum: {
      width: 28,
      height: 28,
      borderRadius: "50%",
      background: "#2c6bed",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: 14,
      flexShrink: 0,
    },
    stepContent: { flex: 1 },
    stepTitle: { fontWeight: 700, marginBottom: 4 },
    stepText: { fontSize: 13, opacity: 0.8, lineHeight: 1.4 },

    // Preview
    previewCard: {
      background: "rgba(44, 107, 237, 0.08)",
      border: "1px solid rgba(44, 107, 237, 0.2)",
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    previewTitle: {
      fontSize: 12,
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
      marginBottom: 12,
      opacity: 0.8,
    },
    previewGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 12,
    },
    previewItem: { fontSize: 12 },
    previewLabel: { opacity: 0.6, marginBottom: 2 },
    previewValue: { fontWeight: 600 },

    // Tooltip icon
    tooltipIcon: {
      width: 16,
      height: 16,
      opacity: 0.5,
      cursor: "help",
      marginLeft: 4,
    },

    // Step navigation
    stepNavigation: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 16,
      paddingTop: 16,
      borderTop: "1px solid rgba(255,255,255,0.08)",
    },
    backBtn: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 8,
      padding: "10px 16px",
      color: "#e6edf7",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      transition: "all 0.15s ease",
    },
    nextBtn: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "linear-gradient(135deg, #2c6bed 0%, #1e4fc2 100%)",
      border: "none",
      borderRadius: 10,
      padding: "12px 24px",
      color: "#fff",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 700,
      transition: "all 0.15s ease",
      boxShadow: "0 4px 14px rgba(44, 107, 237, 0.4)",
    },
    nextBtnDisabled: {
      background: "rgba(255,255,255,0.10)",
      color: "rgba(255,255,255,0.4)",
      cursor: "not-allowed",
    },
    stepIndicator: {
      display: "flex",
      gap: 6,
      alignItems: "center",
    },
    stepDot: {
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: "rgba(255,255,255,0.15)",
      transition: "all 0.2s ease",
      boxShadow: "none",
    },
    stepDotActive: {
      background: "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)",
      width: 32,
      borderRadius: 6,
      boxShadow: "0 2px 10px rgba(44, 107, 237, 0.4)",
    },
    stepDotCompleted: {
      background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
      boxShadow: "0 2px 8px rgba(34, 197, 94, 0.3)",
    },
  };

  return (
    <div style={styles.page} className="ath-page">
      {/* Header - Enhanced with gradient */}
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto 24px auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap" as const,
          paddingTop: 50,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: 1,
              margin: 0,
              background:
                "linear-gradient(135deg, #2c6bed 0%, #7eb3ff 50%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Generate a Post
          </h1>
          <p
            style={{
              margin: "8px 0 0 0",
              opacity: 0.8,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <img src="/logo-icon.png" alt="AI Social Helper" style={{ width: 28, height: 28, objectFit: "contain" }} />
            AI-powered image + caption + hashtags
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a
            href="/dashboard"
            style={{
              background:
                "linear-gradient(135deg, rgba(44, 107, 237, 0.2) 0%, rgba(44, 107, 237, 0.1) 100%)",
              border: "1px solid rgba(44, 107, 237, 0.3)",
              borderRadius: 10,
              padding: "10px 16px",
              color: "#7eb3ff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
              textDecoration: "none",
            }}
            className="hover-btn"
          >
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Dashboard
          </a>
          <button
            style={{
              background:
                "linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%)",
              border: "1px solid rgba(124, 58, 237, 0.3)",
              borderRadius: 10,
              padding: "10px 16px",
              color: "#a78bfa",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
            onClick={() => setShowInstructions(true)}
            className="hover-btn"
          >
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            How it works
          </button>
        </div>
      </div>

      <div style={styles.container}>
        {/* Step indicator */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <div style={styles.stepIndicator}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                style={{
                  ...styles.stepDot,
                  ...(i === currentStep ? styles.stepDotActive : {}),
                  ...(i < currentStep ? styles.stepDotCompleted : {}),
                }}
              />
            ))}
          </div>
        </div>

        {/* Step 0: Your Business */}
        {currentStep === 0 && (
          <div
            key={`step-0-${slideDirection}`}
            className={`slide-card ${slideDirection === "left" ? "slide-from-right" : "slide-from-left"}`}
          >
            <div style={styles.card} className="hover-card">
              <h2 style={styles.cardTitle}>Your Business</h2>
              <p style={styles.cardHint}>
                Tell us about your business and audience
              </p>

              <div style={styles.row2} className="ath-row2">
                <div style={styles.field}>
                  <div style={styles.label}>
                    Niche <span style={styles.pill}>Required</span>
                    <Tooltip text="Your business type or industry. Be specific for better results.">
                      <svg
                        style={styles.tooltipIcon}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Tooltip>
                  </div>
                  <div style={styles.autocompleteWrap}>
                    <input
                      ref={nicheInputRef}
                      style={styles.input}
                      value={form.niche}
                      onChange={(e) => updateForm("niche", e.target.value)}
                      onFocus={() => setShowNicheSuggestions(true)}
                      onBlur={() =>
                        setTimeout(() => setShowNicheSuggestions(false), 150)
                      }
                      placeholder="Type or select a niche..."
                      className="hover-input"
                    />
                    {showNicheSuggestions && filteredNiches.length > 0 && (
                      <div style={styles.suggestions}>
                        <div style={styles.suggestionHint}>
                          Suggestions (or type your own)
                        </div>
                        {filteredNiches.map((n) => (
                          <div
                            key={n}
                            style={styles.suggestionItem}
                            className="hover-suggestion"
                            onMouseDown={() => {
                              updateForm("niche", n);
                              setShowNicheSuggestions(false);
                            }}
                          >
                            {n}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>
                    Audience <span style={styles.pill}>Required</span>
                    <Tooltip text="Who you're trying to reach. The more specific, the better your content.">
                      <svg
                        style={styles.tooltipIcon}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Tooltip>
                  </div>
                  <input
                    style={styles.input}
                    value={form.audience}
                    onChange={(e) => updateForm("audience", e.target.value)}
                    placeholder='e.g., "local homeowners", "busy moms"'
                    className="hover-input"
                  />
                </div>
              </div>
              {/* Navigation */}
              <div style={styles.stepNavigation}>
                <div></div>
                <button
                  style={{
                    ...styles.nextBtn,
                    ...(isStepComplete(0) ? {} : styles.nextBtnDisabled),
                  }}
                  onClick={goToNextStep}
                  disabled={!isStepComplete(0)}
                  className="hover-btn"
                >
                  Next
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Post Type Cards */}
        {currentStep === 1 && (
          <div
            key={`step-1-${slideDirection}`}
            className={`slide-card ${slideDirection === "left" ? "slide-from-right" : "slide-from-left"}`}
          >
            <div style={styles.card} className="hover-card">
              <h2 style={styles.cardTitle}>Post Type</h2>
              <p style={styles.cardHint}>
                What kind of post do you want to create?
              </p>
              <div style={styles.postTypeGrid} className="ath-postTypeGrid">
                {postTypes.map((pt) => (
                  <Tooltip key={pt.value} text={pt.tooltip}>
                    <div
                      style={{
                        ...styles.postTypeCard,
                        ...(form.postType === pt.value
                          ? styles.postTypeCardSelected
                          : {}),
                      }}
                      onClick={() => handlePostTypeSelect(pt.value)}
                      className="hover-card-item"
                    >
                      <svg
                        style={styles.postTypeIcon}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d={pt.icon}
                        />
                      </svg>
                      <div style={styles.postTypeName}>
                        {pt.value.split(" / ")[0]}
                      </div>
                    </div>
                  </Tooltip>
                ))}
              </div>

              {specificUI.show && (
                <div ref={specificRequestWrapRef} style={{ ...styles.field, marginTop: 16 }}>
                  <div style={styles.label}>
                    {specificUI.label}
                    <span
                      style={{
                        ...styles.pill,
                        background: "rgba(255,255,255,0.1)",
                        color: getCharCountColor(
                          form.specificRequest.length,
                          MAX_SPECIFIC_REQUEST_CHARS
                        ),
                      }}
                    >
                      {form.specificRequest.length}/{MAX_SPECIFIC_REQUEST_CHARS}
                    </span>
                  </div>
                  <input
                    ref={specificRequestRef}
                    style={styles.input}
                    value={form.specificRequest}
                    onChange={(e) =>
                      updateForm(
                        "specificRequest",
                        e.target.value.slice(0, MAX_SPECIFIC_REQUEST_CHARS)
                      )
                    }
                    placeholder={specificUI.placeholder}
                    className={`hover-input${inputPulse ? " input-pulse" : ""}`}
                  />
                  <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6 }}>
                    {specificUI.helper}
                  </div>
                </div>
              )}
              {/* Navigation */}
              <div style={styles.stepNavigation}>
                <button
                  style={styles.backBtn}
                  onClick={goToPrevStep}
                  className="hover-btn"
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </button>
                <button
                  style={{
                    ...styles.nextBtn,
                    ...(isStepComplete(1) ? {} : styles.nextBtnDisabled),
                  }}
                  onClick={goToNextStep}
                  disabled={!isStepComplete(1)}
                  className="hover-btn"
                >
                  Next
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Image Style */}
        {currentStep === 2 && (
          <div
            key={`step-2-${slideDirection}`}
            className={`slide-card ${slideDirection === "left" ? "slide-from-right" : "slide-from-left"}`}
          >
            <div style={styles.card} className="hover-card">
              <h2 style={styles.cardTitle}>Image Style</h2>
              <p style={styles.cardHint}>Choose how your image will look</p>
              <div style={styles.styleCardGrid} className="ath-styleCardGrid">
                {imageStyles.map((s) => (
                  <Tooltip key={s.value} text={s.tooltip}>
                    <div
                      style={{
                        ...styles.styleCard,
                        ...(form.imageStyle === s.value
                          ? styles.styleCardSelected
                          : {}),
                      }}
                      onClick={() => updateForm("imageStyle", s.value)}
                      className="hover-card-item"
                    >
                      {form.imageStyle === s.value && (
                        <div style={styles.checkmark}>
                          <svg
                            width="12"
                            height="12"
                            fill="none"
                            stroke="#fff"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                      <svg
                        style={styles.styleCardIcon}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d={s.icon}
                        />
                      </svg>
                      <div style={styles.styleCardName}>{s.name}</div>
                      <div style={styles.styleCardDesc}>{s.description}</div>
                    </div>
                  </Tooltip>
                ))}
              </div>
              {/* Navigation */}
              <div style={styles.stepNavigation}>
                <button
                  style={styles.backBtn}
                  onClick={goToPrevStep}
                  className="hover-btn"
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </button>
                <button
                  style={{
                    ...styles.nextBtn,
                    ...(isStepComplete(2) ? {} : styles.nextBtnDisabled),
                  }}
                  onClick={goToNextStep}
                  disabled={!isStepComplete(2)}
                  className="hover-btn"
                >
                  Next
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Caption Settings */}
        {currentStep === 3 && (
          <div
            key={`step-3-${slideDirection}`}
            className={`slide-card ${slideDirection === "left" ? "slide-from-right" : "slide-from-left"}`}
          >
            <div style={styles.card} className="hover-card">
              <h2 style={styles.cardTitle}>Caption Settings</h2>
              <p style={styles.cardHint}>Customize your caption and hashtags</p>
              <div style={styles.row2} className="ath-row2">
                <div style={styles.field}>
                  <div style={styles.label}>
                    Tone
                    <Tooltip text="The voice and personality of your caption. Match it to your brand.">
                      <svg
                        style={styles.tooltipIcon}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Tooltip>
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
                  <div style={styles.label}>
                    Caption Length
                    <Tooltip text="Short for quick hits, Long for storytelling or detailed info.">
                      <svg
                        style={styles.tooltipIcon}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Tooltip>
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
                    <svg
                      style={styles.tooltipIcon}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Tooltip>
                </div>
                <div style={styles.sliderContainer}>
                  <div style={styles.sliderLabels}>
                    <span>None</span>
                    <span>Few</span>
                    <span>Standard</span>
                    <span>Many</span>
                    <span>Max</span>
                  </div>
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
                  <div style={styles.sliderValue}>
                    {form.hashtagCount} hashtags (
                    {getHashtagLabel(form.hashtagCount)})
                  </div>
                </div>
              </div>
              {/* Navigation */}
              <div style={styles.stepNavigation}>
                <button
                  style={styles.backBtn}
                  onClick={goToPrevStep}
                  className="hover-btn"
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </button>
                <button
                  style={{
                    ...styles.nextBtn,
                    ...(isStepComplete(3) ? {} : styles.nextBtnDisabled),
                  }}
                  onClick={goToNextStep}
                  disabled={!isStepComplete(3)}
                  className="hover-btn"
                >
                  Next
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Brand Colors */}
        {currentStep === 4 && (
          <div
            key={`step-4-${slideDirection}`}
            className={`slide-card ${slideDirection === "left" ? "slide-from-right" : "slide-from-left"}`}
          >
            <div style={styles.card} className="hover-card">
              <h2 style={styles.cardTitle}>Brand Colors</h2>
              <p style={styles.cardHint}>Used for branded image styles</p>
              <div style={styles.row2} className="ath-row2">
                <div style={styles.field}>
                  <div style={styles.label}>Primary Color</div>
                  <div style={styles.colorPickerRow}>
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={(e) =>
                        updateForm("primaryColor", e.target.value)
                      }
                      style={{
                        ...styles.colorSwatch,
                        background: form.primaryColor,
                      }}
                    />
                    <input
                      type="text"
                      value={form.primaryColor}
                      onChange={(e) =>
                        updateForm("primaryColor", e.target.value)
                      }
                      style={styles.colorInput}
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>Secondary Color</div>
                  <div style={styles.colorPickerRow}>
                    <input
                      type="color"
                      value={form.secondaryColor}
                      onChange={(e) =>
                        updateForm("secondaryColor", e.target.value)
                      }
                      style={{
                        ...styles.colorSwatch,
                        background: form.secondaryColor,
                      }}
                    />
                    <input
                      type="text"
                      value={form.secondaryColor}
                      onChange={(e) =>
                        updateForm("secondaryColor", e.target.value)
                      }
                      style={styles.colorInput}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>
              {/* Navigation */}
              <div style={styles.stepNavigation}>
                <button
                  style={styles.backBtn}
                  onClick={goToPrevStep}
                  className="hover-btn"
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </button>
                <button
                  style={{
                    ...styles.nextBtn,
                    ...(isStepComplete(4) ? {} : styles.nextBtnDisabled),
                  }}
                  onClick={goToNextStep}
                  disabled={!isStepComplete(4)}
                  className="hover-btn"
                >
                  Next
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Reference Image - Drag & Drop */}
        {currentStep === 5 && (
          <div
            key={`step-5-${slideDirection}`}
            className={`slide-card ${slideDirection === "left" ? "slide-from-right" : "slide-from-left"}`}
          >
            <div style={styles.card} className="hover-card">
              <h2 style={styles.cardTitle}>Reference Image</h2>
              <p style={styles.cardHint}>
                Optional: Upload an image for visual inspiration
              </p>

              <div
                ref={dropRef}
                style={{
                  ...styles.dropZone,
                  ...(isDragging ? styles.dropZoneActive : {}),
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleUploadChange}
                  style={{ display: "none" }}
                />
                <svg
                  width="40"
                  height="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                  style={{ opacity: 0.5, marginBottom: 8 }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  {isDragging ? "Drop image here" : "Drag & drop an image here"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>
                  or click to browse (max 2MB)
                </div>
              </div>

              {uploadRef && (
                <div style={{ marginTop: 12 }}>
                  <img
                    src={uploadRef.dataUrl}
                    alt="Reference"
                    style={{
                      width: "100%",
                      maxHeight: 150,
                      objectFit: "cover",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  />
                  <button
                    style={{
                      ...styles.secondaryBtn,
                      marginTop: 8,
                      width: "100%",
                    }}
                    onClick={() => setUploadRef(null)}
                    className="hover-btn"
                  >
                    Remove
                  </button>
                </div>
              )}
              {uploadError && <div style={styles.danger}>{uploadError}</div>}

              {dayContext && (
                <div
                  style={{
                    ...styles.card,
                    background: "rgba(44, 107, 237, 0.1)",
                    marginTop: 16,
                  }}
                >
                  <strong>Calendar: Day {dayContext.day}</strong>
                  <br />
                  {dayContext.title} — {dayContext.detail}
                </div>
              )}

              {/* Live Preview */}
              <div style={{ ...styles.previewCard, marginTop: 16 }}>
                <div style={styles.previewTitle}>Your settings summary</div>
                <div style={styles.previewGrid}>
                  <div style={styles.previewItem}>
                    <div style={styles.previewLabel}>Post Type</div>
                    <div style={styles.previewValue}>{form.postType}</div>
                  </div>
                  <div style={styles.previewItem}>
                    <div style={styles.previewLabel}>Image Style</div>
                    <div style={styles.previewValue}>
                      {
                        imageStyles.find((s) => s.value === form.imageStyle)
                          ?.name
                      }
                    </div>
                  </div>
                  <div style={styles.previewItem}>
                    <div style={styles.previewLabel}>Tone</div>
                    <div style={styles.previewValue}>{form.tone}</div>
                  </div>
                  <div style={styles.previewItem}>
                    <div style={styles.previewLabel}>Caption</div>
                    <div style={styles.previewValue}>
                      {form.captionLength} · {form.hashtagCount} hashtags
                    </div>
                  </div>
                </div>
              </div>

              {statusMsg && <div style={styles.status}>{statusMsg}</div>}
              {errorMsg && <div style={styles.danger}>{errorMsg}</div>}

              {/* Navigation with Generate button */}
              <div style={styles.stepNavigation}>
                <button
                  style={styles.backBtn}
                  onClick={goToPrevStep}
                  className="hover-btn"
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </button>
                <button
                  style={{
                    ...styles.nextBtn,
                    padding: "12px 24px",
                    fontSize: 14,
                    ...(canGenerate ? {} : styles.nextBtnDisabled),
                  }}
                  onClick={() => {
                    if (!tokenBalance.isLoading && tokenBalance.tokensRemaining <= 0) {
                      setShowOutOfTokens(true);
                      addToast("You've used all your tokens this month.", "warning");
                      return;
                    }
                    generatePost();
                  }}
                  disabled={!canGenerate || isLoading}
                  className="hover-btn"
                >
                  {isLoading
                    ? "Generating…"
                    : !tokenBalance.isLoading && tokenBalance.tokensRemaining <= 0
                      ? "Token limit reached"
                      : canGenerate
                        ? "Generate Post"
                        : "Fill in Niche & Audience"}
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions Modal */}
      {showInstructions && (
        <div
          style={styles.instructionsOverlay}
          onClick={() => setShowInstructions(false)}
        >
          <div
            className="ath-gen-modal"
            style={styles.instructionsModal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={styles.instructionsClose}
              onClick={() => setShowInstructions(false)}
            >
              ×
            </button>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 20 }}>How it works</h2>
            <div style={styles.step}>
              <div style={styles.stepNum}>1</div>
              <div style={styles.stepContent}>
                <div style={styles.stepTitle}>Enter your business info</div>
                <div style={styles.stepText}>
                  Add your niche and target audience. These are required.
                </div>
              </div>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNum}>2</div>
              <div style={styles.stepContent}>
                <div style={styles.stepTitle}>Choose your post type</div>
                <div style={styles.stepText}>
                  Pick what kind of content you want. Add specific details if
                  needed.
                </div>
              </div>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNum}>3</div>
              <div style={styles.stepContent}>
                <div style={styles.stepTitle}>Customize the style</div>
                <div style={styles.stepText}>
                  Select image style, tone, and brand colors.
                </div>
              </div>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNum}>4</div>
              <div style={styles.stepContent}>
                <div style={styles.stepTitle}>Generate & refine</div>
                <div style={styles.stepText}>
                  Click generate. You get one refinement per post if needed.
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 20,
                padding: 12,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 8,
                fontSize: 12,
                opacity: 0.8,
              }}
            >
              <strong>Tip:</strong> Leave "specific request" blank to keep posts
              generic and safe (no invented discounts or claims).
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

        /* Input pulse when post type is selected */
        @keyframes inputPulse {
          0%   { border-color: rgba(44, 107, 237, 0.3); box-shadow: none; }
          40%  { border-color: rgba(44, 107, 237, 1);   box-shadow: 0 0 0 4px rgba(44, 107, 237, 0.25); }
          100% { border-color: rgba(44, 107, 237, 0.5); box-shadow: 0 0 0 0px rgba(44, 107, 237, 0); }
        }
        .input-pulse {
          animation: inputPulse 0.65s ease-out forwards !important;
          border-color: rgba(44, 107, 237, 0.5) !important;
        }

        /* Slide animations */
        .slide-card {
          animation-duration: 0.4s;
          animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
          animation-fill-mode: both;
        }
        .slide-from-right {
          animation-name: slideInFromRight;
        }
        .slide-from-left {
          animation-name: slideInFromLeft;
        }

        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(60px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-60px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (max-width: 768px) {
          .ath-page { padding: 10px !important; }
          .ath-row2 { grid-template-columns: 1fr !important; }
          .ath-styleCardGrid { grid-template-columns: repeat(2, 1fr) !important; }
          .ath-postTypeGrid { grid-template-columns: repeat(3, 1fr) !important; }
          .ath-page input, .ath-page select, .ath-page textarea { font-size: 16px !important; }
        }
        @media (max-width: 480px) {
          .ath-postTypeGrid { grid-template-columns: repeat(2, 1fr) !important; }
          .ath-styleCardGrid { grid-template-columns: 1fr !important; }
        }
        /* Narrow phone: tighten modal padding */
        @media (max-width: 420px) {
          .ath-gen-modal { padding: 16px !important; max-height: 85vh !important; }
          .ath-page { padding: 8px !important; }
        }
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
