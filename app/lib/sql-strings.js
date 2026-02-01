const mealInsertSql = `INSERT INTO meals (
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
  leftover_followup_meal_id,
  leftover_followup_offset_days,
  leftover_followup_required,
  updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`;

module.exports = {
  mealInsertSql,
};
