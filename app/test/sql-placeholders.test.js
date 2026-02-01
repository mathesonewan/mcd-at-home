const test = require("node:test");
const assert = require("node:assert/strict");

const { mealInsertSql } = require("../lib/sql-strings");

function countPlaceholders(sql) {
  return (sql.match(/\?/g) || []).length;
}

function countColumns(sql) {
  const start = sql.indexOf("(");
  const end = sql.indexOf(")");
  if (start === -1 || end === -1) return 0;
  const inside = sql.slice(start + 1, end);
  return inside
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean).length;
}

function countValues(sql) {
  const valuesIndex = sql.toUpperCase().indexOf("VALUES");
  if (valuesIndex === -1) return 0;
  const start = sql.indexOf("(", valuesIndex);
  const end = sql.indexOf(")", start);
  const inside = sql.slice(start + 1, end);
  return inside
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean).length;
}

test("meal insert SQL has matching column and value counts", () => {
  const columns = countColumns(mealInsertSql);
  const values = countValues(mealInsertSql);
  assert.equal(values, columns, "values count should match columns");
});

test("meal insert SQL placeholders count matches explicit placeholders", () => {
  const columns = countColumns(mealInsertSql);
  const placeholders = countPlaceholders(mealInsertSql);
  assert.equal(placeholders, columns - 1);
});
