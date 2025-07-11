// api/[...slug].js
// Serverless wrapper para Vercel, com rota de ping e ajustes para evitar 504

const serverless = require('serverless-http');
const express    = require('express');
const { Pool }   = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());

// ─── Configuração do Pool ──────────────────────────────────────────────────────
// Usa variáveis atômicas do Neon (PGUSER, PGPASSWORD, PGHOST, PGDATABASE, PGPORT)
// SSL sem validação de certificado e timeouts para evitar pendências
const pool = new Pool({
  user:                    process.env.PGUSER,
  password:                process.env.PGPASSWORD,
  host:                    process.env.PGHOST,
  database:                process.env.PGDATABASE,
  port:                    parseInt(process.env.PGPORT, 10),
  ssl:                     { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,   // 5s para falhar se não conectar
  idleTimeoutMillis:       10000,  // 10s para fechar conexões ociosas
});

console.log('✅ Serverless function initialized. DB Pool created.');

// ─── Rota de diagnóstico rápido ───────────────────────────────────────────────
// Testa se a função está respondendo sem envolver banco de dados
app.get('/ping', (_req, res) => {
  res.status(200).json({ pong: true });
});

// ─── Health-check: GET /api/health ─────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('❌ Health-check failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Buscar um poste: GET /api/poste?cp=...&cs=... ─────────────────────────────
app.get('/poste', async (req, res) => {
  const { cp, cs } = req.query;
  console.log(`🔍 /api/poste called with cp=${cp}, cs=${cs}`);

  if (!cp) {
    return res.status(400).json({ erro: "Parâmetro 'cp' é obrigatório" });
  }

  const isCs = Boolean(cs);
  const sql = isCs
    ? `SELECT * FROM localizacao_cp_cs WHERE cp = $1 AND cs = $2 LIMIT 1`
    : `SELECT * FROM localizacao_cp WHERE cp = $1 LIMIT 1`;
  const params = isCs ? [cp, cs] : [cp];

  try {
    const { rows } = await pool.query(sql, params);
    console.log(`➡️ DB returned ${rows.length} row(s)`);

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Poste não encontrado' });
    }
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('❌ Query error:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

// ─── Listar todos os postes: GET /api/postes ────────────────────────────────────
app.get('/postes', async (_req, res) => {
  console.log('🔍 /api/postes called');
  try {
    const { rows } = await pool.query(
      `SELECT cp, cs, municipio, coordenadas
       FROM localizacao_cp_cs
       WHERE coordenadas IS NOT NULL`
    );
    console.log(`➡️ DB returned ${rows.length} ponto(s)`);
    return res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Error fetching all postes:', err);
    return res.status(500).json({ erro: 'Erro ao buscar coordenadas' });
  }
});

// ─── Fallback para rotas não encontradas ────────────────────────────────────────
app.use((_req, res) => {
  console.warn(`⚠️ 404 on ${_req.method} ${_req.originalUrl}`);
  res.status(404).json({ erro: 'Not Found' });
});

// ─── Exporta como Serverless Function em /api ─────────────────────────────────
module.exports = serverless(app, { basePath: '/api' });
