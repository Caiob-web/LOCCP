// server.js
// Servidor Express para desenvolvimento local e deploy em ambiente que suporte always-on

const express = require("express");
const { Pool } = require("pg");
const path = require("path");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// ─── Configuração do Pool ────────────────────────────────────────────────
// Usando variáveis atômicas: PGUSER, PGPASSWORD, PGHOST, PGDATABASE, PGPORT
// Adiciona SSL sem validação de certificado e timeouts para evitar pendências
const pool = new Pool({
  user:                    process.env.PGUSER,
  password:                process.env.PGPASSWORD,
  host:                    process.env.PGHOST,
  database:                process.env.PGDATABASE,
  port:                    parseInt(process.env.PGPORT, 10),
  ssl:                     { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,   // 5s para erro de conexão
  idleTimeoutMillis:       10000,  // 10s para fechar conexões ociosas
});
console.log("✅ DB Pool initialized for local dev");

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─── Health-check endpoint ─────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("❌ Health-check failed:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Página principal ─────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ─── Buscar poste por CP ou CP+CS ─────────────────────────────────────────
app.get("/api/poste", async (req, res) => {
  const { cp, cs } = req.query;
  console.log(`🔍 /api/poste called with`, { cp, cs });

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
    console.error("❌ Query error on /api/poste:", err);
    return res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

// ─── Listar todos os pontos para o mapa ────────────────────────────────────
app.get("/api/postes", async (_req, res) => {
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
    console.error("❌ Error fetching /api/postes:", err);
    return res.status(500).json({ erro: "Erro ao buscar coordenadas" });
  }
});

// ─── Inicia servidor ───────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`✅ Servidor rodando em http://localhost:${port}`);
});
