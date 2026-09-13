import React, { useEffect, useState } from "react";
import { fetchReview, generateReview } from "../api.js";

export default function ReviewPanel({ productId, user, onRequireLogin }) {
  const [recensione, setRecensione] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchReview(productId)
      .then((data) => {
        if (!cancelled) setRecensione(data.recensione);
      })
      .catch(() => {
        if (!cancelled) setError("Errore nel caricamento della recensione.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function handleGenerate() {
    if (!user) {
      onRequireLogin();
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const data = await generateReview(productId);
      setRecensione(data.recensione);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <p className="status-msg small">Caricamento recensione...</p>;

  return (
    <div className="review-panel">
      {recensione ? (
        <>
          <p className="review-text">{recensione.testo}</p>
          {Array.isArray(recensione.fonti) && recensione.fonti.length > 0 && (
            <div className="review-sources">
              <strong>Fonti:</strong>
              <ul>
                {recensione.fonti.map((f) => (
                  <li key={f.url}>
                    <a href={f.url} target="_blank" rel="noreferrer">
                      {f.titolo || f.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="review-meta">
            Generata il {new Intl.DateTimeFormat("it-IT").format(new Date(recensione.generato_il))}
          </p>
        </>
      ) : (
        <p className="status-msg small">Nessuna recensione generata per questo sigaro.</p>
      )}

      {error && <p className="error-msg small">{error}</p>}

      <button onClick={handleGenerate} disabled={generating}>
        {generating
          ? "Genero la recensione..."
          : recensione
          ? "Rigenera recensione"
          : "Genera recensione"}
      </button>
    </div>
  );
}
