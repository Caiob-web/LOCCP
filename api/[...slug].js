// api/[...slug].js
// Serverless wrapper para Vercel, com timeout e roteamento correto

const serverless = require("serverless-http");
const express    = require("express");
const { Pool }   = require("pg");
require("dotenv").config();

const app = express();
app.use(express.json());

// Configuração do pool com SSL e timeout de conexão
const pool = new Pool({
  user:                    process.env.PGUSER,
  password:                process.env.PGPASSWORD,
  host:                    process.env.PGHOST,
  database:                process.env.PGDATABASE,
  port:                    parseInt(process.env.PGPORT, 10),
  ssl:                     { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,  // 5s para falhar se não conectar
  idleTimeoutMillis:       10000, // 10s antes de fechar conexões ociosas
});

console.log("✅ Serverless function loaded. DB pool:", {
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
  ssl: true,
});

// Health‑check: GET /api/health
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("❌ Health‑check failed:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Buscar um poste: GET /api/poste?cp=...&cs=...
app.get("/poste", async (req, res) => {
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
      return res.status(404).json({ erro: "Poste não encontrado" });
    }
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("❌ Query error:", err);
    return res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

// Listar todos os postes: GET /api/postes
app.get("/postes", async (req, res) => {
  console.log("🔍 /api/postes called");
  try {
    const { rows } = await pool.query(
      `SELECT cp, cs, municipio, coordenadas
       FROM localizacao_cp_cs
       WHERE coordenadas IS NOT NULL`
    );
    console.log(`➡️ DB returned ${rows.length} pontos`);
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error fetching all postes:", err);
    return res.status(500).json({ erro: "Erro ao buscar coordenadas" });
  }
});

// Se nenhuma rota bateu, retorna 404 JSON
app.use((req, res) => {
  console.warn(`⚠️ 404 on ${req.method} ${req.url}`);
  res.status(404).json({ erro: "Not Found" });
});

// Exporta o handler, removendo automaticamente o prefixo '/api'
module.exports = serverless(app, { basePath: "/api" });
