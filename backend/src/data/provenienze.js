// Classificazione della provenienza dei sigari a partire dal nome della marca.
//
// Non esiste un campo "paese di origine" nel listino ADM/tabaccai.it (che riporta
// solo marca/categoria/formato/prezzo), quindi la provenienza viene dedotta da un
// elenco curato a mano dei marchi piu' noti. Alcuni nomi (es. "Romeo y Julieta",
// "Montecristo", "Punch", "La Gloria Cubana"...) esistono storicamente sia in
// versione cubana (Habanos S.A.) sia in versione non cubana (Repubblica
// Dominicana/Honduras, di solito Altadis USA o General Cigar): nel canale
// ufficiale italiano (tabaccheria/monopolio) sono in pratica sempre le versioni
// cubane originali Habanos, quindi qui vengono classificate come "Cuba" — ma se
// un domani comparisse la versione non cubana di uno di questi nomi, andrebbe
// corretta a mano (vedi PATCH /api/admin/products/:id/provenienza).
const MARCHI_CUBA = [
  "cohiba", "montecristo", "partagas", "partagás", "romeo y julieta", "h. upmann",
  "h upmann", "hoyo de monterrey", "bolivar", "bolívar", "punch", "trinidad",
  "vegas robaina", "quintero", "fonseca", "ramon allones", "ramón allones",
  "san cristobal", "san cristóbal", "diplomaticos", "diplomáticos",
  "el rey del mundo", "rafael gonzalez", "rafael gonzález", "juan lopez",
  "juan lópez", "la gloria cubana", "sancho panza", "jose l. piedra",
  "josé l. piedra", "cuaba", "vegueros", "guantanamera", "cifuentes",
];

const MARCHI_ITALIA = [
  "toscano", "garibaldi", "antico toscano", "fiorentino", "nazionali",
  "moro", "originale toscano", "classico toscano",
];

const MARCHI_EXTRA_CUBA = [
  "davidoff", "arturo fuente", "padron", "padrón", "my father", "ashton",
  "oliva", "rocky patel", "la aurora", "macanudo", "camacho", "perdomo",
  "cao", "alec bradley", "diesel", "acid", "drew estate", "flor de cana",
  "flor de caña", "joya de nicaragua", "plasencia", "vegafina", "montecruz",
];

function normalizza(testo) {
  return (testo || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // rimuove accenti per un confronto piu' tollerante
}

function contieneMarchio(marcaNormalizzata, elenco) {
  return elenco.some((m) => marcaNormalizzata.startsWith(normalizza(m)));
}

// Ritorna "Cuba", "Italia", "Extra-Cuba" o "Altro" a partire dal nome marca.
function classificaProvenienza(marca) {
  const m = normalizza(marca);
  if (!m) return "Altro";
  if (contieneMarchio(m, MARCHI_CUBA)) return "Cuba";
  if (contieneMarchio(m, MARCHI_ITALIA)) return "Italia";
  if (contieneMarchio(m, MARCHI_EXTRA_CUBA)) return "Extra-Cuba";
  return "Altro";
}

module.exports = { classificaProvenienza };
