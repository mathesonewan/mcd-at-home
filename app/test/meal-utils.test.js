const test = require("node:test");
const assert = require("node:assert/strict");

const {
  safeJsonParse,
  normalizeIngredient,
  parseMealPayload,
} = require("../lib/meal-utils");

test("safeJsonParse returns parsed value or fallback", () => {
  assert.deepEqual(safeJsonParse("[1,2]", []), [1, 2]);
  assert.deepEqual(safeJsonParse("", [1]), [1]);
  assert.deepEqual(safeJsonParse("not-json", { ok: true }), { ok: true });
});

test("normalizeIngredient trims strings and coerces quantities", () => {
  const normalized = normalizeIngredient({
    name: "  Flour ",
    quantity: "2",
    unit: " g ",
    category: " pantry ",
  });
  assert.deepEqual(normalized, {
    name: "Flour",
    quantity: 2,
    unit: "g",
    category: "pantry",
  });
});

test("parseMealPayload sets defaults and normalizes meal type", () => {
  const payload = parseMealPayload({ name: "  Salad  " });
  assert.equal(payload.name, "Salad");
  assert.equal(payload.meal_type, "dinner");
  assert.deepEqual(payload.tags, []);
  assert.deepEqual(payload.method_steps, []);
});

test("parseMealPayload supports nutrition aliases", () => {
  const payload = parseMealPayload({
    name: "Pancakes",
    meal_type: "lunch",
    nutrition: {
      calories: 256,
      protein_g: 7,
      carbohydrates_g: 35,
      fat_g: 9.5,
      fiber_g: 1.5,
      nutrition_source: "recipe",
    },
  });
  assert.deepEqual(payload.nutrition, {
    kcal: 256,
    protein_g: 7,
    carbs_g: 35,
    fat_g: 9.5,
    fibre_g: 1.5,
    source: "recipe",
  });
});

test("parseMealPayload uses top-level nutrition_source when present", () => {
  const payload = parseMealPayload({
    name: "Toast",
    nutrition_source: "label",
  });
  assert.equal(payload.nutrition.source, "label");
});

test("parseMealPayload normalizes non-lunch meal_type to dinner", () => {
  const payload = parseMealPayload({ name: "Soup", meal_type: "brunch" });
  assert.equal(payload.meal_type, "dinner");
});

test("parseMealPayload handles missing arrays and booleans safely", () => {
  const payload = parseMealPayload({
    name: "Taco",
    tags: "not-an-array",
    method_steps: null,
    nutrition_unknown: "yes",
  });
  assert.deepEqual(payload.tags, []);
  assert.deepEqual(payload.method_steps, []);
  assert.equal(payload.nutrition_unknown, true);
});

test("parseMealPayload defaults followup offset to 1", () => {
  const payload = parseMealPayload({ name: "Roast" });
  assert.equal(payload.leftover_followup_offset_days, 1);
});

test("normalizeIngredient handles nulls", () => {
  const normalized = normalizeIngredient({
    name: "  Banana ",
    quantity: null,
    unit: null,
    category: null,
  });
  assert.deepEqual(normalized, {
    name: "Banana",
    quantity: null,
    unit: null,
    category: null,
  });
});
