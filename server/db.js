import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, "habits.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    start_date TEXT NOT NULL,
    track_streak INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS habit_rules (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL,
    from_date TEXT NOT NULL,
    type TEXT NOT NULL,
    unit TEXT
  );

  CREATE TABLE IF NOT EXISTS habit_ranges (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL,
    min REAL NOT NULL,
    max REAL,
    completes INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entries (
    date TEXT NOT NULL,
    habit_id TEXT NOT NULL,
    value REAL NOT NULL,
    PRIMARY KEY (date, habit_id)
  );
`);

export default db;
