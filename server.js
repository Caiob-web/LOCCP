// server.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();

// Configura pool reutilizável
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Rota /api/poste?cp=XXX[&cs=YYY]
app.get('/api/poste', async (req, res) => {
  const { cp, cs } = req.query;
  if (!cp) return res.status(400).json({ error: "cp é obrigatório" });
  const cpNum = parseInt(cp, 10);
  const csNum = cs !== undefined ? parseInt(cs, 10) : null;
  if (isNaN(cpNum) || (cs !== undefined && isNaN(csNum))) {
    return res.status(400).json({ error: "CP/CS inválidos" });
  }

  try {
    let query, params;
    if (csNum !== null) {
      query = `
        SELECT cp, cs, municipio, endereco, bairro, et, cp_serie, cs_serie,
               latitude, longitude
        FROM dados_poste
        WHERE cp = $1 AND cs = $2
        LIMIT 1
      `;
      params = [cpNum, csNum];
    } else {
      query = `
        SELECT cp, municipio, endereco, bairro, et, cp_serie,
               latitude, longitude
        FROM dados_poste
        WHERE cp = $1
        LIMIT 1
      `;
      params = [cpNum];
    }

    const { rows } = await pool.query(query, params);
    if (rows.length === 0) {
      return res
        .status(404)
        .send(csNum !== null ? "CP + CS não encontrado." : "CP não encontrado.");
    }

    const row = rows[0];
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

    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Rota estática do seu index.html e script.js (se quiser servir pelo Express)
app.use(express.static('public'));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
