const state = {
  meals: [],
  weekStart: getWeekStart(new Date()),
  week: null,
  activeView: "planner",
  currentMealId: null,
  saveTimer: null,
  mealPicker: null,
  tagFilters: {
    lunch: [],
    dinner: [],
  },
  selectedMealIds: new Set(),
};

const mealTypes = [
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
];

const elements = {
  status: document.getElementById("status"),
  themeToggle: document.getElementById("theme-toggle"),
  clearWeek: document.getElementById("clear-week"),
  tabs: document.querySelectorAll(".tab"),
  views: {
    planner: document.getElementById("view-planner"),
    shopping: document.getElementById("view-shopping"),
    meals: document.getElementById("view-meals"),
  },
  weekLabel: document.getElementById("week-label"),
  plannerGrid: document.getElementById("planner-grid"),
  plannerWarning: document.getElementById("planner-warning"),
  prevWeek: document.getElementById("prev-week"),
  nextWeek: document.getElementById("next-week"),
  totals: {
    kcal: document.getElementById("total-kcal"),
    avgKcal: document.getElementById("avg-kcal"),
    protein: document.getElementById("total-protein"),
    carbs: document.getElementById("total-carbs"),
    fat: document.getElementById("total-fat"),
    fibre: document.getElementById("total-fibre"),
    note: document.getElementById("nutrition-note"),
    macroChart: document.getElementById("macro-chart"),
    macro: {
      protein: document.getElementById("macro-protein"),
      carbs: document.getElementById("macro-carbs"),
      fat: document.getElementById("macro-fat"),
      fibre: document.getElementById("macro-fibre"),
    },
  },
  shopping: {
    week: document.getElementById("shopping-week"),
    list: document.getElementById("shopping-list"),
    copy: document.getElementById("copy-list"),
    print: document.getElementById("print-list"),
  },
  meals: {
    list: document.getElementById("meals-list"),
    newButton: document.getElementById("new-meal"),
    uploadButton: document.getElementById("upload-meals"),
    form: document.getElementById("meal-form"),
    title: document.getElementById("meal-editor-title"),
    delete: document.getElementById("delete-meal"),
    mealType: document.getElementById("meal-type"),
    ingredients: document.getElementById("ingredients"),
    addIngredient: document.getElementById("add-ingredient"),
    nutritionUnknown: document.getElementById("nutrition-unknown"),
    followupMeal: document.getElementById("followup-meal"),
    selectAll: document.getElementById("select-all-meals"),
    bulkCount: document.getElementById("bulk-count"),
    bulkTags: document.getElementById("bulk-tags"),
    bulkDelete: document.getElementById("bulk-delete"),
  },
  jsonUpload: {
    modal: document.getElementById("json-upload-modal"),
    close: document.getElementById("json-upload-close"),
    clear: document.getElementById("json-upload-clear"),
    submit: document.getElementById("json-upload-submit"),
    text: document.getElementById("json-upload-text"),
  },
};

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  bindNavigation();
  bindPlannerControls();
  bindShoppingControls();
  bindThemeControls();
  bindMealForm();
  loadAll();
});

function bindNavigation() {
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const view = tab.dataset.view;
      if (!view) return;
      setActiveView(view);
    });
  });
}

function bindPlannerControls() {
  elements.prevWeek.addEventListener("click", () => shiftWeek(-7));
  elements.nextWeek.addEventListener("click", () => shiftWeek(7));
}

function bindShoppingControls() {
  elements.shopping.copy.addEventListener("click", copyShoppingList);
  elements.shopping.print.addEventListener("click", () => window.print());
}

function bindThemeControls() {
  elements.themeToggle.addEventListener("click", toggleTheme);
}

function bindMealForm() {
  elements.meals.newButton.addEventListener("click", () => setMealForm());
  elements.meals.uploadButton.addEventListener("click", openJsonUpload);
  elements.jsonUpload.close.addEventListener("click", closeJsonUpload);
  elements.jsonUpload.clear.addEventListener("click", () => {
    elements.jsonUpload.text.value = "";
  });
  elements.jsonUpload.submit.addEventListener("click", handleMealUpload);
  elements.meals.addIngredient.addEventListener("click", () => {
    const lastGroup = elements.meals.ingredients.querySelector(
      ".ingredient-group:last-of-type .ingredient-group-body"
    );
    if (lastGroup) {
      addIngredientRow({}, lastGroup);
      return;
    }
    renderIngredientGroups([]);
  });
  elements.meals.form.addEventListener("submit", handleMealSubmit);
  elements.meals.delete.addEventListener("click", handleMealDelete);
  elements.meals.nutritionUnknown.addEventListener("change", toggleNutrition);
  elements.meals.mealType.addEventListener("change", () =>
    renderFollowupOptions()
  );
  elements.clearWeek.addEventListener("click", handleClearWeek);
  elements.meals.selectAll.addEventListener("change", handleSelectAllMeals);
  elements.meals.bulkDelete.addEventListener("click", handleBulkDelete);
  elements.meals.bulkTags.addEventListener("click", handleBulkTags);
}

async function loadAll() {
  setStatus("Loading...");
  await Promise.all([loadMeals(), loadWeek()]);
  renderPlanner();
  await loadShoppingList();
  setStatus("Ready");
}

async function loadMeals() {
  const data = await apiGet("/api/meals");
  if (!data) return;
  state.meals = data;
  pruneSelectedMeals();
  renderMealsList();
  renderFollowupOptions();
}

async function loadWeek() {
  const weekStart = formatDate(state.weekStart);
  const data = await apiGet(`/api/weeks/${weekStart}`);
  state.week = data || createEmptyWeek(weekStart);
  elements.weekLabel.textContent = formatWeekRange(state.weekStart);
  elements.shopping.week.textContent = `Week of ${formatDate(state.weekStart)}`;
}

async function loadShoppingList() {
  const weekStart = formatDate(state.weekStart);
  const data = await apiGet(`/api/weeks/${weekStart}/shopping-list`);
  if (!data) return;
  renderShoppingList(data.items);
}

function renderPlanner() {
  if (!state.week) {
    state.week = createEmptyWeek(formatDate(state.weekStart));
  }
  elements.weekLabel.textContent = formatWeekRange(state.weekStart);
  elements.plannerGrid.innerHTML = "";
  const weekDates = getWeekDates(state.weekStart);
  mealTypes.forEach((mealType) => {
    const row = document.createElement("div");
    row.className = "planner-row";

    const rowHeader = document.createElement("div");
    rowHeader.className = "planner-row-header";
    rowHeader.textContent = mealType.label;
    row.appendChild(rowHeader);

    const pickerPanel = document.createElement("div");
    pickerPanel.className = "meal-picker-inline";
    const isOpen =
      state.mealPicker && state.mealPicker.mealType === mealType.key;
    if (!isOpen) {
      pickerPanel.classList.add("hidden");
    } else {
      const header = document.createElement("div");
      header.className = "meal-picker-header";
      const titleWrap = document.createElement("div");
      const eyebrow = document.createElement("p");
      eyebrow.className = "meal-picker-eyebrow";
      eyebrow.textContent = "Choose meal";
      const title = document.createElement("h4");
      title.textContent = `${mealType.label} · ${dayNames[state.mealPicker.dayIndex]} · ${formatShortDate(
        state.mealPicker.date
      )}`;
      titleWrap.appendChild(eyebrow);
      titleWrap.appendChild(title);
      header.appendChild(titleWrap);

      const close = document.createElement("button");
      close.type = "button";
      close.className = "ghost";
      close.textContent = "Close";
      close.addEventListener("click", closeMealPicker);
      header.appendChild(close);
      pickerPanel.appendChild(header);

      const actions = document.createElement("div");
      actions.className = "meal-picker-actions";
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "ghost danger";
      clear.textContent = "Clear selection";
      clear.addEventListener("click", () => {
        applyMealSelection(
          state.mealPicker.dayIndex,
          state.mealPicker.mealType,
          null
        );
        closeMealPicker();
      });
      actions.appendChild(clear);
      pickerPanel.appendChild(actions);

      const filterRow = document.createElement("div");
      filterRow.className = "meal-tag-filter";
      const filterLabel = document.createElement("span");
      filterLabel.textContent = "Filter by tag";
      filterRow.appendChild(filterLabel);

      const clearFilters = document.createElement("button");
      clearFilters.type = "button";
      clearFilters.className = "ghost";
      clearFilters.textContent = "Clear tags";
      clearFilters.addEventListener("click", () => {
        state.tagFilters[mealType.key] = [];
        renderPlanner();
      });
      filterRow.appendChild(clearFilters);
      pickerPanel.appendChild(filterRow);

      const tagChips = document.createElement("div");
      tagChips.className = "meal-tag-chips";
      renderTagChips(tagChips, mealType.key);
      pickerPanel.appendChild(tagChips);

      const buckets = document.createElement("div");
      buckets.className = "meal-picker-buckets";
      renderMealPickerBuckets(buckets, state.mealPicker.dayIndex, mealType.key);
      pickerPanel.appendChild(buckets);
    }

    row.appendChild(pickerPanel);

    const rowGrid = document.createElement("div");
    rowGrid.className = "planner-grid";

    state.week.days.forEach((day, index) => {
      const card = document.createElement("div");
      card.className = "planner-card";

      const title = document.createElement("strong");
      title.textContent = `${dayNames[index]} · ${formatShortDate(
        weekDates[index]
      )}`;
      card.appendChild(title);

      const selectedMealId = day[`${mealType.key}_meal_id`] ?? null;
      const selectedMeal = selectedMealId
        ? state.meals.find((meal) => meal.id === selectedMealId)
        : null;

      const selectedWrap = document.createElement("div");
      selectedWrap.className = "meal-selected";
      const selectedName = document.createElement("span");
      selectedName.textContent = selectedMeal?.name ?? "No meal selected";
      selectedWrap.appendChild(selectedName);

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "ghost";
      toggle.textContent = selectedMeal ? "Change" : "Choose";
      toggle.addEventListener("click", () =>
        openMealPicker(index, mealType.key, weekDates[index])
      );
      selectedWrap.appendChild(toggle);
      card.appendChild(selectedWrap);

      rowGrid.appendChild(card);
    });

    row.appendChild(rowGrid);
    elements.plannerGrid.appendChild(row);
  });

  renderNutritionTotals();
}

function openMealPicker(dayIndex, mealType, date) {
  state.mealPicker = { dayIndex, mealType, date };
  renderPlanner();
}

function closeMealPicker() {
  state.mealPicker = null;
  renderPlanner();
}

function renderMealPickerBuckets(container, dayIndex, mealType) {
  container.innerHTML = "";
  const mealsForType = state.meals.filter(
    (meal) => getMealType(meal) === mealType
  );
  const selectedTags = new Set(state.tagFilters[mealType] || []);
  if (selectedTags.size === 0) {
    const empty = document.createElement("div");
    empty.className = "meal-picker-empty";
    empty.textContent = "Select a tag to see matching meals.";
    container.appendChild(empty);
    return;
  }
  const tagMap = new Map();
  mealsForType.forEach((meal) => {
    const tags = (meal.tags || []).filter(Boolean);
    if (tags.length === 0) {
      if (selectedTags.has("Untagged")) {
        if (!tagMap.has("Untagged")) tagMap.set("Untagged", []);
        tagMap.get("Untagged").push(meal);
      }
      return;
    }
    tags.forEach((tag) => {
      if (!selectedTags.has(tag)) return;
      if (!tagMap.has(tag)) tagMap.set(tag, []);
      tagMap.get(tag).push(meal);
    });
  });

  const sortedTags = Array.from(tagMap.keys()).sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" })
  );
  sortedTags.forEach((tag) => {
    const bucket = document.createElement("div");
    bucket.className = "meal-bucket";
    const bucketTitle = document.createElement("div");
    bucketTitle.className = "meal-bucket-title";
    bucketTitle.textContent = tag;
    bucket.appendChild(bucketTitle);

    const bucketItems = document.createElement("div");
    bucketItems.className = "meal-bucket-items";
    tagMap.get(tag).forEach((meal) => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "meal-pill";
      pill.textContent = meal.name;
      pill.addEventListener("click", () => {
        applyMealSelection(dayIndex, mealType, meal.id);
        closeMealPicker();
      });
      bucketItems.appendChild(pill);
    });
    bucket.appendChild(bucketItems);
    container.appendChild(bucket);
  });
}

function renderTagChips(container, mealType) {
  container.innerHTML = "";
  const mealsForType = state.meals.filter(
    (meal) => getMealType(meal) === mealType
  );
  const tagSet = new Set();
  mealsForType.forEach((meal) => {
    const tags = (meal.tags || []).filter(Boolean);
    if (tags.length === 0) {
      tagSet.add("Untagged");
      return;
    }
    tags.forEach((tag) => tagSet.add(tag));
  });

  const selectedTags = new Set(state.tagFilters[mealType] || []);
  const sortedTags = Array.from(tagSet).sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" })
  );
  sortedTags.forEach((tag) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "tag-chip";
    chip.textContent = tag;
    chip.classList.toggle("is-active", selectedTags.has(tag));
    chip.addEventListener("click", () => {
      const next = new Set(state.tagFilters[mealType] || []);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      state.tagFilters[mealType] = Array.from(next);
      renderPlanner();
    });
    container.appendChild(chip);
  });
}

function applyMealSelection(dayIndex, mealType, mealId) {
  setPlannerWarning("");
  updateDayMeal(dayIndex, mealType, mealId);
  handleFollowup(dayIndex, mealType, mealId);
  renderPlanner();
  queueSaveWeek();
}

function handleFollowup(dayIndex, mealType, mealId) {
  if (!mealId) return;
  const meal = state.meals.find((item) => item.id === mealId);
  const result = window.evaluateFollowup({
    meal,
    meals: state.meals,
    mealType,
    dayIndex,
    weekDays: state.week.days,
    dayNames,
    getMealType,
  });

  if (result.type === "autofill") {
    updateDayMeal(result.targetIndex, mealType, result.followupMealId);
    if (result.message) {
      setPlannerWarning(result.message);
    }
  } else if (result.type === "conflict" && result.message) {
    setPlannerWarning(result.message);
  } else if (result.type === "type_mismatch") {
    setPlannerWarning(
      `${meal.name} expects a ${mealType} follow-up, but the follow-up meal is ${getMealType(
        state.meals.find((item) => item.id === result.followupMealId)
      )}.`
    );
  }
}

function updateDayMeal(dayIndex, mealType, mealId) {
  if (!state.week) return;
  const entry = state.week.days[dayIndex];
  if (!entry) return;
  entry[`${mealType}_meal_id`] = mealId;
}


function queueSaveWeek() {
  if (state.saveTimer) clearTimeout(state.saveTimer);
  setStatus("Saving...");
  state.saveTimer = setTimeout(async () => {
    await saveWeek();
    state.saveTimer = null;
  }, 600);
}

async function saveWeek() {
  if (!state.week) return;
  const payload = { days: state.week.days };
  const weekStart = formatDate(state.weekStart);
  const saved = await apiSend(`/api/weeks/${weekStart}`, "PUT", payload);
  if (saved) {
    state.week = saved;
    renderPlanner();
    await loadShoppingList();
    setStatus("Saved");
  }
}

function renderNutritionTotals() {
  const totals = {
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fibre: 0,
    knownCount: 0,
  };

  const mealById = new Map(state.meals.map((meal) => [meal.id, meal]));
  state.week.days.forEach((day) => {
    ["lunch_meal_id", "dinner_meal_id"].forEach((slot) => {
      if (!day[slot]) return;
      const meal = mealById.get(day[slot]);
      if (!meal || meal.nutrition_unknown) return;
      const nutrition = meal.nutrition || {};
      totals.knownCount += 1;
      totals.kcal += Number(nutrition.kcal || 0);
      totals.protein += Number(nutrition.protein_g || 0);
      totals.carbs += Number(nutrition.carbs_g || 0);
      totals.fat += Number(nutrition.fat_g || 0);
      totals.fibre += Number(nutrition.fibre_g || 0);
    });
  });

  elements.totals.kcal.textContent = formatNumber(totals.kcal);
  const avgKcal = totals.knownCount > 0 ? totals.kcal / 7 : 0;
  elements.totals.avgKcal.textContent = formatNumber(avgKcal);
  elements.totals.protein.textContent = `${formatNumber(totals.protein)} g`;
  elements.totals.carbs.textContent = `${formatNumber(totals.carbs)} g`;
  elements.totals.fat.textContent = `${formatNumber(totals.fat)} g`;
  elements.totals.fibre.textContent = `${formatNumber(totals.fibre)} g`;

  renderMacroSplit(totals);

  if (totals.knownCount < 14) {
    elements.totals.note.textContent = `Totals based on ${totals.knownCount} of 14 meals.`;
  } else {
    elements.totals.note.textContent = "Totals include all 14 meals.";
  }
}

function renderMacroSplit(totals) {
  const macroTotal = totals.protein + totals.carbs + totals.fat + totals.fibre;
  if (macroTotal === 0) {
    elements.totals.macro.protein.textContent = "0% · 0 g";
    elements.totals.macro.carbs.textContent = "0% · 0 g";
    elements.totals.macro.fat.textContent = "0% · 0 g";
    elements.totals.macro.fibre.textContent = "0% · 0 g";
    ["--macro-protein-color", "--macro-carbs-color", "--macro-fat-color", "--macro-fibre-color"].forEach(
      (token) => {
        elements.totals.macroChart.style.setProperty(
          token,
          "var(--paper-dark)"
        );
      }
    );
    elements.totals.macroChart.style.setProperty("--macro-protein-stop", "0deg");
    elements.totals.macroChart.style.setProperty("--macro-carbs-stop", "0deg");
    elements.totals.macroChart.style.setProperty("--macro-fat-stop", "0deg");
    elements.totals.macroChart.setAttribute(
      "aria-label",
      "Macro split: no data yet."
    );
    return;
  }

  ["--macro-protein-color", "--macro-carbs-color", "--macro-fat-color", "--macro-fibre-color"].forEach(
    (token) => {
      elements.totals.macroChart.style.setProperty(token, "");
    }
  );

  const proteinPct =
    macroTotal > 0 ? (totals.protein / macroTotal) * 100 : 0;
  const carbsPct = macroTotal > 0 ? (totals.carbs / macroTotal) * 100 : 0;
  const fatPct = macroTotal > 0 ? (totals.fat / macroTotal) * 100 : 0;
  const fibrePct = macroTotal > 0 ? (totals.fibre / macroTotal) * 100 : 0;

  elements.totals.macro.protein.textContent = `${formatPercent(
    proteinPct
  )}% · ${formatNumber(totals.protein)} g`;
  elements.totals.macro.carbs.textContent = `${formatPercent(
    carbsPct
  )}% · ${formatNumber(totals.carbs)} g`;
  elements.totals.macro.fat.textContent = `${formatPercent(fatPct)}% · ${formatNumber(
    totals.fat
  )} g`;
  elements.totals.macro.fibre.textContent = `${formatPercent(
    fibrePct
  )}% · ${formatNumber(totals.fibre)} g`;

  const proteinStop = (proteinPct / 100) * 360;
  const carbsStop = proteinStop + (carbsPct / 100) * 360;
  const fatStop = carbsStop + (fatPct / 100) * 360;

  elements.totals.macroChart.style.setProperty(
    "--macro-protein-stop",
    `${proteinStop}deg`
  );
  elements.totals.macroChart.style.setProperty(
    "--macro-carbs-stop",
    `${carbsStop}deg`
  );
  elements.totals.macroChart.style.setProperty(
    "--macro-fat-stop",
    `${fatStop}deg`
  );

  elements.totals.macroChart.setAttribute(
    "aria-label",
    `Macro split: Protein ${formatPercent(
      proteinPct
    )}%, Carbs ${formatPercent(carbsPct)}%, Fat ${formatPercent(
      fatPct
    )}%, Fibre ${formatPercent(fibrePct)}%`
  );
}

function renderShoppingList(items) {
  elements.shopping.list.innerHTML = "";
  if (!items || items.length === 0) {
    elements.shopping.list.textContent =
      "No meals planned yet. Plan a week to generate a list.";
    return;
  }

  const groups = new Map();
  items.forEach((item) => {
    const key = item.category || "Uncategorised";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  Array.from(groups.entries()).forEach(([category, groupItems]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "shopping-category";
    const title = document.createElement("h4");
    title.textContent = category;
    wrapper.appendChild(title);

    groupItems.forEach((item) => {
      const row = document.createElement("label");
      row.className = "shopping-item";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      const text = document.createElement("span");
      text.textContent = formatShoppingItem(item);
      row.appendChild(checkbox);
      row.appendChild(text);
      wrapper.appendChild(row);
    });

    elements.shopping.list.appendChild(wrapper);
  });
}

function renderMealsList() {
  elements.meals.list.innerHTML = "";
  if (state.meals.length === 0) {
    elements.meals.list.textContent = "No meals yet. Add your first one.";
    setMealForm();
    state.selectedMealIds.clear();
    updateBulkUI();
    return;
  }
  state.meals.forEach((meal) => {
    const item = document.createElement("div");
    item.className = "meal-item";
    if (state.currentMealId === meal.id) {
      item.classList.add("is-active");
    }
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "meal-checkbox";
    checkbox.checked = state.selectedMealIds.has(meal.id);
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        state.selectedMealIds.add(meal.id);
      } else {
        state.selectedMealIds.delete(meal.id);
      }
      updateBulkUI();
    });

    const label = document.createElement("span");
    label.textContent = meal.name;

    item.appendChild(checkbox);
    item.appendChild(label);
    item.addEventListener("click", () => setMealForm(meal));
    elements.meals.list.appendChild(item);
  });
  updateBulkUI();
}

function renderFollowupOptions() {
  elements.meals.followupMeal.innerHTML = "";
  const currentValue = elements.meals.followupMeal.value;
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "None";
  elements.meals.followupMeal.appendChild(empty);
  const currentType = elements.meals.form.elements.meal_type?.value || "dinner";
  state.meals.forEach((meal) => {
    if (getMealType(meal) !== currentType) return;
    const option = document.createElement("option");
    option.value = String(meal.id);
    option.textContent = meal.name;
    elements.meals.followupMeal.appendChild(option);
  });
  if (
    currentValue &&
    !Array.from(elements.meals.followupMeal.options).some(
      (option) => option.value === currentValue
    )
  ) {
    elements.meals.followupMeal.value = "";
  }
}

function setMealForm(meal = null) {
  const form = elements.meals.form;
  form.reset();
  elements.meals.ingredients.innerHTML = "";
  setPlannerWarning("");

  if (meal) {
    state.currentMealId = meal.id;
    elements.meals.title.textContent = "Edit meal";
    form.elements.name.value = meal.name ?? "";
    form.elements.meal_type.value = getMealType(meal);
    form.elements.tags.value = (meal.tags || []).join(", ");
    form.elements.method_steps.value = (meal.method_steps || []).join("\n");
    elements.meals.nutritionUnknown.checked = Boolean(meal.nutrition_unknown);
    form.elements.nutrition_kcal.value = meal.nutrition?.kcal ?? "";
    form.elements.nutrition_protein.value = meal.nutrition?.protein_g ?? "";
    form.elements.nutrition_carbs.value = meal.nutrition?.carbs_g ?? "";
    form.elements.nutrition_fat.value = meal.nutrition?.fat_g ?? "";
    form.elements.nutrition_fibre.value = meal.nutrition?.fibre_g ?? "";
    form.elements.nutrition_source.value = meal.nutrition?.source ?? "";
    elements.meals.followupMeal.value = meal.leftover_followup_meal_id
      ? String(meal.leftover_followup_meal_id)
      : "";
    form.elements.followup_offset.value =
      meal.leftover_followup_offset_days ?? 1;
    form.elements.followup_required.checked = Boolean(
      meal.leftover_followup_required
    );
    renderIngredientGroups(meal.ingredients || []);
    elements.meals.delete.disabled = false;
  } else {
    state.currentMealId = null;
    elements.meals.title.textContent = "Create meal";
    form.elements.meal_type.value = "dinner";
    elements.meals.followupMeal.value = "";
    form.elements.followup_offset.value = 1;
    form.elements.followup_required.checked = false;
    elements.meals.nutritionUnknown.checked = false;
    renderIngredientGroups([]);
    elements.meals.delete.disabled = true;
  }

  renderFollowupOptions();
  toggleNutrition();
  renderMealsList();
  updateCustomHeaderVisibility();
}

function renderIngredientGroups(ingredients) {
  const container = elements.meals.ingredients;
  container.innerHTML = "";
  const groups = new Map();
  (ingredients || []).forEach((ingredient) => {
    const key = ingredient.category ? ingredient.category.trim() : "Uncategorised";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(ingredient);
  });

  if (groups.size === 0) {
    const block = createIngredientGroup("Uncategorised", []);
    container.appendChild(block);
    return;
  }

  Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b, "en", { sensitivity: "base" }))
    .forEach(([category, items]) => {
      const block = createIngredientGroup(category, items);
      container.appendChild(block);
    });
}

function createIngredientGroup(category, items) {
  const wrapper = document.createElement("div");
  wrapper.className = "ingredient-group";

  const header = document.createElement("button");
  header.type = "button";
  header.className = "ingredient-group-header";
  header.setAttribute("aria-expanded", "true");
  header.textContent = `${category} (${items.length})`;
  wrapper.appendChild(header);

  const body = document.createElement("div");
  body.className = "ingredient-group-body";
  items.forEach((ingredient) =>
    addIngredientRow(ingredient || {}, body)
  );
  if (items.length === 0) {
    addIngredientRow({}, body);
  }
  wrapper.appendChild(body);

  header.addEventListener("click", () => {
    const isOpen = header.getAttribute("aria-expanded") === "true";
    header.setAttribute("aria-expanded", isOpen ? "false" : "true");
    body.classList.toggle("hidden", isOpen);
  });

  return wrapper;
}

function updateBulkUI() {
  const total = state.meals.length;
  const selectedCount = state.selectedMealIds.size;
  elements.meals.bulkCount.textContent = `${selectedCount} selected`;
  elements.meals.selectAll.checked = total > 0 && selectedCount === total;
  elements.meals.bulkDelete.disabled = selectedCount === 0;
  elements.meals.bulkTags.disabled = selectedCount === 0;
}

function updateCustomHeaderVisibility() {
  const header = document.querySelector(".ingredient-headers .custom-only");
  if (!header) return;
  const anyCustom = Array.from(
    elements.meals.ingredients.querySelectorAll("[data-field='unit_select']")
  ).some((select) => select.value === "custom");
  header.classList.toggle("is-hidden", !anyCustom);
}

function pruneSelectedMeals() {
  const validIds = new Set(state.meals.map((meal) => meal.id));
  state.selectedMealIds = new Set(
    Array.from(state.selectedMealIds).filter((id) => validIds.has(id))
  );
}

function handleSelectAllMeals(event) {
  if (event.target.checked) {
    state.selectedMealIds = new Set(state.meals.map((meal) => meal.id));
  } else {
    state.selectedMealIds.clear();
  }
  renderMealsList();
}

async function handleBulkDelete() {
  if (state.selectedMealIds.size === 0) return;
  const confirmDelete = window.confirm(
    `Delete ${state.selectedMealIds.size} meals? This cannot be undone.`
  );
  if (!confirmDelete) return;

  setStatus("Deleting meals...");
  for (const id of state.selectedMealIds) {
    await apiSend(`/api/meals/${id}`, "DELETE");
  }
  state.selectedMealIds.clear();
  await loadMeals();
  await loadWeek();
  renderPlanner();
  await loadShoppingList();
  setMealForm();
  setStatus("Meals deleted");
}

async function handleBulkTags() {
  if (state.selectedMealIds.size === 0) return;
  const raw = window.prompt(
    "Enter tags to apply (comma separated). Leave blank to clear tags:"
  );
  if (raw === null) return;
  const tags = raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  setStatus("Updating tags...");
  for (const id of state.selectedMealIds) {
    const meal = state.meals.find((item) => item.id === id);
    if (!meal) continue;
    const payload = {
      name: meal.name,
      meal_type: getMealType(meal),
      tags,
      ingredients: meal.ingredients || [],
      method_steps: meal.method_steps || [],
      nutrition_unknown: meal.nutrition_unknown,
      nutrition: meal.nutrition || {},
      leftover_followup_meal_id: meal.leftover_followup_meal_id ?? null,
      leftover_followup_offset_days: meal.leftover_followup_offset_days ?? 1,
      leftover_followup_required: meal.leftover_followup_required ?? false,
    };
    await apiSend(`/api/meals/${id}`, "PUT", payload);
  }
  await loadMeals();
  setStatus("Tags updated");
}

function openJsonUpload() {
  elements.jsonUpload.modal.classList.remove("hidden");
  elements.jsonUpload.text.focus();
}

function closeJsonUpload() {
  elements.jsonUpload.modal.classList.add("hidden");
}

async function handleMealUpload() {
  const raw = elements.jsonUpload.text.value.trim();
  if (!raw) return;

  try {
    const payload = JSON.parse(raw);
    if (!payload || !Array.isArray(payload.meals)) {
      window.alert("Invalid JSON. Expected { meals: [...] }.");
      return;
    }
    setStatus("Importing meals...");
    const result = await apiSend("/api/meals/import", "POST", payload);
    if (!result) return;
    await loadMeals();
    await loadWeek();
    renderPlanner();
    await loadShoppingList();
    setStatus(`Imported ${result.created} meals`);
    closeJsonUpload();
  } catch (err) {
    console.error(err);
    window.alert("Could not parse that JSON.");
  }
}

function addIngredientRow(values = {}, target = null) {
  const row = document.createElement("div");
  row.className = "ingredient-row";

  const name = document.createElement("input");
  name.placeholder = "Name";
  name.value = values.name ?? "";
  name.dataset.field = "name";

  const quantity = document.createElement("input");
  quantity.placeholder = "Qty";
  quantity.type = "number";
  quantity.step = "0.1";
  quantity.value =
    values.quantity === null || values.quantity === undefined
      ? ""
      : values.quantity;
  quantity.dataset.field = "quantity";

  const unit = document.createElement("input");
  unit.placeholder = "Custom unit";
  unit.value = values.unit ?? "";
  unit.dataset.field = "unit";
  unit.className = "unit-custom is-hidden";

  const unitSelect = document.createElement("select");
  unitSelect.dataset.field = "unit_select";
  ["", "g", "ml", "tbsp", "tsp", "custom"].forEach((optionValue) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent =
      optionValue === ""
        ? "Unit"
        : optionValue === "custom"
          ? "Custom"
          : optionValue;
    unitSelect.appendChild(option);
  });

  const currentUnit = values.unit ?? "";
  if (
    currentUnit === "g" ||
    currentUnit === "ml" ||
    currentUnit === "tbsp" ||
    currentUnit === "tsp" ||
    currentUnit === ""
  ) {
    unitSelect.value = currentUnit;
    unit.classList.add("is-hidden");
  } else if (currentUnit) {
    unitSelect.value = "custom";
    unit.classList.remove("is-hidden");
  }

  unitSelect.addEventListener("change", () => {
    if (unitSelect.value === "custom") {
      unit.classList.remove("is-hidden");
      unit.focus();
    } else {
      unit.classList.add("is-hidden");
      unit.value = "";
    }
    updateCustomHeaderVisibility();
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "ghost";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => row.remove());

  const category = document.createElement("input");
  category.placeholder = "Category";
  category.value = values.category ?? "";
  category.dataset.field = "category";

  row.appendChild(name);
  row.appendChild(quantity);
  row.appendChild(unitSelect);
  row.appendChild(unit);
  row.appendChild(category);
  row.appendChild(remove);

  (target || elements.meals.ingredients).appendChild(row);
  updateCustomHeaderVisibility();
}

function toggleNutrition() {
  const disabled = elements.meals.nutritionUnknown.checked;
  ["nutrition_kcal", "nutrition_protein", "nutrition_carbs", "nutrition_fat", "nutrition_fibre", "nutrition_source"].forEach(
    (field) => {
      elements.meals.form.elements[field].disabled = disabled;
    }
  );
}

async function handleMealSubmit(event) {
  event.preventDefault();
  const form = elements.meals.form;
  const name = form.elements.name.value.trim();
  if (!name) return;

  const tags = form.elements.tags.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const ingredients = collectIngredients();
  const methodSteps = form.elements.method_steps.value
    .split("\n")
    .map((step) => step.trim())
    .filter(Boolean);

  const nutritionUnknown = elements.meals.nutritionUnknown.checked;
  const nutrition = {
    kcal: parseNumber(form.elements.nutrition_kcal.value),
    protein_g: parseNumber(form.elements.nutrition_protein.value),
    carbs_g: parseNumber(form.elements.nutrition_carbs.value),
    fat_g: parseNumber(form.elements.nutrition_fat.value),
    fibre_g: parseNumber(form.elements.nutrition_fibre.value),
    source: form.elements.nutrition_source.value.trim() || null,
  };

  const payload = {
    name,
    meal_type: form.elements.meal_type.value,
    tags,
    ingredients,
    method_steps: methodSteps,
    nutrition_unknown: nutritionUnknown,
    nutrition,
    leftover_followup_meal_id: form.elements.followup_meal.value
      ? Number(form.elements.followup_meal.value)
      : null,
    leftover_followup_offset_days: parseInt(
      form.elements.followup_offset.value || "1",
      10
    ),
    leftover_followup_required: form.elements.followup_required.checked,
  };

  setStatus("Saving meal...");
  let saved = null;
  if (state.currentMealId) {
    saved = await apiSend(`/api/meals/${state.currentMealId}`, "PUT", payload);
  } else {
    saved = await apiSend("/api/meals", "POST", payload);
    if (saved?.id) {
      state.currentMealId = saved.id;
    }
  }
  if (!saved) {
    setStatus("Save failed");
    return;
  }

  await loadMeals();
  await loadWeek();
  renderPlanner();
  await loadShoppingList();
  setMealForm(
    state.meals.find((meal) => meal.id === state.currentMealId) ?? null
  );
  setStatus("Meal saved");
}

async function handleMealDelete() {
  if (!state.currentMealId) return;
  const meal = state.meals.find((item) => item.id === state.currentMealId);
  const confirmDelete = window.confirm(
    `Delete "${meal?.name ?? "this meal"}"?`
  );
  if (!confirmDelete) return;

  setStatus("Deleting meal...");
  await apiSend(`/api/meals/${state.currentMealId}`, "DELETE");
  state.currentMealId = null;
  await loadMeals();
  await loadWeek();
  renderPlanner();
  await loadShoppingList();
  setMealForm();
  setStatus("Meal deleted");
}

function collectIngredients() {
  const rows = elements.meals.ingredients.querySelectorAll(".ingredient-row");
  const ingredients = [];
  rows.forEach((row) => {
    const name = row.querySelector("[data-field='name']").value.trim();
    const quantityRaw = row.querySelector("[data-field='quantity']").value;
    const unitSelect = row.querySelector("[data-field='unit_select']").value;
    const unitCustom = row.querySelector("[data-field='unit']").value.trim();
    const unit =
      unitSelect === "custom"
        ? unitCustom
        : unitSelect === ""
          ? null
          : unitSelect;
    const category =
      row.querySelector("[data-field='category']").value.trim() || null;
    if (!name) return;
    ingredients.push({
      name,
      quantity: quantityRaw === "" ? null : parseFloat(quantityRaw),
      unit: unit || null,
      category,
    });
  });
  return ingredients;
}

function setActiveView(view) {
  state.activeView = view;
  elements.tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.view === view);
  });
  Object.entries(elements.views).forEach(([key, section]) => {
    section.classList.toggle("hidden", key !== view);
  });
  if (view !== "planner") {
    closeMealPicker();
  }
}

function setStatus(text) {
  elements.status.textContent = text;
}

function setPlannerWarning(message) {
  if (!message) {
    elements.plannerWarning.classList.add("hidden");
    elements.plannerWarning.textContent = "";
    return;
  }
  elements.plannerWarning.textContent = message;
  elements.plannerWarning.classList.remove("hidden");
}

function shiftWeek(offsetDays) {
  const date = new Date(state.weekStart);
  date.setDate(date.getDate() + offsetDays);
  state.weekStart = getWeekStart(date);
  state.week = null;
  loadWeek().then(() => {
    renderPlanner();
    loadShoppingList();
  });
}

function handleClearWeek() {
  if (!state.week) return;
  const confirmClear = window.confirm(
    "Clear all meals for this week? This cannot be undone."
  );
  if (!confirmClear) return;
  state.week.days = state.week.days.map((day) => ({
    ...day,
    lunch_meal_id: null,
    dinner_meal_id: null,
  }));
  renderPlanner();
  queueSaveWeek();
}

function formatWeekRange(startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  return `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`;
}

function formatShortDate(date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStart(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
}

function createEmptyWeek(weekStart) {
  return {
    week_start: weekStart,
    days: Array.from({ length: 7 }, (_, index) => ({
      day_index: index,
      lunch_meal_id: null,
      dinner_meal_id: null,
    })),
  };
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "0";
  return value % 1 === 0 ? value.toString() : value.toFixed(1);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0";
  return value < 1 && value > 0 ? value.toFixed(1) : value.toFixed(0);
}

function formatShoppingItem(item) {
  const quantity =
    item.quantity === null || item.quantity === undefined
      ? ""
      : `${item.quantity} `;
  const unit = item.unit ? `${item.unit} ` : "";
  return `${quantity}${unit}${item.name}`.trim();
}

function copyShoppingList() {
  const listText = buildShoppingText();
  if (!listText) return;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(listText)
      .then(() => setStatus("Shopping list copied"))
      .catch(() => fallbackCopy(listText));
  } else {
    fallbackCopy(listText);
  }
}

function initTheme() {
  const stored = localStorage.getItem("theme");
  if (stored === "dark" || stored === "light") {
    setTheme(stored);
    return;
  }
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(prefersDark ? "dark" : "light");
}

function toggleTheme() {
  const current = document.body.dataset.theme === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  setTheme(next);
  localStorage.setItem("theme", next);
}

function setTheme(mode) {
  if (mode === "dark") {
    document.body.dataset.theme = "dark";
    elements.themeToggle.textContent = "Light mode";
  } else {
    document.body.dataset.theme = "light";
    elements.themeToggle.textContent = "Dark mode";
  }
}

function buildShoppingText() {
  const categories = Array.from(
    elements.shopping.list.querySelectorAll(".shopping-category")
  );
  if (categories.length === 0) return "";
  return categories
    .map((category) => {
      const title = category.querySelector("h4")?.textContent ?? "";
      const items = Array.from(category.querySelectorAll(".shopping-item span"))
        .map((span) => `- ${span.textContent}`)
        .join("\n");
      return `${title}\n${items}`;
    })
    .join("\n\n");
}

function fallbackCopy(text) {
  window.prompt("Copy shopping list:", text);
}

function parseNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getMealType(meal) {
  return meal?.meal_type === "lunch" ? "lunch" : "dinner";
}

async function apiGet(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    setStatus("API error");
    console.error(err);
    return null;
  }
}

async function apiSend(path, method, payload) {
  try {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (res.status === 204) return true;
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    setStatus("API error");
    console.error(err);
    return null;
  }
}
