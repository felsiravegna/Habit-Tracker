import React, { useState, useMemo, useRef } from "react";
import { Check, X, Flame } from "lucide-react";

const DONE_COLOR = "#8FDDA0";
const PEAK_COLOR = "#7DB8EE";
const NUMBER_PALETTE = ["#F5BE73", "#F3A6B8", "#8FE0C0", "#C6AEEA", "#F5D373"];
const HABIT_COL_W = 176;
const STREAK_COL_W = 68;
const DAY_COL_W = 72;
const HEADER_H = 56;
const CAT_DIVIDER_H = 30;

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}
const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

let idCounter = 1000;
const nextId = (prefix) => `${prefix}_${idCounter++}`;

const initialCategories = [
  { id: "cat_general", name: "General" },
  { id: "cat_higiene", name: "Higiene" },
  { id: "cat_salud", name: "Salud" },
  { id: "cat_nutricion", name: "Nutrición" },
];

const initialHabits = [
  { id: "h_cama", categoryId: "cat_general", name: "Cama", type: "boolean", trackStreak: true },
  { id: "h_diario", categoryId: "cat_general", name: "Diario", type: "boolean", trackStreak: true },
  { id: "h_leer", categoryId: "cat_general", name: "Leer", type: "number", unit: "páginas", color: NUMBER_PALETTE[1], trackStreak: false, highlightBest: false },
  { id: "h_dientes_md", categoryId: "cat_higiene", name: "Dientes mediodía", type: "boolean", trackStreak: true },
  { id: "h_dientes_nc", categoryId: "cat_higiene", name: "Dientes noche", type: "boolean", trackStreak: false },
  { id: "h_ducha", categoryId: "cat_higiene", name: "Ducha", type: "boolean", trackStreak: false },
  { id: "h_cara", categoryId: "cat_higiene", name: "Cara", type: "boolean", trackStreak: false },
  { id: "h_mg_am", categoryId: "cat_salud", name: "Magnesio mañana", type: "boolean", trackStreak: true },
  { id: "h_mg_pm", categoryId: "cat_salud", name: "Magnesio noche", type: "boolean", trackStreak: false },
  { id: "h_pasos", categoryId: "cat_salud", name: "Pasos", type: "number", unit: "pasos", color: NUMBER_PALETTE[0], trackStreak: false, highlightBest: true },
  { id: "h_pesarse", categoryId: "cat_salud", name: "Pesarse", type: "boolean", trackStreak: true },
  { id: "h_cafe", categoryId: "cat_nutricion", name: "Café", type: "number", unit: "tazas", color: NUMBER_PALETTE[2], trackStreak: true, highlightBest: false },
  { id: "h_agua", categoryId: "cat_nutricion", name: "Agua", type: "number", unit: "botellas", color: NUMBER_PALETTE[3], trackStreak: false, highlightBest: false },
  { id: "h_choco", categoryId: "cat_nutricion", name: "Sin chocolatada", type: "boolean", trackStreak: false },
];

function buildSeedEntries(today) {
  const e = {};
  const set = (offset, values) => {
    e[isoDate(addDays(today, -offset))] = values;
  };
  set(0, { h_cama: true, h_diario: true, h_dientes_md: true, h_mg_am: true, h_pesarse: true, h_cafe: 2, h_agua: 1 });
  set(1, { h_cama: true, h_diario: true, h_leer: 5, h_dientes_md: true, h_mg_am: true, h_pasos: 6735, h_cafe: 2, h_agua: 2 });
  set(2, { h_cama: true, h_diario: true, h_dientes_md: true, h_mg_am: true, h_pasos: 8891, h_pesarse: true, h_cafe: 2, h_agua: 3 });
  set(3, { h_cama: true, h_diario: true, h_leer: 5, h_dientes_md: true, h_mg_am: true, h_pasos: 6909, h_cafe: 2, h_agua: 3, h_choco: true });
  set(4, { h_cama: true, h_diario: true, h_dientes_md: true, h_mg_am: true, h_pasos: 6270, h_cafe: 2, h_agua: 3 });
  return e;
}

export default function HabitTracker() {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayISO = isoDate(today);

  const [categories, setCategories] = useState(initialCategories);
  const [habits, setHabits] = useState(initialHabits);
  const [entries, setEntries] = useState(() => buildSeedEntries(today));
  const [visibleDays, setVisibleDays] = useState(45);
  const scrollRef = useRef(null);

  function handleScroll(e) {
    const el = e.currentTarget;
    const distanceToEnd = el.scrollWidth - (el.scrollLeft + el.clientWidth);
    if (distanceToEnd < 400) {
      setVisibleDays((v) => Math.min(v + 30, 366));
    }
  }

  const dates = useMemo(
    () => Array.from({ length: visibleDays }, (_, i) => addDays(today, -i)),
    [today, visibleDays]
  );

  const orderedHabits = useMemo(
    () => categories.flatMap((cat) => habits.filter((h) => h.categoryId === cat.id)),
    [categories, habits]
  );

  function isDone(dateISO, habit) {
    const v = entries[dateISO] && entries[dateISO][habit.id];
    if (habit.type === "boolean") return v === true;
    return typeof v === "number" && v > 0;
  }

  function toggleBoolean(dateISO, habitId) {
    setEntries((prev) => {
      const day = { ...(prev[dateISO] || {}) };
      day[habitId] = day[habitId] === true ? undefined : true;
      return { ...prev, [dateISO]: day };
    });
  }

  function updateNumber(dateISO, habitId, raw) {
    setEntries((prev) => {
      const day = { ...(prev[dateISO] || {}) };
      if (raw === "") {
        delete day[habitId];
      } else {
        const n = Math.max(0, Number(raw));
        if (!Number.isNaN(n)) day[habitId] = n;
      }
      return { ...prev, [dateISO]: day };
    });
  }

  function streakFor(habit) {
    if (!habit.trackStreak) return null;
    let count = 0;
    for (let i = 0; i < 400; i++) {
      const dISO = isoDate(addDays(today, -i));
      if (isDone(dISO, habit)) count++;
      else break;
    }
    return count;
  }

  function peakValue(habit) {
    if (habit.type !== "number" || !habit.highlightBest) return null;
    let max = 0;
    dates.forEach((d) => {
      const v = entries[isoDate(d)] && entries[isoDate(d)][habit.id];
      if (typeof v === "number" && v > max) max = v;
    });
    return max > 0 ? max : null;
  }

  const todayStats = useMemo(() => {
    const total = orderedHabits.length;
    const done = orderedHabits.filter((h) => isDone(todayISO, h)).length;
    return { total, done };
  }, [orderedHabits, entries, todayISO]);

  function removeHabit(habitId) {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
  }

  function removeCategory(categoryId) {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    setHabits((prev) => prev.filter((h) => h.categoryId !== categoryId));
  }

  const gridTemplate = `${HABIT_COL_W}px ${STREAK_COL_W}px repeat(${dates.length}, ${DAY_COL_W}px)`;
  const ratio = todayStats.total ? todayStats.done / todayStats.total : 0;
  const circumference = 2 * Math.PI * 26;
  const dashOffset = circumference * (1 - ratio);

  return (
    <div
      style={{
        fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
        background: "#FAFAF8",
        minHeight: "100vh",
        padding: "28px 20px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .htk-mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
        .htk-num::-webkit-inner-spin-button, .htk-num::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .htk-num { -moz-appearance: textfield; }
        .htk-cell-btn { transition: transform 120ms ease, background-color 120ms ease; }
        .htk-cell-btn:active { transform: scale(0.94); }
        .htk-x { opacity: 0; transition: opacity 120ms ease; }
        .htk-hdr:hover .htk-x { opacity: 1; }
        .htk-scroll::-webkit-scrollbar { height: 12px; width: 12px; }
        .htk-scroll::-webkit-scrollbar-thumb { background: #DAD7CD; border-radius: 8px; border: 3px solid #fff; background-clip: padding-box; }
        .htk-scroll::-webkit-scrollbar-thumb:hover { background: #C2BEB1; background-clip: padding-box; }
        .htk-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div style={{ width: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#232320", margin: 0, letterSpacing: "-0.01em" }}>
              Mis hábitos
            </h1>
            <p className="htk-mono" style={{ fontSize: 12, color: "#9A968C", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {WEEKDAYS[today.getDay()]}, {today.getDate()} de {MONTHS[today.getMonth()]}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#FFFFFF", border: "1px solid #EEEDE7", borderRadius: 16, padding: "10px 16px" }}>
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="26" fill="none" stroke="#F0EFE9" strokeWidth="5" />
              <circle
                cx="28"
                cy="28"
                r="26"
                fill="none"
                stroke={ratio === 1 ? DONE_COLOR : "#232320"}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 28 28)"
                style={{ transition: "stroke-dashoffset 300ms ease" }}
              />
            </svg>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#232320" }}>Hoy</div>
              <div className="htk-mono" style={{ fontSize: 12, color: "#9A968C" }}>
                {todayStats.done}/{todayStats.total} completados
              </div>
            </div>
          </div>
        </div>

        {/* Table: habits are rows, dates are columns (hoy a la izquierda) */}
        <div style={{ background: "#fff", border: "1px solid #EEEDE7", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 2px rgba(20,20,15,0.03)" }}>
          <div className="htk-scroll" ref={scrollRef} onScroll={handleScroll} style={{ overflow: "auto", maxHeight: 560 }}>
            <div style={{ display: "grid", gridTemplateColumns: gridTemplate, background: "#EDECE6", gap: 1, minWidth: "fit-content" }}>
              {/* Header row: corner + racha corner + one cell per fecha */}
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  left: 0,
                  zIndex: 4,
                  background: "#fff",
                  height: HEADER_H,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 12px",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: "#B7B3A8",
                  textTransform: "uppercase",
                }}
              >
                Hábito
              </div>
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  left: HABIT_COL_W,
                  zIndex: 4,
                  background: "#fff",
                  height: HEADER_H,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: "#B7B3A8",
                  textTransform: "uppercase",
                }}
              >
                <Flame size={11} /> Racha
              </div>
              {dates.map((date) => {
                const dISO = isoDate(date);
                const isToday = dISO === todayISO;
                return (
                  <div
                    key={dISO}
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 3,
                      background: isToday ? "#FBFAF6" : "#fff",
                      height: HEADER_H,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", color: isToday ? "#6FAE7F" : "#B7B3A8" }}>
                      {isToday ? "hoy" : WEEKDAYS[date.getDay()]}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#232320", lineHeight: 1 }}>{date.getDate()}</span>
                    <span className="htk-mono" style={{ fontSize: 9, color: "#B7B3A8" }}>{MONTHS[date.getMonth()]}</span>
                  </div>
                );
              })}

              {/* Categorías + filas de hábitos */}
              {categories.map((cat) => {
                const catHabits = habits.filter((h) => h.categoryId === cat.id);
                if (catHabits.length === 0) return null;
                return (
                  <React.Fragment key={cat.id}>
                    <div
                      className="htk-hdr"
                      style={{
                        gridColumn: "1 / -1",
                        background: "#F6F5F1",
                        height: CAT_DIVIDER_H,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 12px",
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9A968C" }}>
                        {cat.name}
                      </span>
                      <button onClick={() => removeCategory(cat.id)} className="htk-x" style={{ border: "none", background: "none", cursor: "pointer", color: "#B7B3A8", padding: 2 }} title="Eliminar categoría">
                        <X size={12} />
                      </button>
                    </div>

                    {catHabits.map((h) => {
                      const streak = streakFor(h);
                      const peak = peakValue(h);
                      return (
                        <React.Fragment key={h.id}>
                          <div
                            className="htk-hdr"
                            style={{
                              position: "sticky",
                              left: 0,
                              zIndex: 2,
                              background: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 6,
                              padding: "0 12px",
                              minHeight: 44,
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: "#4A473F" }}>{h.name}</span>
                              {h.unit && (
                                <span className="htk-mono" style={{ fontSize: 10, color: "#B7B3A8" }}>
                                  {h.unit}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => removeHabit(h.id)}
                              className="htk-x"
                              style={{ border: "none", background: "none", cursor: "pointer", color: "#C9C5B9", flexShrink: 0 }}
                              title="Eliminar hábito"
                            >
                              <X size={11} />
                            </button>
                          </div>

                          <div
                            className="htk-mono"
                            style={{
                              position: "sticky",
                              left: HABIT_COL_W,
                              zIndex: 2,
                              background: "#FBFAF9",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minHeight: 44,
                              fontSize: 13,
                              fontWeight: 600,
                              color: streak ? "#232320" : "#C9C5B9",
                            }}
                          >
                            {streak === null || streak === 0 ? "—" : streak}
                          </div>

                          {dates.map((date) => {
                            const dISO = isoDate(date);
                            const isToday = dISO === todayISO;
                            const bg = isToday ? "#FBFAF6" : "#fff";
                            const val = entries[dISO] && entries[dISO][h.id];

                            if (h.type === "boolean") {
                              const done = val === true;
                              return (
                                <button
                                  key={dISO}
                                  onClick={() => toggleBoolean(dISO, h.id)}
                                  className="htk-cell-btn"
                                  style={{
                                    background: done ? DONE_COLOR : bg,
                                    border: "none",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    minHeight: 44,
                                    width: "100%",
                                    margin: 0,
                                    padding: 0,
                                    boxSizing: "border-box",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  {done && <Check size={15} color="#fff" strokeWidth={3} />}
                                </button>
                              );
                            }

                            const cellColor = typeof val === "number" && val > 0 ? (peak !== null && val === peak ? PEAK_COLOR : h.color) : bg;
                            return (
                              <div key={dISO} style={{ background: cellColor, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44 }}>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  className="htk-mono htk-num"
                                  value={typeof val === "number" ? val : ""}
                                  onChange={(e) => updateNumber(dISO, h.id, e.target.value)}
                                  placeholder="—"
                                  style={{
                                    width: "100%",
                                    background: "transparent",
                                    border: "none",
                                    textAlign: "center",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: typeof val === "number" && val > 0 ? "#232320" : "#C9C5B9",
                                    outline: "none",
                                  }}
                                />
                              </div>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}