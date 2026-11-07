const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Autenticazione richiesta." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token non valido o scaduto." });
  }
}

// Come requireAuth, ma non blocca la richiesta se manca il token: imposta
// semplicemente req.userId a null. Utile per endpoint pubblici che vogliono
// arricchire la risposta (es. "e' nei tuoi preferiti?") solo se l'utente e' loggato.
function optionalAuth(req, _res, next) {
  const header = req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    req.userId = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
  } catch (err) {
    req.userId = null;
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
