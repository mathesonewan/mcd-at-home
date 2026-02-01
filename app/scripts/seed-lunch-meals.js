const { db } = require("../db");

const meals = [
  {
    name: "Chicken Caesar Wrap",
    meal_type: "lunch",
    tags: ["wrap", "quick"],
    method_steps: ["Warm the wrap.", "Toss chicken with Caesar dressing.", "Add lettuce and parmesan.", "Roll tight and slice."],
    nutrition_unknown: true,
    ingredients: [
      { name: "Cooked chicken", quantity: 150, unit: "g", category: "meat" },
      { name: "Wraps", quantity: 1, unit: null, category: "pantry" },
      { name: "Romaine lettuce", quantity: 80, unit: "g", category: "veg" },
      { name: "Parmesan", quantity: 15, unit: "g", category: "dairy" },
      { name: "Caesar dressing", quantity: 25, unit: "g", category: "pantry" },
    ],
  },
  {
    name: "Tuna Salad Sandwich",
    meal_type: "lunch",
    tags: ["sandwich"],
    method_steps: ["Mix tuna with mayo and lemon.", "Season with salt and pepper.", "Spread on bread with lettuce."],
    nutrition_unknown: true,
    ingredients: [
      { name: "Tuna", quantity: 1, unit: "can", category: "pantry" },
      { name: "Mayonnaise", quantity: 20, unit: "g", category: "pantry" },
      { name: "Lemon juice", quantity: 5, unit: "g", category: "pantry" },
      { name: "Bread", quantity: 2, unit: "slices", category: "pantry" },
      { name: "Lettuce", quantity: 30, unit: "g", category: "veg" },
    ],
  },
  {
    name: "Halloumi Pita",
    meal_type: "lunch",
    tags: ["vegetarian", "quick"],
    method_steps: ["Fry halloumi until golden.", "Warm pita.", "Fill with salad and sauce."],
    nutrition_unknown: true,
    ingredients: [
      { name: "Halloumi", quantity: 120, unit: "g", category: "dairy" },
      { name: "Pita bread", quantity: 1, unit: null, category: "pantry" },
      { name: "Cucumber", quantity: 60, unit: "g", category: "veg" },
      { name: "Tomato", quantity: 80, unit: "g", category: "veg" },
      { name: "Yogurt sauce", quantity: 30, unit: "g", category: "dairy" },
    ],
  },
  {
    name: "Veggie Burrito Bowl",
    meal_type: "lunch",
    tags: ["vegetarian", "batch"],
    method_steps: ["Warm rice and beans.", "Top with corn, salsa, and avocado.", "Add lime and coriander."],
    nutrition_unknown: true,
    ingredients: [
      { name: "Cooked rice", quantity: 180, unit: "g", category: "pantry" },
      { name: "Black beans", quantity: 120, unit: "g", category: "pantry" },
      { name: "Corn", quantity: 80, unit: "g", category: "pantry" },
      { name: "Salsa", quantity: 60, unit: "g", category: "pantry" },
      { name: "Avocado", quantity: 0.5, unit: null, category: "veg" },
    ],
  },
  {
    name: "Caprese Toast",
    meal_type: "lunch",
    tags: ["vegetarian", "quick"],
    method_steps: ["Toast bread.", "Layer tomato and mozzarella.", "Finish with basil and balsamic."],
    nutrition_unknown: true,
    ingredients: [
      { name: "Bread", quantity: 2, unit: "slices", category: "pantry" },
      { name: "Tomato", quantity: 120, unit: "g", category: "veg" },
      { name: "Mozzarella", quantity: 80, unit: "g", category: "dairy" },
      { name: "Basil", quantity: 5, unit: "g", category: "veg" },
      { name: "Balsamic glaze", quantity: 10, unit: "g", category: "pantry" },
    ],
  },
  {
    name: "Egg Fried Rice",
    meal_type: "lunch",
    tags: ["quick"],
    method_steps: ["Scramble eggs in a hot pan.", "Add rice and veg.", "Season with soy sauce."],
    nutrition_unknown: true,
    ingredients: [
      { name: "Cooked rice", quantity: 200, unit: "g", category: "pantry" },
      { name: "Eggs", quantity: 2, unit: null, category: "dairy" },
      { name: "Mixed veg", quantity: 120, unit: "g", category: "veg" },
      { name: "Soy sauce", quantity: 15, unit: "g", category: "pantry" },
      { name: "Spring onion", quantity: 20, unit: "g", category: "veg" },
    ],
  },
  {
    name: "Pesto Pasta Salad",
    meal_type: "lunch",
    tags: ["vegetarian", "batch"],
    method_steps: ["Cook pasta and cool.", "Mix with pesto, tomatoes, and spinach.", "Season to taste."],
    nutrition_unknown: true,
    ingredients: [
      { name: "Pasta", quantity: 160, unit: "g", category: "pantry" },
      { name: "Pesto", quantity: 40, unit: "g", category: "pantry" },
      { name: "Cherry tomatoes", quantity: 120, unit: "g", category: "veg" },
      { name: "Spinach", quantity: 60, unit: "g", category: "veg" },
      { name: "Parmesan", quantity: 15, unit: "g", category: "dairy" },
    ],
  },
  {
    name: "Chicken Noodle Soup",
    meal_type: "lunch",
    tags: ["soup"],
    method_steps: ["Simmer stock with chicken and veg.", "Add noodles and cook through.", "Season and serve."],
    nutrition_unknown: true,
    ingredients: [
      { name: "Chicken", quantity: 150, unit: "g", category: "meat" },
      { name: "Chicken stock", quantity: 400, unit: "ml", category: "pantry" },
      { name: "Carrot", quantity: 80, unit: "g", category: "veg" },
      { name: "Celery", quantity: 40, unit: "g", category: "veg" },
      { name: "Egg noodles", quantity: 80, unit: "g", category: "pantry" },
    ],
  },
  {
    name: "Falafel Salad Bowl",
    meal_type: "lunch",
    tags: ["vegetarian"],
    method_steps: ["Warm falafel.", "Build salad base.", "Top with falafel and dressing."],
    nutrition_unknown: true,
    ingredients: [
      { name: "Falafel", quantity: 5, unit: null, category: "pantry" },
      { name: "Mixed salad leaves", quantity: 80, unit: "g", category: "veg" },
      { name: "Cucumber", quantity: 60, unit: "g", category: "veg" },
      { name: "Tomato", quantity: 80, unit: "g", category: "veg" },
      { name: "Tahini dressing", quantity: 30, unit: "g", category: "pantry" },
    ],
  },
  {
    name: "Ham & Cheese Melt",
    meal_type: "lunch",
    tags: ["sandwich"],
    method_steps: ["Assemble sandwich.", "Toast until cheese melts.", "Serve with salad."],
    nutrition_unknown: true,
    ingredients: [
      { name: "Bread", quantity: 2, unit: "slices", category: "pantry" },
      { name: "Ham", quantity: 60, unit: "g", category: "meat" },
      { name: "Cheddar", quantity: 40, unit: "g", category: "dairy" },
      { name: "Butter", quantity: 10, unit: "g", category: "dairy" },
    ],
  },
  {
    name: "Greek Chicken Salad",
    meal_type: "lunch",
    tags: ["salad"],
    method_steps: ["Chop veg.", "Top with chicken and feta.", "Dress with olive oil and lemon."],
    nutrition_unknown: true,
    ingredients: [
      { name: "Cooked chicken", quantity: 140, unit: "g", category: "meat" },
      { name: "Cucumber", quantity: 80, unit: "g", category: "veg" },
      { name: "Tomato", quantity: 100, unit: "g", category: "veg" },
      { name: "Feta", quantity: 40, unit: "g", category: "dairy" },
      { name: "Olives", quantity: 30, unit: "g", category: "pantry" },
    ],
  },
  {
    name: "Avocado Egg Bagel",
    meal_type: "lunch",
    tags: ["quick"],
    method_steps: ["Toast bagel.", "Layer avocado and egg.", "Season and serve."],
    nutrition_unknown: true,
    ingredients: [
      { name: "Bagel", quantity: 1, unit: null, category: "pantry" },
      { name: "Eggs", quantity: 1, unit: null, category: "dairy" },
      { name: "Avocado", quantity: 0.5, unit: null, category: "veg" },
      { name: "Lemon juice", quantity: 5, unit: "g", category: "pantry" },
    ],
  },
];

const selectMeal = db.prepare(
  "SELECT id FROM meals WHERE name = ? AND meal_type = ?"
);
const insertMeal = db.prepare(
  `INSERT INTO meals (
    name,
    meal_type,
    tags,
    method_steps,
    nutrition_unknown,
    nutrition_kcal,
    nutrition_protein_g,
    nutrition_carbs_g,
    nutrition_fat_g,
    nutrition_fibre_g,
    nutrition_source,
    updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
);
const insertIngredient = db.prepare(
  `INSERT INTO meal_ingredients (
    meal_id,
    name,
    quantity,
    unit,
    category
  ) VALUES (?, ?, ?, ?, ?)`
);

const seed = db.transaction(() => {
  let created = 0;
  let skipped = 0;

  for (const meal of meals) {
    const existing = selectMeal.get(meal.name, meal.meal_type);
    if (existing) {
      skipped += 1;
      continue;
    }

    const info = insertMeal.run(
      meal.name,
      meal.meal_type,
      JSON.stringify(meal.tags || []),
      JSON.stringify(meal.method_steps || []),
      meal.nutrition_unknown ? 1 : 0,
      meal.nutrition?.kcal ?? null,
      meal.nutrition?.protein_g ?? null,
      meal.nutrition?.carbs_g ?? null,
      meal.nutrition?.fat_g ?? null,
      meal.nutrition?.fibre_g ?? null,
      meal.nutrition?.source ?? null
    );

    const mealId = info.lastInsertRowid;
    for (const ingredient of meal.ingredients || []) {
      if (!ingredient.name) continue;
      insertIngredient.run(
        mealId,
        ingredient.name,
        ingredient.quantity ?? null,
        ingredient.unit ?? null,
        ingredient.category ?? null
      );
    }

    created += 1;
  }

  return { created, skipped };
});

const result = seed();
console.log(
  `Lunch meals seed complete. Added ${result.created}, skipped ${result.skipped}.`
);
