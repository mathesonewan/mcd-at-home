function evaluateFollowup({
  meal,
  meals,
  mealType,
  dayIndex,
  weekDays,
  dayNames,
  getMealType,
}) {
  if (!meal || !meal.leftover_followup_meal_id) {
    return { type: "none" };
  }

  const offset = meal.leftover_followup_offset_days || 1;
  const targetIndex = dayIndex + offset;
  if (targetIndex < 0 || targetIndex > 6) {
    return { type: "out_of_range", targetIndex };
  }

  const existing = weekDays[targetIndex]?.[`${mealType}_meal_id`] ?? null;
  const followupId = meal.leftover_followup_meal_id;
  const followupMeal = meals.find((item) => item.id === followupId);
  const followupType = getMealType
    ? getMealType(followupMeal)
    : followupMeal?.meal_type === "lunch"
      ? "lunch"
      : "dinner";

  if (followupMeal && followupType !== mealType) {
    return {
      type: "type_mismatch",
      targetIndex,
      followupMealId: followupId,
    };
  }

  if (!existing) {
    return {
      type: "autofill",
      targetIndex,
      followupMealId: followupId,
      message: `Auto-filled ${followupMeal?.name ?? "follow-up meal"} on ${
        dayNames?.[targetIndex] ?? "target day"
      }.`,
    };
  }

  if (existing !== followupId) {
    return {
      type: "conflict",
      targetIndex,
      message: `${meal.name} needs ${
        dayNames?.[targetIndex] ?? "target day"
      } for leftovers, but it's already set.`,
    };
  }

  return { type: "none" };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    evaluateFollowup,
  };
}

if (typeof window !== "undefined") {
  window.evaluateFollowup = evaluateFollowup;
}
