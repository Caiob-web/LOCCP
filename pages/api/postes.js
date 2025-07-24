// pages/api/poste.js

import { Pool } from 'pg';

let pool;

// Reuse pool across invocations to avoid exhausting connections
if (!global._postePool) {
  global._postePool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
    // caso precise de SSL explícito:
    ssl: {
      rejectUnauthorized: false,
    },
  });
}
pool = global._postePool;

/**
 * GET /api/poste?cp=519
 * GET /api/poste?cp=519&cs=243
 */
export default async function handler(req, res) {
  const { cp, cs } = req.query;

  if (!cp) {
    return res
      .status(400)
      .json({ error: "Parâmetro 'cp' é obrigatório." });
  }

  const cpNum = parseInt(cp, 10);
  const csNum = cs !== undefined ? parseInt(cs, 10) : null;

  if (isNaN(cpNum) || (cs !== undefined && isNaN(csNum))) {
    return res
      .status(400)
      .json({ error: "CP e CS devem ser números válidos." });
  }

  try {
    let query, params;

    if (csNum !== null) {
      // Busca por CP + CS
      query = `
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
      // Busca só por CP
      query = `
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

    const { rows } = await pool.query(query, params);

    if (rows.length === 0) {
      return res
        .status(404)
        .send(csNum !== null ? "CP + CS não encontrado." : "CP não encontrado.");
    }

    const row = rows[0];

    // Concatena latitude e longitude no formato "lat,lon"
    const coordenadas =
      row.latitude != null && row.longitude != null
        ? `${row.latitude},${row.longitude}`
        : null;

    // Monta objeto de saída
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

    return res.status(200).json(item);
  } catch (err) {
    console.error("Erro na consulta:", err);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
}
