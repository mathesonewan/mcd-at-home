const test = require("node:test");
const assert = require("node:assert/strict");

const { evaluateFollowup } = require("../shared/followup-utils");

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function buildWeek() {
  return Array.from({ length: 7 }, (_, index) => ({
    day_index: index,
    lunch_meal_id: null,
    dinner_meal_id: null,
  }));
}

test("evaluateFollowup returns none when no followup", () => {
  const result = evaluateFollowup({
    meal: { id: 1 },
    meals: [],
    mealType: "dinner",
    dayIndex: 0,
    weekDays: buildWeek(),
    dayNames,
  });
  assert.equal(result.type, "none");
});

test("evaluateFollowup returns out_of_range when target is outside week", () => {
  const result = evaluateFollowup({
    meal: { id: 1, leftover_followup_meal_id: 2, leftover_followup_offset_days: 10 },
    meals: [],
    mealType: "dinner",
    dayIndex: 0,
    weekDays: buildWeek(),
    dayNames,
  });
  assert.equal(result.type, "out_of_range");
});

test("evaluateFollowup returns type_mismatch for different meal types", () => {
  const meals = [
    { id: 2, name: "Soup", meal_type: "lunch" },
  ];
  const result = evaluateFollowup({
    meal: { id: 1, name: "Roast", leftover_followup_meal_id: 2, leftover_followup_offset_days: 1 },
    meals,
    mealType: "dinner",
    dayIndex: 1,
    weekDays: buildWeek(),
    dayNames,
  });
  assert.equal(result.type, "type_mismatch");
});

test("evaluateFollowup returns autofill when target slot is empty", () => {
  const meals = [{ id: 2, name: "Soup", meal_type: "dinner" }];
  const result = evaluateFollowup({
    meal: { id: 1, name: "Roast", leftover_followup_meal_id: 2, leftover_followup_offset_days: 1 },
    meals,
    mealType: "dinner",
    dayIndex: 1,
    weekDays: buildWeek(),
    dayNames,
  });
  assert.equal(result.type, "autofill");
  assert.equal(result.targetIndex, 2);
});

test("evaluateFollowup returns conflict when target slot has different meal", () => {
  const weekDays = buildWeek();
  weekDays[2].dinner_meal_id = 5;
  const meals = [{ id: 2, name: "Soup", meal_type: "dinner" }];
  const result = evaluateFollowup({
    meal: { id: 1, name: "Roast", leftover_followup_meal_id: 2, leftover_followup_offset_days: 1 },
    meals,
    mealType: "dinner",
    dayIndex: 1,
    weekDays,
    dayNames,
  });
  assert.equal(result.type, "conflict");
});
