"use client";

import React, { useMemo, useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getImageStyleOption, type ImageStyleValue } from "../lib/imageStyleOptions";
import { useTokenBalance } from "../lib/useTokenBalance";
import { useToast } from "../_components/ToastProvider";
import OutOfTokensModal from "../_components/OutOfTokensModal";
import { getImage, saveImage } from "../lib/imageStorage";
import { applyRawTreatment, applyPhotoWithText, applyBrandingPhotoOnly, applyBrandingWithPhotoAndText } from "../lib/photoTreatments";
import { useInstagram } from "../lib/useInstagram";
import { useFacebook } from "../lib/useFacebook";
import {
  getTemplate,
  getPillarForWorkdayIndex,
  weekdayToWorkdayIndex,
  nicheKeyFromLabel,
} from "../lib/nicheTemplates";

type ImageStyle =
  | "lifestyle_photo"
  | "lifestyle_photo_text"
  | "branding_photo"
  | "branding_text_photo"
  | "branding_text_only";

type DayPlan = {
  day: number;
  postType: string;
  detail: string;
  imageStyle: ImageStyle;
  date: Date;
  captionLength: "short" | "medium" | "long";
  hashtagPack: "light" | "standard" | "heavy";
  imageFormatLabel: string;
  isHoliday?: boolean;
  holidayName?: string;
  pillarType?: string;
};

type SavedPost = {
  id: string;
  profileId?: string;
  calendarDay?: number;
  month?: string;
  hasImage?: boolean;
  caption: string;
  hashtags: string;
  postType: string;
  imageStyle: string;
  tone: string;
  niche: string;
  audience: string;
  createdAt: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/* ---------------- Holiday Detection ---------------- */

type Holiday = {
  name: string;
  month: number;
  day?: number;
  weekday?: number;
  week?: number;
  detail: string;
};

const HOLIDAYS: Holiday[] = [
  {
    name: "New Year's Day",
    month: 0,
    day: 1,
    detail: "Start the year with inspiration for your audience!",
  },
  {
    name: "Valentine's Day",
    month: 1,
    day: 14,
    detail: "Share the love with your community!",
  },
  {
    name: "St. Patrick's Day",
    month: 2,
    day: 17,
    detail: "Get festive with green-themed content!",
  },
  {
    name: "April Fools' Day",
    month: 3,
    day: 1,
    detail: "Have fun with lighthearted content!",
  },
  {
    name: "Earth Day",
    month: 3,
    day: 22,
    detail: "Highlight sustainability and eco-friendly practices!",
  },
  {
    name: "Cinco de Mayo",
    month: 4,
    day: 5,
    detail: "Celebrate with vibrant, festive content!",
  },
  {
    name: "Independence Day",
    month: 6,
    day: 4,
    detail: "Patriotic content and summer vibes!",
  },
  {
    name: "Halloween",
    month: 9,
    day: 31,
    detail: "Spooky, fun content for your followers!",
  },
  {
    name: "Veterans Day",
    month: 10,
    day: 11,
    detail: "Honor and thank those who served!",
  },
  {
    name: "Christmas Eve",
    month: 11,
    day: 24,
    detail: "Holiday cheer and last-minute gift ideas!",
  },
  {
    name: "Christmas Day",
    month: 11,
    day: 25,
    detail: "Celebrate the holiday with your community!",
  },
  {
    name: "New Year's Eve",
    month: 11,
    day: 31,
    detail: "Reflect on the year and look ahead!",
  },
  {
    name: "MLK Day",
    month: 0,
    weekday: 1,
    week: 3,
    detail: "Honor Dr. Martin Luther King Jr.'s legacy!",
  },
  {
    name: "Presidents' Day",
    month: 1,
    weekday: 1,
    week: 3,
    detail: "Celebrate leadership and history!",
  },
  {
    name: "Mother's Day",
    month: 4,
    weekday: 0,
    week: 2,
    detail: "Celebrate moms and mother figures!",
  },
  {
    name: "Memorial Day",
    month: 4,
    weekday: 1,
    week: -1,
    detail: "Honor those who served our country!",
  },
  {
    name: "Father's Day",
    month: 5,
    weekday: 0,
    week: 3,
    detail: "Celebrate dads and father figures!",
  },
  {
    name: "Labor Day",
    month: 8,
    weekday: 1,
    week: 1,
    detail: "Celebrate workers and end of summer!",
  },
  {
    name: "Columbus Day",
    month: 9,
    weekday: 1,
    week: 2,
    detail: "Fall content and exploration themes!",
  },
  {
    name: "Thanksgiving",
    month: 10,
    weekday: 4,
    week: 4,
    detail: "Gratitude and giving thanks!",
  },
  {
    name: "Black Friday",
    month: 10,
    weekday: 5,
    week: 4,
    detail: "Deals, sales, and shopping excitement!",
  },
  {
    name: "Small Business Saturday",
    month: 10,
    weekday: 6,
    week: 4,
    detail: "Support local and small businesses!",
  },
  {
    name: "Cyber Monday",
    month: 11,
    weekday: 1,
    week: 1,
    detail: "Online deals and digital promotions!",
  },
];

function getHolidayForDate(
  year: number,
  month: number,
  day: number
): Holiday | null {
  for (const holiday of HOLIDAYS) {
    if (holiday.month !== month) continue;
    if (holiday.day !== undefined && holiday.day === day) return holiday;
    if (holiday.weekday !== undefined && holiday.week !== undefined) {
      const holidayDate = getNthWeekdayOfMonth(
        year,
        month,
        holiday.weekday,
        holiday.week
      );
      if (holidayDate === day) return holiday;
    }
  }
  return null;
}

function getNthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  week: number
): number {
  if (week === -1) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let d = lastDay; d >= 1; d--) {
      if (new Date(year, month, d).getDay() === weekday) return d;
    }
    return 1;
  }
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d);
    if (date.getMonth() !== month) break;
    if (date.getDay() === weekday) {
      count++;
      if (count === week) return d;
    }
  }
  return 1;
}

/* ---------------- Deterministic "random" ---------------- */

function hashSeed(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededPick<T>(arr: readonly T[], seed: number) {
  return arr[seed % arr.length];
}

function pickImageStyleForDay(
  postType: string,
  year: number,
  monthIndex0: number,
  day: number
): ImageStyle {
  const t = postType.toLowerCase();
  const seed = hashSeed(`${year}-${monthIndex0}-${day}-${postType}`);

  if (t.includes("educational") || t.includes("authority")) {
    return seededPick(
      ["branding_text_only", "branding_text_photo"] as const,
      seed
    );
  }
  if (t.includes("seasonal") || t.includes("holiday")) {
    return seededPick(
      ["branding_text_photo", "lifestyle_photo_text", "lifestyle_photo"] as const,
      seed
    );
  }
  if (t.includes("engagement")) {
    return seededPick(["lifestyle_photo", "lifestyle_photo_text", "branding_photo"] as const, seed);
  }
  if (t.includes("before") || t.includes("after")) {
    return seededPick(["lifestyle_photo", "lifestyle_photo_text"] as const, seed);
  }
  return seededPick(["lifestyle_photo", "lifestyle_photo_text", "branding_photo"] as const, seed);
}

/* ---------------- Post types ---------------- */

const POST_TYPES: Array<{ postType: string; detail: string }> = [
  {
    postType: "Basic Post",
    detail: "A simple, engaging post for your audience.",
  },
  {
    postType: "Educational",
    detail: "Share valuable knowledge with your followers.",
  },
  {
    postType: "Problem → Solution",
    detail: "Address a pain point your audience has.",
  },
  { postType: "Before & After", detail: "Show transformation and results." },
  {
    postType: "Engagement",
    detail: "Start a conversation with your audience.",
  },
  { postType: "Authority", detail: "Position yourself as the expert." },
];

const WEEKDAY_PLANS: Record<number, { postType: string; detail: string }> = {
  0: POST_TYPES[4], // Sunday: Engagement
  1: POST_TYPES[1], // Monday: Educational
  2: POST_TYPES[5], // Tuesday: Authority
  3: POST_TYPES[2], // Wednesday: Problem → Solution
  4: POST_TYPES[3], // Thursday: Before & After
  5: POST_TYPES[0], // Friday: Basic Post
  6: POST_TYPES[1], // Saturday: Educational
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function buildMonthPlan(year: number, month: number, nicheKey?: string): DayPlan[] {
  const daysInMonth = getDaysInMonth(year, month);
  const plans: DayPlan[] = [];
  const template = getTemplate(nicheKey);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const weekday = date.getDay();
    const holiday = getHolidayForDate(year, month, day);

    let postType: string;
    let detail: string;
    let isHoliday = false;
    let holidayName: string | undefined;
    let pillarType: string | undefined;
    let imageStyle: ImageStyle;
    let captionLength: "short" | "medium" | "long";
    let hashtagPack: "light" | "standard" | "heavy";

    if (holiday) {
      // Holidays always override the template
      postType = "Seasonal";
      detail = holiday.detail;
      isHoliday = true;
      holidayName = holiday.name;
      imageStyle = pickImageStyleForDay(postType, year, month, day);
      captionLength = "medium";
      hashtagPack = "heavy";
    } else {
      const workdayIndex = weekdayToWorkdayIndex(weekday);
      if (workdayIndex !== null) {
        // Mon–Fri: drive from the niche template's weeklyStructure
        const pillar = getPillarForWorkdayIndex(template, workdayIndex);
        postType = pillar.label;
        detail = pillar.detail;
        pillarType = pillar.id;
        imageStyle = pillar.imageStyleHint
          ? (pillar.imageStyleHint as ImageStyle)
          : pickImageStyleForDay(pillar.postTypeHint, year, month, day);
        captionLength = pillar.captionLength.toLowerCase() as "short" | "medium" | "long";
        hashtagPack = pillar.hashtagPack;
      } else {
        // Sat–Sun: fall back to existing weekday plan
        const base = WEEKDAY_PLANS[weekday];
        postType = base.postType;
        detail = base.detail;
        imageStyle = pickImageStyleForDay(postType, year, month, day);
        switch (postType) {
          case "Engagement": captionLength = "short"; hashtagPack = "light"; break;
          case "Educational": captionLength = "medium"; hashtagPack = "heavy"; break;
          default: captionLength = "medium"; hashtagPack = "standard";
        }
      }
    }

    const imageStyleOption = getImageStyleOption(imageStyle);
    const imageFormatLabel = imageStyleOption?.name || imageStyle;

    plans.push({
      day,
      postType,
      detail,
      imageStyle,
      date,
      captionLength,
      hashtagPack,
      imageFormatLabel,
      isHoliday,
      holidayName,
      pillarType,
    });
  }

  return plans;
}

/* ---------------- Helpers ---------------- */

function getPostTypeAccent(postType: string, isHoliday?: boolean): { color: string; icon: string } {
  if (isHoliday) return { color: "#f97316", icon: "🎉" };
  const t = postType.toLowerCase();
  if (t.includes("educat")) return { color: "#3b82f6", icon: "📚" };
  if (t.includes("authority") || t.includes("expert")) return { color: "#8b5cf6", icon: "⭐" };
  if (t.includes("problem") || t.includes("solution")) return { color: "#f59e0b", icon: "💡" };
  if (t.includes("before") || t.includes("after") || t.includes("transform")) return { color: "#14b8a6", icon: "🔄" };
  if (t.includes("engag") || t.includes("connect") || t.includes("community")) return { color: "#ec4899", icon: "💬" };
  if (t.includes("market") || t.includes("listing") || t.includes("feature")) return { color: "#10b981", icon: "📈" };
  if (t.includes("seasonal") || t.includes("holiday")) return { color: "#f97316", icon: "🎉" };
  return { color: "#6b7280", icon: "✏️" };
}

const HASHTAG_COUNT_MAP: Record<string, number> = { light: 5, standard: 12, heavy: 20 };

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ----------------------------- Page ----------------------------- */

function CalendarPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenBalance = useTokenBalance();
  const { addToast } = useToast();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null);
  const [activeBrandProfile, setActiveBrandProfile] = useState<any>(null);

  // Niche key: prefer URL param (?niche=realtor), fall back to active brand profile's niche
  const nicheKey = useMemo(() => {
    const urlNiche = searchParams.get("niche");
    if (urlNiche) return urlNiche;
    if (activeBrandProfile?.niche) return nicheKeyFromLabel(activeBrandProfile.niche);
    return undefined;
  }, [searchParams, activeBrandProfile]);
  const [showOutOfTokens, setShowOutOfTokens] = useState(false);

  // Social publishing
  const instagram = useInstagram();
  const facebook = useFacebook();
  const [igPostStatus, setIgPostStatus] = useState<"idle" | "posting" | "success" | "error">("idle");
  const [fbPostStatus, setFbPostStatus] = useState<"idle" | "posting" | "success" | "error">("idle");

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [extraDetails, setExtraDetails] = useState("");
  const [userThought, setUserThought] = useState("");
  const [dayPostsMap, setDayPostsMap] = useState<Map<number, SavedPost>>(new Map());
  const [drawerImage, setDrawerImage] = useState<string | null>(null);
  const [drawerImageLoading, setDrawerImageLoading] = useState(false);
  const [drawerView, setDrawerView] = useState<"plan" | "saved">("plan");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [planningGeneration, setPlanningGeneration] = useState(false);

  // Load gallery data for current month
  const loadGalleryData = useCallback(() => {
    try {
      const gallery: SavedPost[] = JSON.parse(localStorage.getItem("ath_gallery") || "[]");
      const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
      const map = new Map<number, SavedPost>();
      gallery.forEach((p) => {
        if (p.month === monthKey && p.calendarDay) {
          const existing = map.get(p.calendarDay);
          if (!existing || new Date(p.createdAt) > new Date(existing.createdAt)) {
            map.set(p.calendarDay, p);
          }
        }
      });
      setDayPostsMap(map);
    } catch {
      setDayPostsMap(new Map());
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Load active brand profile
    try {
      const activeBrand = localStorage.getItem("ath_active_brand_profile");
      if (activeBrand) {
        const parsed = JSON.parse(activeBrand);
        if (parsed && parsed.profileId) {
          setActiveBrandProfile(parsed);
        }
      }
    } catch {}
  }, []);

  // Load gallery on mount and month change
  useEffect(() => {
    loadGalleryData();
  }, [loadGalleryData]);

  // Re-read gallery when returning from /post page
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadGalleryData();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadGalleryData]);

  const plan = useMemo(
    () => buildMonthPlan(currentYear, currentMonth, nicheKey),
    [currentYear, currentMonth, nicheKey]
  );
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);

  const monthHolidays = useMemo(() => {
    return plan
      .filter((p) => p.isHoliday)
      .map((p) => ({ day: p.day, name: p.holidayName }));
  }, [plan]);

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  /* ---- Drawer open/close ---- */

  function openDrawer(dayPlan: DayPlan) {
    setSelectedDay(dayPlan);
    setExtraDetails("");
    setUserThought("");
    setDrawerImage(null);
    setCopiedField(null);
    setIgPostStatus("idle");
    setFbPostStatus("idle");

    const savedPost = dayPostsMap.get(dayPlan.day);
    if (savedPost) {
      setDrawerView("saved");
      if (savedPost.hasImage) {
        setDrawerImageLoading(true);
        const targetId = savedPost.id;
        getImage(targetId).then((img) => {
          // Only set if still viewing same post
          setDrawerImage(img);
          setDrawerImageLoading(false);
        }).catch(() => {
          setDrawerImageLoading(false);
        });
      }
    } else {
      setDrawerView("plan");
    }

    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setTimeout(() => {
      setSelectedDay(null);
      setDrawerImage(null);
      setDrawerView("plan");
      setExtraDetails("");
      setUserThought("");
      setCopiedField(null);
    }, 300);
  }

  /* ---- Generate caption from a planned media post ---- */

  async function handleGenerateFromPlanned() {
    if (!savedPostForDay || savedPostForDay.postType !== "Media: Planned") return;
    if (!drawerImage) { addToast("Photo not available", "error"); return; }
    setPlanningGeneration(true);
    try {
      // Parse caption settings stored as JSON in the hashtags field
      let captionSettings = { captionLength: "Medium", hashtagCount: 12 };
      try { captionSettings = JSON.parse(savedPostForDay.hashtags); } catch {}

      // Generate caption via caption-only API
      const captionRes = await fetch("/api/caption-only", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: savedPostForDay.niche,
          audience: savedPostForDay.audience,
          tone: savedPostForDay.tone,
          topic: savedPostForDay.caption, // topic was stored in caption field
          captionLength: captionSettings.captionLength,
          hashtagCount: captionSettings.hashtagCount,
        }),
      });
      const captionData = await captionRes.json();
      if (!captionRes.ok) throw new Error(captionData.error || "Caption generation failed");

      const generatedCaption: string = captionData.caption ?? "";
      const generatedHashtags: string = captionData.hashtags ?? "";

      // Apply image treatment
      let finalImage = drawerImage;
      if (savedPostForDay.imageStyle === "photo_text") {
        finalImage = await applyPhotoWithText(drawerImage, generatedCaption);
      } else if (savedPostForDay.imageStyle === "branding_photo" && activeBrandProfile) {
        finalImage = await applyBrandingPhotoOnly(drawerImage, {
          primaryColor: activeBrandProfile.primaryColor,
          secondaryColor: activeBrandProfile.secondaryColor,
          logoBase64: activeBrandProfile.logoBase64,
          website: activeBrandProfile.website,
          phone: activeBrandProfile.phone,
        });
      } else if (savedPostForDay.imageStyle === "brand_photo_text" && activeBrandProfile) {
        finalImage = await applyBrandingWithPhotoAndText(drawerImage, generatedCaption, {
          primaryColor: activeBrandProfile.primaryColor,
          secondaryColor: activeBrandProfile.secondaryColor,
          logoBase64: activeBrandProfile.logoBase64,
          website: activeBrandProfile.website,
          phone: activeBrandProfile.phone,
        });
      } else {
        finalImage = applyRawTreatment(drawerImage);
      }

      // Save final image to IndexedDB (replaces raw)
      await saveImage(savedPostForDay.id, finalImage);
      setDrawerImage(finalImage);

      // Update localStorage gallery entry
      const gallery: any[] = JSON.parse(localStorage.getItem("ath_gallery") || "[]");
      const updatedGallery = gallery.map((p) => {
        if (p.id === savedPostForDay.id) {
          return { ...p, caption: generatedCaption, hashtags: generatedHashtags, postType: "Media Post" };
        }
        return p;
      });
      localStorage.setItem("ath_gallery", JSON.stringify(updatedGallery));

      // Update dayPostsMap in state
      const updatedPost = { ...savedPostForDay, caption: generatedCaption, hashtags: generatedHashtags, postType: "Media Post" };
      setDayPostsMap((prev) => {
        const next = new Map(prev);
        next.set(savedPostForDay.calendarDay!, updatedPost);
        return next;
      });

      // Update DB record
      await fetch(`/api/posts/${savedPostForDay.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: generatedCaption,
          hashtags: generatedHashtags,
          postType: "Media Post",
          imageBase64: finalImage,
          hasImage: true,
        }),
      });

      addToast("Caption generated and image ready!", "success");
    } catch (err: any) {
      addToast(err?.message || "Generation failed", "error");
    } finally {
      setPlanningGeneration(false);
    }
  }

  /* ---- Generate — direct to /post ---- */

  function handleGenerate() {
    if (!selectedDay || !activeBrandProfile) return;
    if (!tokenBalance.isLoading && tokenBalance.tokensRemaining <= 0) {
      setShowOutOfTokens(true);
      addToast("You've used all your tokens this month.", "warning");
      return;
    }

    const p = selectedDay;
    const sp = new URLSearchParams();

    // Brand profile data
    sp.set("niche", activeBrandProfile.niche || "");
    sp.set("audience", activeBrandProfile.audience || "");
    sp.set("tone", activeBrandProfile.tone || "Confident");
    sp.set("primaryColor", activeBrandProfile.primaryColor || "#000000");
    sp.set("secondaryColor", activeBrandProfile.secondaryColor || "#ffffff");

    // Day plan data
    sp.set("postType", p.postType);
    sp.set("goal", p.postType);
    sp.set("imageStyle", p.imageStyle);
    sp.set("captionLength", capitalize(p.captionLength));
    sp.set("hashtagCount", String(HASHTAG_COUNT_MAP[p.hashtagPack] || 12));
    sp.set("day", String(p.day));
    sp.set("title", p.holidayName || p.postType);
    sp.set("detail", p.detail);

    // Pillar type (for template-driven prompt enrichment)
    if (p.pillarType) {
      sp.set("pillarType", p.pillarType);
    }

    // Extra details (topic/detail hint → specificRequest)
    // If blank, silently inject a topic from the pillar's postIdeas bank so the AI
    // always has a specific, curated angle to work from (invisible to the user).
    if (extraDetails.trim()) {
      sp.set("specificRequest", extraDetails.trim());
    } else if (p.pillarType) {
      const template = getTemplate(nicheKey);
      const pillar = template?.pillars[p.pillarType];
      if (pillar?.postIdeas?.length) {
        const topic = pillar.postIdeas[p.day % pillar.postIdeas.length];
        sp.set("specificRequest", topic);
      }
    }
    // Personal thought → woven into caption body
    if (userThought.trim()) {
      sp.set("userThought", userThought.trim());
    }

    sp.set("autogen", "1");

    // Unique genId for idempotency
    const genId = Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    sp.set("genId", genId);

    window.location.href = `/post?${sp.toString()}`;
  }

  /* ---- Copy/download for saved view ---- */

  async function copyText(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedField(field);
    addToast(field === "caption" ? "Caption copied!" : field === "hashtags" ? "Hashtags copied!" : "Copied!", "success");
    setTimeout(() => setCopiedField(null), 2000);
  }

  function downloadDrawerImage() {
    if (!drawerImage) return;
    const a = document.createElement("a");
    a.href = drawerImage;
    a.download = "ai-tech-helper.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast("Image downloaded!", "success");
  }

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const calendarCells: Array<
    { type: "empty" } | { type: "day"; plan: DayPlan }
  > = [];
  for (let i = 0; i < firstDayOfMonth; i++)
    calendarCells.push({ type: "empty" });
  for (let day = 1; day <= getDaysInMonth(currentYear, currentMonth); day++) {
    calendarCells.push({ type: "day", plan: plan[day - 1] });
  }

  // Get the saved post for the selected day (for drawer)
  const savedPostForDay = selectedDay ? dayPostsMap.get(selectedDay.day) : null;

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background: "#0b1220",
      color: "#e6edf7",
      padding: 20,
      fontFamily: "Verdana, Geneva, sans-serif",
      boxSizing: "border-box",
    },
    container: { maxWidth: 1100, margin: "0 auto" },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      flexWrap: "wrap",
      gap: 16,
      marginBottom: 24,
      paddingTop: 50,
    },
    h1: {
      fontSize: 34,
      fontWeight: 800,
      letterSpacing: 1,
      margin: 0,
      background:
        "linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #c4b5fd 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    subtitle: {
      margin: "10px 0 0 0",
      opacity: 0.8,
      fontSize: 15,
      lineHeight: 1.5,
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    backBtn: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background:
        "linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%)",
      border: "1px solid rgba(124, 58, 237, 0.3)",
      borderRadius: 10,
      padding: "10px 18px",
      color: "#a78bfa",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      textDecoration: "none",
      transition: "all 0.15s ease",
    },
    card: {
      background: "linear-gradient(135deg, #15233d 0%, #101a33 100%)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 20,
      padding: 24,
      boxShadow:
        "0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)",
    },
    monthNav: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    monthLabel: {
      fontSize: 22,
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: 1,
      background: "linear-gradient(135deg, #e6edf7 0%, #a78bfa 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    navBtns: { display: "flex", gap: 10 },
    navBtn: {
      background:
        "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 10,
      padding: "10px 18px",
      color: "#e6edf7",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      transition: "all 0.15s ease",
    },
    weekdayRow: {
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      gap: 8,
      marginBottom: 8,
    },
    weekdayLabel: {
      textAlign: "center",
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      opacity: 0.5,
      padding: "8px 0",
    },
    calendarGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      gap: 8,
    },
    emptyCell: {
      background: "rgba(255,255,255,0.02)",
      borderRadius: 10,
      minHeight: 110,
    },
    dayCell: {
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10,
      padding: 10,
      minHeight: 110,
      cursor: "pointer",
      transition: "all 0.15s ease",
      display: "flex",
      flexDirection: "column",
      position: "relative",
    },
    dayCellHoliday: {
      background:
        "linear-gradient(135deg, rgba(255, 99, 132, 0.1) 0%, rgba(255, 159, 64, 0.1) 100%)",
      border: "1px solid rgba(255, 99, 132, 0.3)",
    },
    dayNumber: {
      fontSize: 14,
      fontWeight: 700,
      marginBottom: 4,
      color: "#7eb3ff",
    },
    dayToday: {
      background: "linear-gradient(135deg, #7c3aed 0%, #2c6bed 100%)",
      color: "#fff",
      width: 26,
      height: 26,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      fontWeight: 700,
      boxShadow: "0 2px 10px rgba(124, 58, 237, 0.4)",
    },
    holidayLabel: {
      fontSize: 9,
      fontWeight: 700,
      color: "#ff9f7f",
      marginBottom: 2,
      textTransform: "uppercase",
    },
    postType: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.3,
      marginBottom: 4,
      lineHeight: 1.3,
      color: "#e6edf7",
    },
    badge: {
      fontSize: 9,
      padding: "2px 6px",
      borderRadius: 4,
      background: "rgba(44, 107, 237, 0.2)",
      color: "#7eb3ff",
      fontWeight: 600,
      marginTop: "auto",
      alignSelf: "flex-start",
    },
    badgeHoliday: { background: "rgba(255, 99, 132, 0.2)", color: "#ff9999" },
    legend: {
      marginTop: 20,
      padding: 16,
      background: "rgba(255,255,255,0.04)",
      borderRadius: 10,
    },
    legendTitle: {
      fontSize: 12,
      fontWeight: 700,
      textTransform: "uppercase",
      marginBottom: 12,
      opacity: 0.7,
    },
    legendGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
      gap: 10,
    },
    // Mobile list styles
    mobileListContainer: {
      display: "none",
    },
    mobileListItem: {
      background:
        "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      cursor: "pointer",
      transition: "all 0.2s ease",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    mobileListItemHoliday: {
      background:
        "linear-gradient(135deg, rgba(255, 165, 0, 0.15) 0%, rgba(255, 165, 0, 0.05) 100%)",
      border: "1px solid rgba(255, 165, 0, 0.3)",
    },
    mobileListLeft: {
      flex: 1,
    },
    mobileListDate: {
      fontSize: 16,
      fontWeight: 600,
      marginBottom: 4,
      color: "#e6edf7",
    },
    mobileListDateToday: {
      fontSize: 16,
      fontWeight: 600,
      marginBottom: 4,
      color: "#22c55e",
    },
    mobileListPostType: {
      fontSize: 14,
      fontWeight: 500,
      marginBottom: 2,
      color: "#7eb3ff",
    },
    mobileListDetail: {
      fontSize: 12,
      opacity: 0.7,
      color: "#e6edf7",
    },
    mobileListRight: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 6,
    },
    mobileListBadge: {
      background: "rgba(126, 179, 255, 0.2)",
      border: "1px solid rgba(126, 179, 255, 0.3)",
      borderRadius: 6,
      padding: "2px 6px",
      fontSize: 10,
      fontWeight: 600,
      color: "#7eb3ff",
      display: "flex",
      alignItems: "center",
      gap: 3,
    },
    mobileListBadgeHoliday: {
      background: "rgba(255, 165, 0, 0.2)",
      border: "1px solid rgba(255, 165, 0, 0.4)",
      color: "#ffa500",
    },
    mobileSeasonalTag: {
      background: "rgba(255, 165, 0, 0.2)",
      border: "1px solid rgba(255, 165, 0, 0.4)",
      borderRadius: 4,
      padding: "1px 4px",
      fontSize: 9,
      fontWeight: 600,
      color: "#ffa500",
      textTransform: "uppercase" as const,
    },
    legendItem: {
      display: "flex",
      alignItems: "flex-start",
      gap: 8,
      fontSize: 12,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "#2c6bed",
      marginTop: 4,
      flexShrink: 0,
    },
    legendDotHoliday: { background: "#ff6384" },
    legendText: { lineHeight: 1.4 },
    legendDay: { fontWeight: 700, color: "#7eb3ff" },
    helpText: {
      textAlign: "center",
      marginTop: 20,
      fontSize: 13,
      opacity: 0.6,
      lineHeight: 1.5,
    },
  };

  return (
    <div style={styles.page} className="ath-page">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.h1} className="ath-page-title">
              Plan Your Month
            </h1>
            <p style={styles.subtitle} className="ath-page-subtitle">
              <span style={{ fontSize: 18 }}>📅</span>
              Click any day to see your content plan and generate posts.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="/dashboard" style={styles.backBtn} className="hover-btn">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </a>
            <a href="/media" style={styles.backBtn} className="hover-btn">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              My Media
            </a>
          </div>
        </div>

        {/* Brand profile gate */}
        {!activeBrandProfile && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(255, 165, 0, 0.12) 0%, rgba(255, 165, 0, 0.06) 100%)",
              border: "1px solid rgba(255, 165, 0, 0.3)",
              borderRadius: 16,
              padding: "40px 28px",
              textAlign: "center" as const,
              maxWidth: 520,
              margin: "0 auto",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 10px", color: "#e6edf7" }}>
              Brand Profile Required
            </h2>
            <p style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.6, margin: "0 0 24px" }}>
              Set up a brand profile on your dashboard before using the calendar.
              Your profile ensures every post matches your brand voice, niche, and colors.
            </p>
            <a
              href="/dashboard"
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #7c3aed 0%, #2c6bed 100%)",
                color: "#fff",
                padding: "12px 28px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
                textTransform: "uppercase" as const,
                letterSpacing: 0.5,
              }}
              className="hover-btn-primary"
            >
              Go to Dashboard
            </a>
          </div>
        )}

        {/* Calendar Card */}
        {activeBrandProfile && (<><div style={styles.card} className="ath-card">
          <div style={styles.monthNav}>
            <div style={styles.monthLabel} className="ath-month-label">
              {MONTHS[currentMonth]} {currentYear}
            </div>
            <div style={styles.navBtns}>
              <button
                style={styles.navBtn}
                onClick={prevMonth}
                className="hover-btn ath-nav-btn"
              >
                ← Prev
              </button>
              <button
                style={styles.navBtn}
                onClick={nextMonth}
                className="hover-btn ath-nav-btn"
              >
                Next →
              </button>
            </div>
          </div>

          <div style={styles.weekdayRow}>
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                style={styles.weekdayLabel}
                className="ath-weekday-label"
              >
                {day}
              </div>
            ))}
          </div>

          <div
            style={styles.calendarGrid}
            className="ath-cal-grid desktop-calendar"
          >
            {calendarCells.map((cell, idx) => {
              if (cell.type === "empty")
                return <div key={`empty-${idx}`} style={styles.emptyCell} />;

              const p = cell.plan;
              const savedPostCell = dayPostsMap.get(p.day);
              const badgeStyleOption = savedPostCell?.imageStyle
                ? (getImageStyleOption(savedPostCell.imageStyle as ImageStyleValue) ?? getImageStyleOption(p.imageStyle))
                : getImageStyleOption(p.imageStyle);
              const imageStyleOption = badgeStyleOption;
              const hasPost = !!savedPostCell;
              const isPlannedPost = savedPostCell?.postType === "Media: Planned";
              const accent = hasPost
                ? isPlannedPost
                  ? { color: "#7c3aed", icon: "📷" }
                  : { color: "#22c55e", icon: "✅" }
                : getPostTypeAccent(p.postType, p.isHoliday);
              const displayLabel = hasPost
                ? isPlannedPost ? "Photo Scheduled" : "Post Saved"
                : p.postType;
              return (
                <div
                  key={p.day}
                  style={{
                    ...styles.dayCell,
                    borderTop: `3px solid ${accent.color}`,
                    ...(p.isHoliday
                      ? styles.dayCellHoliday
                      : { background: `linear-gradient(180deg, ${accent.color}12 0%, rgba(255,255,255,0.04) 60%)` }),
                  }}
                  className="ath-day-cell"
                  onClick={() => openDrawer(p)}
                >
                  {hasPost && (
                    <div style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: isPlannedPost
                        ? "linear-gradient(135deg, #7c3aed 0%, #2c6bed 100%)"
                        : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: isPlannedPost
                        ? "0 2px 6px rgba(124,58,237,0.4)"
                        : "0 2px 6px rgba(34, 197, 94, 0.4)",
                    }}>
                      {isPlannedPost ? (
                        <svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        </svg>
                      ) : (
                        <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  )}
                  <div
                    style={isToday(p.day) ? styles.dayToday : styles.dayNumber}
                    className={isToday(p.day) ? "day-today" : "day-number"}
                  >
                    {p.day}
                  </div>
                  {p.isHoliday && (
                    <div style={styles.holidayLabel} className="holiday-label">
                      {p.holidayName}
                    </div>
                  )}
                  <div style={{ ...styles.postType, display: "flex", alignItems: "center", gap: 3 }} className="post-type-label">
                    <span style={{ fontSize: 10, lineHeight: 1, flexShrink: 0 }}>{accent.icon}</span>
                    {displayLabel}
                  </div>
                  <div
                    style={{
                      ...styles.badge,
                      ...(p.isHoliday ? styles.badgeHoliday : {}),
                      display: "flex",
                      alignItems: "center",
                    }}
                    className="image-badge"
                    title={imageStyleOption?.tooltip || ""}
                  >
                    <svg
                      width="10"
                      height="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      style={{ marginRight: 3, flexShrink: 0 }}
                    >
                      <path d={imageStyleOption?.icon || ""} />
                    </svg>
                    {p.imageFormatLabel}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile List View */}
          <div style={styles.mobileListContainer} className="mobile-calendar">
            {plan.map((dayPlan) => {
              const dayOfWeek = WEEKDAYS[dayPlan.date.getDay()];
              const monthName = MONTHS[dayPlan.date.getMonth()];
              const dayNum = dayPlan.day;
              const savedPostMobile = dayPostsMap.get(dayPlan.day);
              const hasPost = !!savedPostMobile;
              const mobileBadgeOption = savedPostMobile?.imageStyle
                ? (getImageStyleOption(savedPostMobile.imageStyle as ImageStyleValue) ?? getImageStyleOption(dayPlan.imageStyle))
                : getImageStyleOption(dayPlan.imageStyle);
              const imageStyleOption = mobileBadgeOption;
              const isPlannedMobile = savedPostMobile?.postType === "Media: Planned";
              const mobileAccent = hasPost
                ? isPlannedMobile
                  ? { color: "#7c3aed", icon: "📷" }
                  : { color: "#22c55e", icon: "✅" }
                : getPostTypeAccent(dayPlan.postType, dayPlan.isHoliday);
              const mobileDisplayLabel = hasPost
                ? isPlannedMobile ? "Photo Scheduled" : "Post Saved"
                : dayPlan.postType;

              return (
                <div
                  key={dayPlan.day}
                  style={{
                    ...styles.mobileListItem,
                    ...(dayPlan.isHoliday ? styles.mobileListItemHoliday : {}),
                    borderLeft: `3px solid ${mobileAccent.color}`,
                  }}
                  className="mobile-list-item"
                  onClick={() => openDrawer(dayPlan)}
                >
                  <div style={styles.mobileListLeft}>
                    <div
                      style={
                        isToday(dayPlan.day)
                          ? styles.mobileListDateToday
                          : styles.mobileListDate
                      }
                    >
                      {dayOfWeek}, {monthName} {dayNum}
                    </div>
                    <div style={{ ...styles.mobileListPostType, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 12, lineHeight: 1, flexShrink: 0 }}>{mobileAccent.icon}</span>
                      {mobileDisplayLabel}
                    </div>
                    <div style={styles.mobileListDetail}>{dayPlan.detail}</div>
                    {hasPost && (
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: isPlannedMobile ? "rgba(124,58,237,0.15)" : "rgba(34, 197, 94, 0.15)",
                        border: isPlannedMobile ? "1px solid rgba(124,58,237,0.3)" : "1px solid rgba(34, 197, 94, 0.3)",
                        borderRadius: 6,
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 600,
                        color: isPlannedMobile ? "#a78bfa" : "#22c55e",
                        marginTop: 4,
                      }}>
                        {isPlannedMobile ? (
                          <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          </svg>
                        ) : (
                          <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {isPlannedMobile ? "Photo Planned" : "Generated"}
                      </div>
                    )}
                  </div>
                  <div style={styles.mobileListRight}>
                    {dayPlan.isHoliday && (
                      <div style={styles.mobileSeasonalTag}>Seasonal</div>
                    )}
                    <div
                      style={{
                        ...styles.mobileListBadge,
                        ...(dayPlan.isHoliday
                          ? styles.mobileListBadgeHoliday
                          : {}),
                      }}
                      title={imageStyleOption?.tooltip || ""}
                    >
                      <svg
                        width="8"
                        height="8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d={imageStyleOption?.icon || ""} />
                      </svg>
                      <span>{imageStyleOption?.name || ""}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={styles.legend} className="ath-legend">
            <div style={styles.legendTitle}>Content Rotation</div>
            <div style={styles.legendGrid}>
              {WEEKDAYS.map((day, idx) => (
                <div key={day} style={styles.legendItem}>
                  <div style={styles.legendDot} />
                  <div style={styles.legendText}>
                    <span style={styles.legendDay}>{day}:</span>{" "}
                    {WEEKDAY_PLANS[idx].postType}
                  </div>
                </div>
              ))}
              <div style={styles.legendItem}>
                <div
                  style={{ ...styles.legendDot, ...styles.legendDotHoliday }}
                />
                <div style={styles.legendText}>
                  <span style={{ ...styles.legendDay, color: "#ff9999" }}>
                    Holidays:
                  </span>{" "}
                  Seasonal
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.helpText}>
          💡 Holidays are automatically detected and marked as Seasonal content.
          <br />
          Click any day to see your content plan and generate posts.
        </div>
        </>)}
      </div>

      {/* ============ DRAWER BACKDROP ============ */}
      {drawerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 100,
            transition: "opacity 0.3s ease",
          }}
          onClick={closeDrawer}
        />
      )}

      {/* ============ DRAWER PANEL (centered modal) ============ */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          width: 960,
          maxWidth: "96vw",
          maxHeight: "92vh",
          background: "#101a33",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          zIndex: 101,
          transform: drawerOpen ? "translate(-50%, -50%)" : "translate(-50%, -46%)",
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? "auto" : "none",
          transition: "transform 0.25s ease, opacity 0.25s ease",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 30px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07)",
          fontFamily: "Verdana, Geneva, sans-serif",
          color: "#e6edf7",
        }}
        className="calendar-drawer"
      >
        {selectedDay && (
          <>
            {/* Drawer Header */}
            <div
              className="calendar-drawer-header"
              style={{
                padding: "24px 24px 20px",
                background: selectedDay.isHoliday
                  ? "linear-gradient(135deg, rgba(255, 99, 132, 0.2) 0%, rgba(255, 159, 64, 0.15) 100%)"
                  : "linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(44, 107, 237, 0.15) 100%)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                position: "relative",
              }}
            >
              {/* Close button */}
              <button
                onClick={closeDrawer}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  zIndex: 10,
                  pointerEvents: "auto",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: 8,
                  width: 44,
                  height: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#e6edf7",
                  fontSize: 18,
                }}
              >
                ✕
              </button>
              <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 6 }}>
                {WEEKDAYS[selectedDay.date.getDay()]}, {MONTHS[currentMonth]} {selectedDay.day}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, marginBottom: 4 }}>
                {selectedDay.isHoliday ? `🎉 ${selectedDay.holidayName}` : selectedDay.postType}
              </h2>
              <p style={{ fontSize: 14, opacity: 0.8, margin: 0, lineHeight: 1.5 }}>
                {selectedDay.detail}
              </p>
              {savedPostForDay && drawerView === "saved" && (
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: savedPostForDay.postType === "Media: Planned"
                    ? "rgba(124,58,237,0.15)"
                    : "rgba(34, 197, 94, 0.15)",
                  border: savedPostForDay.postType === "Media: Planned"
                    ? "1px solid rgba(124,58,237,0.3)"
                    : "1px solid rgba(34, 197, 94, 0.3)",
                  borderRadius: 8,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: savedPostForDay.postType === "Media: Planned" ? "#a78bfa" : "#22c55e",
                  marginTop: 10,
                }}>
                  {savedPostForDay.postType === "Media: Planned" ? (
                    <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                  ) : (
                    <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {savedPostForDay.postType === "Media: Planned" ? "📸 Photo Post Planned" : "Post Generated"}
                </div>
              )}
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>

              {/* ======== SAVED POST VIEW ======== */}
              {drawerView === "saved" && savedPostForDay ? (

                /* ---- PLANNED MEDIA POST VIEW ---- */
                savedPostForDay.postType === "Media: Planned" ? (
                  <div style={{ display: "flex", gap: 20 }}>
                    {/* LEFT: Photo + Generate button */}
                    <div style={{ flex: "0 0 42%", display: "flex", flexDirection: "column", gap: 10 }}>
                      {drawerImageLoading ? (
                        <div style={{ width: "100%", height: 200, background: "rgba(255,255,255,0.06)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, opacity: 0.5 }}>
                          Loading photo...
                        </div>
                      ) : drawerImage ? (
                        <img src={drawerImage} alt="Planned photo" style={{ width: "100%", borderRadius: 12 }} />
                      ) : (
                        <div style={{ width: "100%", height: 160, background: "rgba(255,255,255,0.04)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, opacity: 0.35 }}>
                          No image
                        </div>
                      )}
                      <button
                        onClick={handleGenerateFromPlanned}
                        disabled={planningGeneration || !drawerImage}
                        style={{
                          width: "100%",
                          padding: "13px 16px",
                          borderRadius: 12,
                          border: "none",
                          background: planningGeneration ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          color: planningGeneration ? "rgba(255,255,255,0.4)" : "#fff",
                          fontSize: 14,
                          fontWeight: 800,
                          cursor: planningGeneration ? "not-allowed" : "pointer",
                          fontFamily: "Verdana, Geneva, sans-serif",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          boxShadow: planningGeneration ? "none" : "0 4px 14px rgba(16,185,129,0.35)",
                          transition: "all 0.15s",
                        }}
                      >
                        {planningGeneration ? (
                          <>Generating…</>
                        ) : (
                          <>
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Generate Post & Apply Treatment
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setDrawerView("plan")}
                        style={{
                          width: "100%",
                          padding: "10px 16px",
                          borderRadius: 10,
                          border: "1px solid rgba(124,58,237,0.3)",
                          background: "rgba(124,58,237,0.08)",
                          color: "#a78bfa",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "Verdana, Geneva, sans-serif",
                        }}
                      >
                        Generate AI Post Instead
                      </button>
                    </div>

                    {/* RIGHT: Post details */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, opacity: 0.5, marginBottom: 6 }}>What this post is about</div>
                        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14, fontSize: 13, lineHeight: 1.6 }}>
                          {savedPostForDay.caption || <span style={{ opacity: 0.4 }}>No topic specified</span>}
                        </div>
                      </div>
                      {(() => {
                        let settings = { captionLength: "Medium", hashtagCount: 12 };
                        try { settings = JSON.parse(savedPostForDay.hashtags); } catch {}
                        const treatmentLabels: Record<string, string> = {
                          raw: "Raw Photo",
                          photo_text: "Photo + Text Overlay",
                          brand_photo_text: "Branding + Photo + Text",
                        };
                        return (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, opacity: 0.5, marginBottom: 8 }}>Settings</div>
                            <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                              {[
                                { label: "Image Treatment", value: treatmentLabels[savedPostForDay.imageStyle] || savedPostForDay.imageStyle },
                                { label: "Caption Length", value: settings.captionLength },
                                { label: "Hashtags", value: `${settings.hashtagCount} tags` },
                                { label: "Tone", value: savedPostForDay.tone },
                                { label: "Niche", value: savedPostForDay.niche },
                              ].map(({ label, value }) => (
                                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "7px 10px" }}>
                                  <span style={{ fontSize: 12, opacity: 0.55 }}>{label}</span>
                                  <span style={{ fontSize: 12, fontWeight: 600 }}>{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 10, padding: "10px 12px", fontSize: 12, lineHeight: 1.5, color: "rgba(167,139,250,0.85)" }}>
                        This generates the caption, hashtags, and applies your chosen image treatment. Your uploaded photo stays in place — no token used.
                      </div>
                    </div>
                  </div>
                ) : (

                /* ---- REGULAR GENERATED POST VIEW ---- */
                <div style={{ display: "flex", gap: 20 }}>
                  {/* LEFT: Image + download + generate new */}
                  <div style={{ flex: "0 0 42%", display: "flex", flexDirection: "column", gap: 10 }}>
                    {drawerImageLoading ? (
                      <div style={{
                        width: "100%",
                        height: 220,
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        opacity: 0.5,
                      }}>
                        Loading image...
                      </div>
                    ) : drawerImage ? (
                      <img
                        src={drawerImage}
                        alt="Generated post"
                        style={{ width: "100%", borderRadius: 12 }}
                      />
                    ) : (
                      <div style={{
                        width: "100%",
                        height: 160,
                        background: "rgba(255,255,255,0.04)",
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        opacity: 0.35,
                      }}>
                        No image
                      </div>
                    )}
                    {drawerImage && (
                      <button
                        onClick={downloadDrawerImage}
                        style={{
                          width: "100%",
                          padding: "10px 16px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.06)",
                          color: "#e6edf7",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                        className="hover-btn"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                        </svg>
                        Download Image
                      </button>
                    )}
                    <button
                      onClick={() => setDrawerView("plan")}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: 12,
                        border: "1px solid rgba(124, 58, 237, 0.3)",
                        background: "linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(44, 107, 237, 0.1) 100%)",
                        color: "#a78bfa",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "Verdana, Geneva, sans-serif",
                        marginTop: "auto",
                      }}
                      className="hover-btn"
                    >
                      Generate New Post for This Day
                    </button>
                  </div>

                  {/* RIGHT: Caption + Hashtags */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Caption */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, opacity: 0.5 }}>
                          Caption
                        </div>
                        <button
                          onClick={() => copyText(savedPostForDay.caption, "caption")}
                          style={{
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 6,
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            color: copiedField === "caption" ? "#22c55e" : "#e6edf7",
                            cursor: "pointer",
                          }}
                        >
                          {copiedField === "caption" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <div style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 10,
                        padding: 14,
                        fontSize: 13,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap" as const,
                        maxHeight: 280,
                        overflowY: "auto" as const,
                      }}>
                        {savedPostForDay.caption}
                      </div>
                    </div>

                    {/* Hashtags */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, opacity: 0.5 }}>
                          Hashtags
                        </div>
                        <button
                          onClick={() => copyText(savedPostForDay.hashtags, "hashtags")}
                          style={{
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 6,
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            color: copiedField === "hashtags" ? "#22c55e" : "#e6edf7",
                            cursor: "pointer",
                          }}
                        >
                          {copiedField === "hashtags" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <div style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 10,
                        padding: 14,
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: "#7eb3ff",
                        maxHeight: 120,
                        overflowY: "auto" as const,
                      }}>
                        {savedPostForDay.hashtags}
                      </div>
                    </div>

                    {/* Publish buttons */}
                    {(instagram.connected || facebook.connected) && drawerImage && (
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginTop: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, opacity: 0.5, marginBottom: 2 }}>
                          Publish
                        </div>
                        {instagram.connected && (
                          <button
                            onClick={async () => {
                              if (igPostStatus === "posting" || igPostStatus === "success") return;
                              setIgPostStatus("posting");
                              try {
                                await instagram.publish(drawerImage, savedPostForDay.caption, savedPostForDay.hashtags);
                                setIgPostStatus("success");
                                addToast(`Posted to @${instagram.username}!`, "success");
                              } catch (err: any) {
                                setIgPostStatus("error");
                                addToast(err?.message || "Instagram post failed.", "error");
                              }
                            }}
                            style={{
                              width: "100%",
                              padding: "11px 16px",
                              borderRadius: 10,
                              border: igPostStatus === "success" ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(225,48,108,0.35)",
                              background: igPostStatus === "success"
                                ? "rgba(34,197,94,0.12)"
                                : "linear-gradient(135deg, rgba(225,48,108,0.15) 0%, rgba(193,53,132,0.1) 100%)",
                              color: igPostStatus === "success" ? "#22c55e" : "#f472b6",
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: igPostStatus === "posting" || igPostStatus === "success" ? "default" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              fontFamily: "Verdana, Geneva, sans-serif",
                              opacity: igPostStatus === "posting" ? 0.7 : 1,
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                            </svg>
                            {igPostStatus === "posting" ? "Posting…" : igPostStatus === "success" ? "Posted to Instagram!" : `Post to Instagram (@${instagram.username})`}
                          </button>
                        )}
                        {facebook.connected && (
                          <button
                            onClick={async () => {
                              if (fbPostStatus === "posting" || fbPostStatus === "success") return;
                              setFbPostStatus("posting");
                              try {
                                await facebook.publish(drawerImage, savedPostForDay.caption, savedPostForDay.hashtags);
                                setFbPostStatus("success");
                                addToast(`Posted to ${facebook.pageName}!`, "success");
                              } catch (err: any) {
                                setFbPostStatus("error");
                                addToast(err?.message || "Facebook post failed.", "error");
                              }
                            }}
                            style={{
                              width: "100%",
                              padding: "11px 16px",
                              borderRadius: 10,
                              border: fbPostStatus === "success" ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(24,119,242,0.35)",
                              background: fbPostStatus === "success"
                                ? "rgba(34,197,94,0.12)"
                                : "linear-gradient(135deg, rgba(24,119,242,0.15) 0%, rgba(24,119,242,0.08) 100%)",
                              color: fbPostStatus === "success" ? "#22c55e" : "#60a5fa",
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: fbPostStatus === "posting" || fbPostStatus === "success" ? "default" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              fontFamily: "Verdana, Geneva, sans-serif",
                              opacity: fbPostStatus === "posting" ? 0.7 : 1,
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                            {fbPostStatus === "posting" ? "Posting…" : fbPostStatus === "success" ? "Posted to Facebook!" : `Post to ${facebook.pageName}`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                )  /* end inner ternary (regular generated view) */
              ) : (
                /* ======== PLAN / GENERATE VIEW ======== */
                <div style={{ display: "flex", gap: 20 }}>
                  {/* ---- LEFT COLUMN ---- */}
                  <div style={{ flex: "0 0 50%", display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Post type explanation */}
                  <div
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, opacity: 0.5, marginBottom: 8 }}>
                      What this means for your post
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, opacity: 0.9 }}>
                      {selectedDay.postType === "Market Authority" && (
                        <>AI will position you as the <strong>local market expert</strong>. Expect confident, data-informed content that gives buyers and sellers a genuine reason to trust your insight over anyone else's.</>
                      )}
                      {selectedDay.postType === "Home Feature Spotlight" && (
                        <>AI will write <strong>aspirational, feature-focused content</strong> that makes buyers picture themselves in the home — no listing language, just the feeling of living in a space they love.</>
                      )}
                      {selectedDay.postType === "Educational" && (
                        <>AI will share <strong>genuinely useful tips</strong> that teach buyers or sellers something they didn't know. Builds trust by making you the resource they turn to before making any real estate decision.</>
                      )}
                      {selectedDay.postType === "Social Proof" && (
                        <>AI will craft a <strong>credibility-building post</strong> around client results, wins, or testimonials. The goal is to let real outcomes speak — warm, genuine, and compelling.</>
                      )}
                      {selectedDay.postType === "Community" && (
                        <>AI will write a <strong>personal, authentic post</strong> about the neighborhood, a local spot, or what makes this community special. Zero sales pitch — pure connection and local pride.</>
                      )}
                      {selectedDay.postType === "Seasonal" && (
                        <>AI will tap into the <strong>holiday or seasonal moment</strong> with timely, festive content that connects your brand to what your audience is already thinking about.</>
                      )}
                      {!["Market Authority","Active Listing","Educational","Social Proof","Community","Seasonal"].includes(selectedDay.postType) && (
                        <>AI will generate a <strong>well-crafted, on-brand post</strong> tailored to your profile. Add extra details below to make it more specific to your current goals.</>
                      )}
                    </p>
                  </div>

                  {/* Post ideas for this day */}
                  {selectedDay.pillarType && getTemplate(nicheKey).pillars[selectedDay.pillarType]?.postIdeas?.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, opacity: 0.5, marginBottom: 10 }}>
                        Post ideas for today
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: 7 }}>
                        {getTemplate(nicheKey).pillars[selectedDay.pillarType].postIdeas.slice(0, 4).map((idea, i) => (
                          <div
                            key={i}
                            style={{
                              background: "rgba(44, 107, 237, 0.07)",
                              border: "1px solid rgba(44, 107, 237, 0.18)",
                              borderRadius: 8,
                              padding: "9px 13px",
                              fontSize: 13,
                              lineHeight: 1.5,
                              color: "rgba(230, 237, 247, 0.85)",
                              cursor: "pointer",
                            }}
                            onClick={() => setExtraDetails(idea)}
                            title="Click to use as extra details"
                          >
                            {idea}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.35, marginTop: 6, textAlign: "center" as const }}>
                        Tap any idea to use it as your post angle
                      </div>
                    </div>
                  )}

                  {/* Example caption hook preview */}
                  {selectedDay.pillarType && (getTemplate(nicheKey).pillars[selectedDay.pillarType]?.captionHooks?.length ?? 0) > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, opacity: 0.5, marginBottom: 10 }}>
                        Example caption opener
                      </div>
                      <div style={{
                        background: "rgba(124, 58, 237, 0.09)",
                        border: "1px solid rgba(124, 58, 237, 0.22)",
                        borderRadius: 10,
                        padding: "12px 14px",
                        fontSize: 13,
                        lineHeight: 1.6,
                        fontStyle: "italic",
                        color: "rgba(167, 139, 250, 0.9)",
                      }}>
                        "{getTemplate(nicheKey).pillars[selectedDay.pillarType!].captionHooks[0]}"
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.35, marginTop: 6, textAlign: "center" as const }}>
                        Your actual caption will be unique and tailored to your brand
                      </div>
                    </div>
                  )}
                  </div>{/* end left column */}

                  {/* ---- RIGHT COLUMN ---- */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* What you'll get */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, opacity: 0.5, marginBottom: 10 }}>
                      What you'll get
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 7 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                          🖼️
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>Custom AI Image</div>
                          <div style={{ fontSize: 11, opacity: 0.6 }}>Designed to match your brand colors</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, rgba(44, 107, 237, 0.2) 0%, rgba(44, 107, 237, 0.1) 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                          ✍️
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>Engaging Caption</div>
                          <div style={{ fontSize: 11, opacity: 0.6 }}>Written in your brand voice</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                          #️⃣
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>Relevant Hashtags</div>
                          <div style={{ fontSize: 11, opacity: 0.6 }}>Optimized for your niche</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Brand profile indicator */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      borderRadius: 12,
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 22 }}>✅</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#6ee7b7" }}>
                        Using "{activeBrandProfile?.profileName}" Profile
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                        Your brand settings will be applied automatically
                      </div>
                    </div>
                  </div>

                  {/* Optional inputs */}
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                    {/* Field 1: Topic detail */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, opacity: 0.5, marginBottom: 6 }}>
                        Add a detail <span style={{ fontWeight: 400, opacity: 0.6, textTransform: "none" as const, letterSpacing: 0 }}>(optional)</span>
                      </div>
                      <textarea
                        value={extraDetails}
                        onChange={(e) => setExtraDetails(e.target.value)}
                        placeholder={
                          selectedDay.postType === "Market Authority"
                            ? "E.g. Interest rates just dropped 0.25%..."
                            : selectedDay.postType === "Home Feature Spotlight"
                            ? "E.g. modern kitchen, big backyard, home office..."
                            : selectedDay.postType === "Educational"
                            ? "E.g. pre-approval vs pre-qualification..."
                            : selectedDay.postType === "Social Proof"
                            ? "E.g. sold price, days on market, specific win..."
                            : selectedDay.postType === "Community"
                            ? "E.g. coffee shop name, neighborhood, local event..."
                            : selectedDay.postType === "Workout Tip"
                            ? "E.g. legs workout, squat form, core training..."
                            : selectedDay.postType === "Nutrition Advice"
                            ? "E.g. protein intake, meal prep, hydration..."
                            : selectedDay.postType === "Menu Feature"
                            ? "E.g. burgers, tacos, pasta, weekend special..."
                            : "E.g. specific topic, feature, or angle to focus on..."
                        }
                        style={{
                          width: "100%",
                          minHeight: 56,
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 10,
                          padding: 12,
                          color: "#e6edf7",
                          fontFamily: "Verdana, Geneva, sans-serif",
                          fontSize: 13,
                          resize: "none",
                          outline: "none",
                          boxSizing: "border-box",
                          lineHeight: 1.5,
                        }}
                      />
                    </div>
                    {/* Field 2: Personal thought */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, opacity: 0.5, marginBottom: 6 }}>
                        Add your own thought <span style={{ fontWeight: 400, opacity: 0.6, textTransform: "none" as const, letterSpacing: 0 }}>(optional)</span>
                      </div>
                      <textarea
                        value={userThought}
                        onChange={(e) => setUserThought(e.target.value)}
                        placeholder="E.g. Just helped a first-time buyer close last week — most emotional closing I've had..."
                        style={{
                          width: "100%",
                          minHeight: 56,
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 10,
                          padding: 12,
                          color: "#e6edf7",
                          fontFamily: "Verdana, Geneva, sans-serif",
                          fontSize: 13,
                          resize: "none",
                          outline: "none",
                          boxSizing: "border-box",
                          lineHeight: 1.5,
                        }}
                      />
                      <div style={{ fontSize: 11, opacity: 0.35, marginTop: 5 }}>
                        AI will weave this into the caption naturally
                      </div>
                    </div>
                  </div>

                  {/* Token count */}
                  <div style={{ fontSize: 12, textAlign: "center" as const, opacity: 0.5, marginTop: "auto", paddingTop: 8 }}>
                    {tokenBalance.isLoading
                      ? "Loading tokens..."
                      : `${tokenBalance.tokensRemaining} tokens remaining this month`}
                  </div>
                  </div>{/* end right column */}
                </div>
              )}
            </div>

            {/* Drawer Footer — only show on plan view */}
            {drawerView === "plan" && (
              <div style={{
                padding: "16px 24px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
              }}>
                <button
                  onClick={handleGenerate}
                  disabled={!activeBrandProfile || (!tokenBalance.isLoading && tokenBalance.tokensRemaining <= 0)}
                  style={{
                    width: "100%",
                    padding: "16px 20px",
                    borderRadius: 12,
                    border: "none",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: (!tokenBalance.isLoading && tokenBalance.tokensRemaining <= 0) ? "not-allowed" : "pointer",
                    background: (!tokenBalance.isLoading && tokenBalance.tokensRemaining <= 0)
                      ? "rgba(255,255,255,0.08)"
                      : selectedDay.isHoliday
                        ? "linear-gradient(135deg, #ff6384 0%, #ff9f64 100%)"
                        : "linear-gradient(135deg, #2c6bed 0%, #1e4fc2 100%)",
                    color: (!tokenBalance.isLoading && tokenBalance.tokensRemaining <= 0)
                      ? "rgba(255,255,255,0.4)"
                      : "#fff",
                    fontFamily: "Verdana, Geneva, sans-serif",
                    textTransform: "uppercase" as const,
                    letterSpacing: 0.5,
                    transition: "all 0.15s ease",
                    opacity: (!tokenBalance.isLoading && tokenBalance.tokensRemaining <= 0) ? 0.5 : 1,
                  }}
                  className="hover-btn-primary"
                >
                  {!tokenBalance.isLoading && tokenBalance.tokensRemaining <= 0
                    ? "Token limit reached"
                    : "✨ Generate (uses 1 token)"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .hover-btn:hover { background: rgba(255,255,255,0.12) !important; }
        .hover-btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .ath-day-cell:hover {
          background: rgba(44, 107, 237, 0.15) !important;
          border-color: rgba(44, 107, 237, 0.4) !important;
          transform: translateY(-2px);
        }

        /* Desktop/Tablet: Show grid, hide mobile list */
        @media (min-width: 769px) {
          .desktop-calendar { display: grid !important; }
          .mobile-calendar { display: none !important; }
        }

        /* Mobile: Hide grid, show mobile list */
        @media (max-width: 768px) {
          .ath-page { padding: 10px !important; }
          .desktop-calendar { display: none !important; }
          .mobile-calendar { display: block !important; }
          .calendar-drawer { width: 96vw !important; max-height: 88vh !important; border-radius: 16px !important; padding-bottom: env(safe-area-inset-bottom, 0px); }
          .calendar-drawer-header { padding: 16px 16px 14px !important; }

          .mobile-list-item:hover {
            transform: translateY(-1px);
            background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%) !important;
            border-color: rgba(255,255,255,0.15) !important;
          }
        }

        /* Tablet */
        @media (max-width: 900px) {
          .ath-cal-grid { gap: 6px !important; }
          .ath-day-cell { min-height: 90px !important; padding: 8px !important; }
          .ath-day-cell .post-type-label { font-size: 9px !important; }
          .ath-day-cell .image-badge { font-size: 8px !important; padding: 2px 4px !important; }
        }

        /* Small tablet / large phone */
        @media (max-width: 768px) {
          .ath-cal-grid { gap: 4px !important; }
          .ath-day-cell { min-height: 80px !important; padding: 6px !important; }
          .ath-day-cell .post-type-label { font-size: 8px !important; line-height: 1.2 !important; }
          .ath-day-cell .image-badge { display: none !important; }
          .ath-day-cell .holiday-label { font-size: 7px !important; }
          .ath-weekday-label { font-size: 9px !important; }
          .ath-legend { display: none !important; }
          .ath-month-label { font-size: 18px !important; }
          .ath-nav-btn { padding: 8px 12px !important; font-size: 12px !important; }
        }

        /* Phone */
        @media (max-width: 600px) {
          .ath-cal-grid { gap: 3px !important; }
          .ath-day-cell { min-height: 65px !important; padding: 4px !important; border-radius: 6px !important; }
          .ath-day-cell .day-number { font-size: 12px !important; }
          .ath-day-cell .day-today { width: 22px !important; height: 22px !important; font-size: 11px !important; }
          .ath-day-cell .post-type-label { font-size: 7px !important; letter-spacing: 0 !important; }
          .ath-day-cell .holiday-label { font-size: 6px !important; }
          .ath-weekday-label { font-size: 8px !important; padding: 4px 0 !important; }
          .ath-card { padding: 12px !important; border-radius: 12px !important; }
          .ath-page-title { font-size: 24px !important; }
          .ath-page-subtitle { font-size: 13px !important; }
        }

        /* Extra narrow: tighten drawer further */
        @media (max-width: 420px) {
          .calendar-drawer-header { padding: 12px 12px 10px !important; }
          .ath-page { padding: 8px !important; }
        }

        /* Very small phone */
        @media (max-width: 400px) {
          .ath-cal-grid { gap: 2px !important; }
          .ath-day-cell { min-height: 55px !important; padding: 3px !important; }
          .ath-day-cell .day-number { font-size: 11px !important; }
          .ath-day-cell .day-today { width: 20px !important; height: 20px !important; font-size: 10px !important; }
          .ath-day-cell .post-type-label { font-size: 6px !important; }
          .ath-day-cell .holiday-label { display: none !important; }
          .ath-weekday-label { font-size: 7px !important; }
          .ath-nav-btn { padding: 6px 10px !important; font-size: 11px !important; }
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

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarPageInner />
    </Suspense>
  );
}
