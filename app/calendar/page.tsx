"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getImageStyleOption } from "../lib/imageStyleOptions";
import { useTokenBalance } from "../lib/useTokenBalance";
import { useToast } from "../_components/ToastProvider";
import OutOfTokensModal from "../_components/OutOfTokensModal";

type ImageStyle =
  | "lifestyle_photo"
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
      ["branding_text_photo", "lifestyle_photo"] as const,
      seed
    );
  }
  if (t.includes("engagement")) {
    return seededPick(["lifestyle_photo", "branding_photo"] as const, seed);
  }
  if (t.includes("before") || t.includes("after")) {
    return "lifestyle_photo";
  }
  return seededPick(["lifestyle_photo", "branding_photo"] as const, seed);
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

function buildMonthPlan(year: number, month: number): DayPlan[] {
  const daysInMonth = getDaysInMonth(year, month);
  const plans: DayPlan[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const weekday = date.getDay();
    const holiday = getHolidayForDate(year, month, day);

    let postType: string;
    let detail: string;
    let isHoliday = false;
    let holidayName: string | undefined;

    if (holiday) {
      postType = "Seasonal";
      detail = holiday.detail;
      isHoliday = true;
      holidayName = holiday.name;
    } else {
      const base = WEEKDAY_PLANS[weekday];
      postType = base.postType;
      detail = base.detail;
    }

    const imageStyle = pickImageStyleForDay(postType, year, month, day);

    let captionLength: "short" | "medium" | "long";
    let hashtagPack: "light" | "standard" | "heavy";

    switch (postType) {
      case "Engagement":
        captionLength = "short";
        hashtagPack = "light";
        break;
      case "Educational":
        captionLength = "medium";
        hashtagPack = "heavy";
        break;
      case "Authority":
        captionLength = "medium";
        hashtagPack = "standard";
        break;
      case "Problem → Solution":
        captionLength = "medium";
        hashtagPack = "standard";
        break;
      case "Before & After":
        captionLength = "short";
        hashtagPack = "standard";
        break;
      case "Seasonal":
        captionLength = "medium";
        hashtagPack = "heavy";
        break;
      default:
        captionLength = "medium";
        hashtagPack = "standard";
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
    });
  }

  return plans;
}

/* ----------------------------- Page ----------------------------- */

export default function CalendarPage() {
  const router = useRouter();
  const tokenBalance = useTokenBalance();
  const { addToast } = useToast();
  const [qs, setQs] = useState("");
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null);
  const [activeBrandProfile, setActiveBrandProfile] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [showOutOfTokens, setShowOutOfTokens] = useState(false);

  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);

    setQs(window.location.search ? window.location.search.slice(1) : "");

    // Load active brand profile (validate it has required fields)
    try {
      const activeBrand = localStorage.getItem("ath_active_brand_profile");
      if (activeBrand) {
        const parsed = JSON.parse(activeBrand);
        if (parsed && parsed.niche && parsed.audience) {
          setActiveBrandProfile(parsed);
        } else {
          // Stale/incomplete profile — clear it
          localStorage.removeItem("ath_active_brand_profile");
        }
      }
    } catch {}
  }, []);

  const plan = useMemo(
    () => buildMonthPlan(currentYear, currentMonth),
    [currentYear, currentMonth]
  );
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);

  const monthHolidays = useMemo(() => {
    return plan
      .filter((p) => p.isHoliday)
      .map((p) => ({ day: p.day, name: p.holidayName }));
  }, [plan]);

  const forwardedQs = useMemo(() => {
    if (!qs) return "";
    const sp = new URLSearchParams(qs);
    [
      "day",
      "title",
      "detail",
      "autogen",
      "goal",
      "imageStyle",
      "postType",
      "captionLength",
      "hashtagPack",
      "niche",
      "audience",
      "tone",
      "primaryColor",
      "secondaryColor",
    ].forEach((k) => sp.delete(k));
    const out = sp.toString();
    return out ? `&${out}` : "";
  }, [qs]);

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

  function handleGenerate() {
    if (!selectedDay || generating) return;
    if (!tokenBalance.isLoading && tokenBalance.tokensRemaining <= 0) {
      setShowOutOfTokens(true);
      addToast("You've used all your tokens this month.", "warning");
      return;
    }
    setGenerating(true);
    const p = selectedDay;
    const href =
      `/generator?day=${p.day}` +
      `&title=${encodeURIComponent(p.holidayName || p.postType)}` +
      `&detail=${encodeURIComponent(p.detail)}` +
      `&autogen=1` +
      `&postType=${encodeURIComponent(p.postType)}` +
      `&captionLength=${encodeURIComponent(p.captionLength)}` +
      `&hashtagPack=${encodeURIComponent(p.hashtagPack)}` +
      `&imageStyle=${encodeURIComponent(p.imageStyle)}` +
      `${forwardedQs}`;
    router.push(href);
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
    holidayAlert: {
      background:
        "linear-gradient(135deg, rgba(255, 99, 132, 0.15) 0%, rgba(255, 159, 64, 0.15) 100%)",
      border: "1px solid rgba(255, 99, 132, 0.3)",
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    holidayAlertTitle: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: "uppercase",
      marginBottom: 8,
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    holidayList: { display: "flex", flexWrap: "wrap", gap: 8 },
    holidayTag: {
      background: "rgba(255, 99, 132, 0.2)",
      border: "1px solid rgba(255, 99, 132, 0.3)",
      borderRadius: 6,
      padding: "4px 10px",
      fontSize: 12,
      fontWeight: 600,
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
      display: "none", // Hidden by default, shown on mobile via CSS
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

    // Modal
    modalOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.75)",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      zIndex: 100,
      padding: 20,
      paddingTop: 60,
      overflowY: "auto" as const,
    },
    modal: {
      background: "#101a33",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 20,
      padding: 0,
      maxWidth: 960,
      width: "90vw",
      overflow: "hidden",
      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    },
    modalHeader: {
      padding: "20px 24px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    },
    modalHeaderHoliday: {
      background:
        "linear-gradient(135deg, rgba(255, 99, 132, 0.15) 0%, rgba(255, 159, 64, 0.15) 100%)",
    },
    modalDate: { fontSize: 13, opacity: 0.6, marginBottom: 4 },
    modalTitle: { fontSize: 22, fontWeight: 700, margin: 0 },
    modalHolidayBadge: {
      display: "inline-block",
      background: "rgba(255, 99, 132, 0.2)",
      border: "1px solid rgba(255, 99, 132, 0.3)",
      borderRadius: 6,
      padding: "4px 10px",
      fontSize: 11,
      fontWeight: 700,
      marginTop: 8,
      color: "#ff9999",
    },
    modalBody: {
      padding: "20px 24px",
      display: "grid",
      gridTemplateColumns: "1.2fr 1fr",
      gap: 24,
      alignItems: "start",
    },
    modalBodyMobile: {
      padding: "20px 24px",
      display: "block",
    },
    modalSection: { marginBottom: 16 },
    modalLeftColumn: {
      display: "flex",
      flexDirection: "column" as const,
      gap: 16,
    },
    modalRightColumn: {
      display: "flex",
      flexDirection: "column" as const,
      gap: 16,
    },
    modalSectionTitle: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 1,
      opacity: 0.5,
      marginBottom: 8,
    },
    modalDetail: { fontSize: 14, lineHeight: 1.5, opacity: 0.9 },
    modalGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    modalItem: {
      background: "rgba(255,255,255,0.04)",
      borderRadius: 10,
      padding: "10px 12px",
    },
    modalItemLabel: {
      fontSize: 10,
      textTransform: "uppercase",
      opacity: 0.5,
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    modalItemValue: { fontSize: 14, fontWeight: 600 },
    modalFooter: {
      padding: "14px 24px",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      display: "flex",
      gap: 12,
    },
    modalBtn: {
      flex: 1,
      padding: "14px 20px",
      borderRadius: 12,
      border: "none",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      transition: "all 0.15s ease",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    modalBtnCancel: {
      background: "rgba(255,255,255,0.08)",
      color: "#e6edf7",
      border: "1px solid rgba(255,255,255,0.12)",
    },
    modalBtnGenerate: {
      background: "linear-gradient(135deg, #2c6bed 0%, #1e4fc2 100%)",
      color: "#fff",
    },
    modalBtnGenerateHoliday: {
      background: "linear-gradient(135deg, #ff6384 0%, #ff9f64 100%)",
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.h1} className="ath-page-title">
              Plan Your Month
            </h1>
            <p style={styles.subtitle} className="ath-page-subtitle">
              <span style={{ fontSize: 18 }}>📅</span>
              Click any day to preview and generate that post. Holidays are
              auto-detected!
            </p>
          </div>
          <a href="/dashboard" style={styles.backBtn} className="hover-btn">
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
            Dashboard
          </a>
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
              const imageStyleOption = getImageStyleOption(p.imageStyle);
              return (
                <div
                  key={p.day}
                  style={{
                    ...styles.dayCell,
                    ...(p.isHoliday ? styles.dayCellHoliday : {}),
                  }}
                  className="ath-day-cell"
                  onClick={() => setSelectedDay(p)}
                >
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
                  <div style={styles.postType} className="post-type-label">
                    {p.postType}
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
            {plan.map((dayPlan, index) => {
              const imageStyleOption = getImageStyleOption(dayPlan.imageStyle);
              const dayOfWeek = WEEKDAYS[dayPlan.date.getDay()];
              const monthName = MONTHS[dayPlan.date.getMonth()];
              const dayNum = dayPlan.day;

              return (
                <div
                  key={dayPlan.day}
                  style={{
                    ...styles.mobileListItem,
                    ...(dayPlan.isHoliday ? styles.mobileListItemHoliday : {}),
                  }}
                  className="mobile-list-item"
                  onClick={() => setSelectedDay(dayPlan)}
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
                    <div style={styles.mobileListPostType}>
                      {dayPlan.postType}
                    </div>
                    <div style={styles.mobileListDetail}>{dayPlan.detail}</div>
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
          Click any day to preview what will be generated.
        </div>
        </>)}
      </div>

      {/* Preview Modal */}
      {selectedDay && (
        <div style={styles.modalOverlay} onClick={() => setSelectedDay(null)}>
          <div
            style={{ ...styles.modal, maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Colorful Header */}
            <div
              style={{
                padding: "28px 28px 24px",
                background: selectedDay.isHoliday
                  ? "linear-gradient(135deg, rgba(255, 99, 132, 0.2) 0%, rgba(255, 159, 64, 0.15) 100%)"
                  : "linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(44, 107, 237, 0.15) 100%)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                textAlign: "center" as const,
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 8 }}>
                {WEEKDAYS[selectedDay.date.getDay()]}, {MONTHS[currentMonth]}{" "}
                {selectedDay.day}
              </div>
              <h2
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  margin: 0,
                  marginBottom: 8,
                }}
              >
                {selectedDay.isHoliday
                  ? `🎉 ${selectedDay.holidayName}`
                  : selectedDay.postType}
              </h2>
              <p
                style={{
                  fontSize: 15,
                  opacity: 0.85,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {selectedDay.detail}
              </p>
            </div>

            {/* Simple Body */}
            <div style={{ padding: "24px 28px" }}>
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
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase" as const,
                    letterSpacing: 1,
                    opacity: 0.5,
                    marginBottom: 8,
                  }}
                >
                  What this means for your post
                </div>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    margin: 0,
                    opacity: 0.9,
                  }}
                >
                  {selectedDay.postType === "Engagement" && (
                    <>
                      Your post will include a{" "}
                      <strong>question or call-to-action</strong> designed to
                      spark conversation. Expect a{" "}
                      <strong>casual, inviting tone</strong> that encourages
                      your followers to comment and share their thoughts.
                    </>
                  )}
                  {selectedDay.postType === "Educational" && (
                    <>
                      Your post will share{" "}
                      <strong>valuable tips or insights</strong> that teach your
                      audience something new. The content will establish you as
                      a <strong>helpful resource</strong> in your niche.
                    </>
                  )}
                  {selectedDay.postType === "Authority" && (
                    <>
                      Your post will showcase your{" "}
                      <strong>expertise and credibility</strong>. Expect content
                      that positions you as a <strong>trusted leader</strong> in
                      your industry.
                    </>
                  )}
                  {selectedDay.postType === "Problem → Solution" && (
                    <>
                      Your post will address a{" "}
                      <strong>common pain point</strong> your audience faces and
                      present your <strong>solution or approach</strong>. Great
                      for showing how you can help.
                    </>
                  )}
                  {selectedDay.postType === "Before & After" && (
                    <>
                      Your post will highlight a{" "}
                      <strong>transformation or results</strong>. Perfect for
                      showing the <strong>impact of your work</strong> or
                      product in a visual, compelling way.
                    </>
                  )}
                  {selectedDay.postType === "Basic Post" && (
                    <>
                      Your post will be a{" "}
                      <strong>well-crafted, on-brand message</strong> that keeps
                      your audience engaged. Simple, effective, and true to your
                      voice.
                    </>
                  )}
                  {selectedDay.postType === "Seasonal" && (
                    <>
                      Your post will tap into the{" "}
                      <strong>holiday excitement</strong> with festive, timely
                      content. Perfect for connecting with your audience through{" "}
                      <strong>shared celebrations</strong>.
                    </>
                  )}
                </p>
              </div>

              {/* What you'll get section */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase" as const,
                    letterSpacing: 1,
                    opacity: 0.5,
                    marginBottom: 14,
                  }}
                >
                  What you'll get
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column" as const,
                    gap: 10,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background:
                          "linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                      }}
                    >
                      🖼️
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        Custom AI Image
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.6 }}>
                        Designed to match your brand colors
                      </div>
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background:
                          "linear-gradient(135deg, rgba(44, 107, 237, 0.2) 0%, rgba(44, 107, 237, 0.1) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                      }}
                    >
                      ✍️
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        Engaging Caption
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.6 }}>
                        Written in your brand voice
                      </div>
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background:
                          "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                      }}
                    >
                      #️⃣
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        Relevant Hashtags
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.6 }}>
                        Optimized for your niche
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand profile indicator */}
              {activeBrandProfile ? (
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: 12,
                    padding: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 22 }}>✅</div>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#6ee7b7",
                      }}
                    >
                      Using "{activeBrandProfile.profileName}" Profile
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                      Your brand settings will be applied automatically
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    padding: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 22 }}>💡</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      No Profile Selected
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                      <a
                        href="/dashboard"
                        style={{ color: "#7eb3ff", textDecoration: "none" }}
                      >
                        Set up a profile
                      </a>{" "}
                      for personalized results
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={styles.modalFooter}>
              <button
                style={{ ...styles.modalBtn, ...styles.modalBtnCancel }}
                onClick={() => setSelectedDay(null)}
                className="hover-btn"
              >
                Cancel
              </button>
              <button
                style={{
                  ...styles.modalBtn,
                  ...styles.modalBtnGenerate,
                  ...(selectedDay.isHoliday
                    ? styles.modalBtnGenerateHoliday
                    : {}),
                  ...((!tokenBalance.isLoading && tokenBalance.tokensRemaining <= 0) || generating
                    ? { opacity: 0.4, cursor: "not-allowed" }
                    : {}),
                }}
                onClick={handleGenerate}
                disabled={(!tokenBalance.isLoading && tokenBalance.tokensRemaining <= 0) || generating}
                className="hover-btn-primary"
              >
                {generating
                  ? "Loading…"
                  : !tokenBalance.isLoading && tokenBalance.tokensRemaining <= 0
                    ? "Out of tokens"
                    : "✨ Create My Post"}
              </button>
            </div>
          </div>
        </div>
      )}

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
          .desktop-calendar { display: none !important; }
          .mobile-calendar { display: block !important; }
          
          /* Adjust mobile list item hover states */
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
          .calendar-modal-body {
            display: block !important;
            padding: 16px 20px !important;
          }
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
