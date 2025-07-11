// script.js
// Lógica de front-end para buscar CP e CP+CS no LOCCP

// Elementos do DOM
const cpInput = document.getElementById("cp");
const csInput = document.getElementById("cs");
const resultadoDiv = document.getElementById("resultado");
const loadingOverlay = document.getElementById("loading-overlay");
const radioModo = document.querySelectorAll("input[name='modo']");
const grupoCS = document.getElementById("grupo-cs");

// Mostra ou esconde o campo CS
radioModo.forEach(radio => {
  radio.addEventListener("change", () => {
    if (radio.checked && radio.value === "cp_cs") {
      grupoCS.style.display = "block";
    } else if (radio.checked && radio.value === "cp") {
      grupoCS.style.display = "none";
    }
  });
});

// Função para mostrar/esconder o loading
function toggleLoading(show) {
  loadingOverlay.style.display = show ? "flex" : "none";
}

// Função principal de busca
async function buscar(event) {
  event.preventDefault();
  const modo = document.querySelector("input[name='modo']:checked").value;
  const cp = cpInput.value.trim();
  const cs = csInput.value.trim();

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
  const query = new URLSearchParams({ cp });
  if (modo === "cp_cs") query.append("cs", cs);
  const url = `${API_BASE}/api/poste?${query.toString()}`;
  console.log("Chamando API:", url);

  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    if (!res.ok) {
      resultadoDiv.textContent = modo === "cp" ? "CP não encontrado." : "CP + CS não encontrado.";
      return;
    }
    const data = await res.json();
    mostrarResultado(data, modo);
  } catch (err) {
    console.error("Erro ao buscar dados:", err);
    resultadoDiv.textContent = "Erro de conexão, tente novamente.";
  } finally {
    toggleLoading(false);
  }
}

document.getElementById("buscaForm").addEventListener("submit", buscar);
document.getElementById("limparBtn").addEventListener("click", () => {
  cpInput.value = "";
  csInput.value = "";
  resultadoDiv.textContent = "";
});
document.getElementById("mapaBtn").addEventListener("click", () => {
  window.open("/mapa.html", "_blank");
});

// Exibe os dados retornados
function mostrarResultado(item, modo) {
  const gps = item.coordenadas || "";
  const linkMapa = gps ? `https://www.google.com/maps?q=${gps}` : "#";

  if (modo === "cp_cs") {
    resultadoDiv.innerHTML = `
      <p><strong>Município:</strong> ${item.municipio || 'N/A'}</p>
      <p><strong>Endereço:</strong> ${item.endereco || 'N/A'}</p>
      <p><strong>Bairro:</strong> ${item.bairro || 'N/A'}</p>
      <p><strong>ET:</strong> ${item.et || 'N/A'}</p>
      <p><strong>CS Série:</strong> ${item.cs_serie || 'N/A'}</p>
      <p><strong>Localização:</strong> <a href="${linkMapa}" target="_blank">Abrir no Google Maps</a></p>
    `;
  } else {
    resultadoDiv.innerHTML = `
      <p><strong>CP Série:</strong> ${item.cp_serie || 'N/A'}</p>
      <p><strong>ET:</strong> ${item.et || 'N/A'}</p>
      <p><strong>Localização:</strong> <a href="${linkMapa}" target="_blank">Abrir no Google Maps</a></p>
    `;
  }
}
