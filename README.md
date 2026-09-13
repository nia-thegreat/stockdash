# 📦 StockDash

A full-stack inventory and sales management dashboard for managing products, tracking stock, recording sales, and monitoring business performance.

## ✨ Features

* 📊 Dashboard with inventory and sales statistics
* 📦 Add and manage products
* 🔢 Track available stock
* ⚠️ Low-stock alerts
* 💰 Record sales and automatically update stock
* 📈 Visualize recent sales
* 🔄 Real-time data from MySQL database
* 📱 Responsive dashboard interface

## 🛠️ Tech Stack

**Frontend**

* React
* Vite
* Tailwind CSS
* Recharts

**Backend**

* Node.js
* Express.js

**Database**

* MySQL

## 📁 Project Structure

```text
StockDash/
├── client/          # React frontend
├── server/          # Express backend
├── AGENTS.md        # Project development context
└── package.json
```

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/nia-thegreat/stockdash
cd StockDash
```

### 2. Install dependencies

```bash
npm install

cd server
npm install

cd ../client
npm install
```

### 3. Set up MySQL

Create a MySQL database and run the SQL file:

```bash
mysql -u root -p < server/schema.sql
```

### 4. Configure environment variables

Create a `.env` file inside the `server` folder:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=inventory_db
PORT=5001
```

### 5. Run the project

From the root folder:

```bash
npm run dev
```

The application will run on:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5001
```

## 🎯 Future Improvements

* Vehicle and car-part categorization
* Supplier management
* Advanced sales reports
* Search and filtering
* User authentication and roles
* Inventory history and analytics

## 👩‍💻 Developer

**Nia**

Built as a full-stack project to explore inventory management, REST APIs, React, and MySQL.

## 📄 License

This project is licensed under the MIT License.
