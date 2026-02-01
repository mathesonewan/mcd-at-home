const state = {
  meals: [],
  weekStart: getWeekStart(new Date()),
  week: null,
  activeView: "planner",
  currentMealId: null,
  saveTimer: null,
};

const elements = {
  status: document.getElementById("status"),
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
    protein: document.getElementById("total-protein"),
    carbs: document.getElementById("total-carbs"),
    fat: document.getElementById("total-fat"),
    fibre: document.getElementById("total-fibre"),
    note: document.getElementById("nutrition-note"),
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
    form: document.getElementById("meal-form"),
    title: document.getElementById("meal-editor-title"),
    delete: document.getElementById("delete-meal"),
    ingredients: document.getElementById("ingredients"),
    addIngredient: document.getElementById("add-ingredient"),
    nutritionUnknown: document.getElementById("nutrition-unknown"),
    followupMeal: document.getElementById("followup-meal"),
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
  bindNavigation();
  bindPlannerControls();
  bindShoppingControls();
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

function bindMealForm() {
  elements.meals.newButton.addEventListener("click", () => setMealForm());
  elements.meals.addIngredient.addEventListener("click", () =>
    addIngredientRow()
  );
  elements.meals.form.addEventListener("submit", handleMealSubmit);
  elements.meals.delete.addEventListener("click", handleMealDelete);
  elements.meals.nutritionUnknown.addEventListener("change", toggleNutrition);
  elements.clearWeek.addEventListener("click", handleClearWeek);
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
  state.week.days.forEach((day, index) => {
    const card = document.createElement("div");
    card.className = "planner-card";

    const title = document.createElement("strong");
    title.textContent = `${dayNames[index]} · ${formatShortDate(weekDates[index])}`;
    card.appendChild(title);

    const select = document.createElement("select");
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "—";
    select.appendChild(emptyOption);

    state.meals.forEach((meal) => {
      const option = document.createElement("option");
      option.value = String(meal.id);
      option.textContent = meal.name;
      select.appendChild(option);
    });

    select.value = day.meal_id ? String(day.meal_id) : "";
    select.addEventListener("change", (event) => {
      const value = event.target.value;
      const mealId = value ? Number(value) : null;
      applyMealSelection(index, mealId);
    });

    card.appendChild(select);
    elements.plannerGrid.appendChild(card);
  });

  renderNutritionTotals();
}

function applyMealSelection(dayIndex, mealId) {
  setPlannerWarning("");
  updateDayMeal(dayIndex, mealId);
  handleFollowup(dayIndex, mealId);
  renderPlanner();
  queueSaveWeek();
}

function handleFollowup(dayIndex, mealId) {
  if (!mealId) return;
  const meal = state.meals.find((item) => item.id === mealId);
  if (!meal || !meal.leftover_followup_meal_id) return;

  const offset = meal.leftover_followup_offset_days || 1;
  const targetIndex = dayIndex + offset;
  if (targetIndex < 0 || targetIndex > 6) return;

  const existing = state.week.days[targetIndex]?.meal_id ?? null;
  const followupId = meal.leftover_followup_meal_id;
  if (!existing) {
    updateDayMeal(targetIndex, followupId);
    const followupMeal = state.meals.find((item) => item.id === followupId);
    setPlannerWarning(
      `Auto-filled ${followupMeal?.name ?? "follow-up meal"} on ${dayNames[targetIndex]}.`
    );
  } else if (existing !== followupId) {
    setPlannerWarning(
      `${meal.name} needs ${dayNames[targetIndex]} for leftovers, but it's already set.`
    );
  }
}

function updateDayMeal(dayIndex, mealId) {
  if (!state.week) return;
  const entry = state.week.days[dayIndex];
  if (!entry) return;
  entry.meal_id = mealId;
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
    if (!day.meal_id) return;
    const meal = mealById.get(day.meal_id);
    if (!meal || meal.nutrition_unknown) return;
    const nutrition = meal.nutrition || {};
    totals.knownCount += 1;
    totals.kcal += Number(nutrition.kcal || 0);
    totals.protein += Number(nutrition.protein_g || 0);
    totals.carbs += Number(nutrition.carbs_g || 0);
    totals.fat += Number(nutrition.fat_g || 0);
    totals.fibre += Number(nutrition.fibre_g || 0);
  });

  elements.totals.kcal.textContent = formatNumber(totals.kcal);
  elements.totals.protein.textContent = `${formatNumber(totals.protein)} g`;
  elements.totals.carbs.textContent = `${formatNumber(totals.carbs)} g`;
  elements.totals.fat.textContent = `${formatNumber(totals.fat)} g`;
  elements.totals.fibre.textContent = `${formatNumber(totals.fibre)} g`;

  if (totals.knownCount < 7) {
    elements.totals.note.textContent = `Totals based on ${totals.knownCount} of 7 meals.`;
  } else {
    elements.totals.note.textContent = "Totals include all 7 meals.";
  }
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
    return;
  }
  state.meals.forEach((meal) => {
    const item = document.createElement("div");
    item.className = "meal-item";
    if (state.currentMealId === meal.id) {
      item.classList.add("is-active");
    }
    item.innerHTML = `<span>${meal.name}</span>`;
    item.addEventListener("click", () => setMealForm(meal));
    elements.meals.list.appendChild(item);
  });
}

function renderFollowupOptions() {
  elements.meals.followupMeal.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "None";
  elements.meals.followupMeal.appendChild(empty);
  state.meals.forEach((meal) => {
    const option = document.createElement("option");
    option.value = String(meal.id);
    option.textContent = meal.name;
    elements.meals.followupMeal.appendChild(option);
  });
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
    (meal.ingredients || []).forEach((ingredient) =>
      addIngredientRow(ingredient)
    );
    if ((meal.ingredients || []).length === 0) {
      addIngredientRow();
    }
    elements.meals.delete.disabled = false;
  } else {
    state.currentMealId = null;
    elements.meals.title.textContent = "Create meal";
    elements.meals.followupMeal.value = "";
    form.elements.followup_offset.value = 1;
    form.elements.followup_required.checked = false;
    elements.meals.nutritionUnknown.checked = false;
    addIngredientRow();
    elements.meals.delete.disabled = true;
  }

  toggleNutrition();
  renderMealsList();
}

function addIngredientRow(values = {}) {
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
  unit.placeholder = "Unit";
  unit.value = values.unit ?? "";
  unit.dataset.field = "unit";

  const category = document.createElement("input");
  category.placeholder = "Category";
  category.value = values.category ?? "";
  category.dataset.field = "category";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "ghost";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => row.remove());

  row.appendChild(name);
  row.appendChild(quantity);
  row.appendChild(unit);
  row.appendChild(category);
  row.appendChild(remove);

  elements.meals.ingredients.appendChild(row);
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
  if (state.currentMealId) {
    await apiSend(`/api/meals/${state.currentMealId}`, "PUT", payload);
  } else {
    const created = await apiSend("/api/meals", "POST", payload);
    if (created?.id) {
      state.currentMealId = created.id;
    }
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
    const unit = row.querySelector("[data-field='unit']").value.trim();
    const category = row.querySelector("[data-field='category']").value.trim();
    if (!name) return;
    ingredients.push({
      name,
      quantity: quantityRaw === "" ? null : parseFloat(quantityRaw),
      unit: unit || null,
      category: category || null,
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
    meal_id: null,
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
      meal_id: null,
    })),
  };
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "0";
  return value % 1 === 0 ? value.toString() : value.toFixed(1);
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
