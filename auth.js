const crypto = require('crypto');

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage

function sign(secret, value) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function createAuthToken(secret) {
  const payload = `auth:${Date.now()}`;
  const sig = sign(secret, payload);
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

function verifyAuthToken(secret, token) {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const lastColon = decoded.lastIndexOf(':');
    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);
    const expected = sign(secret, payload);
    const sigBuf = Buffer.from(sig, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return false;
    const ts = parseInt(payload.split(':')[1], 10);
    if (!ts || Date.now() - ts > MAX_AGE_MS) return false;
    return true;
  } catch {
    return false;
  }
}

// Freischaltung der Preise (zweites Passwort): kurzlebiges, signiertes Token, gebunden an den Stand des Preis-Passworts (fp)
const PREIS_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 Stunden
function createPreisToken(secret, fp) {
  const payload = `preise:${Date.now()}:${fp}`;
  return Buffer.from(`${payload}:${sign(secret, payload)}`).toString('base64url');
}
function verifyPreisToken(secret, token, fp) {
  if (!token || !fp) return false;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const i = decoded.lastIndexOf(':');
    const payload = decoded.slice(0, i), sig = decoded.slice(i + 1);
    const a = Buffer.from(sig, 'hex'), b = Buffer.from(sign(secret, payload), 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    const [tag, ts, f] = payload.split(':');
    return tag === 'preise' && f === fp && Date.now() - parseInt(ts, 10) <= PREIS_MAX_AGE_MS;
  } catch { return false; }
}

module.exports = { createAuthToken, verifyAuthToken, MAX_AGE_MS, createPreisToken, verifyPreisToken, PREIS_MAX_AGE_MS };
