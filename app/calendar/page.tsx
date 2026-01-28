"use client";

import React, { useMemo, useState, useEffect } from "react";

type ImageStyle =
  | "lifestyle_photo"
  | "branding_photo"
  | "branding_text_photo"
  | "branding_text_only";

type DayPlan = {
  day: number;
  postType: string; // ✅ shown as the big title in the cell
  detail: string; // ✅ short subtext
  imageStyle: ImageStyle; // ✅ chosen automatically (NOT shown)
};

function daysInMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function getWeekdayLabel(year: number, monthIndex: number, day: number) {
  const d = new Date(year, monthIndex, day);
  return WEEKDAYS[d.getDay()];
}

function formatDayNumber(day: number) {
  if (day >= 11 && day <= 13) return `${day}th`;
  const last = day % 10;
  if (last === 1) return `${day}st`;
  if (last === 2) return `${day}nd`;
  if (last === 3) return `${day}rd`;
  return `${day}th`;
}

function startDayOfWeek(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0, 1).getDay(); // 0=Sun..6=Sat
}

function monthName(monthIndex0: number) {
  return new Date(2000, monthIndex0, 1).toLocaleString(undefined, {
    month: "long",
  });
}

/* ---------------- Deterministic “random” (NO hydration issues) ---------------- */

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

  // Text-first formats
  if (
    t.includes("educational") ||
    t.includes("tips") ||
    t.includes("authority")
  ) {
    return seededPick(
      ["branding_text_only", "branding_text_photo"] as const,
      seed
    );
  }

  // Promo / announcement
  if (
    t.includes("promotion") ||
    t.includes("offer") ||
    t.includes("announcement")
  ) {
    return seededPick(["branding_text_photo", "branding_photo"] as const, seed);
  }

  // Social proof
  if (t.includes("testimonial") || t.includes("social proof")) {
    return seededPick(
      ["branding_text_only", "branding_text_photo"] as const,
      seed
    );
  }

  // BTS
  if (t.includes("behind")) return "lifestyle_photo";

  // Engagement
  if (t.includes("engagement") || t.includes("conversation")) {
    return seededPick(["lifestyle_photo", "branding_photo"] as const, seed);
  }

  // Transformations
  if (
    t.includes("before") ||
    t.includes("after") ||
    t.includes("transformation")
  ) {
    return "lifestyle_photo";
  }

  // Default
  return seededPick(["lifestyle_photo", "branding_photo"] as const, seed);
}

/* ---------------- Plan builder (post types) ---------------- */

const POST_TYPES: Array<{ postType: string; detail: string }> = [
  {
    postType: "Basic Post",
    detail: "A safe, general post that fits your niche.",
  },
  {
    postType: "Promotion / Offer",
    detail: "Highlight a deal, discount, or special offer.",
  },
  {
    postType: "Service or Product Highlight",
    detail:
      "Show what you offer and who it helps (keep visuals generic if needed).",
  },
  {
    postType: "Educational / Tips",
    detail: "Share a helpful tip your audience can use today.",
  },
  {
    postType: "Problem → Solution",
    detail: "Call out a pain point and give a simple solution.",
  },
  {
    postType: "Before & After / Transformation",
    detail: "Show a transformation or progress (visual-only, no labels).",
  },
  {
    postType: "Testimonial / Social Proof",
    detail: "Build trust with a quick customer win or review.",
  },
  {
    postType: "Behind the Scenes",
    detail: "Show a real moment from your day or process.",
  },
  {
    postType: "Announcement / Update",
    detail: "Share news, updates, milestones, or changes.",
  },
  {
    postType: "Engagement / Conversation Starter",
    detail: "Ask a question that encourages comments and replies.",
  },
  {
    postType: "Seasonal / Timely",
    detail: "Tie your post to a season, holiday, or current moment.",
  },
  {
    postType: "Authority / Credibility",
    detail: "Position yourself as the expert with a strong takeaway.",
  },
];

function buildPostTypePlan(
  totalDays: number,
  year: number,
  monthIndex0: number
): DayPlan[] {
  return Array.from({ length: totalDays }, (_, i) => {
    const base = POST_TYPES[i % POST_TYPES.length];
    const day = i + 1;
    const imageStyle = pickImageStyleForDay(
      base.postType,
      year,
      monthIndex0,
      day
    );
    return {
      day,
      postType: base.postType,
      detail: base.detail,
      imageStyle,
    };
  });
}

/* ----------------------------- Page ----------------------------- */

export default function CalendarPage() {
  const [qs, setQs] = useState(""); // existing form params from generator
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIndex0, setMonthIndex0] = useState(today.getMonth());

  useEffect(() => {
    setQs(window.location.search ? window.location.search.slice(1) : "");
  }, []);

  const totalDays = useMemo(
    () => daysInMonth(year, monthIndex0),
    [year, monthIndex0]
  );
  const firstDow = useMemo(
    () => startDayOfWeek(year, monthIndex0),
    [year, monthIndex0]
  );
  const plan = useMemo(
    () => buildPostTypePlan(totalDays, year, monthIndex0),
    [totalDays, year, monthIndex0]
  );

  const monthLabel = `${monthName(monthIndex0)} ${year}`;

  // ✅ remove keys that we override from the calendar (prevents duplicates)
  const forwardedQs = useMemo(() => {
    if (!qs) return "";
    const sp = new URLSearchParams(qs);

    // we set these ourselves
    sp.delete("day");
    sp.delete("title");
    sp.delete("detail");
    sp.delete("autogen");
    sp.delete("goal");
    sp.delete("imageStyle");

    const out = sp.toString();
    return out ? `&${out}` : "";
  }, [qs]);

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background: "#0b1220",
      color: "#e6edf7",
      padding: 20,
      fontFamily: "Verdana, Geneva, sans-serif",
      boxSizing: "border-box",
      overflowX: "hidden",
    },
    wrap: {
      maxWidth: 1100,
      margin: "0 auto",
      width: "100%",
      boxSizing: "border-box",
    },
    top: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: 12,
      flexWrap: "wrap",
      marginBottom: 14,
    },
    h1: {
      fontSize: 35,
      fontWeight: 600,
      letterSpacing: 1,
      margin: 0,
      textTransform: "uppercase",
    },
    sub: { margin: 0, opacity: 0.75, fontSize: 14, lineHeight: 1.4 },
    monthPill: {
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      padding: "8px 12px",
      fontSize: 12,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      whiteSpace: "nowrap",
    },
    card: {
      background: "#101a33",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      padding: 14,
      boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
      width: "100%",
      boxSizing: "border-box",
    },
    bar: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    controls: { display: "flex", gap: 10, flexWrap: "wrap" },
    btn: {
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(255,255,255,0.06)",
      color: "#e6edf7",
      padding: "10px 14px",
      fontWeight: 700,
      cursor: "pointer",
      textTransform: "uppercase",
      fontSize: 12,
      letterSpacing: 0.6,
    },
    link: {
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
    },

    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
      gap: 10,
      width: "100%",
      boxSizing: "border-box",
    },

    dow: {
      fontSize: 11,
      fontWeight: 700,
      opacity: 0.75,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      padding: "0 6px",
      textAlign: "left",
    },

    cell: {
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(11,18,32,0.55)",
      padding: 10,
      minHeight: 120,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      boxSizing: "border-box",
      minWidth: 0,
      overflow: "hidden",
    },

    dayNum: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      minWidth: 0,
    },

    day: {
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      opacity: 0.95,
      whiteSpace: "nowrap",
    },

    tag: {
      fontSize: 11,
      padding: "4px 8px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      whiteSpace: "nowrap",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      opacity: 0.95,
    },

    title: {
      margin: 0,
      fontSize: 13,
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },

    detail: {
      margin: 0,
      fontSize: 12,
      lineHeight: 1.35,
      opacity: 0.85,
    },

    note: {
      marginTop: 10,
      fontSize: 12,
      opacity: 0.7,
      lineHeight: 1.4,
    },
  };

  const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function prevMonth() {
    setMonthIndex0((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }

  function nextMonth() {
    setMonthIndex0((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }

  const cells: Array<{ kind: "blank" } | { kind: "day"; plan: DayPlan }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ kind: "blank" });
  for (let d = 1; d <= totalDays; d++)
    cells.push({ kind: "day", plan: plan[d - 1] });

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.top}>
          <div>
            <h1 style={styles.h1}>{monthLabel}</h1>
            <p style={styles.sub}>
              A simple monthly plan. Click a day to generate that day’s post.
            </p>
          </div>
          <div style={styles.monthPill}>Monthly Calendar</div>
        </div>

        <div style={{ ...styles.card, marginBottom: 12 }}>
          <div style={styles.bar}>
            <div style={styles.controls}>
              <button style={styles.btn} onClick={prevMonth}>
                Prev
              </button>
              <button style={styles.btn} onClick={nextMonth}>
                Next
              </button>
            </div>

            <a href="/" style={styles.link}>
              Back to Generator
            </a>
          </div>

          <div style={{ ...styles.grid, marginBottom: 8 }} className="ath-dow">
            {dows.map((d) => (
              <div key={d} style={styles.dow}>
                {d}
              </div>
            ))}
          </div>

          <div style={styles.grid} className="ath-cal-grid">
            {cells.map((c, idx) => {
              if (c.kind === "blank") {
                return (
                  <div
                    key={idx}
                    style={{ ...styles.cell, opacity: 0.25 }}
                    className="ath-blank"
                  />
                );
              }

              const p = c.plan;

              // ✅ What generator receives:
              // - dayContext uses title/detail
              // - goal = post type
              // - imageStyle = chosen automatically (not shown)
              const href =
                `/?day=${p.day}` +
                `&title=${encodeURIComponent(p.postType)}` +
                `&detail=${encodeURIComponent(p.detail)}` +
                `&autogen=1` +
                `&goal=${encodeURIComponent(p.postType)}` +
                `&imageStyle=${encodeURIComponent(p.imageStyle)}` +
                `${forwardedQs}`;

              return (
                <a
                  key={idx}
                  href={href}
                  style={{
                    ...styles.cell,
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <div style={styles.dayNum}>
                    <div style={styles.day}>{formatDayNumber(p.day)}</div>
                    <div style={styles.tag}>
                      {getWeekdayLabel(year, monthIndex0, p.day)}
                    </div>
                  </div>

                  {/* ✅ title now shows the POST TYPE */}
                  <p style={styles.title}>{p.postType}</p>
                  {/* ✅ short subtext */}
                  <p style={styles.detail}>{p.detail}</p>

                  <div style={{ marginTop: "auto" }}>
                    <span style={{ ...styles.tag, opacity: 0.7 }}>
                      Generate now
                    </span>
                  </div>
                </a>
              );
            })}
          </div>

          <div style={styles.note}>
            This calendar rotates through your post types. The image style is
            chosen automatically per day.
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .ath-cal-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          .ath-dow { display: none !important; }
          .ath-blank { display: none !important; }
        }
        @media (max-width: 700px) {
          .ath-cal-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 420px) {
          .ath-cal-grid { grid-template-columns: minmax(0, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
