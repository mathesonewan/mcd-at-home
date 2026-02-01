function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch (err) {
    return fallback;
  }
}

function normalizeIngredient(input) {
  return {
    name: typeof input.name === "string" ? input.name.trim() : "",
    quantity:
      input.quantity === null || input.quantity === undefined
        ? null
        : Number(input.quantity),
    unit: typeof input.unit === "string" ? input.unit.trim() : null,
    category: typeof input.category === "string" ? input.category.trim() : null,
  };
}

function parseMealPayload(body) {
  const nutritionInput = body.nutrition ?? {};
  const sourceRaw =
    nutritionInput.source ??
    nutritionInput.nutrition_source ??
    body.nutrition_source ??
    null;
  const normalizedNutrition = {
    kcal: nutritionInput.kcal ?? nutritionInput.calories ?? null,
    protein_g: nutritionInput.protein_g ?? null,
    carbs_g: nutritionInput.carbs_g ?? nutritionInput.carbohydrates_g ?? null,
    fat_g: nutritionInput.fat_g ?? null,
    fibre_g: nutritionInput.fibre_g ?? nutritionInput.fiber_g ?? null,
    source: typeof sourceRaw === "string" ? sourceRaw : null,
  };

  return {
    name: typeof body.name === "string" ? body.name.trim() : "",
    meal_type: body.meal_type === "lunch" ? "lunch" : "dinner",
    tags: Array.isArray(body.tags) ? body.tags : [],
    method_steps: Array.isArray(body.method_steps) ? body.method_steps : [],
    nutrition_unknown: Boolean(body.nutrition_unknown),
    nutrition: normalizedNutrition,
    leftover_followup_meal_id: body.leftover_followup_meal_id ?? null,
    leftover_followup_offset_days:
      typeof body.leftover_followup_offset_days === "number"
        ? body.leftover_followup_offset_days
        : 1,
    leftover_followup_required: Boolean(body.leftover_followup_required),
    ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
  };
}

module.exports = {
  safeJsonParse,
  normalizeIngredient,
  parseMealPayload,
};
