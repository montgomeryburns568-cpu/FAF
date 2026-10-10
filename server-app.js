require('dotenv').config();
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = require('dommatrix');
}
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const store = require('./store');
const { createAuthToken, verifyAuthToken, MAX_AGE_MS } = require('./auth');
const { pruefeEmbedToken } = require('./embed-auth');
const { mergeKatalogDaten } = require('./katalog-merge');

const APP_PASSWORD = process.env.APP_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const IS_VERCEL = !!process.env.VERCEL;
// Einbindung des Speisenkatalogs in andere Anwendungen (Office-App): gemeinsames Geheimnis + erlaubte Herkunft(en), nur als Umgebungsvariablen
const OFFICE_EMBED_SECRET = process.env.OFFICE_EMBED_SECRET || '';
const OFFICE_ORIGINS = (process.env.OFFICE_ORIGIN || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);

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

// Katalog-Endpunkte: Anmeldung im Generator ODER kurzlebiges Token der Office-App (nur Scope "katalog")
function katalogNutzer(req) {
  if (verifyAuthToken(SESSION_SECRET, req.cookies && req.cookies.auth)) return { sub: 'generator', name: 'Küche' };
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? pruefeEmbedToken(OFFICE_EMBED_SECRET, h.slice(7).trim()) : null;
}
function requireKatalogAuth(req, res, next) {
  const u = katalogNutzer(req);
  if (u) { req.katalogNutzer = u; return next(); }
  res.status(401).json({ error: 'Nicht angemeldet.' });
}
// CORS nur für die eingetragene Office-Herkunft (Server-zu-Server-Aufrufe brauchen kein CORS)
app.use(['/api/speisenkatalog', '/api/integration'], (req, res, next) => {
  const o = req.headers.origin;
  if (o && OFFICE_ORIGINS.includes(o)) {
    res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type'); res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();
  }
  next();
});

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

// Fehlende Standardrezepte aus dem Speisenkatalog ergänzen (Bezugsmenge 200 g/ml)
app.post('/api/recipes/standard-import', requireAuth, async (req, res) => {
  const r = await store.seedStandardRezepte(true);
  res.json({ added: r.added, recipes: await store.getRecipes() });
});

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

// --- Speisenkatalog (Seite + Änderungsstand) ---
app.get('/api/speisenkatalog/page', requireKatalogAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(require('./speisenkatalog/katalog-html.js'));
});
// Schlanke Komponentenliste + aktueller Änderungsstand (für die To-Do-Erkennung im Generator)
app.get('/api/speisenkatalog/komponenten', requireKatalogAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const daten = require('./speisenkatalog/katalog-komponenten.js');
  res.json({ komponenten: daten.komponenten, aliase: daten.aliase, state: await store.getSpeisenkatalog() });
});
app.get('/api/speisenkatalog/state', requireKatalogAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await store.getSpeisenkatalog());
});
// Speichern: Schickt der Browser den Stand mit, auf dem seine Änderungen beruhen (asis), werden die Änderungen je Eintrag mit dem aktuellen
// Serverstand zusammengeführt – so überschreiben sich Küche und Büro nicht gegenseitig. Die Antwort enthält dann den zusammengeführten Stand.
app.put('/api/speisenkatalog/state', requireKatalogAuth, async (req, res) => {
  if (req.katalogNutzer && req.katalogNutzer.ro) return res.status(403).json({ error: 'Nur Lesezugriff.' });
  const b = req.body;
  if (!b || typeof b !== 'object' || !b.daten || typeof b.daten !== 'object') return res.status(400).json({ error: 'Ungültiger Stand.' });
  const aktuell = await store.getSpeisenkatalog();
  const daten = b.basis && typeof b.basis === 'object' ? mergeKatalogDaten(aktuell.daten, b.basis, b.daten) : b.daten;
  const neu = { updated: new Date().toISOString(), version: ((aktuell && aktuell.version) || 0) + 1, von: (req.katalogNutzer && req.katalogNutzer.name) || '', daten };
  await store.setSpeisenkatalog(neu);
  res.json({ ok: true, updated: neu.updated, version: neu.version, daten: b.basis ? daten : undefined });
});

// Eingebettete Katalog-Seite für andere Anwendungen (iframe): Token kommt per Adresse (iframes können keine Header senden), wird in die Seite
// eingesetzt und von dort bei jedem Zugriff auf die Katalog-Schnittstelle mitgeschickt. Erlaubt ist das Einbetten nur durch OFFICE_ORIGIN.
app.get('/api/speisenkatalog/embed', (req, res) => {
  const u = pruefeEmbedToken(OFFICE_EMBED_SECRET, String(req.query.token || ''));
  if (!u) return res.status(401).type('text').send('Token ungültig oder abgelaufen.');
  const cfg = { token: String(req.query.token), user: u.name || '', readonly: !!u.ro, select: req.query.select === '1', theme: req.query.theme === 'dark' ? 'dark' : req.query.theme === 'light' ? 'light' : '' };
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${OFFICE_ORIGINS.join(' ')}`);
  res.setHeader('Referrer-Policy', 'no-referrer');
  const html = require('./speisenkatalog/katalog-html.js').replace('<!--KATALOG_EMBED-->', () => '<script>window.__KATALOG_EMBED = ' + JSON.stringify(cfg).replace(/</g, '\\u003c') + ';</script>');
  res.type('html').send(html);
});

// --- Übersicht Lager/Überproduktion für die Office-App (nur lesend, Token mit Bereich "lager") ---
// Zeigt dem Büro bei der Angebotserstellung, was ohnehin da ist bzw. überproduziert wurde und verkauft werden soll – samt Vorschlägen aus dem Katalog.
// Keine Kundennamen, nur Artikel, Mengen, Haltbarkeit.
function requireScope(scope) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    const u = h.startsWith('Bearer ') ? pruefeEmbedToken(OFFICE_EMBED_SECRET, h.slice(7).trim(), scope) : null;
    if (!u) return res.status(401).json({ error: 'Nicht angemeldet.' });
    req.integrationNutzer = u; next();
  };
}
app.get('/api/integration/v1/lager', requireScope('lager'), async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const KL = require('./public/kartei-logik.js');
  const kat = require('./speisenkatalog/katalog-komponenten.js');
  let gerichte = []; try { gerichte = require('./speisenkatalog/katalog-gerichte.js'); } catch (e) { /* ältere Auslieferung */ }
  const archiv = await archivSynchronisieren();
  const heute = KL.heuteIso();
  const ue = KL.lagerBestand(archiv.filter(e => !e.ausgeblendet), heute, false).filter(r => r.ampel !== 'abgelaufen' && (r.menge == null || r.menge > 0));
  const vorrat = (await store.getVorrat()).filter(v => v.name).map(v => {
    const b = Number(v.bestand) || 0, m = Number(v.mindest) || 0;
    return { name: v.name, bestand: b, einheit: v.einheit, status: b <= 0 ? 'leer' : (m > 0 && b < m ? 'niedrig' : 'ok') };
  });
  res.json({
    format: 'kuechen-lager/1', stand: new Date().toISOString(),
    ueberproduktion: ue.map(r => ({ id: r.itemId, name: r.name, menge: r.menge, einheit: r.einheit, klasse: r.klasse, klasseLabel: r.klasseLabel, haltbarBis: r.haltbarBis, tageRest: r.tageRest, ampel: r.ampel, notiz: r.notiz, herkunftDatum: r.datum,
      vorschlaege: { ideen: KL.ideenFuer(r.name, kat.komponenten).kuratiert, gerichte: KL.gerichteFuer(r.name, kat.komponenten, gerichte, 6) } })),
    vorrat,
  });
});

// --- events ---
// Jede gespeicherte Veranstaltung landet automatisch im Archiv (und bleibt dort, auch wenn das Event gelöscht wird).
const KarteiLogik = require('./public/kartei-logik.js');
async function archivSynchronisieren(events) {
  const archiv = await store.getArchiv();
  const a = KarteiLogik.archivAusEvents(events || await store.getEvents(), archiv);
  const b = KarteiLogik.archivDatenErgaenzen(a.archiv);
  if (a.geaendert || b.geaendert) await store.setArchiv(b.archiv);
  return b.archiv;
}
app.get('/api/events', requireAuth, async (req, res) => res.json(await store.getEvents()));

app.post('/api/events', requireAuth, async (req, res) => {
  const events = await store.getEvents();
  const event = { ...req.body, id: req.body.id || crypto.randomUUID() };
  events.push(event);
  await store.setEvents(events);
  await archivSynchronisieren(events).catch(err => console.error('Archiv-Sync:', err.message));
  res.json(event);
});

app.put('/api/events/:id', requireAuth, async (req, res) => {
  const events = await store.getEvents();
  const idx = events.findIndex(e => e.id === req.params.id);
  const event = { ...req.body, id: req.params.id };
  if (idx === -1) events.push(event); else events[idx] = event;
  await store.setEvents(events);
  await archivSynchronisieren(events).catch(err => console.error('Archiv-Sync:', err.message));
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
  const { buildTableBlock, looksLikeWochenplan } = require('./pdf-tables');
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  let text = result.text
    .split('\n')
    .filter(line => !/^--\s*\d+\s+of\s+\d+\s*--$/.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
  // Wochenpläne: Tabellenstruktur (Spalten = Wochentage) als zusätzlichen Textblock anhängen
  if (looksLikeWochenplan(text)) {
    try {
      const block = buildTableBlock(await parser.getTable());
      if (block) text += '\n\n' + block;
    } catch (err) {
      console.error('Tabellen-Extraktion fehlgeschlagen:', err.message);
    }
  }
  await parser.destroy();
  return text;
}

app.post('/api/archiv/upload', requireAuth, express.raw({ type: '*/*', limit: '15mb' }), async (req, res) => {
  if (!req.body || !req.body.length) return res.status(400).json({ error: 'Keine PDF-Daten erhalten.' });
  const filename = decodeURIComponent(req.headers['x-filename'] || 'angebot.pdf');
  try {
    const text = await extractPdfText(req.body);
    // Das Original-PDF wandert in den Blob-Speicher; ohne Speicher (z.B. lokal) wird nur der Text archiviert.
    let blobPath = null;
    try {
      const { put } = require('@vercel/blob');
      const blob = await put(`archiv/${crypto.randomUUID()}-${filename}`, req.body, { access: 'private', contentType: 'application/pdf' });
      blobPath = blob.pathname;
    } catch (err) { console.error('PDF konnte nicht im Blob-Speicher abgelegt werden:', err.message); }
    res.json({ text, filename, pathname: blobPath });
  } catch (err) {
    res.status(500).json({ error: 'PDF konnte nicht verarbeitet werden: ' + err.message });
  }
});

app.get('/api/archiv', requireAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await archivSynchronisieren());
});

// --- Vorrat (Basisartikel) ---
app.get('/api/vorrat', requireAuth, async (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.json(await store.getVorrat()); });
app.put('/api/vorrat', requireAuth, async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Liste erwartet.' });
  await store.setVorrat(req.body);
  res.json(req.body);
});

// --- Kundenkartei: manuell gepflegte Profile (Vorlieben, Tags, Brot-Faktor ...) ---
app.get('/api/kunden', requireAuth, async (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.json(await store.getKunden()); });
app.put('/api/kunden', requireAuth, async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Liste erwartet.' });
  await store.setKunden(req.body);
  res.json(req.body);
});

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
