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

module.exports = { createAuthToken, verifyAuthToken, MAX_AGE_MS };
