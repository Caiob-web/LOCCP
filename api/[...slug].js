// api/[...slug].js
// Serverless functions para Vercel: ping, health, poste e postes

const serverless = require('serverless-http');
const express    = require('express');
const { Pool }   = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());

// Configuração do pool com SSL e timeouts
todo();
const pool = new Pool({
  user:                    process.env.PGUSER,
  password:                process.env.PGPASSWORD,
  host:                    process.env.PGHOST,
  database:                process.env.PGDATABASE,
  port:                    parseInt(process.env.PGPORT, 10),
  ssl:                     { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis:       10000,
});

console.log('✅ Serverless function initialized.');

// Rota de diagnóstico
app.get('/ping', (_req, res) => {
  res.status(200).json({ pong: true });
});

// Health-check: verifica conexão com o banco
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('❌ Health-check failed:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Buscar um poste por CP ou CP+CS
app.get('/poste', async (req, res) => {
  const { cp, cs } = req.query;
  if (!cp) {
    return res.status(400).json({ erro: "Parâmetro 'cp' é obrigatório" });
  }

  const isCs = Boolean(cs);
  const sql = isCs
    ? 'SELECT * FROM localizacao_cp_cs WHERE cp = $1 AND cs = $2 LIMIT 1'
    : 'SELECT * FROM localizacao_cp WHERE cp = $1 LIMIT 1';
  const params = isCs ? [cp, cs] : [cp];

  try {
    const { rows } = await pool.query(sql, params);
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Poste não encontrado' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('❌ Query error:', err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// Listar todos os postes que possuem coordenadas
app.get('/postes', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT cp, cs, municipio, coordenadas
      FROM localizacao_cp_cs
      WHERE coordenadas IS NOT NULL
    `);
    res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Fetch all error:', err);
    res.status(500).json({ erro: 'Erro ao buscar coordenadas' });
  }
});

// Exporta como Serverless Function em /api
module.exports = serverless(app, { basePath: '/api' });
