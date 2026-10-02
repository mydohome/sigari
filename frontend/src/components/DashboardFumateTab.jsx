import React, { useEffect, useState } from "react";
import { fetchFumate, fetchHumidorStats } from "../api.js";
import BarChart from "./BarChart.jsx";
import DurataFumate from "./DurataFumate.jsx";

const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

function formatData(dateStr) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("it-IT").format(new Date(dateStr));
}

function chiaveGiorno(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Il backend restituisce solo i periodi con almeno una fumata: qui aggiungiamo
// a zero quelli intermedi, cosi' le pause non spariscono dal grafico.
// passo: "settimana" | "mese". Mantiene gli ultimi `max` periodi.
function riempiSerie(serie, passo, max = 12) {
  if (!serie.length) return [];
  const valori = new Map(serie.map((s) => [chiaveGiorno(new Date(s.periodo)), s.totale]));
  const primo = new Date(serie[0].periodo);
  const ultimo = new Date(serie[serie.length - 1].periodo);
  const risultato = [];
  for (
    let d = new Date(primo.getFullYear(), primo.getMonth(), primo.getDate());
    d <= ultimo;
    d =
      passo === "mese"
        ? new Date(d.getFullYear(), d.getMonth() + 1, 1)
        : new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)
  ) {
    risultato.push({ label: d, value: valori.get(chiaveGiorno(d)) ?? 0 });
  }
  return risultato.slice(-max);
}

export default function DashboardFumateTab({ refreshToken }) {
  const [stats, setStats] = useState(null);
  const [fumate, setFumate] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchHumidorStats(), fetchFumate(60)])
      .then(([s, f]) => {
        setStats(s);
        setFumate(f.fumate || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshToken]);

  if (loading) return <p className="status-msg">Caricamento dashboard...</p>;
  if (error) return <p className="error-msg">{error}</p>;

  if (!stats || stats.fumate_totali === 0) {
    return (
      <div className="dashboard-fumate">
        <h2>Dashboard fumate</h2>
        <p className="status-msg">
          Nessuna fumata registrata ancora. Usa il pulsante della fumata per registrare la prima: qui
          compariranno medie e grafici.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-fumate">
      <h2>Dashboard fumate</h2>

      <div className="humidor-stats">
        <div className="stat-card">
          <span className="stat-value">{stats.fumate_totali}</span>
          <span className="stat-label">Fumate totali</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.media_settimanale}</span>
          <span className="stat-label">Media / settimana</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.media_mensile}</span>
          <span className="stat-label">Media / mese</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.media_annuale}</span>
          <span className="stat-label">Media / anno</span>
        </div>
      </div>

      <div className="dashboard-charts">
        {stats.serie_settimanale.length > 0 && (
          <section className="burn-panel burn-chart-panel">
            <h3>Fumate per settimana</h3>
            <p className="burn-subtitle">Ogni sigaro è una settimana · il numero è il lunedì d'inizio</p>
            <BarChart
              data={riempiSerie(stats.serie_settimanale, "settimana")}
              formatLabel={(d) => String(new Date(d).getDate())}
              formatSub={(d, i, data) => {
                const mese = new Date(d).getMonth();
                const precedente = i > 0 ? new Date(data[i - 1].label).getMonth() : null;
                return mese !== precedente ? MESI[mese] : "";
              }}
              unitLabel={(d) => `settimana del ${formatData(d)}`}
            />
          </section>
        )}

        {stats.serie_mensile.length > 0 && (
          <section className="burn-panel burn-chart-panel">
            <h3>Fumate per mese</h3>
            <p className="burn-subtitle">Ogni sigaro è un mese</p>
            <BarChart
              data={riempiSerie(stats.serie_mensile, "mese")}
              formatLabel={(d) => MESI[new Date(d).getMonth()]}
              formatSub={(d, i, data) => {
                const anno = new Date(d).getFullYear();
                const precedente = i > 0 ? new Date(data[i - 1].label).getFullYear() : null;
                return anno !== precedente ? String(anno) : "";
              }}
              unitLabel={(d) => `${MESI[new Date(d).getMonth()]} ${new Date(d).getFullYear()}`}
            />
          </section>
        )}
      </div>

      <DurataFumate fumate={fumate} stats={stats} />
      {stats.fumate_con_durata === 0 && (
        <p className="status-msg small">
          Indica l'ora di inizio e di fine quando registri una fumata (o modificala dal log in Humidor) per
          vedere qui la durata delle fumate.
        </p>
      )}
    </div>
  );
}
