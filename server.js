// server.js
require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();

// 1) Sirva os estáticos de /public (index.html, script.js, mapa.html…)
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

// 3) GET /api/poste?cp=XXX[&cs=YYY]
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
    let result, row;

    if (csNum !== null) {
      // CP + CS: juntamos a tabela de CP (para cp_serie) com a tabela de CP_CS (para cs_serie)
      result = await pool.query(
        `
          SELECT
            csTable.cp,
            csTable.cs,
            cpTable.cp_serie   AS cp_serie,
            csTable.cs_serie   AS cs_serie,
            csTable.et,
            csTable.coordenadas
          FROM localizacao_cp_cs AS csTable
          JOIN localizacao_cp    AS cpTable
            ON csTable.cp = cpTable.cp
          WHERE csTable.cp = $1
            AND csTable.cs = $2
          LIMIT 1
        `,
        [cpNum, csNum]
      );
    } else {
      // Somente CP: consulta direta na tabela localizacao_cp
      result = await pool.query(
        `
          SELECT
            cp,
            cp_serie,
            et,
            coordenadas
          FROM localizacao_cp
          WHERE cp = $1
          LIMIT 1
        `,
        [cpNum]
      );
    }

    if (result.rows.length === 0) {
      return res
        .status(404)
        .send(csNum !== null ? "CP + CS não encontrado." : "CP não encontrado.");
    }

    row = result.rows[0];
    // Monte o objeto conforme o modo
    const item = {
      cp: row.cp,
      ...(csNum !== null && { cs: row.cs }),
      cp_serie: row.cp_serie,
      ...(csNum !== null && { cs_serie: row.cs_serie }),
      et: row.et,
      coordenadas: row.coordenadas, // já vem no formato "lat,lon"
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
