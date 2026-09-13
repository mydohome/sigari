import React, { useEffect, useState } from "react";
import { fetchHumidorReview, saveHumidorReview } from "../api.js";
import StarRating from "./StarRating.jsx";

export default function HumidorReviewEditor({ productId }) {
  const [stelle, setStelle] = useState(null);
  const [descrizione, setDescrizione] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [salvato, setSalvato] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchHumidorReview(productId)
      .then((data) => {
        if (cancelled) return;
        setStelle(data.review?.stelle ?? null);
        setDescrizione(data.review?.descrizione ?? "");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function handleSave() {
    setSaving(true);
    setSalvato(false);
    try {
      await saveHumidorReview(productId, { stelle, descrizione: descrizione.trim() || null });
      setSalvato(true);
      setTimeout(() => setSalvato(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="status-msg small">Caricamento recensione...</p>;

  return (
    <div className="humidor-review-editor">
      <StarRating value={stelle} onChange={setStelle} size="1.4rem" />
      <textarea
        placeholder="Note personali sul sigaro (facoltativo)"
        value={descrizione}
        onChange={(e) => setDescrizione(e.target.value)}
        rows={2}
      />
      <div className="humidor-review-actions">
        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Salvo..." : "Salva recensione"}
        </button>
        {salvato && <span className="status-msg small">Salvata ✓</span>}
      </div>
    </div>
  );
}
