function mergeShoppingItems(rows) {
  const merged = new Map();
  for (const row of rows) {
    const key = `${row.name}__${row.unit ?? ""}`;
    if (!merged.has(key)) {
      merged.set(key, {
        name: row.name,
        unit: row.unit ?? null,
        categories: new Set(row.category ? [row.category] : []),
        total: 0,
        hasUnknown: row.quantity === null || row.quantity === undefined,
      });
    }
    const entry = merged.get(key);
    if (row.category) entry.categories.add(row.category);
    if (row.quantity === null || row.quantity === undefined) {
      entry.hasUnknown = true;
    } else if (!entry.hasUnknown) {
      entry.total += Number(row.quantity);
    }
  }

  return Array.from(merged.values()).map((entry) => {
    const category =
      entry.categories.size === 1
        ? Array.from(entry.categories)[0]
        : null;
    return {
      name: entry.name,
      unit: entry.unit,
      quantity: entry.hasUnknown ? null : entry.total,
      category,
    };
  });
}

module.exports = {
  mergeShoppingItems,
};
