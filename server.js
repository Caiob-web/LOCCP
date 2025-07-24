// server.js
require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();

// 1) Serve arquivos estáticos (index.html, script.js, mapa.html, etc.) da pasta /public
app.use(express.static(path.join(__dirname, "public")));

// 2) Configura pool do Postgres (Neon) com fallback de variável de ambiente
const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!connectionString) {
  console.error(
    "ERRO: variável de ambiente DATABASE_URL ou NEON_DATABASE_URL não encontrada."
  );
  process.exit(1);
}
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

// 3) Handler GET /api/poste?cp=XXX[&cs=YYY]
app.get("/api/poste", async (req, res) => {
  console.log("Chamou /api/poste com:", req.query);
  const { cp, cs } = req.query;

  // valida CP
  if (!cp) {
    return res.status(400).json({ error: "Parâmetro 'cp' é obrigatório." });
  }
  const cpNum = parseInt(cp, 10);
  const csNum = cs !== undefined ? parseInt(cs, 10) : null;
  if (isNaN(cpNum) || (cs !== undefined && isNaN(csNum))) {
    return res
      .status(400)
      .json({ error: "CP e CS devem ser números válidos." });
  }

  try {
    let queryText, params;
    if (csNum !== null) {
      // busca por CP + CS
      queryText = `
        SELECT
          cp,
          cs,
          municipio,
          endereco,
          bairro,
          et,
          cp_serie,
          cs_serie,
          latitude,
          longitude
        FROM dados_poste
        WHERE cp = $1 AND cs = $2
        LIMIT 1
      `;
      params = [cpNum, csNum];
    } else {
      // busca só por CP
      queryText = `
        SELECT
          cp,
          municipio,
          endereco,
          bairro,
          et,
          cp_serie,
          latitude,
          longitude
        FROM dados_poste
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
    const coordenadas =
      row.latitude != null && row.longitude != null
        ? `${row.latitude},${row.longitude}`
        : null;

    const item = {
      cp: row.cp,
      ...(csNum !== null && { cs: row.cs }),
      municipio: row.municipio,
      endereco: row.endereco,
      bairro: row.bairro,
      et: row.et,
      cp_serie: row.cp_serie,
      ...(csNum !== null && { cs_serie: row.cs_serie }),
      coordenadas,
    };

    return res.json(item);
  } catch (err) {
    console.error("Erro na consulta ao banco:", err);
    // retorna mensagem real do erro para facilitar diagnóstico
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
