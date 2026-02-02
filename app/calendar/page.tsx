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
  date: Date; // Added for weekly view
  captionLength: "short" | "medium" | "long";
  hashtagPack: "light" | "standard" | "heavy";
  imageFormatLabel: string;
};

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

const WEEKDAY_PLANS: Record<number, { postType: string; detail: string }> = {
  0: POST_TYPES[9], // Sunday: Engagement / Conversation Starter
  1: POST_TYPES[3], // Monday: Educational / Tips
  2: POST_TYPES[11], // Tuesday: Authority / Credibility
  3: POST_TYPES[4], // Wednesday: Problem → Solution
  4: POST_TYPES[6], // Thursday: Testimonial / Social Proof
  5: POST_TYPES[1], // Friday: Promotion / Offer
  6: POST_TYPES[7], // Saturday: Behind the Scenes
};

function buildPostTypePlan(weekStart: Date): DayPlan[] {
  const plans: DayPlan[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
    const weekday = date.getDay();
    const base = WEEKDAY_PLANS[weekday];
    const imageStyle = pickImageStyleForDay(
      base.postType,
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    // Strategic assignments
    let captionLength: "short" | "medium" | "long";
    let hashtagPack: "light" | "standard" | "heavy";
    switch (base.postType) {
      case "Engagement / Conversation Starter":
        captionLength = "short";
        hashtagPack = "light";
        break;
      case "Educational / Tips":
        captionLength = "medium";
        hashtagPack = "heavy";
        break;
      case "Authority / Credibility":
        captionLength = "medium";
        hashtagPack = "standard";
        break;
      case "Problem → Solution":
        captionLength = "medium";
        hashtagPack = "standard";
        break;
      case "Testimonial / Social Proof":
        captionLength = "short";
        hashtagPack = "standard";
        break;
      case "Promotion / Offer":
        captionLength = "short";
        hashtagPack = "light";
        break;
      case "Behind the Scenes":
        captionLength = "medium";
        hashtagPack = "light";
        break;
      default:
        captionLength = "medium";
        hashtagPack = "standard";
    }

    const imageFormatLabel = {
      lifestyle_photo: "Photo",
      branding_photo: "Branded Graphic",
      branding_text_photo: "Text + Photo",
      branding_text_only: "Text Only",
    }[imageStyle];

    plans.push({
      day: date.getDate(),
      postType: base.postType,
      detail: base.detail,
      imageStyle,
      date,
      captionLength,
      hashtagPack,
      imageFormatLabel,
    });
  }

  // Enforce no more than 2 identical image styles in a row
  for (let i = 2; i < plans.length; i++) {
    if (
      plans[i].imageStyle === plans[i - 1].imageStyle &&
      plans[i].imageStyle === plans[i - 2].imageStyle
    ) {
      // Change to another style
      const options = [
        "lifestyle_photo",
        "branding_photo",
        "branding_text_photo",
        "branding_text_only",
      ] as ImageStyle[];
      const currentIndex = options.indexOf(plans[i].imageStyle);
      const nextIndex = (currentIndex + 1) % options.length;
      plans[i].imageStyle = options[nextIndex];
      plans[i].imageFormatLabel = {
        lifestyle_photo: "Photo",
        branding_photo: "Branded Graphic",
        branding_text_photo: "Text + Photo",
        branding_text_only: "Text Only",
      }[plans[i].imageStyle];
    }
  }

  return plans;
}

/* ----------------------------- Page ----------------------------- */

export default function CalendarPage() {
  const [qs, setQs] = useState(""); // existing form params from generator
  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
    return d;
  });

  useEffect(() => {
    setQs(window.location.search ? window.location.search.slice(1) : "");
  }, []);

  const totalDays = 7;
  const plan = useMemo(() => buildPostTypePlan(weekStart), [weekStart]);

  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  const weekLabel = `Week of ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;

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
    sp.delete("postType");
    sp.delete("captionLength");
    sp.delete("hashtagPack");

    const out = sp.toString();
    return out ? `&${out}` : "";
  }, [qs]);

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0b1220 0%, #0a0f1a 100%)",
      color: "#e6edf7",
      padding: 20,
      fontFamily: "Verdana, Geneva, sans-serif",
      boxSizing: "border-box",
      overflowX: "hidden",
    },
    wrap: {
      maxWidth: 1200,
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
      marginBottom: 20,
    },
    h1: {
      fontSize: 42,
      fontWeight: 700,
      letterSpacing: 1.5,
      margin: 0,
      textTransform: "uppercase",
      textShadow: "0 2px 4px rgba(0,0,0,0.5)",
      background: "linear-gradient(90deg, #e6edf7 0%, #b3c5e6 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    sub: {
      margin: 0,
      opacity: 0.8,
      fontSize: 16,
      lineHeight: 1.5,
      color: "#b3c5e6",
    },
    monthPill: {
      borderRadius: 20,
      border: "1px solid rgba(44,107,237,0.3)",
      background:
        "linear-gradient(145deg, rgba(44,107,237,0.1) 0%, rgba(44,107,237,0.05) 100%)",
      padding: "10px 16px",
      fontSize: 13,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 1,
      whiteSpace: "nowrap",
      color: "#7eb3ff",
      boxShadow: "0 2px 8px rgba(44,107,237,0.2)",
    },
    card: {
      background: "linear-gradient(145deg, #101a33 0%, #0f1629 100%)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 20,
      padding: 24,
      boxShadow: "0 12px 32px rgba(0,0,0,0.4), 0 0 20px rgba(44,107,237,0.1)",
      width: "100%",
      boxSizing: "border-box",
    },
    bar: {
      display: "flex",
      gap: 16,
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    controls: { display: "flex", gap: 12, flexWrap: "wrap" },
    btn: {
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.2)",
      background:
        "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
      color: "#e6edf7",
      padding: "12px 16px",
      fontWeight: 700,
      cursor: "pointer",
      textTransform: "uppercase",
      fontSize: 12,
      letterSpacing: 0.8,
      transition: "all 0.2s ease",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    },
    link: {
      display: "inline-block",
      textAlign: "center",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.2)",
      background:
        "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
      color: "#e6edf7",
      padding: "12px 16px",
      fontWeight: 700,
      textDecoration: "none",
      textTransform: "uppercase",
      fontSize: 12,
      letterSpacing: 0.8,
      transition: "all 0.2s ease",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      cursor: "pointer",
    },

    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: 16,
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
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.15)",
      background:
        "linear-gradient(145deg, rgba(11,18,32,0.6) 0%, rgba(15,22,38,0.4) 100%)",
      padding: 16,
      minHeight: 180,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      boxSizing: "border-box",
      minWidth: 0,
      overflow: "hidden",
      transition: "all 0.3s ease",
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    },

    dayNum: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      minWidth: 0,
    },

    day: {
      fontSize: 14,
      fontWeight: 900,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      opacity: 0.95,
      whiteSpace: "nowrap",
      color: "#4a9eff",
    },

    tag: {
      fontSize: 10,
      padding: "6px 10px",
      borderRadius: 12,
      border: "1px solid rgba(44,107,237,0.4)",
      background:
        "linear-gradient(145deg, rgba(44,107,237,0.15) 0%, rgba(44,107,237,0.08) 100%)",
      whiteSpace: "nowrap",
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      opacity: 0.95,
      color: "#7eb3ff",
      boxShadow: "0 1px 4px rgba(44,107,237,0.2)",
    },

    title: {
      margin: 0,
      fontSize: 14,
      fontWeight: 900,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      color: "#ffffff",
    },

    detail: {
      margin: 0,
      fontSize: 12,
      lineHeight: 1.4,
      opacity: 0.8,
      color: "#c0c8d0",
    },

    note: {
      marginTop: 16,
      fontSize: 13,
      opacity: 0.75,
      lineHeight: 1.5,
      color: "#a0aec0",
      textAlign: "center",
      fontStyle: "italic",
    },

    previewSection: {
      borderTop: "1px solid rgba(255,255,255,0.1)",
      paddingTop: 12,
      marginTop: 12,
    },

    angle: {
      fontSize: 12,
      fontWeight: 600,
      color: "#c0c8d0",
      opacity: 0.8,
      marginBottom: 8,
      lineHeight: 1.4,
    },

    badges: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
      marginBottom: 8,
    },

    badge: {
      fontSize: 9,
      padding: "3px 6px",
      borderRadius: 8,
      border: "1px solid rgba(44,107,237,0.3)",
      background: "rgba(44,107,237,0.1)",
      color: "#7eb3ff",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      whiteSpace: "nowrap",
    },

    checklist: {
      fontSize: 10,
      opacity: 0.6,
      color: "#8892a0",
      lineHeight: 1.3,
    },
  };

  const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function prevMonth() {
    setWeekStart((ws) => new Date(ws.getTime() - 7 * 24 * 60 * 60 * 1000));
  }

  function nextMonth() {
    setWeekStart((ws) => new Date(ws.getTime() + 7 * 24 * 60 * 60 * 1000));
  }

  const cells: Array<{ kind: "day"; plan: DayPlan }> = plan.map((p) => ({
    kind: "day",
    plan: p,
  }));

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.top}>
          <div>
            <h1 style={styles.h1}>{weekLabel}</h1>
            <p style={styles.sub}>
              A simple weekly plan. Click a day to generate that day's post.
            </p>
          </div>
          <div style={styles.monthPill}>Weekly Calendar</div>
        </div>

        <div style={{ ...styles.card, marginBottom: 12 }}>
          <div style={styles.bar}>
            <div style={styles.controls}>
              <button
                style={styles.btn}
                onClick={prevMonth}
                className="ath-btn"
              >
                Prev
              </button>
              <button
                style={styles.btn}
                onClick={nextMonth}
                className="ath-btn"
              >
                Next
              </button>
            </div>

            <a href="/dashboard" style={styles.link} className="ath-btn">
              Dashboard
            </a>
          </div>

          <div style={styles.grid} className="ath-cal-grid">
            {cells.map((c, idx) => {
              const p = c.plan;

              // ✅ What generator receives:
              // - dayContext uses title/detail
              // - goal = post type
              // - imageStyle = chosen automatically (not shown)
              const href =
                `/generate?day=${p.day}` +
                `&title=${encodeURIComponent(p.postType)}` +
                `&detail=${encodeURIComponent(p.detail)}` +
                `&autogen=1` +
                `&postType=${encodeURIComponent(p.postType)}` +
                `&captionLength=${encodeURIComponent(p.captionLength)}` +
                `&hashtagPack=${encodeURIComponent(p.hashtagPack)}` +
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
                  className="ath-cell"
                >
                  <div style={styles.dayNum}>
                    <div style={styles.day}>{formatDayNumber(p.day)}</div>
                    <div style={styles.tag}>
                      {getWeekdayLabel(
                        p.date.getFullYear(),
                        p.date.getMonth(),
                        p.day
                      )}
                    </div>
                  </div>

                  {/* ✅ title now shows the POST TYPE */}
                  <p style={styles.title}>{p.postType}</p>
                  {/* ✅ short subtext */}
                  <p style={styles.detail}>{p.detail}</p>

                  {/* Generation Preview */}
                  <div style={styles.previewSection}>
                    <div style={styles.angle}>Angle: {p.detail}</div>
                    <div style={styles.badges}>
                      <span style={styles.badge}>
                        {p.captionLength.charAt(0).toUpperCase() +
                          p.captionLength.slice(1)}
                      </span>
                      <span style={styles.badge}>
                        {p.hashtagPack.charAt(0).toUpperCase() +
                          p.hashtagPack.slice(1)}
                      </span>
                      <span style={styles.badge}>{p.imageFormatLabel}</span>
                    </div>
                    <div style={styles.checklist}>
                      ✓ 1 image
                      <br />
                      ✓ caption
                      <br />✓ hashtags
                    </div>
                  </div>

                  <div style={{ marginTop: "auto" }}>
                    <span
                      style={{
                        ...styles.tag,
                        opacity: 1,
                        background:
                          "linear-gradient(145deg, rgba(44,107,237,0.3) 0%, rgba(44,107,237,0.2) 100%)",
                        border: "1px solid rgba(44,107,237,0.6)",
                        color: "#ffffff",
                      }}
                    >
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
        .ath-cell:hover {
          background: linear-gradient(145deg, rgba(44,107,237,0.15) 0%, rgba(44,107,237,0.08) 100%) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(44,107,237,0.2), 0 4px 12px rgba(0,0,0,0.3) !important;
        }
        .ath-btn:hover {
          background: linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.08) 100%) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
        }
        @media (max-width: 980px) {
          .ath-cal-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 12px !important; }
        }
        @media (max-width: 700px) {
          .ath-cal-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important; }
        }
        @media (max-width: 420px) {
          .ath-cal-grid { grid-template-columns: minmax(0, 1fr) !important; gap: 8px !important; }
        }
      `}</style>
    </div>
  );
}
