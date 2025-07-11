const express = require("express");
const { Pool } = require("pg");
const path = require("path");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Configuração do pool com SSL forçado
const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  port: parseInt(process.env.PGPORT, 10),
  ssl: { rejectUnauthorized: false },
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Health‐check endpoint
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ ok: true });
  } catch (err) {
    console.error("Health‐check failed:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Página principal
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Buscar poste por CP ou por CP + CS em tabelas diferentes
app.get("/api/poste", async (req, res) => {
  const { cp, cs } = req.query;
  console.log("-> /api/poste params:", { cp, cs });

  if (!cp) {
    return res.status(400).json({ erro: "Parâmetro 'cp' é obrigatório" });
  }

  console.log("-> Conectando ao banco com:", {
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    port: process.env.PGPORT,
    ssl: true,
  });

  const isCs = Boolean(cs);
  const query = isCs
    ? `SELECT * FROM localizacao_cp_cs WHERE cp = $1 AND cs = $2 LIMIT 1`
    : `SELECT * FROM localizacao_cp WHERE cp = $1 LIMIT 1`;
  const params = isCs ? [cp, cs] : [cp];

  try {
    const { rows } = await pool.query(query, params);
    console.log("-> DB returned rows:", rows);

    if (rows.length === 0) {
      return res.status(404).json({ erro: "Poste não encontrado" });
    }
    return res.json(rows[0]);
  } catch (erro) {
    console.error("Erro ao consultar o banco:", erro);
    return res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

// Listar todos os pontos com coordenadas para o mapa
app.get("/api/postes", async (_, res) => {
  console.log("-> /api/postes chamada");
  try {
    const { rows } = await pool.query(
      `SELECT cp, cs, municipio, coordenadas
       FROM localizacao_cp_cs
       WHERE coordenadas IS NOT NULL`
    );
    console.log("-> total de rows retornadas:", rows.length);
    return res.json(rows);
  } catch (erro) {
    console.error("Erro ao buscar coordenadas:", erro);
    return res.status(500).json({ erro: "Erro ao buscar coordenadas" });
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`✅ Servidor rodando em http://localhost:${port}`);
});
