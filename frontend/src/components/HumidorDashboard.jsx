import React, { useEffect, useState } from "react";
import { fetchHumidorStats } from "../api.js";

function formatEuro(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

// Riepilogo compatto dell'humidor, mostrato in home appena si accede:
// una vista rapida, il dettaglio completo resta nella scheda Humidor.
export default function HumidorDashboard({ refreshToken }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchHumidorStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, [refreshToken]);

  if (!stats) return null;

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Il tuo humidor</h2>
      <div className="humidor-stats dashboard-stats">
        <div className="stat-card">
          <span className="stat-value">{stats.totale_in_humidor}</span>
          <span className="stat-label">Sigari in humidor</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatEuro(stats.valore_in_humidor)}</span>
          <span className="stat-label">Valore in humidor</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.media_settimanale}</span>
          <span className="stat-label">Media / settimana</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.media_mensile}</span>
          <span className="stat-label">Media / mese</span>
        </div>
      </div>
    </div>
  );
}
