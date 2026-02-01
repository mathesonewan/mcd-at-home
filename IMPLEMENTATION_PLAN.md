# Implementation Plan — mcd-at-home
App name: **Mum Says There’s McDonald’s at Home**  
Repo: `mcd-at-home`

Purpose: Build a tiny LAN-only meal planner that reduces dinner decision friction and produces a shopping list. Keep scope minimal and predictable.

---

## Guardrails (read first)

### Non-features (do not implement)
- Photos
- Pantry/inventory tracking
- Ratings/favourites/likes/comments
- Recommendations/suggestions
- User accounts/auth (LAN only)
- Cloud services
- Third-party integrations (nutrition entered manually)
- Mobile app
- AI features

### Tech constraints
- Backend: Node.js + Express
- DB: SQLite (single file)
- Frontend: static HTML/CSS/vanilla JS (no frameworks, no build step)
- Docker: single container + one volume + one port (added after app works normally)

### Code constraints
- Minimal dependencies (no ORM)
- Readable > clever
- Prefer explicit behaviour over magic
- Keep file count small
- All config via env vars: `PORT`, `DB_PATH`

---

## Repo structure (authoritative)

- `app/` contains runtime code
- `app/public/` contains static frontend
- `data/` is a sibling directory used for SQLite persistence and is not committed

---

## Phase 1 — Backend foundation (no frontend, no Docker)

### Goal
A local server that boots reliably, creates/opens the SQLite database, initialises schema idempotently, and exposes minimal REST endpoints.

### Tasks
1. Create `app/package.json` with dependencies:
   - `express`
   - `better-sqlite3`
   - dev: `nodemon`
2. Implement `db.js`:
   - Reads `DB_PATH` env var (dev default points at `./data/meals.db` from repo root)
   - Opens DB and runs schema initialisation
3. Implement `schema.sql`:
   - Idempotent `CREATE TABLE IF NOT EXISTS ...`
4. Implement `server.js`:
   - Express server
   - JSON middleware
   - Serves static files from `public/` (placeholder until Phase 2)
   - Binds to `0.0.0.0` and uses `PORT` env var

### Minimal API (must exist)
Meals:
- `GET /api/meals`
- `GET /api/meals/:id`
- `POST /api/meals`
- `PUT /api/meals/:id`
- `DELETE /api/meals/:id`

Weeks (keyed by `week_start` YYYY-MM-DD):
- `GET /api/weeks/:week_start`
- `PUT /api/weeks/:week_start`

Computed:
- `GET /api/weeks/:week_start/shopping-list`

### Acceptance checks
- Server starts with `npm run dev`
- DB file is created automatically if missing
- CRUD works via curl/Postman
- Schema init can run multiple times without error
- Shopping list endpoint correctly merges ingredients by exact `name + unit`

---

## Phase 2 — Frontend MVP (still no Docker)

### Goal
A usable in-browser experience: plan a week, generate shopping list, manage meals.

### Tasks
1. `public/index.html`:
   - Single-page layout with three views:
     - Planner
     - Shopping List
     - Meals
2. `public/app.js`:
   - Fetch meals
   - Load/save week plan
   - Render planner slots
   - Generate shopping list view
   - Meal CRUD UI
3. `public/styles.css`:
   - Minimal styling, readable on phone

### Behaviour rules (must implement)

#### Week selection (date-aware)
- Week starts Monday
- App determines which week to show by date
- If no plan exists for that week, show empty slots

#### Leftover follow-up meals
Meal may define:
- `leftover_followup_meal_id` (optional)
- `leftover_followup_offset_days` (default 1)
- `leftover_followup_required` (boolean)

When selecting a meal in the planner:
- If follow-up exists, calculate target day
- If target day is empty: auto-fill follow-up
- If target day has different meal:
  - Show conflict warning
  - Do not overwrite

#### Shopping list merge rules
- Merge only when `ingredient.name + ingredient.unit` match exactly
- If units differ, keep separate lines
- Group by category when present
- Provide:
  - checklist
  - copy-to-clipboard (plain text)
  - print

#### Nutrition
Stored per meal per serving:
- `kcal`, `protein_g`, `carbs_g`, `fat_g`, `fibre_g`
- Optional `source`
- Allow `nutrition_unknown`

Planner must show:
- Weekly totals for kcal, P/C/F/Fibre
- If some meals unknown, indicate partial totals (“Totals based on X of 7 meals”)

### Acceptance checks
- Plan week, refresh page, plan persists
- Leftover follow-up auto-fill works and conflicts are visible
- Shopping list merges correctly and copy/print works
- Meals can be created/edited/deleted
- Nutrition totals behave correctly with partial data

---

## Phase 3 — Docker packaging (after Phase 2 passes)

### Goal
Run the complete app in Docker with persistent storage and LAN access.

### Tasks
1. Add `Dockerfile` (recommended base: `node:lts-slim`)
2. Add `docker-compose.yml`:
   - One service: app
   - Ports: `3000:3000`
   - Volume: `./data:/data`
   - Env:
     - `DB_PATH=/data/meals.db`
     - `PORT=3000`
3. Add `.dockerignore` (node_modules, data/meals.db, etc.)

### Acceptance checks
- `docker compose up --build` starts successfully
- App reachable at `http://localhost:3000`
- Create a meal, restart container, meal persists
- Access via another LAN device using host IP (optional but recommended)

---

## Phase 4 — NAS deployment (out of scope until Phase 3 complete)

### Goal
Copy repo to NAS, run compose, mount persistent data path.

### Acceptance checks
- Runs on NAS with persistent volume
- Backups are “copy the SQLite file”

---

## Notes on testing
Focus on simple functional checks:
- API endpoint sanity
- Persistence across restart
- Leftover follow-up behaviour
- Shopping list merge correctness

Avoid adding a testing framework until the app exists and is stable.

---