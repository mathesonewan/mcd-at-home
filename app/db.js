const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const defaultDbPath = path.resolve(__dirname, "..", "data", "meals.db");
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : defaultDbPath;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const schemaPath = path.resolve(__dirname, "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");
db.exec(schemaSql);

function columnExists(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

function migrateMealType() {
  if (!columnExists("meals", "meal_type")) {
    db.exec("ALTER TABLE meals ADD COLUMN meal_type TEXT NOT NULL DEFAULT 'dinner';");
  }
  db.exec(
    "UPDATE meals SET meal_type = 'dinner' WHERE meal_type IS NULL OR meal_type = ''"
  );
}

function migrateWeekMeals() {
  if (columnExists("week_meals", "meal_type")) {
    return;
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS week_meals_new (
      week_start TEXT NOT NULL,
      day_index INTEGER NOT NULL,
      meal_type TEXT NOT NULL DEFAULT 'dinner',
      meal_id INTEGER,
      PRIMARY KEY (week_start, day_index, meal_type),
      FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE SET NULL
    );
    INSERT INTO week_meals_new (week_start, day_index, meal_type, meal_id)
    SELECT week_start, day_index, 'dinner', meal_id FROM week_meals;
    DROP TABLE week_meals;
    ALTER TABLE week_meals_new RENAME TO week_meals;
  `);
}

migrateMealType();
migrateWeekMeals();

module.exports = {
  db,
  dbPath,
};
