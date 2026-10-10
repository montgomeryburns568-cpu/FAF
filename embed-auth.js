// Kurzlebige, signierte Zugangstoken für die Einbindung des Speisenkatalogs in andere Anwendungen (z.B. die Office-App).
// Format:  <payload>.<signatur>   payload = base64url(JSON {sub, name, scope, exp}), signatur = HMAC-SHA256(secret, payload) als hex.
// Der Server der anderen Anwendung erzeugt das Token (gemeinsames Geheimnis OFFICE_EMBED_SECRET, nur als Umgebungsvariable!),
// der Generator prüft es. Ein Token gilt nur für den Katalog (scope "katalog"), nie für Rezepte, Angebote oder Vorrat.
const crypto = require('crypto');

const MAX_LEBENSDAUER_S = 12 * 60 * 60;   // höchstens 12 Stunden gültig, auch wenn der Aussteller mehr einträgt

const sign = (secret, payload) => crypto.createHmac('sha256', secret).update(payload).digest('hex');

function erzeugeEmbedToken(secret, { sub, name, scope = 'katalog', lebensdauerS = 3600, readonly = false }) {
  const exp = Math.floor(Date.now() / 1000) + Math.min(lebensdauerS, MAX_LEBENSDAUER_S);
  const payload = Buffer.from(JSON.stringify({ sub: String(sub || ''), name: String(name || ''), scope, exp, ...(readonly ? { ro: true } : {}) })).toString('base64url');
  return payload + '.' + sign(secret, payload);
}

// Gibt die Nutzdaten zurück, wenn das Token gültig ist, sonst null.
function pruefeEmbedToken(secret, token, scope = 'katalog') {
  if (!secret || !token || typeof token !== 'string') return null;
  const i = token.lastIndexOf('.');
  if (i < 1) return null;
  const payload = token.slice(0, i), sig = token.slice(i + 1);
  let a, b;
  try { a = Buffer.from(sig, 'hex'); b = Buffer.from(sign(secret, payload), 'hex'); } catch (e) { return null; }
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!d || d.scope !== scope || !d.exp || d.exp < Math.floor(Date.now() / 1000)) return null;
    if (d.exp - Math.floor(Date.now() / 1000) > MAX_LEBENSDAUER_S + 60) return null;   // zu lange Laufzeit wird abgelehnt
    return d;
  } catch (e) { return null; }
}

module.exports = { erzeugeEmbedToken, pruefeEmbedToken, MAX_LEBENSDAUER_S };
