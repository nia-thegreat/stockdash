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
| POST   | `/api/sales`      | (Planned) Log sale `{ part_id, quantity_sold }` — transactional stock decrement |
| GET    | `/api/sales/recent` | (Planned) Sales aggregated by date, last 30 days          |

## Frontend

- Components live in `client/src/components/` (`StatsCards`, `ProductList`, `AddProductForm`, `SaleForm`, `SalesChart`).
- Currently **mock data** in `client/src/data.js` — not yet wired to the API. `App.jsx` holds state and passes handlers down as props (`onAddPart`, `onLogSale`).
- SalesChart is a dependency-free Tailwind bar chart — no Recharts installed.
- Tailwind v3 (config-based), not v4.

## Gotchas

- Data model is `parts` + `sales` (FK `sales.part_id → parts.id`) — **not** `products`/`product_id`; keep that naming everywhere.
- The `parts` update route uses `COALESCE(?, col)` so partial updates don't violate `NOT NULL` on name/price.
- Planned sales route must use a MySQL transaction (`SELECT ... FOR UPDATE` + decrement) — don't bypass it when you build it.
- DB credentials live in `server/.env` (gitignored) — never hardcode.
- We're on Tailwind v3 (config-based), not v4.