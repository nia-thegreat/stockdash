# StockDash — Inventory & Sales Dashboard

![OpenCode Badge](https://img.shields.io/badge/Built%20with-OpenCode-6366f1?style=flat-square&logo=opencode&logoColor=white)
![Git Badge](https://img.shields.io/badge/Git-initialized-000000?style=flat-square&logo=git&logoColor=white)
![Node.js Badge](https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=node.js&logoColor=white)
![React Badge](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![Tailwind CSS Badge](https://img.shields.io/badge/Tailwind-v3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![MySQL Badge](https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql&logoColor=white)

---

## Overview

StockDash is a full-stack inventory and sales management dashboard for retail stores. Track products, monitor stock levels, log sales, and visualize performance — all from a clean, responsive interface.

| Feature | Description |
|---|---|
| **Inventory value** | Real-time total value of all stock on hand |
| **Low-stock alerts** | Items below threshold highlighted instantly |
| **Product management** | Add and list products with stock + pricing |
| **Sale logging** | Sell items with transactional stock validation |
| **Sales chart** | 30-day bar chart of sales volume |

## Architecture

```
stockdash/
├── server/            # Node.js + Express API
│   ├── index.js       # Routes, middleware, stock transaction logic
│   ├── db.js          # MySQL connection pool (mysql2)
│   ├── schema.sql     # DDL + seed data
│   └── .env.example   # Required env vars
├── client/            # React (Vite) + Tailwind CSS
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── StatsCards.jsx
│           ├── ProductList.jsx
│           ├── AddProductForm.jsx
│           ├── SaleForm.jsx
│           └── SalesChart.jsx
├── AGENTS.md          # AI agent context for future sessions
└── package.json       # Root scripts (runs both via concurrently)
```

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **MySQL** ≥ 8
- **npm**

### Setup

```bash
# Clone / enter the repo
cd stockdash

# Install all dependencies
npm install
cd server && npm install
cd client && npm install

# Create database and seed data
mysql -u root -p < server/schema.sql

# Configure environment
cp server/.env.example server/.env
# Edit server/.env with your MySQL password
```

### Run

```bash
# Start both API and frontend
npm run dev
# → API:   http://localhost:5001
# → UI:    http://localhost:5173
```

Or run individually:

```bash
cd server && npm run dev   # API only (auto-restarts on change)
cd client && npm run dev   # Frontend only
```

## API Reference

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| `GET` | `/api/products` | — | List all products |
| `POST` | `/api/products` | `{ name, stock_quantity, price }` | Add a new product |
| `PUT` | `/api/products/:id` | any of `name`, `stock_quantity`, `price` | Update a product |
| `POST` | `/api/sales` | `{ product_id, quantity_sold }` | Log a sale (validates stock) |
| `GET` | `/api/sales/recent` | — | Aggregated sales, last 30 days |

**Error responses:** `400` for validation, `404` for missing product, `500` for server errors. The sale endpoint uses a MySQL transaction with `SELECT ... FOR UPDATE` to guarantee stock consistency.

## Tech Stack

| Layer | Tool | Version |
|---|---|---|
| Frontend | React + Vite | 18 + 6 |
| Styling | Tailwind CSS | 3.x |
| Charts | Recharts | 2.x |
| Backend | Express | 4.x |
| ORM/Driver | mysql2 | 3.x |
| Process manager | concurrently | 9.x |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DB_HOST` | Yes | MySQL host (typically `localhost`) |
| `DB_USER` | Yes | MySQL username |
| `DB_PASSWORD` | Yes | MySQL password |
| `DB_NAME` | Yes | Database name (`inventory_db`) |
| `PORT` | No | Server port (default `5001`) |

## Contributing

1. Create a feature branch
2. Make changes, ensure `npm run build` succeeds in `/client`
3. Test against a running MySQL instance
4. Open a pull request

## AI-Generated Code Notice

> **This project was built using the [OpenCode](https://opencode.ai) AI agent ecosystem.**
>
> The boilerplate, database schema, Express API, and React dashboard components
> were designed and generated through interactive sessions with OpenCode agents.
> The core architecture — including the transactional stock decrement logic,
> component structure, and API design — originated from AI-assisted development
> and was reviewed/validated before use.
>
> OpenCode provides session-aware AI agents that maintain project context across
> files and conversations, enabling rapid full-stack scaffolding with intentional,
> verifiable code output.
>
> Agent context is preserved in [`AGENTS.md`](./AGENTS.md) for continuity across
> future development sessions.

## License

MIT
