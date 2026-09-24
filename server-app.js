require('dotenv').config();
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = require('dommatrix');
}
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const store = require('./store');
const { createAuthToken, verifyAuthToken, MAX_AGE_MS } = require('./auth');

const APP_PASSWORD = process.env.APP_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const IS_VERCEL = !!process.env.VERCEL;

if (!APP_PASSWORD || !SESSION_SECRET) {
  console.error('FEHLER: APP_PASSWORD und/oder SESSION_SECRET sind nicht gesetzt (siehe .env.example).');
}

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

let storeReady = null;
app.use(async (req, res, next) => {
  if (!storeReady) storeReady = store.init();
  await storeReady;
  next();
});

// --- simple brute-force throttle for login (best effort auf Serverless) ---
const loginAttempts = new Map();
function isLocked(ip) {
  const entry = loginAttempts.get(ip);
  return entry && entry.count >= 5 && Date.now() < entry.lockUntil;
}
function registerFailure(ip) {
  const entry = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
  entry.count += 1;
  if (entry.count >= 5) entry.lockUntil = Date.now() + 60_000;
  loginAttempts.set(ip, entry);
}
function clearFailures(ip) { loginAttempts.delete(ip); }

function requireAuth(req, res, next) {
  if (verifyAuthToken(SESSION_SECRET, req.cookies && req.cookies.auth)) return next();
  res.status(401).json({ error: 'Nicht angemeldet.' });
}

app.post('/api/login', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.ip;
  if (isLocked(ip)) {
    return res.status(429).json({ error: 'Zu viele Fehlversuche. Bitte eine Minute warten.' });
  }
  const { password } = req.body || {};
  const ok = typeof password === 'string' &&
    password.length === APP_PASSWORD.length &&
    crypto.timingSafeEqual(Buffer.from(password), Buffer.from(APP_PASSWORD));
  if (!ok) {
    registerFailure(ip);
    return res.status(401).json({ error: 'Falsches Passwort.' });
  }
  clearFailures(ip);
  const token = createAuthToken(SESSION_SECRET);
  res.cookie('auth', token, {
    httpOnly: true, sameSite: 'lax', secure: IS_VERCEL, maxAge: MAX_AGE_MS,
  });
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('auth');
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  res.json({ authenticated: verifyAuthToken(SESSION_SECRET, req.cookies && req.cookies.auth) });
});

// --- recipes ---
app.get('/api/recipes', requireAuth, async (req, res) => res.json(await store.getRecipes()));

app.post('/api/recipes', requireAuth, async (req, res) => {
  const recipes = await store.getRecipes();
  const recipe = { ...req.body, id: req.body.id || crypto.randomUUID() };
  recipes.push(recipe);
  await store.setRecipes(recipes);
  res.json(recipe);
});

app.put('/api/recipes/:id', requireAuth, async (req, res) => {
  const recipes = await store.getRecipes();
  const idx = recipes.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Rezept nicht gefunden.' });
  recipes[idx] = { ...req.body, id: req.params.id };
  await store.setRecipes(recipes);
  res.json(recipes[idx]);
});

app.delete('/api/recipes/:id', requireAuth, async (req, res) => {
  const recipes = (await store.getRecipes()).filter(r => r.id !== req.params.id);
  await store.setRecipes(recipes);
  res.json({ ok: true });
});

// --- rules ---
app.get('/api/rules', requireAuth, async (req, res) => res.json(await store.getRules()));
app.put('/api/rules', requireAuth, async (req, res) => {
  await store.setRules(req.body);
  res.json(req.body);
});

// --- Selgros-Artikelzuordnung (Zutat -> Art.-Nr. + Verpackungsgroesse) ---
app.get('/api/artikelzuordnung', requireAuth, async (req, res) => res.json(await store.getArtikelzuordnung()));
app.put('/api/artikelzuordnung', requireAuth, async (req, res) => {
  await store.setArtikelzuordnung(req.body);
  res.json(req.body);
});

// --- events ---
app.get('/api/events', requireAuth, async (req, res) => res.json(await store.getEvents()));

app.post('/api/events', requireAuth, async (req, res) => {
  const events = await store.getEvents();
  const event = { ...req.body, id: req.body.id || crypto.randomUUID() };
  events.push(event);
  await store.setEvents(events);
  res.json(event);
});

app.put('/api/events/:id', requireAuth, async (req, res) => {
  const events = await store.getEvents();
  const idx = events.findIndex(e => e.id === req.params.id);
  const event = { ...req.body, id: req.params.id };
  if (idx === -1) events.push(event); else events[idx] = event;
  await store.setEvents(events);
  res.json(event);
});

app.delete('/api/events/:id', requireAuth, async (req, res) => {
  const events = (await store.getEvents()).filter(e => e.id !== req.params.id);
  await store.setEvents(events);
  res.json({ ok: true });
});

// --- KI-Rezeptvorschlag ---
app.post('/api/suggest-recipe', requireAuth, async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(400).json({ error: 'Kein ANTHROPIC_API_KEY hinterlegt (siehe SETUP.md).' });
  }
  const { name, categoryLabel, hinweis } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Gerichtname fehlt.' });

  const prompt = `Du bist Küchenchef für Event-Catering und erstellst kalkulierte Rezepte für die Großküche.
Erstelle ein realistisches Rezept für das Gericht "${name}" (Kategorie: ${categoryLabel || 'unbekannt'}).
${hinweis ? 'Zusätzlicher Hinweis: ' + hinweis : ''}

Antworte AUSSCHLIESSLICH mit validem JSON, ohne Markdown-Codeblock, ohne Erklärtext, exakt in diesem Format:
{
  "name": "string",
  "referenceUnit": { "type": "portionen", "value": 10, "unit": "" },
  "ingredients": [ { "name": "string", "amount": 0, "unit": "g" } ],
  "steps": "string mit Zubereitungsschritten",
  "temp": "string, z.B. 180°C, oder leer"
}

Regeln für die Kalkulation:
- "referenceUnit.type" ist "portionen" (Standard) mit einer runden Portionenzahl (z.B. 10 oder 12), oder "menge" mit "unit" g/kg/l/ml für eine Gesamtmenge.
- Die Zutatenmengen beziehen sich auf genau diese Referenzgröße.
- Realistische Groß-Küchen-Mengen verwenden, keine Haushaltsmengen.
- "steps" kurz und praxisnah wie eine Küchenanweisung, keine Rezeptromantik.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(502).json({ error: 'Anthropic API Fehler: ' + text.slice(0, 300) });
    }
    const data = await resp.json();
    const text = (data.content || []).map(b => b.text || '').join('').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ error: 'Konnte KI-Antwort nicht lesen.' });
    const suggestion = JSON.parse(jsonMatch[0]);
    res.json(suggestion);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim KI-Vorschlag: ' + err.message });
  }
});

// --- PDF-Import fuer die Angebot-Eingabe ---
app.post('/api/parse-pdf', requireAuth, express.raw({ type: '*/*', limit: '15mb' }), async (req, res) => {
  if (!req.body || !req.body.length) return res.status(400).json({ error: 'Keine PDF-Daten erhalten.' });
  try {
    const text = await extractPdfText(req.body);
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: 'PDF konnte nicht gelesen werden: ' + err.message });
  }
});

// --- Angebots-Archiv ---
async function extractPdfText(buffer) {
  const { PDFParse } = require('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text
    .split('\n')
    .filter(line => !/^--\s*\d+\s+of\s+\d+\s*--$/.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

app.post('/api/archiv/upload', requireAuth, express.raw({ type: '*/*', limit: '15mb' }), async (req, res) => {
  if (!req.body || !req.body.length) return res.status(400).json({ error: 'Keine PDF-Daten erhalten.' });
  const filename = decodeURIComponent(req.headers['x-filename'] || 'angebot.pdf');
  try {
    const { put } = require('@vercel/blob');
    const text = await extractPdfText(req.body);
    const pathname = `archiv/${crypto.randomUUID()}-${filename}`;
    const blob = await put(pathname, req.body, { access: 'private', contentType: 'application/pdf' });
    res.json({ text, filename, pathname: blob.pathname });
  } catch (err) {
    res.status(500).json({ error: 'PDF konnte nicht verarbeitet werden: ' + err.message });
  }
});

app.get('/api/archiv', requireAuth, async (req, res) => res.json(await store.getArchiv()));

app.post('/api/archiv', requireAuth, async (req, res) => {
  const archiv = await store.getArchiv();
  const entry = { ...req.body, id: req.body.id || crypto.randomUUID(), uploadedAt: req.body.uploadedAt || new Date().toISOString() };
  archiv.push(entry);
  await store.setArchiv(archiv);
  res.json(entry);
});

app.put('/api/archiv/:id', requireAuth, async (req, res) => {
  const archiv = await store.getArchiv();
  const idx = archiv.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
  archiv[idx] = { ...archiv[idx], ...req.body, id: req.params.id };
  await store.setArchiv(archiv);
  res.json(archiv[idx]);
});

app.delete('/api/archiv/:id', requireAuth, async (req, res) => {
  const archiv = await store.getArchiv();
  const entry = archiv.find(e => e.id === req.params.id);
  if (entry && entry.pathname) {
    try { const { del } = require('@vercel/blob'); await del(entry.pathname); } catch (err) { console.error('Blob-Loeschung fehlgeschlagen:', err.message); }
  }
  await store.setArchiv(archiv.filter(e => e.id !== req.params.id));
  res.json({ ok: true });
});

app.get('/api/archiv/:id/pdf', requireAuth, async (req, res) => {
  const archiv = await store.getArchiv();
  const entry = archiv.find(e => e.id === req.params.id);
  if (!entry || !entry.pathname) return res.status(404).json({ error: 'PDF nicht gefunden.' });
  try {
    const { get } = require('@vercel/blob');
    const result = await get(entry.pathname, { access: 'private' });
    if (!result) return res.status(404).json({ error: 'PDF nicht gefunden.' });
    res.setHeader('content-type', 'application/pdf');
    res.setHeader('content-disposition', `inline; filename="${entry.filename || 'angebot.pdf'}"`);
    const { Readable } = require('node:stream');
    Readable.fromWeb(result.stream).pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'PDF konnte nicht geladen werden: ' + err.message });
  }
});

module.exports = app;
