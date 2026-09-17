# AGENTS.md

## Project

Full-stack Inventory & Sales Dashboard: React (Vite + Tailwind) frontend in `/client`, Node.js Express + MySQL (`mysql2`) backend in `/server`. Monorepo with a root `package.json` that runs both.

## Setup

```bash
# 1. Install dependencies
npm install                    # root (concurrently)
cd server && npm install
cd client && npm install

# 2. Set up the database
mysql -u root -p < server/schema.sql   # creates inventory_db + tables + seed data
# Existing databases created before the invoice feature need this one-time migration:
#   ALTER TABLE sales ADD COLUMN invoice_number VARCHAR(40) NULL;
#   CREATE UNIQUE INDEX idx_sales_invoice_number ON sales (invoice_number);
# Existing databases created before the activity log need this one-time migration:
#   CREATE TABLE IF NOT EXISTS activities (
#     id BIGINT AUTO_INCREMENT PRIMARY KEY,
#     action_type VARCHAR(40) NOT NULL,
#     category ENUM('inventory','sales') NOT NULL,
#     entity_type VARCHAR(20) NOT NULL,
#     entity_id INT NULL,
#     description VARCHAR(255) NOT NULL,
#     details JSON NULL,
#     actor VARCHAR(100) NOT NULL DEFAULT 'system',
#     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
#     INDEX idx_activities_created (created_at),
#     INDEX idx_activities_category_created (category, created_at)
#   );
# Existing databases created before the settings feature need this one-time migration:
#   CREATE TABLE IF NOT EXISTS settings (
#     id TINYINT PRIMARY KEY DEFAULT 1,
#     monthly_goal_enabled TINYINT(1) NOT NULL DEFAULT 0,
#     monthly_goal DECIMAL(12,2) NULL,
#     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
#   );
#   INSERT IGNORE INTO settings (id) VALUES (1);

# 3. Configure environment
cp server/.env.example server/.env    # then edit DB_PASSWORD etc.
```

## Commands

```bash
npm run dev        # from root — starts API (port 5001) and Vite dev server (port 5173) via concurrently
cd server && npm run dev   # API only, auto-restarts on change (node --watch)
cd client && npm run dev   # frontend only
cd client && npm run build # production build to client/dist
```

## API

Base URL: `http://localhost:5001` (Vite proxies `/api` → `5001` in dev).

| Method | Route             | Purpose                                                   |
| ------ | ----------------- | --------------------------------------------------------- |
| GET    | `/api/health`     | Health + DB connectivity check                            |
| GET    | `/api/parts`      | List all parts                                            |
| POST   | `/api/parts`      | Add part `{ name, stock_quantity, price }`                |
| PUT    | `/api/parts/:id`  | Partial update (any of name/stock_quantity/price)         |
| DELETE | `/api/parts/:id`  | Delete part — 409 if it has sales history                  |
| POST   | `/api/sales`      | Log sale `{ part_id, quantity_sold }` — transactional stock decrement, 400 if insufficient, computes `total_amount`, assigns a unique `INV-<uuid>` `invoice_number` |
| GET    | `/api/sales/:id/invoice.pdf` | PDF invoice for a sale (PDFKit, server-side from stored rows — never reads the part's current price). `?download=1` → `attachment` (download), otherwise inline. 404 if the sale has no `invoice_number` (pre-invoice rows). |
| GET    | `/api/sales`      | Sales with `part_name` (JOIN parts), `sold_at` as `DATE_FORMAT('%Y-%m-%d %H:%i')` string, newest first. Optional server-side filters: `search` (LIKE part name), `from`/`to` (YYYY-MM-DD, inclusive range). |
| GET    | `/api/sales/analytics` | Filtered aggregates, zero-filled time series (day/month buckets), and top 5 parts. Params: `search`, `from`, `to`, `bucket=day|month`. Returns `{ summary, timeseries, topParts }` |
| GET    | `/api/activities` | Append-only activity/audit log, newest first. Params: `category=all|inventory|sales` (default `all`), `limit` (default 20, max 100), `offset`. Returns `{ activities, total, limit, offset }`. **Read-only** — records are written only by the backend after a successful mutation (part add/edit/delete, sale). `part_edited` details capture `changes` (name/stock/price from→to); `sale_recorded` details carry quantity/total/`invoice_number`/stock before+after. No write/delete endpoint exists. |
| GET    | `/api/settings` | App settings from the single-row `settings` table: `{ monthly_goal_enabled: boolean, monthly_goal: number\|null }` |
| PUT    | `/api/settings` | Update settings. Validates: `monthly_goal_enabled` must be boolean; when enabling, `monthly_goal` must be a finite number > 0 (≤ 1e12, rounded to cents) or it returns **400**; disabling may send a null goal. Returns the saved shape. Changes are NOT written to the activity log (settings are configuration, not business actions). |

## Frontend

- **Routing**: SPA uses **React Router** (`react-router-dom`). Routes: `/dashboard`, `/inventory`, `/sales`, `/activity`, `/settings`; `/` and unknown paths redirect to `/dashboard`. Vite's default SPA fallback serves `index.html` on direct load of any route path in dev.
- **Structure**: `src/App.jsx` is thin — `BrowserRouter > StockDashProvider > AppLayout` (layout route) with `<Route>` children for the four pages. Page components live in `src/pages/` (`Dashboard`, `Inventory`, `Sales`, `Settings`). Presentational components live in `src/components/`. Layout (fixed sidebar + mobile drawer + sticky header with route title + global error banner + `<Outlet/>`) lives in `src/layouts/`. Sidebar active (blue) state is route-derived via `NavLink` `isActive`.
- **Data & API**: all shared state, fetching, and mutations live in `src/context/StockDashContext.jsx` (`useStockDash()`). It fetches `GET /api/parts` + `GET /api/sales` (filtered rows) + `GET /api/sales/analytics` (summary + time series + top parts) + last-30-days overview series in parallel on mount. `handleAddPart` does `POST /api/parts`, `handleLogSale` does `POST /api/sales` (server decrements stock), `handleUpdatePart`/`handleDeletePart` do `PUT`/`DELETE /api/parts/:id` — each then refetches. One provider feeds every page, so mutations reflect everywhere.
- Sales filtering is **server-side**: the context owns `salesQuery` (`{ search, range: all|today|week|month|custom, customFrom, customTo }`), maps it to `search`/`from`/`to` query params via `buildSalesParams()` (in `src/utils/salesFilters.js`), and refetches both `/api/sales` and `/api/sales/analytics` together on a 300 ms debounce (separate `historyLoading` so the layout doesn't flicker). `SalesAnalytics` shows the active scope in a pill (e.g. `12 sales · This week`). `this-week` = Monday → today; `this-month` = 1st → today. Chart granularity is `day` for spans ≤ 45 days, `month` beyond that.
- `SalesAnalytics` + `SalesOverviewChart` use **Recharts v3** (`BarChart`) — installed, not a dev-dependency.
- Invoices: `POST /api/sales` returns the sale row including its `INV-<uuid>` `invoice_number`; `handleLogSale` returns that row to `SaleForm`, which shows a success card with **View Invoice** (`window.open('/api/sales/<id>/invoice.pdf')`) and **Download PDF** (fetch blob → programmatic download via `?download=1`). PDFs are generated server-side with `pdfkit` from stored rows (`total_amount`) so old invoices keep the price recorded at sale time.
- Dashboard metrics (inventory value, total parts, low-stock count) are derived in `src/pages/Dashboard.jsx` and rendered by `StatsCards`; `LOW_STOCK_THRESHOLD` lives in `src/utils/constants.js`; only the parts list itself is fetched.
- **Monthly sales goal**: `GET/PUT /api/settings` back a single-row `settings` table (goal enabled bool + target). `StockDashContext` holds `settings` + `monthlyRevenue` (current **calendar month** revenue, computed by calling the existing `/api/sales/analytics` with `from=<1st of month>&to=<today>`, `bucket=day` — no duplicated sales math, refreshed on every mutation). Dashboard renders `src/components/MonthlyGoalCard.jsx` only when `monthly_goal_enabled`; it derives `pct = revenue/target*100`, `remaining = max(target - revenue, 0)`, and a time-aware status (green `≥ 100%` or on-track vs % of month elapsed, amber slightly behind, red behind). `src/pages/Settings.jsx` is the toggle + target form (status messages, disabled input when off). No goal history is stored; changing the target applies going forward.
- **Activity history**: `src/pages/Activity.jsx` renders `src/components/ActivityHistory.jsx` (compact timeline cards + All/Inventory/Sales pills + "Load more" pagination). Data lives in `StockDashContext` (`activities`, `activityCategory`, `activityTotal`, fetch/load-more/category-change) and refreshes automatically after mutations. Timestamps reuse `formatSaleDate`. **Read-only UI** — there is no way to edit/delete activities.
- **Duplicate part detection**: `server/index.js` normalizes names (trim → lowercase → collapse whitespace → sorted words) and returns **409** `{ error, duplicate: { id, name, stock_quantity } }` from `POST /api/parts` and `PUT /api/parts/:id` (edit excludes itself) when a match exists. Advisory only — clients resend with `force: true` to bypass ("Add Anyway"). The frontend normalizes with the same logic in `src/utils/duplicates.js`; warning panels live in `AddProductForm` and `EditPartModal`. No DB constraint (intentional duplicates allowed).
- Tailwind v3 (config-based), not v4.

## Gotchas

- Data model is `parts` + `sales` (FK `sales.part_id → parts.id`) — **not** `products`/`product_id`; keep that naming everywhere.
- The `parts` update route uses `COALESCE(?, col)` so partial updates don't violate `NOT NULL` on name/price.
- Sales route must use a MySQL transaction (`SELECT ... FOR UPDATE` + decrement) — keep it that way.
- `GET /api/sales/analytics` timeseries must `GROUP BY` the CTE alias (`dates.day` or `months.m`) or the same `DATE_FORMAT` expression as the SELECT, or MySQL 8's `sql_mode=only_full_group_by` rejects it.
- Don't `SELECT DATE(sold_at)` and JSON-serialize it — mysql2 turns `DATE` into a timezone-shifted JS Date. Use `DATE_FORMAT(sold_at, ...)` to return plain strings for series labels.
- The zero-filled time series uses a recursive CTE (`WITH RECURSIVE dates`) + `LEFT JOIN` on a `sold_at >= day AND sold_at < day + INTERVAL 1 DAY` range (or months variant) — keeps every bucket present even on days/months without sales and avoids `DATE()` in the join.
- DB credentials live in `server/.env` (gitignored) — never hardcode.
- `sales.invoice_number` is nullable (pre-invoice rows) with a unique index; the invoice PDF endpoint 404s when it's `NULL` and always renders from stored rows (never `parts.price`).
- We're on Tailwind v3 (config-based), not v4.