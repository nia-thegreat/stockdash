require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: err.message,
    });
  }
});

// Get all parts
app.get('/api/parts', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM parts ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Add a new part
app.post('/api/parts', async (req, res) => {
  const { name, stock_quantity, price } = req.body;

  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'name is required and must be a string' });
  }
  if (!Number.isInteger(stock_quantity) || stock_quantity < 0) {
    return res.status(400).json({ error: 'stock_quantity must be a non-negative integer' });
  }
  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'price must be a number greater than 0' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO parts (name, stock_quantity, price) VALUES (?, ?, ?)',
      [name.trim(), stock_quantity, price]
    );
    const [rows] = await pool.query('SELECT * FROM parts WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Update a part
app.put('/api/parts/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid part ID' });
  }

  const { name, stock_quantity, price } = req.body;

  // At least one field must be provided
  if (name === undefined && stock_quantity === undefined && price === undefined) {
    return res.status(400).json({ error: 'Provide at least one field to update' });
  }

  // Validate any provided field
  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }
  if (stock_quantity !== undefined && (!Number.isInteger(stock_quantity) || stock_quantity < 0)) {
    return res.status(400).json({ error: 'stock_quantity must be a non-negative integer' });
  }
  if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
    return res.status(400).json({ error: 'price must be a number greater than 0' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE parts SET name = COALESCE(?, name), stock_quantity = COALESCE(?, stock_quantity), price = COALESCE(?, price) WHERE id = ?',
      [
        name !== undefined ? name.trim() : null,
        stock_quantity !== undefined ? stock_quantity : null,
        price !== undefined ? price : null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Part not found' });
    }

    const [rows] = await pool.query('SELECT * FROM parts WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete a part (only if it has no sales history — blocks accidental data loss)
app.delete('/api/parts/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid part ID' });
  }

  try {
    // Refuse to delete parts that have linked sales rows
    const [salesCount] = await pool.query(
      'SELECT COUNT(*) AS count FROM sales WHERE part_id = ?',
      [id]
    );
    if (salesCount[0].count > 0) {
      return res.status(409).json({
        error: 'Cannot delete part: part has existing sales history.',
      });
    }

    const [result] = await pool.query('DELETE FROM parts WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Part not found' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Log a sale — transactional stock decrement
app.post('/api/sales', async (req, res) => {
  const { part_id, quantity_sold } = req.body;

  // Validate input
  if (!Number.isInteger(part_id) || part_id <= 0) {
    return res.status(400).json({ error: 'part_id must be a positive integer' });
  }
  if (!Number.isInteger(quantity_sold) || quantity_sold <= 0) {
    return res.status(400).json({ error: 'quantity_sold must be a positive integer' });
  }

  // Pull a dedicated connection so the transaction is isolated
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Lock the part's row — other sales on the same part will wait here
    const [parts] = await conn.query(
      'SELECT * FROM parts WHERE id = ? FOR UPDATE',
      [part_id]
    );

    if (parts.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Part not found' });
    }

    const part = parts[0];

    // Check stock BEFORE decrementing
    if (part.stock_quantity < quantity_sold) {
      await conn.rollback();
      return res.status(400).json({
        error: `Insufficient stock. Available: ${part.stock_quantity}`,
      });
    }

    // total_amount = price × quantity (rounded to cents)
    const total_amount = Math.round(Number(part.price) * quantity_sold * 100) / 100;

    // Decrease stock
    await conn.query(
      'UPDATE parts SET stock_quantity = stock_quantity - ? WHERE id = ?',
      [quantity_sold, part_id]
    );

    // Record the sale
    const [result] = await conn.query(
      'INSERT INTO sales (part_id, quantity_sold, total_amount) VALUES (?, ?, ?)',
      [part_id, quantity_sold, total_amount]
    );

    await conn.commit();

    const [rows] = await pool.query('SELECT * FROM sales WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Database error' });
  } finally {
    conn.release();
  }
});

// Recent sales — last 30 days, quantity sold per day (for the chart).
// Generates a full 30-day date series so days with no sales return 0.
app.get('/api/sales/recent', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      WITH RECURSIVE dates AS (
        SELECT CURDATE() - INTERVAL 29 DAY AS day
        UNION ALL
        SELECT day + INTERVAL 1 DAY FROM dates WHERE day < CURDATE()
      )
      SELECT DATE_FORMAT(dates.day, '%Y-%m-%d') AS date,
             COALESCE(SUM(sales.quantity_sold), 0) AS total_quantity
      FROM dates
      LEFT JOIN sales
        ON sales.sold_at >= dates.day
       AND sales.sold_at < dates.day + INTERVAL 1 DAY
      GROUP BY dates.day
      ORDER BY dates.day ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
