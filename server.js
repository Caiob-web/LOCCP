const express = require("express");
const { Pool } = require("pg");
const path = require("path");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Conexão com NeonDB
const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
  ssl: { rejectUnauthorized: false },
});

// Servir arquivos estáticos (index.html, mapa.html, etc)
app.use(express.static(path.join(__dirname)));

// Página principal
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Buscar poste por CP ou por CP + CS em tabelas diferentes
app.get("/api/poste", async (req, res) => {
  const { cp, cs } = req.query;

  if (!cp) {
    return res.status(400).json({ erro: "Parâmetro 'cp' é obrigatório" });
  }

  let query;
  let params;

  if (cs) {
    // Busca na tabela CP + CS
    query = `
      SELECT *
      FROM localizacao_cp_cs
      WHERE cp = $1 AND cs = $2
      LIMIT 1
    `;
    params = [cp, cs];
  } else {
    // Busca na tabela apenas CP
    query = `
      SELECT *
      FROM localizacao_cp
      WHERE cp = $1
      LIMIT 1
    `;
    params = [cp];
  }

  try {
    const { rows } = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ erro: "Poste não encontrado" });
    }

    res.json(rows[0]);
  } catch (erro) {
    console.error("Erro ao consultar o banco:", erro);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

// Listar todos os pontos com coordenadas para o mapa
app.get("/api/postes", async (_, res) => {
  try {
    const query = `
      SELECT cp, cs, municipio, coordenadas
      FROM localizacao_cp_cs
      WHERE coordenadas IS NOT NULL
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (erro) {
    console.error("Erro ao buscar coordenadas:", erro);
    res.status(500).json({ erro: "Erro ao buscar coordenadas" });
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`✅ Servidor rodando em http://localhost:${port}`);
});
