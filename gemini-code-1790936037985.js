const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/* ================= API ROUTES ================= */

// 1. GET MENU
app.get('/api/menu', async (req, res) => {
  try {
    const isTomorrow = req.query.tomorrow === 'true';
    const result = await pool.query(
      'SELECT * FROM menu_items WHERE is_tomorrow = $1 ORDER BY id DESC',
      [isTomorrow]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. ADD MENU ITEM
app.post('/api/menu', async (req, res) => {
  const { name, price, category, is_tomorrow, badge, image_url } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO menu_items (name, price, category, is_tomorrow, badge, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, price, category, is_tomorrow || false, badge || 'New', image_url || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. CHECKOUT ORDER
app.post('/api/orders', async (req, res) => {
  const { customer_name, order_type, subtotal, items } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderRes = await client.query(
      'INSERT INTO orders (customer_name, order_type, subtotal) VALUES ($1, $2, $3) RETURNING id',
      [customer_name, order_type, subtotal]
    );
    const orderId = orderRes.rows[0].id;

    for (let item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, price) VALUES ($1, $2, $3, $4, $5)',
        [orderId, item.id, item.name, item.qty, item.price]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 4. GET QUEUE
app.get('/api/queue', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM queue_tickets WHERE status != 'Completed' ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET TICKET
app.post('/api/queue', async (req, res) => {
  const { customer_name, service_type } = req.body;
  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM queue_tickets');
    const ticketNum = parseInt(countRes.rows[0].count) + 1;

    const result = await pool.query(
      'INSERT INTO queue_tickets (ticket_number, customer_name, service_type) VALUES ($1, $2, $3) RETURNING *',
      [ticketNum, customer_name, service_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. RESERVATIONS
app.get('/api/reservations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reservations ORDER BY reservation_date ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reservations', async (req, res) => {
  const { customer_name, contact_no, party_size, reservation_date, time_slot } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO reservations (customer_name, contact_no, party_size, reservation_date, time_slot) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [customer_name, contact_no, party_size, reservation_date, time_slot]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));