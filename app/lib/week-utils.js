function buildWeekResponseFromRows(weekStart, rows) {
  const dayMap = new Map(
    rows.map((row) => [`${row.day_index}_${row.meal_type}`, row.meal_id])
  );
  const days = Array.from({ length: 7 }, (_, index) => ({
    day_index: index,
    lunch_meal_id: dayMap.has(`${index}_lunch`)
      ? dayMap.get(`${index}_lunch`)
      : null,
    dinner_meal_id: dayMap.has(`${index}_dinner`)
      ? dayMap.get(`${index}_dinner`)
      : null,
  }));
  return { week_start: weekStart, days };
}

module.exports = {
  buildWeekResponseFromRows,
};
