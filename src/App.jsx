import React, { useState, useMemo, useRef } from "react";
import { Check, X, Flame, Plus, Pencil } from "lucide-react";

const DONE_COLOR = "#4CAE6E";
const MISSED_COLOR = "#DD6A5C";
const HABIT_COL_W = 176;
const STREAK_COL_W = 68;
const DAY_COL_W = 72;
const HEADER_H = 56;
const CAT_DIVIDER_H = 30;
const RULES_ALWAYS = "2000-01-01";

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

const initialCategories = [{ id: "cat_general", name: "General" }];

const initialHabits = [
  { id: "h_cama", categoryId: "cat_general", name: "Cama", trackStreak: true, rules: [{ from: RULES_ALWAYS, type: "boolean" }] },
  { id: "h_diario", categoryId: "cat_general", name: "Diario", trackStreak: true, rules: [{ from: RULES_ALWAYS, type: "boolean" }] },
  { id: "h_leer", categoryId: "cat_general", name: "Leer", trackStreak: false, rules: [{ from: RULES_ALWAYS, type: "number", unit: "páginas" }] },
  { id: "h_dientes_md", categoryId: "cat_general", name: "Dientes mediodía", trackStreak: true, rules: [{ from: RULES_ALWAYS, type: "boolean" }] },
  { id: "h_dientes_nc", categoryId: "cat_general", name: "Dientes noche", trackStreak: false, rules: [{ from: RULES_ALWAYS, type: "boolean" }] },
  { id: "h_ducha", categoryId: "cat_general", name: "Ducha", trackStreak: false, rules: [{ from: RULES_ALWAYS, type: "boolean" }] },
  { id: "h_cara", categoryId: "cat_general", name: "Cara", trackStreak: false, rules: [{ from: RULES_ALWAYS, type: "boolean" }] },
  { id: "h_mg_am", categoryId: "cat_general", name: "Magnesio mañana", trackStreak: true, rules: [{ from: RULES_ALWAYS, type: "boolean" }] },
  { id: "h_mg_pm", categoryId: "cat_general", name: "Magnesio noche", trackStreak: false, rules: [{ from: RULES_ALWAYS, type: "boolean" }] },
  { id: "h_pasos", categoryId: "cat_general", name: "Pasos", trackStreak: false, rules: [{
    from: RULES_ALWAYS, type: "number", unit: "pasos", ranges: [
      { id: "r_pasos_0", min: 0, max: 5999, completes: false },
      { id: "r_pasos_1", min: 6000, max: 9999, completes: true },
      { id: "r_pasos_2", min: 10000, max: null, completes: true },
    ],
  }] },
  { id: "h_pesarse", categoryId: "cat_general", name: "Pesarse", trackStreak: true, rules: [{ from: RULES_ALWAYS, type: "boolean" }] },
  { id: "h_cafe", categoryId: "cat_general", name: "Café", trackStreak: true, rules: [{ from: RULES_ALWAYS, type: "number", unit: "tazas" }] },
  { id: "h_agua", categoryId: "cat_general", name: "Agua", trackStreak: false, rules: [{ from: RULES_ALWAYS, type: "number", unit: "botellas" }] },
  { id: "h_choco", categoryId: "cat_general", name: "Sin chocolatada", trackStreak: false, rules: [{ from: RULES_ALWAYS, type: "boolean" }] },
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
  const [habits, setHabits] = useState(() => {
    const defaultStart = isoDate(addDays(today, -4));
    return initialHabits.map((h) => ({ ...h, startDate: h.startDate || defaultStart }));
  });
  const [entries, setEntries] = useState(() => buildSeedEntries(today));
  const [visibleDays, setVisibleDays] = useState(45);
  const [showAddModal, setShowAddModal] = useState(false);
  const [draft, setDraft] = useState(null);
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [pendingEdit, setPendingEdit] = useState(null);
  const scrollRef = useRef(null);

  function closeModal() {
    setShowAddModal(false);
    setDraft(null);
    setEditingHabitId(null);
  }

  function openAddModal() {
    setEditingHabitId(null);
    setDraft({
      categoryName: categories[0] ? categories[0].name : "General",
      name: "",
      description: "",
      startDate: todayISO,
      type: "boolean",
      unit: "",
      ranges: [],
    });
    setShowAddModal(true);
  }

  function openEditModal(habit) {
    const current = rulesAt(habit, todayISO);
    const cat = categories.find((c) => c.id === habit.categoryId);
    setEditingHabitId(habit.id);
    setDraft({
      categoryName: cat ? cat.name : "",
      name: habit.name,
      description: habit.description || "",
      startDate: habit.startDate || todayISO,
      type: current.type,
      unit: current.unit || "",
      ranges: (current.ranges || []).map((r) => ({
        id: r.id,
        min: r.min === null || r.min === undefined ? "" : String(r.min),
        max: r.max === null || r.max === undefined ? "" : String(r.max),
        completes: r.completes,
      })),
    });
    setShowAddModal(true);
  }

  function resolveCategoryId(name) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const newCat = { id: nextId("cat"), name: trimmed };
    setCategories((prev) => [...prev, newCat]);
    return newCat.id;
  }

  function addRange() {
    setDraft((d) => ({
      ...d,
      ranges: [...d.ranges, { id: nextId("r"), min: "", max: "", completes: true }],
    }));
  }

  function updateRange(rangeId, patch) {
    setDraft((d) => ({ ...d, ranges: d.ranges.map((r) => (r.id === rangeId ? { ...r, ...patch } : r)) }));
  }

  function removeRange(rangeId) {
    setDraft((d) => ({ ...d, ranges: d.ranges.filter((r) => r.id !== rangeId) }));
  }

  function applyHabitEdit(habitId, topFields, rulesChange) {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        let rules = h.rules;
        if (rulesChange) {
          if (rulesChange.mode === "all") {
            rules = [{ from: RULES_ALWAYS, ...rulesChange.snapshot }];
          } else {
            rules = [...h.rules.filter((r) => r.from !== todayISO), { from: todayISO, ...rulesChange.snapshot }].sort((a, b) =>
              a.from.localeCompare(b.from)
            );
          }
        }
        return { ...h, ...topFields, rules };
      })
    );
  }

  function handleConfirmSave() {
    if (!draft.name.trim() || !draft.categoryName.trim()) return;
    const categoryId = resolveCategoryId(draft.categoryName);
    const cleanRanges =
      draft.type === "number"
        ? draft.ranges
            .filter((r) => r.min !== "" && !Number.isNaN(Number(r.min)))
            .map((r) => ({
              id: r.id,
              min: Number(r.min),
              max: r.max === "" || r.max === null || r.max === undefined ? null : Number(r.max),
              completes: r.completes,
            }))
            .sort((a, b) => a.min - b.min)
        : undefined;
    const rulesSnapshot = { type: draft.type, unit: draft.type === "number" ? draft.unit.trim() : undefined, ranges: cleanRanges };
    const topFields = {
      categoryId,
      name: draft.name.trim(),
      description: draft.description.trim(),
      startDate: draft.startDate || todayISO,
    };

    if (!editingHabitId) {
      const newHabit = { id: nextId("h"), ...topFields, trackStreak: true, rules: [{ from: topFields.startDate, ...rulesSnapshot }] };
      setHabits((prev) => [...prev, newHabit]);
      closeModal();
      return;
    }

    const habit = habits.find((h) => h.id === editingHabitId);
    const current = rulesAt(habit, todayISO);
    const before = JSON.stringify({ type: current.type, unit: current.unit || "", ranges: current.ranges || [] });
    const after = JSON.stringify({ type: rulesSnapshot.type, unit: rulesSnapshot.unit || "", ranges: rulesSnapshot.ranges || [] });

    if (before === after) {
      applyHabitEdit(editingHabitId, topFields, null);
      closeModal();
      return;
    }

    setPendingEdit({ habitId: editingHabitId, topFields, rulesSnapshot });
  }

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

  function rulesAt(habit, dateISO) {
    const list = habit.rules;
    let chosen = list[0];
    for (const r of list) {
      if (r.from <= dateISO) chosen = r;
      else break;
    }
    return chosen;
  }

  function activeRange(rules, value) {
    if (!rules.ranges || rules.ranges.length === 0) return null;
    const sorted = [...rules.ranges].sort((a, b) => a.min - b.min);
    for (const r of sorted) {
      const hasMax = r.max !== null && r.max !== undefined && r.max !== "";
      if (value >= r.min && (!hasMax || value <= r.max)) return r;
    }
    return null;
  }

  function isDone(dateISO, habit) {
    const v = entries[dateISO] && entries[dateISO][habit.id];
    const rules = rulesAt(habit, dateISO);
    if (rules.type === "boolean") return v === true;
    if (typeof v !== "number") return false;
    if (rules.ranges && rules.ranges.length > 0) {
      const r = activeRange(rules, v);
      return !!(r && r.completes);
    }
    return v > 0;
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

  const todayStats = useMemo(() => {
    const applicable = orderedHabits.filter((h) => !h.startDate || h.startDate <= todayISO);
    const total = applicable.length;
    const done = applicable.filter((h) => isDone(todayISO, h)).length;
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

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button onClick={openAddModal} style={primaryBtnStyle}>
              <Plus size={14} /> Agregar hábito
            </button>

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
                      const currentRules = rulesAt(h, todayISO);
                      return (
                        <React.Fragment key={h.id}>
                          <div
                            className="htk-hdr"
                            onContextMenu={(e) => {
                              e.preventDefault();
                              openEditModal(h);
                            }}
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
                              cursor: "context-menu",
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                              <span title={h.description || undefined} style={{ fontSize: 13, fontWeight: 500, color: "#4A473F" }}>{h.name}</span>
                              {currentRules.unit && (
                                <span className="htk-mono" style={{ fontSize: 10, color: "#B7B3A8" }}>
                                  {currentRules.unit}
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                              <button
                                onClick={() => openEditModal(h)}
                                className="htk-x"
                                style={{ border: "none", background: "none", cursor: "pointer", color: "#B7B3A8" }}
                                title="Editar hábito"
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                onClick={() => removeHabit(h.id)}
                                className="htk-x"
                                style={{ border: "none", background: "none", cursor: "pointer", color: "#C9C5B9" }}
                                title="Eliminar hábito"
                              >
                                <X size={11} />
                              </button>
                            </div>
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
                            const isPast = dISO < todayISO;
                            const bg = isToday ? "#FBFAF6" : "#fff";
                            const val = entries[dISO] && entries[dISO][h.id];

                            if (h.startDate && dISO < h.startDate) {
                              return (
                                <div
                                  key={dISO}
                                  title="Todavía no empezaste este hábito"
                                  style={{
                                    background: "repeating-linear-gradient(45deg, #FAFAF8, #FAFAF8 5px, #F1F0EC 5px, #F1F0EC 10px)",
                                    minHeight: 44,
                                  }}
                                />
                              );
                            }

                            const done = isDone(dISO, h);

                            if (currentRules.type === "boolean") {
                              const cellBg = done ? DONE_COLOR : isPast ? MISSED_COLOR : bg;
                              return (
                                <button
                                  key={dISO}
                                  onClick={() => toggleBoolean(dISO, h.id)}
                                  className="htk-cell-btn"
                                  style={{
                                    background: cellBg,
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
                                  {!done && isPast && <X size={13} color="#fff" strokeWidth={3} />}
                                </button>
                              );
                            }

                            const hasValue = typeof val === "number";
                            const showMissed = !done && (hasValue || isPast);
                            const cellColor = done ? DONE_COLOR : showMissed ? MISSED_COLOR : bg;
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
                                    color: done || showMissed ? "#fff" : "#C9C5B9",
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

      {showAddModal && draft && (
        <div
          onClick={closeModal}
          style={{ position: "fixed", inset: 0, background: "rgba(20,20,15,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 460, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(20,20,15,0.25)" }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#232320", margin: "0 0 18px" }}>{editingHabitId ? "Editar hábito" : "Nuevo hábito"}</h2>

            <label style={labelStyle}>Categoría</label>
            <input
              list="htk-category-options"
              value={draft.categoryName}
              onChange={(e) => setDraft((d) => ({ ...d, categoryName: e.target.value }))}
              placeholder="Ej: General"
              style={{ ...inputStyle, width: "100%", marginBottom: 14, boxSizing: "border-box" }}
            />
            <datalist id="htk-category-options">
              {categories.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
            <p style={{ fontSize: 11, color: "#B7B3A8", margin: "-10px 0 14px" }}>
              Si escribís el nombre de una categoría que ya existe, se agrupa ahí. Si no existe, se crea nueva.
            </p>

            <label style={labelStyle}>Nombre</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Ej: Meditar"
              style={{ ...inputStyle, width: "100%", marginBottom: 14, boxSizing: "border-box" }}
            />

            <label style={labelStyle}>Descripción</label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Opcional"
              rows={2}
              style={{ ...inputStyle, width: "100%", marginBottom: 14, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
            />

            <label style={labelStyle}>Fecha de inicio</label>
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
              style={{ ...inputStyle, width: "100%", marginBottom: 14, boxSizing: "border-box" }}
            />

            <label style={labelStyle}>Tipo de hábito</label>
            <select
              value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value, ranges: e.target.value === "number" ? d.ranges : [] }))}
              style={{ ...inputStyle, width: "100%", marginBottom: draft.type === "number" ? 14 : 20, boxSizing: "border-box" }}
            >
              <option value="boolean">Sí / No</option>
              <option value="number">Numérico</option>
            </select>

            {draft.type === "number" && (
              <>
                <label style={labelStyle}>Unidad</label>
                <input
                  value={draft.unit}
                  onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                  placeholder="Ej: pasos, tazas, páginas"
                  style={{ ...inputStyle, width: "100%", marginBottom: 16, boxSizing: "border-box" }}
                />

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ ...labelStyle, marginBottom: 0 }}>Rangos</span>
                  <button onClick={addRange} style={smallBtnStyle}>
                    <Plus size={12} /> Agregar rango
                  </button>
                </div>
                <p style={{ fontSize: 11, color: "#B7B3A8", margin: "0 0 10px", lineHeight: 1.4 }}>
                  Definí desde y hasta qué cantidad aplica cada rango (dejá "hasta" vacío si no tiene techo) y marcá cuáles cuentan como "cumplido". Los que cumplen se ven en verde; el resto, en rojo si ya no hay tiempo de corregirlo.
                </p>

                {draft.ranges.length === 0 && (
                  <p style={{ fontSize: 12, color: "#C9C5B9", marginBottom: 16 }}>Todavía no agregaste ningún rango.</p>
                )}

                {draft.ranges.map((r) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, background: "#FAFAF8", border: "1px solid #EEEDE7", borderRadius: 10, padding: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "#9A968C", whiteSpace: "nowrap" }}>Desde</span>
                    <input
                      type="number"
                      value={r.min}
                      onChange={(e) => updateRange(r.id, { min: e.target.value })}
                      style={{ ...inputStyle, width: 62, padding: "6px 8px" }}
                    />
                    <span style={{ fontSize: 11, color: "#9A968C", whiteSpace: "nowrap" }}>hasta</span>
                    <input
                      type="number"
                      value={r.max}
                      onChange={(e) => updateRange(r.id, { max: e.target.value })}
                      placeholder="sin límite"
                      style={{ ...inputStyle, width: 78, padding: "6px 8px" }}
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#4A473F", whiteSpace: "nowrap" }}>
                      <input type="checkbox" checked={r.completes} onChange={(e) => updateRange(r.id, { completes: e.target.checked })} />
                      Cumple
                    </label>
                    <button
                      onClick={() => removeRange(r.id)}
                      style={{ border: "none", background: "none", cursor: "pointer", color: "#C9C5B9", marginLeft: "auto" }}
                      title="Quitar rango"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button onClick={closeModal} style={secondaryBtnStyle}>Cancelar</button>
              <button
                onClick={handleConfirmSave}
                disabled={!draft.name.trim()}
                style={{ ...primaryBtnStyle, opacity: draft.name.trim() ? 1 : 0.5, cursor: draft.name.trim() ? "pointer" : "not-allowed" }}
              >
                {editingHabitId ? "Guardar cambios" : "Crear hábito"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingEdit && (
        <div
          onClick={() => setPendingEdit(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(20,20,15,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(20,20,15,0.25)" }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#232320", margin: "0 0 10px" }}>Cambiaste cómo se cumple este hábito</h3>
            <p style={{ fontSize: 13, color: "#6B675E", margin: "0 0 20px", lineHeight: 1.5 }}>
              ¿Los nuevos valores rigen para todo el historial de este hábito, o solo desde hoy en adelante? Los días ya cargados se van a re-evaluar según lo que elijas.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => {
                  applyHabitEdit(pendingEdit.habitId, pendingEdit.topFields, { mode: "all", snapshot: pendingEdit.rulesSnapshot });
                  setPendingEdit(null);
                  closeModal();
                }}
                style={primaryBtnStyle}
              >
                Aplicar a todo el historial
              </button>
              <button
                onClick={() => {
                  applyHabitEdit(pendingEdit.habitId, pendingEdit.topFields, { mode: "fromToday", snapshot: pendingEdit.rulesSnapshot });
                  setPendingEdit(null);
                  closeModal();
                }}
                style={secondaryBtnStyle}
              >
                Solo desde hoy en adelante
              </button>
              <button onClick={() => setPendingEdit(null)} style={{ ...secondaryBtnStyle, background: "none" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  fontFamily: "inherit",
  fontSize: 13,
  padding: "8px 10px",
  border: "1px solid #E3E1DA",
  borderRadius: 9,
  outline: "none",
  color: "#232320",
};
const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#9A968C",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 6,
};
const primaryBtnStyle = {
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  color: "#fff",
  background: "#232320",
  border: "none",
  borderRadius: 9,
  padding: "8px 14px",
  cursor: "pointer",
};
const secondaryBtnStyle = {
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  color: "#6B675E",
  background: "#F2F1ED",
  border: "none",
  borderRadius: 9,
  padding: "8px 14px",
  cursor: "pointer",
};
const smallBtnStyle = {
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  fontWeight: 600,
  color: "#232320",
  background: "none",
  border: "1px solid #E3E1DA",
  borderRadius: 8,
  padding: "4px 8px",
  cursor: "pointer",
};