const path = require("path");
const express = require("express");
const { db, dbPath } = require("./db");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/shared", express.static(path.join(__dirname, "shared")));

const {
  safeJsonParse,
  normalizeIngredient,
  parseMealPayload,
} = require("./lib/meal-utils");
const { buildWeekResponseFromRows } = require("./lib/week-utils");
const { mergeShoppingItems } = require("./lib/shopping-utils");

const { mealInsertSql } = require("./lib/sql-strings");

const selectMealById = db.prepare("SELECT * FROM meals WHERE id = ?");
const selectAllMeals = db.prepare("SELECT * FROM meals ORDER BY name ASC");
const selectIngredientsByMealId = db.prepare(
  "SELECT id, name, quantity, unit, category FROM meal_ingredients WHERE meal_id = ? ORDER BY id ASC"
);

function normalizeMealRow(row, ingredients) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    meal_type: row.meal_type ?? "dinner",
    tags: safeJsonParse(row.tags, []),
    method_steps: safeJsonParse(row.method_steps, []),
    nutrition_unknown: Boolean(row.nutrition_unknown),
    nutrition: {
      kcal: row.nutrition_kcal ?? null,
      protein_g: row.nutrition_protein_g ?? null,
      carbs_g: row.nutrition_carbs_g ?? null,
      fat_g: row.nutrition_fat_g ?? null,
      fibre_g: row.nutrition_fibre_g ?? null,
      source: row.nutrition_source ?? null,
    },
    leftover_followup_meal_id: row.leftover_followup_meal_id ?? null,
    leftover_followup_offset_days: row.leftover_followup_offset_days,
    leftover_followup_required: Boolean(row.leftover_followup_required),
    ingredients,
  };
}

function fetchMeal(id) {
  const meal = selectMealById.get(id);
  if (!meal) return null;
  const ingredients = selectIngredientsByMealId.all(id);
  return normalizeMealRow(meal, ingredients);
}


app.get("/api/meals", (req, res) => {
  const meals = selectAllMeals.all().map((row) => {
    const ingredients = selectIngredientsByMealId.all(row.id);
    return normalizeMealRow(row, ingredients);
  });
  res.json(meals);
});

app.get("/api/meals/:id", (req, res) => {
  const id = Number(req.params.id);
  const meal = fetchMeal(id);
  if (!meal) {
    return res.status(404).json({ error: "Meal not found" });
  }
  res.json(meal);
});

app.post("/api/meals", (req, res) => {
  const payload = parseMealPayload(req.body ?? {});
  if (!payload.name) {
    return res.status(400).json({ error: "Meal name is required" });
  }

  const insertMeal = db.prepare(mealInsertSql);
  const insertIngredient = db.prepare(
    `INSERT INTO meal_ingredients (
      meal_id,
      name,
      quantity,
      unit,
      category
    ) VALUES (?, ?, ?, ?, ?)`
  );

  const createMeal = db.transaction(() => {
    const info = insertMeal.run(
      payload.name,
      payload.meal_type,
      JSON.stringify(payload.tags),
      JSON.stringify(payload.method_steps),
      payload.nutrition_unknown ? 1 : 0,
      payload.nutrition.kcal ?? null,
      payload.nutrition.protein_g ?? null,
      payload.nutrition.carbs_g ?? null,
      payload.nutrition.fat_g ?? null,
      payload.nutrition.fibre_g ?? null,
      payload.nutrition.source ?? null,
      payload.leftover_followup_meal_id,
      payload.leftover_followup_offset_days,
      payload.leftover_followup_required ? 1 : 0
    );

    const mealId = info.lastInsertRowid;
    for (const ingredient of payload.ingredients.map(normalizeIngredient)) {
      if (!ingredient.name) continue;
      insertIngredient.run(
        mealId,
        ingredient.name,
        ingredient.quantity,
        ingredient.unit,
        ingredient.category
      );
    }
    return mealId;
  });

  const mealId = createMeal();
  const meal = fetchMeal(mealId);
  res.status(201).json(meal);
});

app.post("/api/meals/import", (req, res) => {
  const meals = Array.isArray(req.body?.meals) ? req.body.meals : null;
  if (!meals) {
    return res.status(400).json({ error: "Body must include meals array" });
  }

  const insertMeal = db.prepare(mealInsertSql);
  const insertIngredient = db.prepare(
    `INSERT INTO meal_ingredients (
      meal_id,
      name,
      quantity,
      unit,
      category
    ) VALUES (?, ?, ?, ?, ?)`
  );

  const insertMeals = db.transaction(() => {
    const created = [];
    for (const item of meals) {
      const payload = parseMealPayload(item ?? {});
      if (!payload.name) continue;

      const info = insertMeal.run(
        payload.name,
        payload.meal_type,
        JSON.stringify(payload.tags),
        JSON.stringify(payload.method_steps),
        payload.nutrition_unknown ? 1 : 0,
        payload.nutrition.kcal ?? null,
        payload.nutrition.protein_g ?? null,
        payload.nutrition.carbs_g ?? null,
        payload.nutrition.fat_g ?? null,
        payload.nutrition.fibre_g ?? null,
        payload.nutrition.source ?? null,
        payload.leftover_followup_meal_id,
        payload.leftover_followup_offset_days,
        payload.leftover_followup_required ? 1 : 0
      );

      const mealId = info.lastInsertRowid;
      for (const ingredient of payload.ingredients.map(normalizeIngredient)) {
        if (!ingredient.name) continue;
        insertIngredient.run(
          mealId,
          ingredient.name,
          ingredient.quantity,
          ingredient.unit,
          ingredient.category
        );
      }

      created.push(mealId);
    }
    return created;
  });

  const createdIds = insertMeals();
  const createdMeals = createdIds.map((id) => fetchMeal(id)).filter(Boolean);
  res.status(201).json({ created: createdMeals.length, meals: createdMeals });
});

app.put("/api/meals/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = selectMealById.get(id);
  if (!existing) {
    return res.status(404).json({ error: "Meal not found" });
  }

  const payload = parseMealPayload(req.body ?? {});
  if (!payload.name) {
    return res.status(400).json({ error: "Meal name is required" });
  }

  const updateMeal = db.prepare(
    `UPDATE meals SET
      name = ?,
      meal_type = ?,
      tags = ?,
      method_steps = ?,
      nutrition_unknown = ?,
      nutrition_kcal = ?,
      nutrition_protein_g = ?,
      nutrition_carbs_g = ?,
      nutrition_fat_g = ?,
      nutrition_fibre_g = ?,
      nutrition_source = ?,
      leftover_followup_meal_id = ?,
      leftover_followup_offset_days = ?,
      leftover_followup_required = ?,
      updated_at = datetime('now')
    WHERE id = ?`
  );
  const deleteIngredients = db.prepare(
    "DELETE FROM meal_ingredients WHERE meal_id = ?"
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

  const update = db.transaction(() => {
    updateMeal.run(
      payload.name,
      payload.meal_type,
      JSON.stringify(payload.tags),
      JSON.stringify(payload.method_steps),
      payload.nutrition_unknown ? 1 : 0,
      payload.nutrition.kcal ?? null,
      payload.nutrition.protein_g ?? null,
      payload.nutrition.carbs_g ?? null,
      payload.nutrition.fat_g ?? null,
      payload.nutrition.fibre_g ?? null,
      payload.nutrition.source ?? null,
      payload.leftover_followup_meal_id,
      payload.leftover_followup_offset_days,
      payload.leftover_followup_required ? 1 : 0,
      id
    );
    deleteIngredients.run(id);
    for (const ingredient of payload.ingredients.map(normalizeIngredient)) {
      if (!ingredient.name) continue;
      insertIngredient.run(
        id,
        ingredient.name,
        ingredient.quantity,
        ingredient.unit,
        ingredient.category
      );
    }
  });

  update();
  const meal = fetchMeal(id);
  res.json(meal);
});

app.delete("/api/meals/:id", (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM meals WHERE id = ?").run(id);
  if (info.changes === 0) {
    return res.status(404).json({ error: "Meal not found" });
  }
  res.status(204).end();
});

function buildWeekResponse(weekStart) {
  const rows = db
    .prepare(
      "SELECT day_index, meal_type, meal_id FROM week_meals WHERE week_start = ? ORDER BY day_index ASC"
    )
    .all(weekStart);
  return buildWeekResponseFromRows(weekStart, rows);
}

app.get("/api/weeks/:week_start", (req, res) => {
  const weekStart = req.params.week_start;
  res.json(buildWeekResponse(weekStart));
});

app.put("/api/weeks/:week_start", (req, res) => {
  const weekStart = req.params.week_start;
  const days = Array.isArray(req.body?.days) ? req.body.days : null;
  if (!days) {
    return res
      .status(400)
      .json({ error: "Body must include days array" });
  }

  const upsert = db.prepare(
    `INSERT INTO week_meals (week_start, day_index, meal_type, meal_id)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(week_start, day_index, meal_type) DO UPDATE SET meal_id = excluded.meal_id`
  );

  const apply = db.transaction(() => {
    for (const entry of days) {
      const dayIndex = Number(entry.day_index);
      if (Number.isNaN(dayIndex) || dayIndex < 0 || dayIndex > 6) {
        throw new Error("Invalid day_index");
      }
      const lunchMealId =
        entry.lunch_meal_id === null || entry.lunch_meal_id === undefined
          ? null
          : Number(entry.lunch_meal_id);
      const dinnerMealId =
        entry.dinner_meal_id === null || entry.dinner_meal_id === undefined
          ? null
          : Number(entry.dinner_meal_id);
      upsert.run(weekStart, dayIndex, "lunch", lunchMealId);
      upsert.run(weekStart, dayIndex, "dinner", dinnerMealId);
    }
  });

  try {
    apply();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  res.json(buildWeekResponse(weekStart));
});

app.get("/api/weeks/:week_start/shopping-list", (req, res) => {
  const weekStart = req.params.week_start;
  const rows = db
    .prepare(
      `SELECT mi.name, mi.unit, mi.category, mi.quantity
       FROM week_meals wm
       JOIN meal_ingredients mi ON mi.meal_id = wm.meal_id
       WHERE wm.week_start = ?
       ORDER BY mi.name ASC`
    )
    .all(weekStart);

  const items = mergeShoppingItems(rows);

  res.json({ week_start: weekStart, items });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", db_path: dbPath });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
