// server.js
require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();

// 1) Sirva arquivos estáticos de /public
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
    let result;
    if (csNum !== null) {
      // busca por CP+CS unindo cp para pegar cp_serie
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
      // busca apenas CP
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

    const row = result.rows[0];
    const item = {
      cp: row.cp,
      ...(csNum !== null && { cs: row.cs }),
      cp_serie: row.cp_serie,
      ...(csNum !== null && { cs_serie: row.cs_serie }),
      et: row.et,
      coordenadas: row.coordenadas,
    };

    return res.json(item);
  } catch (err) {
    console.error("Erro na consulta ao banco:", err);
    return res
      .status(500)
      .json({ error: err.message || "Erro interno no servidor." });
  }
});

// 4) GET /api/postes → retorna listas de todos os CP e todos os CP+CS,
//    opcionalmente filtrando apenas pelos que estão dentro de uma bounding box
app.get("/api/postes", async (req, res) => {
  try {
    const { minLat, minLon, maxLat, maxLon } = req.query;
    let cpQuery = `
      SELECT cp, cp_serie, et, coordenadas
      FROM localizacao_cp
    `;
    let csQuery = `
      SELECT cp, cs, cs_serie, et, coordenadas
      FROM localizacao_cp_cs
    `;
    const params = [];

    if (minLat && minLon && maxLat && maxLon) {
      // filtra apenas os pontos dentro da bounding box
      const filter = `
        WHERE
          (split_part(coordenadas, ',', 1)::float BETWEEN $1 AND $3)
        AND (split_part(coordenadas, ',', 2)::float BETWEEN $2 AND $4)
      `;
      cpQuery += filter;
      csQuery += filter;
      params.push(minLat, minLon, maxLat, maxLon);
    }

    const cpRs = await pool.query(cpQuery, params);
    const csRs = await pool.query(csQuery, params);

    const cpList = cpRs.rows.map(r => ({
      tipo: "CP",
      cp: r.cp,
      cp_serie: r.cp_serie,
      et: r.et,
      coords: r.coordenadas.split(",").map(Number)
    }));
    const csList = csRs.rows.map(r => ({
      tipo: "CP+CS",
      cp: r.cp,
      cs: r.cs,
      cs_serie: r.cs_serie,
      et: r.et,
      coords: r.coordenadas.split(",").map(Number)
    }));

    res.json({ cpList, csList });
  } catch (err) {
    console.error("Erro em /api/postes:", err);
    res.status(500).json({ error: err.message });
  }
});

// 5) Inicia o servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
