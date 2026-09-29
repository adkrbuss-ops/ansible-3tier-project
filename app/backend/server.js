const express = require('express');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const app = express();

async function init() {
  for (let i = 0; i < 20; i++) {
    try {
      await pool.query('CREATE TABLE IF NOT EXISTS visits (id SERIAL PRIMARY KEY, at TIMESTAMPTZ DEFAULT now())');
      return;
    } catch (e) { console.log('waiting for db...', e.message); await new Promise(r => setTimeout(r, 3000)); }
  }
  process.exit(1);
}

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.get('/api/visits', async (_, res) => {
  try {
    await pool.query('INSERT INTO visits DEFAULT VALUES');
    const { rows } = await pool.query('SELECT count(*)::int AS count FROM visits');
    res.json({ visits: rows[0].count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

init().then(() => app.listen(process.env.PORT || 3000, () => console.log('backend up')));
