import React, { useEffect, useState } from "react";
import { login, register, fetchRegistrationOpen } from "../api.js";
import { saveSession } from "../auth.js";

export default function AuthBar({ user, onAuthChange, onLogout }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [registrazioneAperta, setRegistrazioneAperta] = useState(false);

  useEffect(() => {
    fetchRegistrationOpen()
      .then((data) => setRegistrazioneAperta(data.open))
      .catch(() => setRegistrazioneAperta(false));
  }, []);

  if (user) {
    return (
      <div className="auth-bar">
        <span className="auth-email">{user.email}</span>
        <button className="link-button" onClick={onLogout}>
          Esci
        </button>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fn = mode === "login" ? login : register;
      const data = await fn(email, password);
      saveSession(data.token, data.user);
      onAuthChange(data.user);
      setOpen(false);
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-bar">
      {!open ? (
        <button className="link-button" onClick={() => setOpen(true)}>
          {registrazioneAperta ? "Accedi / Registrati" : "Accedi"}
        </button>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          {registrazioneAperta && (
            <div className="auth-tabs">
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => setMode("login")}
              >
                Accedi
              </button>
              <button
                type="button"
                className={mode === "register" ? "active" : ""}
                onClick={() => setMode("register")}
              >
                Registrati
              </button>
            </div>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (min. 8 caratteri)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          {error && <p className="error-msg small">{error}</p>}
          <div className="auth-actions">
            <button type="submit" disabled={loading}>
              {loading ? "..." : mode === "login" ? "Accedi" : "Crea account"}
            </button>
            <button type="button" className="link-button" onClick={() => setOpen(false)}>
              Annulla
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
