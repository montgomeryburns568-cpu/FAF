// Lokaler Dev-Einstiegspunkt. Auf Vercel wird stattdessen api/[...all].js verwendet,
// das dieselbe App (server-app.js) importiert - kein eigener Server dort noetig.
const path = require('path');
const express = require('express');
const app = require('./server-app');

app.use(express.static(path.join(__dirname, 'public')));

// Optional (nur lokal): DEV_AUTOLOGIN=1 in der .env meldet jeden Aufruf von DIESEM Rechner (localhost/127.0.0.1) automatisch an,
// damit die lokale Entwicklungskopie ohne Passworteingabe öffnet (z. B. im eingebauten Browser von Claude). Gilt nie auf Vercel und nie
// für Zugriffe von anderen Geräten im Netzwerk: nur Verbindungen über die Loopback-Adresse mit Host localhost/127.0.0.1.
const outer = express();
if (process.env.DEV_AUTOLOGIN === '1' && !process.env.VERCEL && process.env.NODE_ENV !== 'production' && process.env.SESSION_SECRET) {
  const { createAuthToken, verifyAuthToken, MAX_AGE_MS } = require('./auth');
  outer.use((req, res, next) => {
    const ip = req.socket.remoteAddress || '', host = (req.headers.host || '').split(':')[0];
    const lokal = (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') && (host === 'localhost' || host === '127.0.0.1');
    if (lokal) {
      const m = /(?:^|;\s*)auth=([^;]+)/.exec(req.headers.cookie || '');
      if (!(m && verifyAuthToken(process.env.SESSION_SECRET, m[1]))) {
        const t = createAuthToken(process.env.SESSION_SECRET);
        res.cookie('auth', t, { httpOnly: true, sameSite: 'lax', maxAge: MAX_AGE_MS });
        req.headers.cookie = (req.headers.cookie ? req.headers.cookie + '; ' : '') + 'auth=' + t;   // gilt schon für diese Anfrage
      }
    }
    next();
  });
  console.log('DEV_AUTOLOGIN aktiv: lokale Aufrufe von diesem Rechner sind automatisch angemeldet.');
}
outer.use(app);

const PORT = process.env.PORT || 3000;
outer.listen(PORT, () => {
  console.log(`Küchensheet-Generator läuft auf http://localhost:${PORT}`);
});
