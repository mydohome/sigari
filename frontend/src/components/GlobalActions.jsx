import React, { useState } from "react";
import { IconCigarLit, IconCart } from "./icons/Icons.jsx";
import PurchaseModal from "./PurchaseModal.jsx";
import FumataModal from "./FumataModal.jsx";

// Pulsanti flottanti sempre visibili (loggato) per registrare rapidamente una
// fumata o un acquisto da qualsiasi pagina dell'app, senza dover aprire la
// scheda Humidor. `onHumidorChange` avvisa la scheda Humidor, se montata, di
// ricaricare i dati.
export default function GlobalActions({ onHumidorChange }) {
  const [modale, setModale] = useState(null); // "fumata" | "acquisto" | null

  return (
    <>
      <div className="global-fabs">
        <button
          type="button"
          className="fab fab-cigar"
          title="Registra una fumata"
          onClick={() => setModale("fumata")}
        >
          <IconCigarLit />
        </button>
        <button
          type="button"
          className="fab fab-cart"
          title="Registra un acquisto"
          onClick={() => setModale("acquisto")}
        >
          <IconCart />
        </button>
      </div>

      {modale === "fumata" && (
        <FumataModal onClose={() => setModale(null)} onSaved={onHumidorChange} />
      )}
      {modale === "acquisto" && (
        <PurchaseModal onClose={() => setModale(null)} onSaved={onHumidorChange} />
      )}
    </>
  );
}
