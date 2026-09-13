const axios = require("axios");

const API_URL = "https://api.anthropic.com/v1/messages";
// Haiku è il modello più economico attualmente disponibile: per una sintesi
// di recensioni non serve la qualità (né il costo) di un modello di punta.
// Configurabile via REVIEW_MODEL nel caso si voglia cambiare in futuro.
const MODEL = process.env.REVIEW_MODEL || "claude-haiku-4-5-20251001";

function getAllowedDomains() {
  return (process.env.REVIEW_SOURCES || "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

/**
 * Raccoglie ricorsivamente eventuali {url, title} presenti nella risposta
 * (citazioni nei blocchi di testo, risultati del tool web_search, ecc.),
 * senza dipendere troppo strettamente dalla forma esatta dei blocchi:
 * lo schema di dettaglio delle citazioni può evolvere nel tempo.
 */
function collectSources(node, acc, seen) {
  if (!node || typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (const item of node) collectSources(item, acc, seen);
    return;
  }

  if (typeof node.url === "string" && node.url.startsWith("http") && !seen.has(node.url)) {
    seen.add(node.url);
    acc.push({ url: node.url, titolo: node.title || node.url });
  }

  for (const key of Object.keys(node)) {
    collectSources(node[key], acc, seen);
  }
}

/**
 * Genera una recensione in italiano per il sigaro indicato, sintetizzando le
 * fonti trovate sui siti consentiti (REVIEW_SOURCES). Richiede ANTHROPIC_API_KEY.
 */
async function generateReview({ marca, categoria, formato }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY non configurata: impossibile generare la recensione. Impostala nel file .env."
    );
  }

  const allowedDomains = getAllowedDomains();

  const prompt = [
    `Cerca sul web recensioni in italiano del sigaro "${marca}"` +
      (formato ? ` (${formato})` : "") +
      `.`,
    `Scrivi una sintesi in italiano di circa 150-250 parole delle opinioni più ricorrenti trovate:`,
    `aroma e gusto, forza/intensità, eventuali abbinamenti consigliati (bevande), e un giudizio generale qualità/prezzo.`,
    `Scrivi in tono discorsivo e onesto, senza inventare dettagli: se le fonti disponibili non parlano di questo`,
    `sigaro specifico o parlano solo genericamente della linea/marca, dillo esplicitamente.`,
    `Non riportare citazioni testuali estese dalle fonti: parafrasa sempre con parole tue.`,
    `Concludi con un elenco puntato delle fonti effettivamente usate (solo URL).`,
  ].join(" ");

  const tool = {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 6,
  };
  if (allowedDomains.length > 0) {
    tool.allowed_domains = allowedDomains;
  }

  const res = await axios.post(
    API_URL,
    {
      model: MODEL,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
      tools: [tool],
    },
    {
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      timeout: 60000,
    }
  );

  const blocks = res.data.content || [];
  const testo = blocks
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n\n")
    .trim();

  const fonti = [];
  collectSources(blocks, fonti, new Set());

  return { testo, fonti, modello: MODEL };
}

module.exports = { generateReview, getAllowedDomains };
