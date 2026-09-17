require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
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

// Deterministic duplicate detection: normalize a part name so casing, extra
// spacing, and word order all compare equal ("Brake Fluid" ≈ "FLUID   BRAKE").
function normalizePartName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .split(' ')
    .sort()
    .join(' ');
}

// Look for an existing part whose normalized name matches the candidate,
// ignoring `excludeId` (used when editing so a part never flags itself).
// Returns the matching row ({ id, name, stock_quantity }) or null.
async function findDuplicatePart(candidateName, excludeId) {
  const normalized = normalizePartName(candidateName);
  const [rows] = await pool.query('SELECT id, name, stock_quantity FROM parts');
  return (
    rows.find(
      (row) => row.id !== excludeId && normalizePartName(row.name) === normalized
    ) || null
  );
}

// Add a new part
app.post('/api/parts', async (req, res) => {
  const { name, stock_quantity, price, force } = req.body;

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
    // Warn about potential duplicates (unless the user chose "Add Anyway").
    // The check is advisory only — intentional duplicate records stay allowed.
    if (!force) {
      const duplicate = await findDuplicatePart(name, null);
      if (duplicate) {
        return res.status(409).json({
          error: 'A part with a similar name already exists',
          duplicate,
        });
      }
    }

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

  const { name, stock_quantity, price, force } = req.body;

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
    // If renaming, warn about potential duplicates (self excluded) unless the
    // user chose "Add Anyway". Advisory only — intentional duplicates allowed.
    if (!force && name !== undefined) {
      const duplicate = await findDuplicatePart(name, id);
      if (duplicate) {
        return res.status(409).json({
          error: 'A part with a similar name already exists',
          duplicate,
        });
      }
    }

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

// Shared helper: validate the sales query params (search/from/to) and build
// the WHERE clause + parameters. Returns { error } or { whereSql, params }.
// Used by both GET /api/sales and GET /api/sales/analytics so every metric
// shares exactly the same filter.
function buildSalesFilter(req) {
  const { search, from, to } = req.query;

  if (search !== undefined && search.length > 100) {
    return { error: 'Search must be 100 characters or fewer' };
  }

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  function isValidDate(value) {
    if (!DATE_RE.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }
  if (from !== undefined && from !== '' && !isValidDate(from)) {
    return { error: 'from must be a valid date (YYYY-MM-DD)' };
  }
  if (to !== undefined && to !== '' && !isValidDate(to)) {
    return { error: 'to must be a valid date (YYYY-MM-DD)' };
  }

  const conditions = [];
  const params = [];
  if (search) {
    conditions.push("parts.name LIKE CONCAT('%', ?, '%')");
    params.push(search);
  }
  if (from) {
    conditions.push('sales.sold_at >= ?');
    params.push(from);
  }
  if (to) {
    conditions.push('sales.sold_at < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(to);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereSql, params };
}

// Get sales history with part names, newest first.
// Optional query params (all filtering done in MySQL):
//   search=<text>  partial match on part name
//   from=YYYY-MM-DD / to=YYYY-MM-DD  inclusive date range
app.get('/api/sales', async (req, res) => {
  const filter = buildSalesFilter(req);
  if (filter.error) {
    return res.status(400).json({ error: filter.error });
  }

  try {
    const [rows] = await pool.query(`
      SELECT sales.id, sales.part_id, parts.name AS part_name,
             sales.quantity_sold, sales.total_amount,
             DATE_FORMAT(sales.sold_at, '%Y-%m-%d %H:%i') AS sold_at
      FROM sales
      JOIN parts ON parts.id = sales.part_id
      ${filter.whereSql}
      ORDER BY sales.sold_at DESC, sales.id DESC
    `, filter.params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Sales analytics for the SAME filter as GET /api/sales: aggregate summary,
// a zero-filled time series, and the top-selling parts. Everything is computed
// in MySQL so all metrics share one consistent date range.
//   bucket=day|month  → time-series granularity (client picks by range length)
// Returns: { summary: {revenue, units_sold, transactions, avg_sale_value},
//            timeseries: [{label, quantity, revenue}], topParts: [...], }
function toYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

app.get('/api/sales/analytics', async (req, res) => {
  const filter = buildSalesFilter(req);
  if (filter.error) {
    return res.status(400).json({ error: filter.error });
  }

  const { bucket } = req.query;
  if (bucket !== 'day' && bucket !== 'month') {
    return res.status(400).json({ error: 'bucket must be "day" or "month"' });
  }

  const { from, to } = req.query;

  try {
    // Aggregate summary
    const [summaryRows] = await pool.query(`
      SELECT COALESCE(SUM(sales.total_amount), 0) AS revenue,
             COALESCE(SUM(sales.quantity_sold), 0) AS units_sold,
             COUNT(*) AS transactions,
             COALESCE(AVG(sales.total_amount), 0) AS avg_sale_value
      FROM sales
      JOIN parts ON parts.id = sales.part_id
      ${filter.whereSql}
    `, filter.params);
    const summary = {
      revenue: Number(summaryRows[0].revenue),
      units_sold: Number(summaryRows[0].units_sold),
      transactions: Number(summaryRows[0].transactions),
      avg_sale_value: Number(summaryRows[0].avg_sale_value),
    };

    // Top-selling parts (by units sold), top 5
    const [topRows] = await pool.query(`
      SELECT parts.name AS part_name,
             COALESCE(SUM(sales.quantity_sold), 0) AS units_sold,
             COALESCE(SUM(sales.total_amount), 0) AS revenue,
             COUNT(*) AS sales_count
      FROM sales
      JOIN parts ON parts.id = sales.part_id
      ${filter.whereSql}
      GROUP BY sales.part_id, parts.name
      ORDER BY units_sold DESC, revenue DESC
      LIMIT 5
    `, filter.params);
    const topParts = topRows.map((r) => ({
      part_name: r.part_name,
      units_sold: Number(r.units_sold),
      revenue: Number(r.revenue),
      sales_count: Number(r.sales_count),
    }));

    // Zero-filled time series (revenue + units), day or month granularity
    let timeseries;
    if (bucket === 'day') {
      const today = new Date();
      const start = from || toYMD(new Date(today.getTime() - 29 * 86400000));
      const end = to || toYMD(today);
      const [series] = await pool.query(`
        WITH RECURSIVE dates AS (
          SELECT ? AS day
          UNION ALL
          SELECT day + INTERVAL 1 DAY FROM dates WHERE day < ?
        )
        SELECT DATE_FORMAT(dates.day, '%Y-%m-%d') AS label,
               COALESCE(SUM(sales.quantity_sold), 0) AS quantity,
               COALESCE(SUM(sales.total_amount), 0) AS revenue
        FROM dates
        LEFT JOIN sales
          ON sales.sold_at >= dates.day
         AND sales.sold_at < dates.day + INTERVAL 1 DAY
        GROUP BY dates.day
        ORDER BY dates.day ASC
      `, [start, end]);
      timeseries = series.map((r) => ({
        label: r.label,
        quantity: Number(r.quantity),
        revenue: Number(r.revenue),
      }));
    } else {
      // month bucket — no from/to means All Time, starting at the earliest sale
      let monthStart;
      if (from) {
        monthStart = `${from.slice(0, 7)}-01`;
      } else {
        const [minRow] = await pool.query("SELECT DATE_FORMAT(MIN(sold_at), '%Y-%m-01') AS m FROM sales");
        monthStart = minRow[0].m || toYMD(new Date()).slice(0, 8) + '01';
      }
      const monthEnd = to ? `${to.slice(0, 7)}-01` : `${toYMD(new Date()).slice(0, 7)}-01`;
      const [series] = await pool.query(`
        WITH RECURSIVE months AS (
          SELECT ? AS m
          UNION ALL
          SELECT m + INTERVAL 1 MONTH FROM months WHERE m < DATE_FORMAT(?, '%Y-%m-01')
        )
        SELECT DATE_FORMAT(months.m, '%Y-%m') AS label,
               COALESCE(SUM(sales.quantity_sold), 0) AS quantity,
               COALESCE(SUM(sales.total_amount), 0) AS revenue
        FROM months
        LEFT JOIN sales
          ON sales.sold_at >= months.m
         AND sales.sold_at < months.m + INTERVAL 1 MONTH
        GROUP BY months.m
        ORDER BY months.m ASC
      `, [monthStart, monthEnd]);
      timeseries = series.map((r) => ({
        label: r.label,
        quantity: Number(r.quantity),
        revenue: Number(r.revenue),
      }));
    }

    res.json({ summary, timeseries, topParts });
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

    // Record the sale with its unique invoice number
    const invoice_number = `INV-${crypto.randomUUID()}`;
    const [result] = await conn.query(
      'INSERT INTO sales (part_id, quantity_sold, total_amount, invoice_number) VALUES (?, ?, ?, ?)',
      [part_id, quantity_sold, total_amount, invoice_number]
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

// PDF invoice for a sale — generated server-side from the stored sale data so
// old invoices always reflect the price recorded at the time of the sale.
app.get('/api/sales/:id/invoice.pdf', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid sale ID' });
  }

  try {
    const [rows] = await pool.query(`
      SELECT sales.id, sales.quantity_sold, sales.total_amount,
             sales.invoice_number,
             DATE_FORMAT(sales.sold_at, '%Y-%m-%d %H:%i:%s') AS sold_at,
             parts.name AS part_name
      FROM sales
      JOIN parts ON parts.id = sales.part_id
      WHERE sales.id = ?
    `, [id]);

    const sale = rows[0];
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    // Sales recorded before invoices existed have no number and no invoice
    if (!sale.invoice_number) {
      return res.status(404).json({ error: 'No invoice for this sale' });
    }

    const unitPrice = Number(sale.total_amount) / sale.quantity_sold;
    const money = (value) => `$${Number(value).toFixed(2)}`;

    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const blue = '#1d4ed8';
    const gray = '#6b7280';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      req.query.download === '1'
        ? `attachment; filename="invoice-${sale.invoice_number.substring(4)}.pdf"`
        : 'inline'
    );
    doc.pipe(res);

    // Logo/header area
    doc.fillColor(blue).fontSize(26).font('Helvetica-Bold').text('StockDash', { continued: false });
    doc.fillColor(gray).fontSize(10).font('Helvetica').text('Auto parts & accessories', 48, doc.y);

    // INVOICE label (right)
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#111827')
      .text('INVOICE', { align: 'right' });

    // Supplier + invoice metadata block
    const metaY = doc.y + 10;
    doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold').text('StockDash', 48, metaY);
    doc.fillColor(gray).fontSize(9).font('Helvetica');
    doc.text('123 Auto Parts Lane', 48, metaY + 13);
    doc.text('Anytown, USA', 48, metaY + 24);
    doc.text(`Invoice #: ${sale.invoice_number}`, { align: 'right' });
    doc.text(`Date: ${sale.sold_at}`, { align: 'right' });

    // Billed-to block (customer details come later; quick sales have no customer)
    const billedY = doc.y + 24;
    doc.fillColor(gray).fontSize(9).text('BILLED TO', 48, billedY);
    doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold').text('Walk-in customer', 48, billedY + 13);

    // Items table
    const tableTop = doc.y + 28;
    const colPart = 48;
    const colQty = 340;
    const colPrice = 420;
    const colTotal = 505;

    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9);
    doc.text('PART', colPart, tableTop);
    doc.text('QTY', colQty, tableTop);
    doc.text('UNIT PRICE', colPrice, tableTop);
    doc.text('TOTAL', colTotal, tableTop);

    doc.moveTo(48, tableTop + 14).lineTo(547, tableTop + 14).strokeColor('#d1d5db').lineWidth(1).stroke();

    doc.fillColor('#111827').font('Helvetica').fontSize(10);
    doc.text(sale.part_name, colPart, tableTop + 24);
    doc.text(String(sale.quantity_sold), colQty, tableTop + 24);
    doc.text(money(unitPrice), colPrice, tableTop + 24);
    doc.text(money(sale.total_amount), colTotal, tableTop + 24);

    doc.moveTo(48, tableTop + 40).lineTo(547, tableTop + 40).strokeColor('#d1d5db').lineWidth(1).stroke();

    // Totals
    const totalsY = tableTop + 54;
    doc.font('Helvetica').fontSize(10).fillColor('#111827');
    doc.text('Subtotal', 460, totalsY, { align: 'right' });
    doc.text(money(sale.total_amount), 505, totalsY);
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total', 460, totalsY + 18, { align: 'right' });
    doc.text(money(sale.total_amount), 505, totalsY + 18);

    // Footer
    doc.font('Helvetica').fontSize(9).fillColor(gray);
    doc.text('Thank you for your business!', 48, 780, { align: 'center' });
    doc.text('StockDash · Auto parts & accessories', 48, 794, { align: 'center' });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
