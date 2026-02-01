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

module.exports = {
  db,
  dbPath,
};
