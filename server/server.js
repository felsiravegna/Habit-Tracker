import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import db from "./db.js";

const app = express();
app.use(cors()); // permite que el frontend (otro puerto/origen) le hable a esta API
app.use(express.json());

// ---------- helpers ----------

// Guarda una "versión de reglas" (tipo/unidad/rangos) para un hábito, vigente desde `fromDate`.
function insertRules(habitId, snapshot, fromDate) {
  const ruleId = "rule_" + randomUUID();
  db.prepare("INSERT INTO habit_rules (id, habit_id, from_date, type, unit) VALUES (?, ?, ?, ?, ?)").run(
    ruleId,
    habitId,
    fromDate,
    snapshot.type,
    snapshot.unit || null
  );
  if (snapshot.ranges) {
    for (const rg of snapshot.ranges) {
      db.prepare("INSERT INTO habit_ranges (id, rule_id, min, max, completes) VALUES (?, ?, ?, ?, ?)").run(
        "range_" + randomUUID(),
        ruleId,
        rg.min,
        rg.max === undefined || rg.max === null ? null : rg.max,
        rg.completes ? 1 : 0
      );
    }
  }
  return ruleId;
}

// Borra un hábito y todo lo que depende de él (reglas, rangos, entradas cargadas).
function deleteHabitCascade(habitId) {
  const ruleIds = db.prepare("SELECT id FROM habit_rules WHERE habit_id = ?").all(habitId).map((r) => r.id);
  for (const rid of ruleIds) {
    db.prepare("DELETE FROM habit_ranges WHERE rule_id = ?").run(rid);
  }
  db.prepare("DELETE FROM habit_rules WHERE habit_id = ?").run(habitId);
  db.prepare("DELETE FROM entries WHERE habit_id = ?").run(habitId);
  db.prepare("DELETE FROM habits WHERE id = ?").run(habitId);
}

// Arma el mismo "shape" de datos que ya usa el frontend: categorías, hábitos
// (con su historial de reglas anidado) y entradas como { fecha: { habitId: valor } }.
function getFullState() {
  const categories = db.prepare("SELECT id, name FROM categories ORDER BY rowid").all();
  const habitRows = db.prepare("SELECT * FROM habits ORDER BY rowid").all();
  const ruleRows = db.prepare("SELECT * FROM habit_rules ORDER BY from_date ASC").all();
  const rangeRows = db.prepare("SELECT * FROM habit_ranges").all();

  const rangesByRule = {};
  for (const r of rangeRows) {
    (rangesByRule[r.rule_id] ||= []).push({ id: r.id, min: r.min, max: r.max, completes: !!r.completes });
  }
  const rulesByHabit = {};
  for (const r of ruleRows) {
    (rulesByHabit[r.habit_id] ||= []).push({
      from: r.from_date,
      type: r.type,
      unit: r.unit || undefined,
      ranges: rangesByRule[r.id] || [],
    });
  }

  const habits = habitRows.map((h) => ({
    id: h.id,
    categoryId: h.category_id,
    name: h.name,
    description: h.description || "",
    startDate: h.start_date,
    trackStreak: !!h.track_streak,
    rules: rulesByHabit[h.id] || [],
  }));

  const entryRows = db.prepare("SELECT * FROM entries").all();
  const entries = {};
  for (const e of entryRows) {
    (entries[e.date] ||= {})[e.habit_id] = e.value;
  }

  return { categories, habits, entries };
}

function getHabit(id) {
  return getFullState().habits.find((h) => h.id === id);
}

// ---------- rutas ----------

// El frontend pide esto una vez al arrancar y arma toda la tabla con la respuesta.
app.get("/api/state", (req, res) => {
  res.json(getFullState());
});

// Busca una categoría por nombre (sin importar mayúsculas); si no existe, la crea.
app.post("/api/categories", (req, res) => {
  const name = (req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "name required" });
  const existing = db.prepare("SELECT * FROM categories WHERE lower(name) = lower(?)").get(name);
  if (existing) return res.json(existing);
  const id = "cat_" + randomUUID();
  db.prepare("INSERT INTO categories (id, name) VALUES (?, ?)").run(id, name);
  res.json({ id, name });
});

app.delete("/api/categories/:id", (req, res) => {
  const id = req.params.id;
  const habitIds = db.prepare("SELECT id FROM habits WHERE category_id = ?").all(id).map((r) => r.id);
  for (const hid of habitIds) deleteHabitCascade(hid);
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.post("/api/habits", (req, res) => {
  const { categoryId, name, description, startDate, rules } = req.body;
  if (!categoryId || !name || !name.trim() || !startDate || !rules) {
    return res.status(400).json({ error: "categoryId, name, startDate and rules are required" });
  }
  const id = "h_" + randomUUID();
  db.prepare(
    "INSERT INTO habits (id, category_id, name, description, start_date, track_streak) VALUES (?, ?, ?, ?, ?, 1)"
  ).run(id, categoryId, name.trim(), description || "", startDate);
  insertRules(id, rules, startDate);
  res.json(getHabit(id));
});

// Actualiza solo los campos "cosméticos" (no afectan si un día cuenta como cumplido o no).
app.put("/api/habits/:id", (req, res) => {
  const id = req.params.id;
  const { categoryId, name, description, startDate } = req.body;
  db.prepare("UPDATE habits SET category_id = ?, name = ?, description = ?, start_date = ? WHERE id = ?").run(
    categoryId,
    (name || "").trim(),
    description || "",
    startDate,
    id
  );
  res.json(getHabit(id));
});

// Cambia tipo/unidad/rangos. mode "all" reescribe todo el historial con la regla nueva;
// mode "fromToday" deja el historial viejo intacto y agrega una versión nueva desde `from`.
app.put("/api/habits/:id/rules", (req, res) => {
  const id = req.params.id;
  const { mode, from, snapshot } = req.body;
  if (mode === "all") {
    const ruleIds = db.prepare("SELECT id FROM habit_rules WHERE habit_id = ?").all(id).map((r) => r.id);
    for (const rid of ruleIds) db.prepare("DELETE FROM habit_ranges WHERE rule_id = ?").run(rid);
    db.prepare("DELETE FROM habit_rules WHERE habit_id = ?").run(id);
    const habit = db.prepare("SELECT start_date FROM habits WHERE id = ?").get(id);
    insertRules(id, snapshot, habit.start_date);
  } else {
    // si ya se había editado hoy, reemplaza esa versión en vez de duplicarla
    const dup = db.prepare("SELECT id FROM habit_rules WHERE habit_id = ? AND from_date = ?").get(id, from);
    if (dup) {
      db.prepare("DELETE FROM habit_ranges WHERE rule_id = ?").run(dup.id);
      db.prepare("DELETE FROM habit_rules WHERE id = ?").run(dup.id);
    }
    insertRules(id, snapshot, from);
  }
  res.json(getHabit(id));
});

app.delete("/api/habits/:id", (req, res) => {
  deleteHabitCascade(req.params.id);
  res.json({ ok: true });
});

// Cargar/actualizar el valor de un hábito en una fecha (upsert).
app.put("/api/entries/:date/:habitId", (req, res) => {
  const { date, habitId } = req.params;
  const { value } = req.body;
  db.prepare(
    "INSERT INTO entries (date, habit_id, value) VALUES (?, ?, ?) ON CONFLICT(date, habit_id) DO UPDATE SET value = excluded.value"
  ).run(date, habitId, value);
  res.json({ ok: true });
});

// Borrar el valor cargado (volver la celda a "sin registrar").
app.delete("/api/entries/:date/:habitId", (req, res) => {
  const { date, habitId } = req.params;
  db.prepare("DELETE FROM entries WHERE date = ? AND habit_id = ?").run(date, habitId);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4000;
// "0.0.0.0" (no "localhost") para que también se pueda acceder desde el celular en la misma red wifi.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor de hábitos escuchando en el puerto ${PORT}`);
});
