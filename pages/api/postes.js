// pages/api/poste.js

/**
 * Handler para buscar dados de poste por CP ou CP+CS.
 * Uso:
 *  GET /api/poste?cp=519
 *  GET /api/poste?cp=519&cs=243
 */
export default async function handler(req, res) {
  const { cp, cs } = req.query;

  // CP é obrigatório
  if (!cp) {
    return res
      .status(400)
      .json({ error: "Parâmetro 'cp' é obrigatório." });
  }

  const cpNum = parseInt(cp, 10);
  const csNum = cs !== undefined ? parseInt(cs, 10) : null;

  // validação numérica
  if (isNaN(cpNum) || (cs !== undefined && isNaN(csNum))) {
    return res
      .status(400)
      .json({ error: "CP e CS devem ser números válidos." });
  }

  // TODO: implementar busca real no banco de dados
  // Exemplo de retorno mínimo:
  const item = {
    cp: cpNum,
    cs: csNum,
    municipio: null,
    endereco: null,
    bairro: null,
    et: null,
    cp_serie: null,
    cs_serie: null,
    coordenadas: null,
    // adicione aqui quaisquer outros campos que seu front espera
  };

  // Se não encontrar nada, retorne 404:
  // return res.status(404).send(csNum !== null ? "CP + CS não encontrado." : "CP não encontrado.");

  // Exemplo de sucesso
  return res.status(200).json(item);
}
