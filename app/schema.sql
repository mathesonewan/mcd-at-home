PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'dinner',
  tags TEXT,
  method_steps TEXT,
  nutrition_unknown INTEGER NOT NULL DEFAULT 0,
  nutrition_kcal REAL,
  nutrition_protein_g REAL,
  nutrition_carbs_g REAL,
  nutrition_fat_g REAL,
  nutrition_fibre_g REAL,
  nutrition_source TEXT,
  leftover_followup_meal_id INTEGER,
  leftover_followup_offset_days INTEGER NOT NULL DEFAULT 1,
  leftover_followup_required INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (leftover_followup_meal_id) REFERENCES meals(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS meal_ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  category TEXT,
  FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meal_ingredients_meal_id ON meal_ingredients(meal_id);

CREATE TABLE IF NOT EXISTS week_meals (
  week_start TEXT NOT NULL,
  day_index INTEGER NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'dinner',
  meal_id INTEGER,
  PRIMARY KEY (week_start, day_index, meal_type),
  FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE SET NULL
);
