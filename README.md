# 🍔 Mum Says There’s McDonald’s at Home

*A tiny, LAN-only meal planner to stop us asking “what should we have for dinner?” every night and then eating garbage.*

This app exists to reduce domestic friction.  
It is not a lifestyle platform.  
It is not trying to change anyone’s relationship with food.  
It just picks dinners and tells us what to buy.

---

## What this is

- A **local web app** (LAN only)
- Used by **two people**
- Run in **Docker**
- Backed by **SQLite**
- Focused entirely on **planning dinners for a week** and generating a **shopping list**

Once it works, it should mostly disappear into the background and quietly do its job.

---

## What this is not 🚫

Explicit non-features. If any of these appear, something has gone wrong.

- ❌ No photos
- ❌ No pantry / inventory tracking
- ❌ No ratings, likes, favourites, or comments
- ❌ No recommendations or “suggested meals”
- ❌ No user accounts or authentication
- ❌ No cloud services
- ❌ No third-party integrations (nutrition is entered manually)
- ❌ No mobile app
- ❌ No AI telling us how we feel about dinner

---

## Core features

### 🗓️ Weekly planner
- Plan **7 dinners** (Monday → Sunday)
- Week is determined by date, not manually created
- If a new week has no plan, it appears empty and needs filling
- Meals are selected from a shared meal library

### ♻️ Leftover follow-up meals
Some meals *require* a follow-up meal using leftovers (e.g. roast chicken → chicken soup).

Behaviour:
- Selecting a meal with a follow-up:
  - Automatically fills the follow-up meal on the target day **if empty**
  - If the day already has a different meal:
    - Show a **conflict warning**
    - Do **not** overwrite
- Follow-ups can be:
  - **Required** (blocking conflict)
  - **Optional** (suggestion only)

---

### 🧾 Shopping list
- Aggregates ingredients from the selected week
- Ingredients are merged **only when name + unit match exactly**
- Different units stay separate
- Grouped by category if present (veg, meat, dairy, pantry, etc.)
- Supports:
  - checklist UI
  - copy to clipboard (plain text)
  - print (browser print)

---

### 🍽️ Meal library (CRUD)
Each meal includes:

#### Basics
- Name
- Optional tags (quick, air-fryer, freezer-friendly, etc.)

#### Ingredients
- Name
- Quantity
- Unit
- Optional category

#### Method
- Ordered list of plain-text steps
- No timers
- No guided cooking mode
- Just readable instructions

#### Nutrition (per serving)
Manually entered, typically calculated elsewhere (e.g. MyFitnessPal).

- Calories (kcal)
- Protein (g)
- Carbs (g)
- Fat (g)
- **Fibre (g)** ← included on principle
- Optional source note
- Meals may mark nutrition as “unknown”

Weekly planner shows:
- Total kcal, protein, carbs, fat, fibre
- If some meals have unknown nutrition, totals indicate partial coverage

---

## Technical overview

### Stack
- **Backend**: Node.js + Express
- **Database**: SQLite (single file)
- **Frontend**: Static HTML, CSS, vanilla JS
- **Hosting**: Docker (LAN only)

No frameworks. No build step. No ORM.

---

## Repository structure

mcd-at-home/
├─ app/
│  ├─ server.js
│  ├─ db.js
│  ├─ schema.sql
│  ├─ package.json
│  └─ public/
│     ├─ index.html
│     ├─ app.js
│     └─ styles.css
│
├─ data/           # SQLite DB lives here at runtime (not committed)
│  └─ .gitkeep
│
├─ Dockerfile
├─ docker-compose.yml
├─ .dockerignore
└─ README.md

---

## Configuration

All configuration is via environment variables.

- PORT  
  Default: 3000

- DB_PATH  
  Default (Docker): /data/meals.db  
  Default (dev): ./data/meals.db

The app must:
- bind to 0.0.0.0
- create the database automatically if it doesn’t exist
- initialise schema idempotently on startup

---

## Docker philosophy 🐳

Docker is used to:
- make the app portable
- allow painless migration from Windows → NAS
- avoid host-specific Node / SQLite issues

This app uses:
- **one container**
- **one volume**
- **one port**

That’s it.

---

## Persistence & backups
All state lives in a single SQLite file:

data/meals.db

Backing up this file backs up the entire app.

---

## Design constraints (important)

- Keep everything **boring and readable**
- Prefer explicit behaviour over clever behaviour
- No speculative features
- No “maybe later” hooks
- If it adds friction instead of removing it, it doesn’t belong here

---

## Project goal (in one sentence)

Stop us ordering takeaway because we’re tired and can’t decide what to cook.

If this app does that reliably, it has succeeded.
