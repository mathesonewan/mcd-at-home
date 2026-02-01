const test = require("node:test");
const assert = require("node:assert/strict");

const { mergeShoppingItems } = require("../lib/shopping-utils");

test("mergeShoppingItems merges by name + unit and sums quantities", () => {
  const rows = [
    { name: "Tomato", unit: "g", category: "veg", quantity: 100 },
    { name: "Tomato", unit: "g", category: "veg", quantity: 50 },
  ];
  const items = mergeShoppingItems(rows);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0], {
    name: "Tomato",
    unit: "g",
    quantity: 150,
    category: "veg",
  });
});

test("mergeShoppingItems keeps separate units", () => {
  const rows = [
    { name: "Milk", unit: "ml", category: "dairy", quantity: 200 },
    { name: "Milk", unit: "g", category: "dairy", quantity: 200 },
  ];
  const items = mergeShoppingItems(rows);
  assert.equal(items.length, 2);
});

test("mergeShoppingItems sets quantity to null if any unknown", () => {
  const rows = [
    { name: "Onion", unit: null, category: "veg", quantity: null },
    { name: "Onion", unit: null, category: "veg", quantity: 2 },
  ];
  const items = mergeShoppingItems(rows);
  assert.equal(items[0].quantity, null);
});

test("mergeShoppingItems nulls category when multiple categories appear", () => {
  const rows = [
    { name: "Beans", unit: "g", category: "pantry", quantity: 100 },
    { name: "Beans", unit: "g", category: "veg", quantity: 100 },
  ];
  const items = mergeShoppingItems(rows);
  assert.equal(items[0].category, null);
});
