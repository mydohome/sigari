import React, { useEffect, useState } from "react";
import { Flame, LogIn, UserPlus } from "lucide-react";
import { fetchRegistrationOpen, login, register, type AuthUser } from "../lib/api";
import heroImg from "../assets/images/cigar_lounge_hero.jpg";
import { inputClass, labelClass, primaryButtonClass } from "./ui";

interface AuthScreenProps {
  onLogin: (token: string, user: AuthUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [modo, setModo] = useState<"accedi" | "registrati">("accedi");
  const [registrazioneAperta, setRegistrazioneAperta] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    fetchRegistrationOpen()
      .then((r) => {
        setRegistrazioneAperta(r.open);
        // Primo avvio: nessun utente, si parte dalla creazione dell'account
        if (r.open) setModo("registrati");
      })
      .catch(() => setRegistrazioneAperta(false));
  }, []);

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore(null);
    setInCorso(true);
    try {
      const r = modo === "accedi" ? await login(email.trim(), password) : await register(email.trim(), password);
      onLogin(r.token, r.user);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Operazione non riuscita.");
    } finally {
      setInCorso(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-[#120f0e]">
      <img
        src={heroImg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover filter brightness-[0.4] contrast-[1.05]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#120f0e] via-[#120f0e]/70 to-[#120f0e]/30" />

      <div className="relative w-full max-w-sm bg-[#181311]/95 backdrop-blur-md border border-[#382b24] rounded-2xl shadow-2xl p-6 sm:p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#c99757] to-[#8b5e34] p-0.5 shadow-md shadow-black/40">
            <div className="w-full h-full bg-[#171210] rounded-[7px] flex items-center justify-center">
              <Flame className="w-5 h-5 text-[#c99757]" />
            </div>
          </div>
          <div>
            <div className="font-serif tracking-wider text-lg font-bold text-[#f5ebd9]">SIGARI TRACK</div>
            <div className="text-xs text-[#8c7e75]">Humidor, prezzi e fumate</div>
          </div>
        </div>

        {registrazioneAperta && (
          <p className="text-xs text-[#d9aa6b] bg-[#241b17] border border-[#403026] rounded-lg px-3 py-2 mb-4">
            Primo avvio: crea l'account del proprietario. Dopo questo la registrazione si chiude.
          </p>
        )}

        <div className="flex items-center gap-1 p-1 bg-[#120e0d] rounded-lg border border-[#2a201b] mb-5">
          {(["accedi", "registrati"] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={m === "registrati" && !registrazioneAperta}
              onClick={() => {
                setModo(m);
                setErrore(null);
              }}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                modo === m ? "bg-[#2d211a] text-[#c99757] shadow-sm" : "text-[#8c7e75] hover:text-[#f5ebd9]"
              }`}
            >
              {m === "accedi" ? "Accedi" : "Registrati"}
            </button>
          ))}
        </div>

        <form onSubmit={invia} className="space-y-4">
          <div>
            <label htmlFor="auth-email" className={labelClass}>
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="auth-password" className={labelClass}>
              Password {modo === "registrati" && <span className="text-[#6e6057]">(almeno 8 caratteri)</span>}
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={modo === "registrati" ? 8 : undefined}
              autoComplete={modo === "accedi" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {errore && (
            <p role="alert" className="text-xs text-rose-300 bg-rose-950/40 border border-rose-900/60 rounded-lg px-3 py-2">
              {errore}
            </p>
          )}

          <button type="submit" disabled={inCorso} className={`${primaryButtonClass} w-full py-2.5`}>
            {modo === "accedi" ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            <span>{inCorso ? "Attendere..." : modo === "accedi" ? "Accedi" : "Crea account"}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
