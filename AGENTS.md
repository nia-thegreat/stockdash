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
| POST   | `/api/sales`      | Log sale `{ part_id, quantity_sold }` — transactional stock decrement, 400 if insufficient, computes `total_amount` |
| GET    | `/api/sales`      | Sales with `part_name` (JOIN parts), `sold_at` as `DATE_FORMAT('%Y-%m-%d %H:%i')` string, newest first. Optional server-side filters: `search` (LIKE part name), `from`/`to` (YYYY-MM-DD, inclusive range). |
| GET    | `/api/sales/recent` | Sales aggregated by date, last 30 days                  |

## Frontend

- Components live in `client/src/components/` (`StatsCards`, `ProductList`, `AddProductForm`, `SaleForm`, `SalesChart`).
- All data is wired to the API: `App.jsx` fetches `GET /api/parts` + `GET /api/sales/recent` + `GET /api/sales` in parallel on mount; `handleAddPart` does `POST /api/parts` then refetches. `handleLogSale` does `POST /api/sales` (server decrements stock), then refetches with the active filters applied. `GET /api/sales` feeds `SalesHistory` (table/cards) + `SalesSummary` (revenue/units/transactions derived client-side from the MySQL rows).
- Sales filtering is **server-side**: `App.jsx` owns `salesQuery` (`{ search, range: all|today|week|month|custom, customFrom, customTo }`), maps it to `search`/`from`/`to` query params via `buildSalesParams()`, and refetches `/api/sales` on a 300 ms debounce (separate `historyLoading` so the chart/forms don't flicker). `SalesSummary` and `SalesHistory` both render the filtered array; `SalesSummary` shows the active scope in a pill (e.g. `12 sales · This week`). `this-week` = Monday → today; `this-month` = 1st → today.
- `SalesChart` uses **Recharts v3** (`BarChart`) — installed, not a dev-dependency.
- `GET /api/sales/recent` returns a **zero-filled 30-day series** (recursive CTE) so days without sales render as zero-height bars; never returns fewer than 30 rows except on error.
- Dashboard metrics (inventory value, total parts, low-stock count) are derived in `App.jsx` and rendered by `StatsCards`; only the parts list itself is fetched.
- Tailwind v3 (config-based), not v4.

## Gotchas

- Data model is `parts` + `sales` (FK `sales.part_id → parts.id`) — **not** `products`/`product_id`; keep that naming everywhere.
- The `parts` update route uses `COALESCE(?, col)` so partial updates don't violate `NOT NULL` on name/price.
- Sales route must use a MySQL transaction (`SELECT ... FOR UPDATE` + decrement) — keep it that way.
- `/api/sales/recent` must `GROUP BY` the **same** expression as the SELECT (`DATE_FORMAT`), or MySQL 8's `sql_mode=only_full_group_by` rejects it.
- Don't `SELECT DATE(sold_at)` and JSON-serialize it — mysql2 turns `DATE` into a timezone-shifted JS Date. Use `DATE_FORMAT(sold_at, '%Y-%m-%d')` (returns a plain string) and the chart expecting `{ date: 'YYYY-MM-DD', total_quantity }`.
- The zero-filled series uses a recursive CTE (`WITH RECURSIVE dates`) + `LEFT JOIN` on a `sold_at >= day AND sold_at < day + INTERVAL 1 DAY` range — keeps the 30-day guarantee and avoids `DATE()` in the join.
- DB credentials live in `server/.env` (gitignored) — never hardcode.
- We're on Tailwind v3 (config-based), not v4.