import React, { useState } from "react";
import { PARTI_SIGARO, FOGLIE_TRIPA, COLORI_CAPA, FORMATI_VITOLAS, CONSERVAZIONE_REGOLE } from "../data/wikiData";
import { BookOpen, ShieldCheck, Flame, Compass, Info, Award } from "lucide-react";
import anatomyImg from "../assets/images/cigar_anatomy_guide.jpg";
import ritualImg from "../assets/images/tasting_ritual.jpg";

export const WikiTab: React.FC = () => {
  const [activePart, setActivePart] = useState<number>(1);
  const [wikiSection, setWikiSection] = useState<"anatomia" | "colori" | "formati" | "conservazione">("anatomia");

  const currentPart = PARTI_SIGARO.find((p) => p.numero === activePart) || PARTI_SIGARO[0];

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#faf3ea]">
          Guida & Enciclopedia del Sigaro
        </h1>
        <p className="text-xs sm:text-sm text-[#8c7e75] mt-0.5">
          Anatomia del sigaro fatto a mano, vitolas ufficiali, spettro colori della capa e conservazione
        </p>
      </div>

      {/* Navigation Pills */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#181311] rounded-2xl border border-[#2e231e] self-start">
        {[
          { id: "anatomia", label: "Anatomia & Foglie", icon: Compass },
          { id: "colori", label: "Colori della Capa", icon: Award },
          { id: "formati", label: "Formati & Vitolas", icon: BookOpen },
          { id: "conservazione", label: "Regole di Conservazione", icon: ShieldCheck },
        ].map((sec) => {
          const Icon = sec.icon;
          const isSel = wikiSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setWikiSection(sec.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl transition-colors ${
                isSel
                  ? "bg-[#281f1a] text-[#c99757] border border-[#443328] shadow-sm font-semibold"
                  : "text-[#8c7e75] hover:text-[#f5ebd9]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: ANATOMIA */}
      {wikiSection === "anatomia" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Visual Photography Box */}
            <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-[#382b24] relative bg-[#181311] shadow-xl flex flex-col justify-between">
              <div className="relative h-64 sm:h-80 w-full overflow-hidden">
                <img
                  src={anatomyImg}
                  alt="Anatomia del Sigaro Artigianale"
                  className="w-full h-full object-cover filter brightness-90"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#140f0e] via-transparent to-transparent" />
                <div className="absolute top-4 left-4 bg-[#140f0e]/80 backdrop-blur-md px-3 py-1 rounded-lg border border-[#2e231e] text-[11px] text-[#c99757] font-medium">
                  Parejo Fatto a Mano · Tabacchi Selezionati
                </div>
              </div>

              {/* Anatomy points selector */}
              <div className="p-4 bg-[#16110f] border-t border-[#2e231e]">
                <span className="text-[11px] text-[#7d6f66] block mb-2 font-medium">
                  Seleziona una sezione anatomica per approfondire:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PARTI_SIGARO.map((p) => (
                    <button
                      key={p.numero}
                      onClick={() => setActivePart(p.numero)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
                        activePart === p.numero
                          ? "bg-[#c99757] text-[#14100e] font-bold shadow-md"
                          : "bg-[#1f1714] text-[#a3948b] hover:text-[#f5ebd9] border border-[#2e231e]"
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[10px]">
                        {p.numero}
                      </span>
                      <span>{p.nome}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description Card of Selected Part */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-[#181311] border border-[#2e231e] flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#c99757] tracking-wider uppercase">
                  <span>Parte #{currentPart.numero}</span>
                  <span aria-hidden="true">·</span>
                  <span>Anatomia Classica</span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#faf3ea] mt-1.5">
                  {currentPart.nome}
                </h3>
                <p className="text-sm text-[#c4b5a8] mt-3 leading-relaxed">
                  {currentPart.descrizione}
                </p>

                <div className="mt-5 p-3.5 rounded-xl bg-[#130f0d] border border-[#261d18] text-xs text-[#8c7e75] space-y-1.5">
                  <span className="text-[#c99757] font-semibold block flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    <span>Consiglio del Maestro Fumatrice:</span>
                  </span>
                  <p>
                    Non tagliare mai sotto la linea della spalla della testa: incidi solo il cappuccio (2-3 mm) per evitare che la capa si srotoli durante la fumata.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-[#261d19] text-xs text-[#7d6f66] flex items-center justify-between">
                <span>Passaggio {currentPart.numero} di 7</span>
                <div className="flex gap-2">
                  <button
                    disabled={activePart <= 1}
                    onClick={() => setActivePart(activePart - 1)}
                    className="px-2.5 py-1 rounded bg-[#1f1714] disabled:opacity-30 text-[#f5ebd9]"
                  >
                    ← Precedente
                  </button>
                  <button
                    disabled={activePart >= 7}
                    onClick={() => setActivePart(activePart + 1)}
                    className="px-2.5 py-1 rounded bg-[#1f1714] disabled:opacity-30 text-[#f5ebd9]"
                  >
                    Successivo →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Leaves of the Tripa (Volado, Seco, Ligero) */}
          <div className="p-6 rounded-2xl bg-[#181311] border border-[#2e231e]">
            <h3 className="font-serif text-lg font-bold text-[#faf3ea] mb-1">
              La Miscela Interna (Ligada): Le Foglie della Tripa
            </h3>
            <p className="text-xs text-[#8c7e75] mb-4">
              I sigari premium combinano foglie raccolte a diverse altezze della pianta di tabacco (Corojo o Criollo) per bilanciare combustione, aroma e forza.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {FOGLIE_TRIPA.map((foglia, i) => (
                <div key={i} className="p-4 rounded-xl bg-[#130f0d] border border-[#261d18]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-[#f5ebd9]">{foglia.nome}</span>
                    <span className="text-[10px] font-mono text-[#c99757] px-1.5 py-0.5 rounded bg-[#201713]">
                      Livello {i + 1}
                    </span>
                  </div>
                  <span className="text-xs text-[#a3948b] block font-medium mb-2">{foglia.ruolo}</span>
                  <p className="text-xs text-[#7d6f66] leading-relaxed">{foglia.caratteristiche}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: COLORI DELLA CAPA */}
      {wikiSection === "colori" && (
        <div className="p-6 rounded-2xl bg-[#181311] border border-[#2e231e] space-y-5">
          <div>
            <h3 className="font-serif text-xl font-bold text-[#faf3ea]">
              Lo Spettro Cromatico delle Cape (Wrappers)
            </h3>
            <p className="text-xs sm:text-sm text-[#8c7e75] mt-1">
              Dalla foglia Claro verde-oro alla fermentazione profonda dell'Oscuro maduro. Il colore indica il metodo di raccolta, l'esposizione al sole e la durata della stagionatura in botte o balle di cedro.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COLORI_CAPA.map((col, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-[#130f0d] border border-[#261d18] flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg shrink-0 shadow-md border border-white/10"
                  style={{ backgroundColor: col.codice_colore }}
                />
                <div>
                  <h4 className="text-sm font-bold text-[#f5ebd9]">{col.nome}</h4>
                  <p className="text-xs text-[#a3948b] mt-1 leading-relaxed">{col.descrizione}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: FORMATI & VITOLAS */}
      {wikiSection === "formati" && (
        <div className="p-6 rounded-2xl bg-[#181311] border border-[#2e231e] space-y-4">
          <div>
            <h3 className="font-serif text-xl font-bold text-[#faf3ea]">
              Guida ai Formati (Vitolas de Galera)
            </h3>
            <p className="text-xs sm:text-sm text-[#8c7e75] mt-1">
              Il calibro (ceppo, misurato in 64esimi di pollice) e la lunghezza determinano la temperatura del fumo e il tempo di degustazione.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FORMATI_VITOLAS.map((vitola, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-[#130f0d] border border-[#261d18] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-[#f5ebd9]">{vitola.nome}</h4>
                    <span className="text-xs font-mono font-semibold text-[#c99757] px-2 py-0.5 rounded bg-[#201713]">
                      {vitola.durata_tipica}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#8c7e75] mt-1">
                    <span>Lunghezza: <strong className="text-[#e8decb] font-mono">{vitola.lunghezza}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Ceppo: <strong className="text-[#e8decb] font-mono">{vitola.ceppo}</strong></span>
                  </div>
                  <p className="text-xs text-[#a3948b] mt-2.5 leading-relaxed">{vitola.profilo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: REGOLE DI CONSERVAZIONE */}
      {wikiSection === "conservazione" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CONSERVAZIONE_REGOLE.map((reg, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-[#181311] border border-[#2e231e] flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-serif text-base font-bold text-[#faf3ea]">{reg.titolo}</h4>
                    <span className="text-xs font-mono font-bold text-[#c99757] px-2.5 py-0.5 rounded bg-[#201713] border border-[#382b23]">
                      {reg.valore}
                    </span>
                  </div>
                  <p className="text-xs text-[#c4b5a8] leading-relaxed mt-2">{reg.dettaglio}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tasting Ritual Card with Third generated Photo */}
          <div className="rounded-2xl overflow-hidden border border-[#382b24] bg-[#181311] shadow-xl grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-5 h-56 lg:h-auto relative overflow-hidden">
              <img
                src={ritualImg}
                alt="Rituale della Degustazione"
                className="w-full h-full object-cover filter brightness-90"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#140f0e] via-transparent to-transparent" />
            </div>
            <div className="lg:col-span-7 p-6 flex flex-col justify-center">
              <span className="text-xs font-semibold text-[#c99757] tracking-wider uppercase">
                Il Galateo del Fumo Lento
              </span>
              <h3 className="font-serif text-2xl font-bold text-[#faf3ea] mt-1">
                Il Rituale dell'Accensione & Degustazione
              </h3>
              <p className="text-xs sm:text-sm text-[#c4b5a8] mt-2 leading-relaxed">
                Il fumo del sigaro non si aspira mai nei polmoni: si assapora lentamente nel cavo orale trattenendolo per 2-3 secondi per apprezzare corpo, rotondità e note retronasali. Mantieni un ritmo calmo di un puff ogni 45-60 secondi per non surriscaldare la brace e preservare la purezza degli aromi.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
