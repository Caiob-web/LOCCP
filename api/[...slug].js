// api/[...slug].js
const serverless = require("serverless-http");
const express     = require("express");
const { Pool }    = require("pg");
require("dotenv").config();

const app = express();
app.use(express.json());

// Configuração do pool com SSL  
const pool = new Pool({
  user:     process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host:     process.env.PGHOST,
  database: process.env.PGDATABASE,
  port:     parseInt(process.env.PGPORT, 10),
  ssl:      { rejectUnauthorized: false },
});

// Health-check
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("health failed:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Buscar um poste
app.get("/api/poste", async (req, res) => {
  const { cp, cs } = req.query;
  if (!cp) return res.status(400).json({ erro: "`cp` é obrigatório" });

  const isCs = Boolean(cs);
  const sql = isCs
    ? `SELECT * FROM localizacao_cp_cs WHERE cp=$1 AND cs=$2 LIMIT 1`
    : `SELECT * FROM localizacao_cp WHERE cp=$1 LIMIT 1`;
  const params = isCs ? [cp, cs] : [cp];

  try {
    const { rows } = await pool.query(sql, params);
    if (!rows.length) return res.status(404).json({ erro: "Poste não encontrado" });
    res.json(rows[0]);
  } catch (err) {
    console.error("query error:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

// Listar todos
app.get("/api/postes", async (_, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cp, cs, municipio, coordenadas 
       FROM localizacao_cp_cs 
      WHERE coordenadas IS NOT NULL`
    );
    res.json(rows);
  } catch (err) {
    console.error("fetch all error:", err);
    res.status(500).json({ erro: "Erro ao buscar coordenadas" });
  }
});

// Deixe o Express servir também sua pasta estática
const path = require("path");
app.use(express.static(path.join(__dirname, "..")));

module.exports = serverless(app);
