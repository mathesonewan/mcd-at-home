const test = require("node:test");
const assert = require("node:assert/strict");

const { buildWeekResponseFromRows } = require("../lib/week-utils");

test("buildWeekResponseFromRows maps lunch and dinner per day", () => {
  const rows = [
    { day_index: 0, meal_type: "lunch", meal_id: 1 },
    { day_index: 0, meal_type: "dinner", meal_id: 2 },
    { day_index: 2, meal_type: "dinner", meal_id: 5 },
  ];
  const result = buildWeekResponseFromRows("2026-02-02", rows);
  assert.equal(result.week_start, "2026-02-02");
  assert.equal(result.days.length, 7);
  assert.equal(result.days[0].lunch_meal_id, 1);
  assert.equal(result.days[0].dinner_meal_id, 2);
  assert.equal(result.days[1].lunch_meal_id, null);
  assert.equal(result.days[1].dinner_meal_id, null);
  assert.equal(result.days[2].lunch_meal_id, null);
  assert.equal(result.days[2].dinner_meal_id, 5);
});

test("buildWeekResponseFromRows ignores unknown meal_type entries", () => {
  const rows = [{ day_index: 1, meal_type: "brunch", meal_id: 9 }];
  const result = buildWeekResponseFromRows("2026-02-02", rows);
  assert.equal(result.days[1].lunch_meal_id, null);
  assert.equal(result.days[1].dinner_meal_id, null);
});
