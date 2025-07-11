// script.js
// Lógica de front-end para LOCCP — CP e CP+CS

// Elementos do DOM
const cpInput       = document.getElementById("cp");
const csInput       = document.getElementById("cs");
const resultadoDiv  = document.getElementById("resultado");
const loadingOverlay = document.getElementById("loading-overlay");
const radiosModo    = document.querySelectorAll("input[name='modo']");
const grupoCS       = document.getElementById("grupo-cs");
const form          = document.getElementById("buscaForm");
const btnLimpar     = document.getElementById("limparBtn");
const btnMapa       = document.getElementById("mapaBtn");

// Base da API (ex: https://seuapp.vercel.app)
const API_BASE = window.location.origin;

// Mostra/esconde o overlay de loading
function toggleLoading(show) {
  loadingOverlay.style.display = show ? "flex" : "none";
}

// Atualiza visibilidade do campo CS
function atualizarModo() {
  const modo = document.querySelector("input[name='modo']:checked").value;
  grupoCS.style.display = modo === "cp_cs" ? "block" : "none";
}

// Formata e dispara a busca
async function buscar(event) {
  event.preventDefault();
  const modo = document.querySelector("input[name='modo']:checked").value;
  const cp   = cpInput.value.trim();
  const cs   = csInput.value.trim();

  // Validações
  if (!cp) {
    resultadoDiv.textContent = "Por favor, preencha o número da CP.";
    return;
  }
  if (modo === "cp_cs" && !cs) {
    resultadoDiv.textContent = "Por favor, preencha o número da CS.";
    return;
  }

  toggleLoading(true);
  resultadoDiv.textContent = "";

  // Monta URL da API
  const params = new URLSearchParams({ cp });
  if (modo === "cp_cs") params.append("cs", cs);
  const url = `${API_BASE}/api/poste?${params.toString()}`;

  try {
    console.log("🔍 Chamando API:", url);
    const res = await fetch(url);
    console.log("➡️ Status:", res.status);

    if (!res.ok) {
      resultadoDiv.textContent = modo === "cp"
        ? "CP não encontrado."
        : "CP + CS não encontrado.";
      return;
    }

    const data = await res.json();
    mostrarResultado(data, modo);

  } catch (err) {
    console.error("❌ Erro de conexão:", err);
    resultadoDiv.textContent = "Erro de conexão, tente novamente.";
  } finally {
    toggleLoading(false);
  }
}

// Renderiza resultado no DOM
function mostrarResultado(item, modo) {
  const coords = item.coordenadas || "";
  const linkMapa = coords
    ? `https://www.google.com/maps?q=${coords}`
    : "#";

  if (modo === "cp_cs") {
    resultadoDiv.innerHTML = `
      <p><strong>Município:</strong> ${item.municipio || "N/A"}</p>
      <p><strong>Endereço:</strong> ${item.endereco || "N/A"}</p>
      <p><strong>Bairro:</strong> ${item.bairro || "N/A"}</p>
      <p><strong>ET:</strong> ${item.et || "N/A"}</p>
      <p><strong>CS Série:</strong> ${item.cs_serie || "N/A"}</p>
      <p><strong>Localização:</strong> <a href="${linkMapa}" target="_blank">Abrir no Google Maps</a></p>
    `;
  } else {
    resultadoDiv.innerHTML = `
      <p><strong>CP Série:</strong> ${item.cp_serie || "N/A"}</p>
      <p><strong>ET:</strong> ${item.et || "N/A"}</p>
      <p><strong>Localização:</strong> <a href="${linkMapa}" target="_blank">Abrir no Google Maps</a></p>
    `;
  }
}

// Hooks de evento
radiosModo.forEach(r => r.addEventListener("change", atualizarModo));
form.addEventListener("submit", buscar);
btnLimpar.addEventListener("click", () => {
  cpInput.value = "";
  csInput.value = "";
  resultadoDiv.textContent = "";
});
btnMapa.addEventListener("click", () => {
  window.open("/mapa.html", "_blank");
});

// Inicialização
atualizarModo();
