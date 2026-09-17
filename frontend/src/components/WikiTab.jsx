import React from "react";

const PARTI_SIGARO = [
  {
    numero: 1,
    nome: "Piede",
    def: "L'estremità aperta del sigaro, quella che si accende per iniziare a fumare. Va scaldata uniformemente, non bruciata a fiamma diretta.",
  },
  {
    numero: 2,
    nome: "Capa",
    def: "La foglia più esterna, quella che si vede e si tocca. Determina buona parte dell'aroma e dell'aspetto: il suo colore va dal claro chiarissimo all'oscuro quasi nero.",
  },
  {
    numero: 3,
    nome: "Fascetta (Anilla)",
    def: "L'anello di carta con il marchio della casa produttrice, applicato dopo l'arrotolamento. Toglierla o lasciarla mentre si fuma è solo questione di gusto personale.",
  },
  {
    numero: 4,
    nome: "Sottofascia (Capote)",
    def: "Una foglia intermedia, nascosta sotto la capa, che tiene insieme il ripieno e dà al sigaro la sua forma cilindrica.",
  },
  {
    numero: 5,
    nome: "Tripa (Anima)",
    def: "Il ripieno interno: foglie intere nei sigari di maggior pregio, trinciate in quelli più economici. È la vera miscela di gusto del sigaro.",
  },
  {
    numero: 6,
    nome: "Testa",
    def: "L'estremità chiusa, quella da cui si fuma. Va tagliata di qualche millimetro con un tagliasigari prima di accendere.",
  },
  {
    numero: 7,
    nome: "Cappuccio (Cap)",
    def: "Un piccolo pezzo di foglia applicato sulla testa per sigillarla e fissare la capa in quel punto.",
  },
];

const COMPOSIZIONE_TRIPA = [
  {
    nome: "Volado",
    desc: "Foglie della parte bassa della pianta: le più leggere, garantiscono una buona combustione ma poco sapore.",
  },
  {
    nome: "Seco",
    desc: "Foglie della parte centrale: forza e aroma intermedi, costituiscono il corpo del sigaro.",
  },
  {
    nome: "Ligero",
    desc: "Foglie della cima della pianta, le più esposte al sole: le più forti e aromatiche, danno carattere e intensità.",
  },
];

const COLORI_CAPA = [
  { nome: "Claro", colore: "#c9a876", desc: "Chiarissimo, quasi verdolino. Foglie raccolte giovani, gusto delicato." },
  { nome: "Colorado Claro", colore: "#b78552", desc: "Marrone chiaro, il colore \"classico\" più diffuso." },
  { nome: "Colorado", colore: "#9c6a3c", desc: "Marrone medio, con riflessi rossastri." },
  { nome: "Colorado Maduro", colore: "#7a4d2c", desc: "Marrone scuro, tendente al rossiccio." },
  { nome: "Maduro", colore: "#4f3320", desc: "Marrone molto scuro. Foglie più mature, spesso note più dolci." },
  { nome: "Oscuro", colore: "#2a1c12", desc: "Quasi nero: la maturazione più spinta." },
];

const FORME = [
  {
    nome: "Parejo",
    desc: "La forma classica: un cilindro dritto, dello stesso calibro dal piede alla testa. È la maggioranza dei sigari in commercio.",
  },
  {
    nome: "Figurado",
    desc: "Una o entrambe le estremità sono rastremate invece che dritte: piramidi, torpedo e belicoso sono tutti figurados.",
  },
  {
    nome: "Perfecto",
    desc: "Un figurado particolare: si restringe a entrambe le estremità, spesso con un corpo centrale più \"panciuto\".",
  },
];

// Lunghezza in mm e calibro (in 64esimi di pollice) dei formati più diffusi
// e riconoscibili a livello internazionale. "rastremato: true" = figurado,
// il calibro indicato è quello del punto più largo.
const FORMATI = [
  { nome: "Gigante", lunghezza: 223, calibro: 52 },
  { nome: "Double Corona", lunghezza: 197, calibro: 49 },
  { nome: "Churchill", lunghezza: 178, calibro: 47 },
  { nome: "Piramide", lunghezza: 178, calibro: 52, rastremato: true },
  { nome: "Torpedo", lunghezza: 165, calibro: 52, rastremato: true },
  { nome: "Lonsdale", lunghezza: 165, calibro: 42 },
  { nome: "Toro", lunghezza: 152, calibro: 50 },
  { nome: "Panatela", lunghezza: 152, calibro: 38 },
  { nome: "Corona", lunghezza: 140, calibro: 42 },
  { nome: "Robusto", lunghezza: 127, calibro: 50 },
  { nome: "Petit Corona", lunghezza: 127, calibro: 42 },
  { nome: "Cigarillos", lunghezza: 102, calibro: 26 },
];

const LUNGHEZZA_MAX = Math.max(...FORMATI.map((f) => f.lunghezza));
const CALIBRO_MAX = Math.max(...FORMATI.map((f) => f.calibro));
const CALIBRO_MIN = Math.min(...FORMATI.map((f) => f.calibro));

function poll(mm) {
  return (mm / 25.4).toFixed(2).replace(".", ",");
}

// Diagramma anatomico: sigaro visto di lato con marcatori numerati (1-3, 6-7)
// più una sezione trasversale per gli strati interni non visibili dall'esterno
// (4 sottofascia, 5 tripa). I numeri rimandano alla legenda testuale sotto,
// per restare leggibili anche su schermo piccolo senza rimpicciolire il testo
// dentro l'SVG.
function DiagrammaAnatomia() {
  const marker = (x, y, n) => (
    <g key={n}>
      <circle cx={x} cy={y} r="12" className="wiki-marker" />
      <text x={x} y={y + 4} textAnchor="middle" className="wiki-marker-text">
        {n}
      </text>
    </g>
  );
  const leader = (x1, y1, x2, y2) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} className="wiki-leader" />
  );

  return (
    <svg width="640" height="290" viewBox="0 0 640 290" className="wiki-diagram-svg" role="img" aria-label="Anatomia del sigaro">
      {/* corpo del sigaro (capa) */}
      <ellipse cx="110" cy="100" rx="14" ry="30" className="wiki-cigar-foot" />
      <rect x="110" y="70" width="410" height="60" rx="2" className="wiki-cigar-body" />
      <path
        d="M520,70 C562,70 588,82 600,100 C588,118 562,130 520,130 Z"
        className="wiki-cigar-body"
      />
      <ellipse cx="598" cy="100" rx="9" ry="18" className="wiki-cigar-cap" />

      {/* fascetta */}
      <rect x="330" y="58" width="50" height="84" rx="4" className="wiki-cigar-band" />
      <rect x="330" y="96" width="50" height="8" className="wiki-cigar-band-line" />

      {/* leader lines verso la riga di marcatori in alto */}
      {leader(90, 34, 110, 72)}
      {leader(220, 34, 230, 70)}
      {leader(350, 34, 355, 58)}
      {leader(480, 34, 548, 80)}
      {leader(592, 34, 597, 84)}

      {marker(90, 22, 1)}
      {marker(220, 22, 2)}
      {marker(350, 22, 3)}
      {marker(480, 22, 6)}
      {marker(592, 22, 7)}

      {/* sezione trasversale: capa (anello esterno) / sottofascia / tripa, anelli concentrici a contatto */}
      <circle cx="130" cy="215" r="33" className="wiki-section-capa" />
      <circle cx="130" cy="215" r="20" className="wiki-section-capote" />
      <circle cx="130" cy="215" r="14" className="wiki-section-tripa" />
      <text x="130" y="270" textAnchor="middle" className="wiki-caption">
        sezione trasversale
      </text>

      {leader(232, 193, 147, 205)}
      {leader(232, 237, 138, 218)}
      {marker(242, 188, 4)}
      {marker(242, 232, 5)}
    </svg>
  );
}

function IconaForma({ tipo }) {
  if (tipo === "Parejo") {
    return (
      <svg width="96" height="52" viewBox="0 0 96 52" className="wiki-shape-svg" aria-hidden="true">
        <rect x="10" y="14" width="76" height="24" rx="12" className="wiki-cigar-body" />
      </svg>
    );
  }
  if (tipo === "Figurado") {
    return (
      <svg width="96" height="52" viewBox="0 0 96 52" className="wiki-shape-svg" aria-hidden="true">
        <path
          d="M10,16 L54,16 C74,16 86,20 90,26 C86,32 74,36 54,36 L10,36 Z"
          className="wiki-cigar-body"
        />
      </svg>
    );
  }
  return (
    <svg width="96" height="52" viewBox="0 0 96 52" className="wiki-shape-svg" aria-hidden="true">
      <path
        d="M8,26 C20,8 40,8 48,8 C56,8 76,8 88,26 C76,44 56,44 48,44 C40,44 20,44 8,26 Z"
        className="wiki-cigar-body"
      />
    </svg>
  );
}

export default function WikiTab() {
  return (
    <div className="wiki">
      <h2>Guida al sigaro</h2>
      <p className="status-msg small">
        I concetti di base per orientarsi: come è fatto un sigaro, come si classifica in base alla
        forma, e i formati più comuni con le loro dimensioni. Non serve saperli a memoria per
        godersi un sigaro, ma aiuta a capire cosa si sta fumando — e a chiederlo con il nome giusto
        in tabaccheria.
      </p>

      <h3>Anatomia del sigaro</h3>
      <div className="wiki-diagram">
        <DiagrammaAnatomia />
      </div>
      <dl className="wiki-glossary">
        {PARTI_SIGARO.map((p) => (
          <div key={p.numero} className="wiki-glossary-item">
            <dt>
              <span className="wiki-glossary-num">{p.numero}</span> {p.nome}
            </dt>
            <dd>{p.def}</dd>
          </div>
        ))}
      </dl>

      <h3>Cosa c'è nella tripa</h3>
      <p className="status-msg small">
        Le foglie che compongono il ripieno si distinguono per la posizione sulla pianta, che ne
        determina la forza:
      </p>
      <ul className="wiki-simple-list">
        {COMPOSIZIONE_TRIPA.map((c) => (
          <li key={c.nome}>
            <strong>{c.nome}</strong> — {c.desc}
          </li>
        ))}
      </ul>

      <h3>Il colore della capa</h3>
      <p className="status-msg small">
        Dalla foglia più giovane e chiara a quella più matura e scura: il colore della capa è uno
        dei primi indizi (non l'unico) su cosa aspettarsi da un sigaro.
      </p>
      <div className="wiki-color-scale">
        {COLORI_CAPA.map((c) => (
          <div key={c.nome} className="wiki-color-item">
            <span className="wiki-color-swatch" style={{ background: c.colore }} />
            <div>
              <strong>{c.nome}</strong>
              <p>{c.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <h3>La forma: parejo, figurado, perfecto</h3>
      <div className="wiki-shapes">
        {FORME.map((f) => (
          <div key={f.nome} className="wiki-shape-card">
            <IconaForma tipo={f.nome} />
            <strong>{f.nome}</strong>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
      <p className="status-msg small">
        Una curiosità: il <strong>Culebra</strong> è un figurado particolare, formato da tre
        panatelas sottili intrecciate insieme e legate con un nastro — si dividono solo al momento
        di fumarle.
      </p>

      <h3>I formati più comuni</h3>
      <p className="status-msg small">
        Lunghezza e "calibro" (il diametro, misurato in 64esimi di pollice) sono le due misure che
        identificano un formato. Le barre sotto sono in scala tra loro, per farsi un'idea a colpo
        d'occhio.
      </p>
      <div className="wiki-formats">
        {FORMATI.map((f) => (
          <div key={f.nome} className="wiki-format-row">
            <span className="wiki-format-nome">
              {f.nome}
              {f.rastremato && <span className="wiki-format-tag">figurado</span>}
            </span>
            <div className="wiki-format-track">
              <div
                className="wiki-format-bar"
                style={{
                  width: `${(f.lunghezza / LUNGHEZZA_MAX) * 100}%`,
                  height: `${8 + ((f.calibro - CALIBRO_MIN) / (CALIBRO_MAX - CALIBRO_MIN)) * 14}px`,
                }}
              />
            </div>
            <span className="wiki-format-misure">
              {f.lunghezza} mm ({poll(f.lunghezza)}") · calibro {f.calibro}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
