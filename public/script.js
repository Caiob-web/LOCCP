// script.js

// Função principal para buscar e exibir os dados da API
async function buscar(event) {
  event.preventDefault();

  const modo = document.querySelector('input[name="modo"]:checked').value;
  const cp = parseInt(document.getElementById("cp").value.trim(), 10);
  const cs = parseInt(document.getElementById("cs").value.trim(), 10);
  const resultadoDiv = document.getElementById("resultado");

  // Validações
  if (modo === "cp" && isNaN(cp)) {
    resultadoDiv.textContent = "Por favor, preencha o número da CP.";
    return;
  }
  if (modo === "cp_cs" && (isNaN(cp) || isNaN(cs))) {
    resultadoDiv.textContent = "Por favor, preencha CP e CS com valores válidos.";
    return;
  }

  toggleLoading(true);

  try {
    // URL corrigida apontando para /api/poste
    const url =
      modo === "cp_cs"
        ? `/api/poste?cp=${cp}&cs=${cs}`
        : `/api/poste?cp=${cp}`;
    const response = await fetch(url);

    if (!response.ok) {
      resultadoDiv.textContent =
        modo === "cp" ? "CP não encontrado." : "CP + CS não encontrado.";
      return;
    }

    const item = await response.json();
    mostrarResultado(item, modo);
  } catch (error) {
    resultadoDiv.textContent = "Erro ao buscar dados.";
    console.error(error);
  } finally {
    toggleLoading(false);
  }
}

// Função para exibir o resultado, adaptada para cada modo
function mostrarResultado(item, modo) {
  const resultadoDiv = document.getElementById("resultado");

  if (!item) {
    resultadoDiv.textContent =
      modo === "cp" ? "CP não encontrado." : "CP + CS não encontrado.";
    return;
  }

  const gps = item.coordenadas || "Coordenadas não disponíveis";
  const linkCoordenadas = gps.includes(",")
    ? `https://www.google.com/maps?q=${gps}`
    : "#";

  if (modo === "cp_cs") {
    resultadoDiv.innerHTML = `
      <p><strong>CP:</strong> ${item.cp}</p>
      <p><strong>CS:</strong> ${item.cs}</p>
      <p><strong>Município:</strong> ${item.municipio || "N/A"}</p>
      <p><strong>Endereço:</strong> ${item.endereco || "N/A"}</p>
      <p><strong>Bairro:</strong> ${item.bairro || "N/A"}</p>
      <p><strong>ET:</strong> ${item.et || "N/A"}</p>
      <p><strong>CS Série:</strong> ${item.cs_serie || "N/A"}</p>
      <p><strong>Localização:</strong> <a href="${linkCoordenadas}" target="_blank">Abrir no Google Maps</a></p>
    `;
  } else {
    resultadoDiv.innerHTML = `
      <p><strong>CP:</strong> ${item.cp}</p>
      <p><strong>CP Série:</strong> ${item.cp_serie || "N/A"}</p>
      <p><strong>ET:</strong> ${item.et || "N/A"}</p>
      <p><strong>Localização:</strong> <a href="${linkCoordenadas}" target="_blank">Abrir no Google Maps</a></p>
    `;
  }
}

// Mostra/esconde o indicador de carregamento
function toggleLoading(show) {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) overlay.style.display = show ? "flex" : "none";
}

// Atualiza quais campos aparecem no formulário
function atualizarCamposVisiveis() {
  const modo = document.querySelector('input[name="modo"]:checked').value;
  document.getElementById("grupo-cp").style.display = "block";
  document.getElementById("grupo-cs").style.display =
    modo === "cp_cs" ? "block" : "none";
}

// Hooks de evento
document.getElementById("limparBtn").addEventListener("click", () => {
  document.getElementById("cp").value = "";
  document.getElementById("cs").value = "";
  document.getElementById("resultado").textContent = "";
});
document.getElementById("buscaForm").addEventListener("submit", buscar);
document
  .querySelectorAll('input[name="modo"]')
  .forEach((r) => r.addEventListener("change", atualizarCamposVisiveis));
window.addEventListener("DOMContentLoaded", atualizarCamposVisiveis);

// Abre o mapa em nova aba
document.getElementById("mapaBtn").addEventListener("click", () => {
  window.open("/mapa.html", "_blank");
});
