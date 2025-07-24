// server.js
require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();

// 1) Sirva os arquivos estáticos de /public (index.html, script.js, mapa.html, etc.)
app.use(express.static(path.join(__dirname, "public")));

// 2) Configure o pool do Postgres (Neon)
const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!connectionString) {
  console.error("ERRO: defina DATABASE_URL ou NEON_DATABASE_URL no Vercel.");
  process.exit(1);
}
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

// 3) Rota GET /api/poste?cp=XXX[&cs=YYY]
app.get("/api/poste", async (req, res) => {
  console.log("Chamou /api/poste com:", req.query);
  const { cp, cs } = req.query;

  if (!cp) {
    return res.status(400).json({ error: "Parâmetro 'cp' é obrigatório." });
  }
  const cpNum = parseInt(cp, 10);
  const csNum = cs !== undefined ? parseInt(cs, 10) : null;
  if (isNaN(cpNum) || (cs !== undefined && isNaN(csNum))) {
    return res.status(400).json({ error: "CP e CS devem ser números válidos." });
  }

  try {
    let queryText, params;

    if (csNum !== null) {
      // busca por CP + CS na tabela localizacao_cp_cs
      queryText = `
        SELECT
          cp,
          cs,
          cp_serie,
          cs_serie,
          et,
          coordenadas
        FROM localizacao_cp_cs
        WHERE cp = $1 AND cs = $2
        LIMIT 1
      `;
      params = [cpNum, csNum];
    } else {
      // busca só por CP na tabela localizacao_cp
      queryText = `
        SELECT
          cp,
          cp_serie,
          et,
          coordenadas
        FROM localizacao_cp
        WHERE cp = $1
        LIMIT 1
      `;
      params = [cpNum];
    }

    const result = await pool.query(queryText, params);
    if (result.rows.length === 0) {
      return res
        .status(404)
        .send(csNum !== null ? "CP + CS não encontrado." : "CP não encontrado.");
    }

    const row = result.rows[0];
    // monta o objeto de resposta para o front-end
    const item = {
      cp: row.cp,
      ...(csNum !== null && { cs: row.cs }),
      cp_serie: row.cp_serie,
      ...(csNum !== null && { cs_serie: row.cs_serie }),
      et: row.et,
      coordenadas: row.coordenadas, // já vem como "lat,lon"
    };

    return res.json(item);
  } catch (err) {
    console.error("Erro na consulta ao banco:", err);
    return res
      .status(500)
      .json({ error: err.message || "Erro interno no servidor." });
  }
});

// 4) Inicia o servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
