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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
