"use client";

import React, { useMemo, useState } from "react";

type DayPlan = {
  day: number;
  title: string;
  detail: string;
  tag: "Value" | "Proof" | "Promo" | "Community";
};

function daysInMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function startDayOfWeek(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0, 1).getDay(); // 0=Sun..6=Sat
}

function monthName(monthIndex0: number) {
  return new Date(2000, monthIndex0, 1).toLocaleString(undefined, {
    month: "long",
  });
}

function buildGenericPlan(totalDays: number): DayPlan[] {
  const cycle: Omit<DayPlan, "day">[] = [
    {
      tag: "Value",
      title: "Quick tip",
      detail: "Teach a simple tip your audience can use today.",
    },
    {
      tag: "Proof",
      title: "Testimonial",
      detail: "Share a customer win or a short social proof story.",
    },
    {
      tag: "Value",
      title: "How it works",
      detail: "Explain your process or what makes your offer different.",
    },
    {
      tag: "Community",
      title: "Behind the scenes",
      detail: "Show your work, tools, or a day-in-the-life snapshot.",
    },
    {
      tag: "Promo",
      title: "Offer highlight",
      detail: "Soft promo: explain what you sell + who it’s for.",
    },
    {
      tag: "Value",
      title: "FAQ",
      detail: "Answer one common question your customers ask.",
    },
    {
      tag: "Community",
      title: "Engagement post",
      detail: "Ask a question or run a quick poll to spark comments.",
    },
  ];

  return Array.from({ length: totalDays }, (_, i) => {
    const base = cycle[i % cycle.length];
    return { day: i + 1, ...base };
  });
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIndex0, setMonthIndex0] = useState(today.getMonth());

  const totalDays = useMemo(
    () => daysInMonth(year, monthIndex0),
    [year, monthIndex0]
  );
  const firstDow = useMemo(
    () => startDayOfWeek(year, monthIndex0),
    [year, monthIndex0]
  );
  const plan = useMemo(() => buildGenericPlan(totalDays), [totalDays]);

  const monthLabel = `${monthName(monthIndex0)} ${year}`;

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

    // ✅ one reliable grid that changes columns by breakpoint
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

    // ✅ removed "Day" prefix — now just the number
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
              A simple monthly plan. Next step: click a day to generate that
              day’s post.
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

          {/* Desktop day-of-week labels */}
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
                  <div key={idx} style={{ ...styles.cell, opacity: 0.25 }} />
                );
              }

              const p = c.plan;
              return (
                <div key={idx} style={styles.cell}>
                  <div style={styles.dayNum}>
                    <div style={styles.day}>{p.day}</div>
                    <div style={styles.tag}>{p.tag}</div>
                  </div>

                  <p style={styles.title}>{p.title}</p>
                  <p style={styles.detail}>{p.detail}</p>

                  <div style={{ marginTop: "auto" }}>
                    <span style={{ ...styles.tag, opacity: 0.7 }}>
                      Generate now
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={styles.note}>
            This is a generic strategy calendar. Next we’ll make each day
            clickable and generate that day’s image + caption.
          </div>
        </div>
      </div>

      <style>{`
        /* ✅ Clean, predictable responsiveness */
        @media (max-width: 980px) {
          .ath-cal-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          .ath-dow { display: none !important; }
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
