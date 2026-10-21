require('dotenv').config();
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = require('dommatrix');
}
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const store = require('./store');
const { createAuthToken, verifyAuthToken, MAX_AGE_MS, createPreisToken, verifyPreisToken, PREIS_MAX_AGE_MS } = require('./auth');
const { pruefeEmbedToken, erzeugeEmbedToken } = require('./embed-auth');
const { mergeKatalogDaten } = require('./katalog-merge');
const IA = require('./integration-angebot');

const APP_PASSWORD = process.env.APP_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const IS_VERCEL = !!process.env.VERCEL;
// Einbindung des Speisenkatalogs in andere Anwendungen (Office-App): gemeinsames Geheimnis + erlaubte Herkunft(en), nur als Umgebungsvariablen
const OFFICE_EMBED_SECRET = process.env.OFFICE_EMBED_SECRET || '';
const OFFICE_ORIGINS = (process.env.OFFICE_ORIGIN || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
const embedGeheimnis = () => OFFICE_EMBED_SECRET || crypto.createHmac('sha256', SESSION_SECRET || 'kein-geheimnis').update('kuechen-embed-v1').digest('hex');

if (!APP_PASSWORD || !SESSION_SECRET) {
  console.error('FEHLER: APP_PASSWORD und/oder SESSION_SECRET sind nicht gesetzt (siehe .env.example).');
}

const app = express();
app.use('/api/integration/v1/angebote', express.json({ limit: '12mb' }));
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

// --- Verbindung zur Office-App ---
// Ein dauerhafter Verbindungsschlüssel ("ksk_…", in der App unter Regeln erzeugt) ersetzt Geheimnis und selbst gebaute Token:
// Die Office-App schickt ihn bei jedem Aufruf als "Authorization: Bearer ksk_…" mit. Für die eingebettete Katalog-Seite holt sie sich
// damit per POST /api/integration/v1/token ein kurzlebiges Token (der Schlüssel selbst gehört nie in den Browser).
const sha256 = t => crypto.createHash('sha256').update(String(t)).digest('hex');
async function bueroSchluesselOk(v) {
  if (!v || !v.startsWith('ksk_')) return false;
  const verb = await store.getBueroVerbindung();
  if (!verb || !verb.keyHash) return false;
  const x = Buffer.from(sha256(v), 'hex'), y = Buffer.from(verb.keyHash, 'hex');
  if (x.length !== y.length || !crypto.timingSafeEqual(x, y)) return false;
  if (!verb.zuletzt || Date.now() - Date.parse(verb.zuletzt) > 10 * 60 * 1000) { verb.zuletzt = new Date().toISOString(); store.setBueroVerbindung(verb).catch(() => {}); }
  return true;
}
// scope: 'katalog' | 'lager' | 'angebote'
async function integrationsNutzer(req, scope) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  const v = h.slice(7).trim();
  if (v.startsWith('ksk_')) return (await bueroSchluesselOk(v)) ? { sub: 'office', name: 'Büro', scope: 'katalog lager angebote' } : null;
  return pruefeEmbedToken(embedGeheimnis(), v, scope);
}
async function erlaubteHerkuenfte() {
  const verb = await store.getBueroVerbindung().catch(() => null);
  return Array.from(new Set(OFFICE_ORIGINS.concat((verb && verb.origins) || [])));
}
// Katalog-Endpunkte: Anmeldung im Generator ODER Büro-Zugang (Schlüssel bzw. kurzlebiges Token, nur Bereich "katalog")
async function katalogNutzer(req) {
  if (verifyAuthToken(SESSION_SECRET, req.cookies && req.cookies.auth)) return { sub: 'generator', name: 'Küche' };
  return integrationsNutzer(req, 'katalog');
}
async function requireKatalogAuth(req, res, next) {
  try { const u = await katalogNutzer(req); if (u) { req.katalogNutzer = u; return next(); } } catch (e) { console.error('Katalog-Auth:', e.message); }
  res.status(401).json({ error: 'Nicht angemeldet.' });
}
// CORS nur für die eingetragene Office-Herkunft (Server-zu-Server-Aufrufe brauchen kein CORS)
app.use(['/api/speisenkatalog', '/api/integration'], async (req, res, next) => {
  const o = req.headers.origin;
  if (o && (await erlaubteHerkuenfte()).includes(o)) {
    res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type'); res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
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
app.get('/api/speisenkatalog/embed', async (req, res) => {
  const u = pruefeEmbedToken(embedGeheimnis(), String(req.query.token || ''));
  if (!u) return res.status(401).type('text').send('Token ungültig oder abgelaufen.');
  const cfg = { token: String(req.query.token), user: u.name || '', readonly: !!u.ro, select: req.query.select === '1', theme: req.query.theme === 'dark' ? 'dark' : req.query.theme === 'light' ? 'light' : '' };
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${(await erlaubteHerkuenfte()).join(' ')}`);
  res.setHeader('Referrer-Policy', 'no-referrer');
  const html = require('./speisenkatalog/katalog-html.js').replace('<!--KATALOG_EMBED-->', () => '<script>window.__KATALOG_EMBED = ' + JSON.stringify(cfg).replace(/</g, '\\u003c') + ';</script>');
  res.type('html').send(html);
});

// --- Übersicht Lager/Überproduktion für die Office-App (nur lesend, Token mit Bereich "lager") ---
// Zeigt dem Büro bei der Angebotserstellung, was ohnehin da ist bzw. überproduziert wurde und verkauft werden soll – samt Vorschlägen aus dem Katalog.
// Keine Kundennamen, nur Artikel, Mengen, Haltbarkeit.
function requireScope(scope) {
  return async (req, res, next) => {
    try { const u = await integrationsNutzer(req, scope); if (u) { req.integrationNutzer = u; return next(); } } catch (e) { console.error('Auth:', e.message); }
    res.status(401).json({ error: 'Nicht angemeldet.' });
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

// --- Küchen-Info je Auftrag (Box in jedem Küchensheet der Übersicht) ---
app.put('/api/events/:id/kuecheninfo', requireAuth, async (req, res) => {
  const events = await store.getEvents();
  const ev = events.find(e => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: 'Auftrag nicht gefunden.' });
  const text = typeof (req.body || {}).text === 'string' ? req.body.text.replace(/\r\n/g, '\n').slice(0, 2000) : '';
  ev.kuecheInfo = { text, geaendert: new Date().toISOString() };
  await store.setEvents(events);
  res.json(ev.kuecheInfo);
});
// --- Küchen-Info (Infobox oben auf der Übersicht) ---
app.get('/api/kuecheninfo', requireAuth, async (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.json(await store.getKuechenInfo()); });
app.put('/api/kuecheninfo', requireAuth, async (req, res) => {
  const text = typeof (req.body || {}).text === 'string' ? req.body.text.replace(/\r\n/g, '\n').slice(0, 4000) : '';
  const d = { text, geaendert: new Date().toISOString() };
  await store.setKuechenInfo(d);
  res.json(d);
});

// --- Preise: Beträge in Angebots-PDFs und der Archiv-Bereich sind durch ein eigenes Passwort geschützt ---
const preisFp = pw => (pw && pw.hash ? pw.hash.slice(0, 16) : '');
const preisHash = (passwort, salt) => crypto.scryptSync(passwort, salt, 32).toString('hex');
async function preisPasswortOk(passwort, pw) {
  if (!pw || typeof passwort !== 'string' || !passwort) return false;
  const a = Buffer.from(preisHash(passwort, pw.salt), 'hex'), b = Buffer.from(pw.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
async function preiseFrei(req) {
  const pw = await store.getPreisPasswort();
  return !!pw && verifyPreisToken(SESSION_SECRET, req.cookies && req.cookies.preise, preisFp(pw));
}
function setzePreisCookie(res, pw) {
  res.cookie('preise', createPreisToken(SESSION_SECRET, preisFp(pw)), { httpOnly: true, sameSite: 'lax', secure: IS_VERCEL, maxAge: PREIS_MAX_AGE_MS });
}
app.get('/api/preise/status', requireAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ gesetzt: !!(await store.getPreisPasswort()), frei: await preiseFrei(req) });
});
app.post('/api/preise/entsperren', requireAuth, async (req, res) => {
  const ip = 'preise:' + (req.headers['x-forwarded-for'] || req.ip);
  if (isLocked(ip)) return res.status(429).json({ error: 'Zu viele Fehlversuche. Bitte eine Minute warten.' });
  const pw = await store.getPreisPasswort();
  if (!pw) return res.status(409).json({ error: 'Es ist noch kein Preis-Passwort festgelegt.' });
  if (!(await preisPasswortOk((req.body || {}).passwort, pw))) { registerFailure(ip); return res.status(403).json({ error: 'Falsches Passwort.' }); }
  clearFailures(ip); setzePreisCookie(res, pw);
  res.json({ ok: true, frei: true });
});
// Erstes Passwort festlegen bzw. ändern (ändern nur mit dem bisherigen Passwort); danach ist die Freischaltung sofort aktiv
app.post('/api/preise/setzen', requireAuth, async (req, res) => {
  const { neu, alt } = req.body || {};
  if (typeof neu !== 'string' || neu.length < 4) return res.status(400).json({ error: 'Das Passwort braucht mindestens 4 Zeichen.' });
  const bisher = await store.getPreisPasswort();
  if (bisher) {
    const ip = 'preise:' + (req.headers['x-forwarded-for'] || req.ip);
    if (isLocked(ip)) return res.status(429).json({ error: 'Zu viele Fehlversuche. Bitte eine Minute warten.' });
    if (!(await preisPasswortOk(alt, bisher))) { registerFailure(ip); return res.status(403).json({ error: 'Das bisherige Passwort stimmt nicht.' }); }
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const pw = { salt, hash: preisHash(neu, salt), geaendert: new Date().toISOString() };
  await store.setPreisPasswort(pw);
  setzePreisCookie(res, pw);
  res.json({ ok: true, frei: true });
});
app.post('/api/preise/sperren', requireAuth, (req, res) => { res.clearCookie('preise'); res.json({ ok: true, frei: false }); });

// Frisch geladenes (noch nicht gespeichertes) PDF für die Vorschau schwärzen
app.post('/api/pdf-schwaerzen', requireAuth, express.raw({ type: '*/*', limit: '15mb' }), async (req, res) => {
  if (!req.body || !req.body.length) return res.status(400).json({ error: 'Keine PDF-Daten erhalten.' });
  try {
    res.setHeader('content-type', 'application/pdf'); res.setHeader('cache-control', 'private, no-store');
    res.send((await require('./preise-schwaerzen').schwaerzen(req.body)).pdf);
  } catch (err) { res.status(500).type('json').send(JSON.stringify({ error: 'PDF konnte nicht geschwärzt werden: ' + err.message })); }
});

// Angebots-PDF ausliefern: ohne Freischaltung mit geschwärzten Beträgen (schlägt das Schwärzen fehl, wird nichts ausgeliefert)
async function sendeAngebotPdf(req, res, pathname, filename) {
  try {
    const { get } = require('@vercel/blob');
    const result = await get(pathname, { access: 'private' });
    if (!result) return res.status(404).json({ error: 'PDF nicht gefunden.' });
    let daten = Buffer.from(await new Response(result.stream).arrayBuffer());
    const frei = await preiseFrei(req);
    if (!frei) daten = (await require('./preise-schwaerzen').schwaerzen(daten)).pdf;
    res.setHeader('content-type', 'application/pdf');
    res.setHeader('cache-control', 'private, no-store');
    res.setHeader('x-preise', frei ? 'frei' : 'gesperrt');
    res.setHeader('content-disposition', `inline; filename="${String(filename || 'angebot.pdf').replace(/[^\w. -]/g, '_')}"`);
    res.send(daten);
  } catch (err) {
    res.status(500).json({ error: 'PDF konnte nicht geladen werden: ' + err.message });
  }
}

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
// Angaben, die nur über die Büro-Schnittstelle (bzw. die Entscheidung der Küche) geändert werden
const SERVER_FELDER = ['officeEventId', 'officeOfferId', 'angebotVersion', 'officeAngebot', 'offeneAenderung', 'abgelehnteAenderung', 'quelle', 'storniert', 'storniertAm', 'buero', 'kuecheInfo'];
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
  if (idx !== -1) for (const k of SERVER_FELDER) { if (events[idx][k] !== undefined) event[k] = events[idx][k]; else delete event[k]; }   // Büro-Angaben und offene Änderungen nicht durch einen veralteten Browser überschreiben
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

// Original-PDF eines Angebots (für die Vorschau im Angebotsreiter)
app.get('/api/events/:id/pdf', requireAuth, async (req, res) => {
  const ev = (await store.getEvents()).find(e => e.id === req.params.id);
  if (!ev || !ev.pdfPathname) return res.status(404).json({ error: 'PDF nicht gefunden.' });
  await sendeAngebotPdf(req, res, ev.pdfPathname, ev.pdfFilename);
});

// Kurzlebiges Token für die eingebettete Katalog-Seite (die Office-App ruft das serverseitig mit ihrem Schlüssel ab)
app.post('/api/integration/v1/token', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const h = req.headers.authorization || '';
  if (!(await bueroSchluesselOk(h.startsWith('Bearer ') ? h.slice(7).trim() : ''))) return res.status(401).json({ error: 'Nicht angemeldet.' });
  const { name, readonly, lebensdauerS } = req.body || {};
  const ttl = Math.max(300, Math.min(Number(lebensdauerS) || 3600, 4 * 3600));
  const token = erzeugeEmbedToken(embedGeheimnis(), { sub: 'office', name: String(name || 'Büro').slice(0, 60), scope: 'katalog lager', lebensdauerS: ttl, readonly: !!readonly });
  const basis = (IS_VERCEL ? 'https://' : req.protocol + '://') + req.headers.host;
  res.json({ ok: true, token, laeuftAbIn: ttl, embedUrl: `${basis}/api/speisenkatalog/embed?token=${token}&select=1` });
});
// Einstellungen in der App (Regeln -> Büro-Verbindung): Adresse(n) des Büro-Programms, Schlüssel erzeugen
app.get('/api/buero-verbindung', requireAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const v = await store.getBueroVerbindung();
  res.json({ vorhanden: !!(v && v.keyHash), endung: v && v.endung || '', erzeugt: v && v.erzeugt || null, zuletzt: v && v.zuletzt || null, origins: (v && v.origins) || [], aussenUmgebung: OFFICE_ORIGINS });
});
// Alle Unterlagen für die Büro-Seite als ein Text (Briefing + Angebotsformat + Einrichtung) – zum Einfügen in deren Claude
app.get('/api/buero-verbindung/readme', requireAuth, (req, res) => {
  const fs = require('fs'), path = require('path');
  const lies = n => { try { return fs.readFileSync(path.join(__dirname, 'docs', 'integration', n), 'utf8'); } catch (e) { return null; } };
  const teile = [
    ['BRIEFING-OFFICE-CLAUDE.md', lies('BRIEFING-OFFICE-CLAUDE.md')],
    ['ANGEBOT-FORMAT.md', lies('ANGEBOT-FORMAT.md')],
    ['KATALOG-EINBINDUNG.md', lies('KATALOG-EINBINDUNG.md')],
    ['LAGER-SCHNITTSTELLE.md', lies('LAGER-SCHNITTSTELLE.md')],
  ].filter(t => t[1]);
  if (!teile.length) return res.status(404).json({ error: 'Unterlagen nicht gefunden.' });
  res.setHeader('Cache-Control', 'no-store');
  res.type('text/plain; charset=utf-8').send(teile.map(([n, t]) => `===== ${n} =====\n\n${t.replace(/\r\n/g, '\n').trim()}`).join('\n\n\n'));
});
app.put('/api/buero-verbindung', requireAuth, async (req, res) => {
  const roh = Array.isArray(req.body && req.body.origins) ? req.body.origins : String((req.body && req.body.origins) || '').split(/[\s,;]+/);
  const origins = [];
  for (const t of roh.map(x => String(x).trim()).filter(Boolean)) {
    try { const u = new URL(/^https?:\/\//i.test(t) ? t : 'https://' + t); if (!/^[a-z0-9.-]+$/i.test(u.hostname) || !(u.hostname.includes('.') || u.hostname === 'localhost')) throw new Error('Adresse'); origins.push(u.origin); } catch (e) { return res.status(400).json({ error: 'Das ist keine gültige Adresse: ' + t }); }
  }
  const v = (await store.getBueroVerbindung()) || {};
  v.origins = Array.from(new Set(origins));
  await store.setBueroVerbindung(v);
  res.json({ ok: true, origins: v.origins });
});
app.post('/api/buero-verbindung/schluessel', requireAuth, async (req, res) => {
  const schluessel = 'ksk_' + crypto.randomBytes(32).toString('base64url');
  const v = (await store.getBueroVerbindung()) || {};
  Object.assign(v, { keyHash: sha256(schluessel), endung: schluessel.slice(-4), erzeugt: new Date().toISOString(), zuletzt: null });
  await store.setBueroVerbindung(v);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, schluessel });   // wird nur dieses eine Mal angezeigt; gespeichert ist nur der Hash
});

// --- Angebote aus der Office-App (Token-Bereich "angebote"; Format: docs/integration/ANGEBOT-FORMAT.md) ---
async function angebotsNutzer(req, res, next) {
  let u = null;
  try { u = await integrationsNutzer(req, 'angebote'); } catch (err) { console.error('Auth:', err.message); }
  if (!u) return res.status(401).json({ error: 'Nicht angemeldet.' });
  if (u.ro) return res.status(403).json({ error: 'Nur Lesezugriff.' });
  req.integrationNutzer = u; next();
}
async function pdfAblegen(pdf) {
  if (!pdf) return null;
  const buf = Buffer.from(pdf.base64, 'base64');
  if (!buf.length || buf.slice(0, 5).toString() !== '%PDF-') throw Object.assign(new Error('pdf.base64 ist keine PDF-Datei.'), { code: 400 });
  if (buf.length > 9 * 1024 * 1024) throw Object.assign(new Error('Das PDF ist größer als 9 MB.'), { code: 413 });
  const name = String(pdf.dateiname || 'angebot.pdf').replace(/[^\w. -]/g, '_').slice(0, 80);
  try {
    const { put } = require('@vercel/blob');
    const blob = await put(`archiv/${crypto.randomUUID()}-${name}`, buf, { access: 'private', contentType: 'application/pdf' });
    return { pdfPathname: blob.pathname, pdfFilename: name };
  } catch (err) { console.error('PDF konnte nicht im Blob-Speicher abgelegt werden:', err.message); return null; }
}
async function pdfLoeschen(pathname) {
  if (!pathname) return;
  try { const { del } = require('@vercel/blob'); await del(pathname); } catch (err) { console.error('Blob-Löschung fehlgeschlagen:', err.message); }
}
function ereignis(ev, text) { (ev.buero = ev.buero || []).push({ am: new Date().toISOString(), text }); ev.buero = ev.buero.slice(-30); }

// Übernimmt eine Angebotsversion in den Auftrag (neu oder als Änderung)
async function katalogKontext() {
  try { const k = await store.getSpeisenkatalog(); return { customGerichte: new Set(Object.keys(((k && k.daten) || {}).speisen_custom || {})) }; } catch (e) { return { customGerichte: new Set() }; }
}
async function angebotUebernehmen(events, idx, a, pdf) {
  const alt = idx >= 0 ? events[idx] : null;
  const neu = IA.angebotZuEvent(a, alt, await katalogKontext());
  if (!alt) neu.id = crypto.randomUUID();
  else if (alt.lagerGebucht) neu.lagerAbgleich = true;   // Verbrauch im Vorrat wird beim nächsten Öffnen der App neu verrechnet
  if (pdf) { if (alt && alt.pdfPathname && alt.pdfPathname !== pdf.pdfPathname) await pdfLoeschen(alt.pdfPathname); neu.pdfPathname = pdf.pdfPathname; neu.pdfFilename = pdf.pdfFilename; }
  ereignis(neu, alt ? `Version ${a.version} vom Büro übernommen${a.aenderung && a.aenderung.grund ? ': ' + a.aenderung.grund : ''}` : 'Angebot vom Büro bestätigt (Version ' + a.version + ')');
  if (idx >= 0) events[idx] = neu; else events.push(neu);
  return neu;
}
async function angebotVerarbeiten(roh) {
  const fehler = IA.pruefeAngebot(roh);
  if (fehler.length) return { code: 400, body: { ok: false, fehler } };
  const a = IA.bereinige(roh);
  const events = await store.getEvents();
  const idx = events.findIndex(e => e.officeEventId === a.officeEventId);
  const ev = idx >= 0 ? events[idx] : null;
  const runden = await store.getBestellungen();
  const jetzt = new Date();
  const ktx = await katalogKontext();
  const warn = a.status === 'CONFIRMED' ? IA.katalogWarnungen(a, ktx) : [];
  const fertig = async (neu, body) => { await store.setEvents(events); await archivSynchronisieren(events).catch(err => console.error('Archiv-Sync:', err.message)); return { code: 200, body: { ok: true, kuechenEventId: neu.id, version: a.version, ...body, ...(warn.length ? { warnungen: warn } : {}) } }; };

  if (ev && a.version < (ev.angebotVersion || 0)) return { code: 409, body: { ok: false, status: 'veraltet', aktuelleVersion: ev.angebotVersion, fehler: ['Es liegt bereits eine neuere Version vor.'] } };
  if (ev && ev.offeneAenderung && ev.offeneAenderung.version === a.version) return { code: 200, body: { ok: true, status: 'wartet_auf_kueche', kuechenEventId: ev.id, version: a.version, gruende: ev.offeneAenderung.gruende } };
  if (ev && ev.angebotVersion === a.version && !ev.storniert) return { code: 200, body: { ok: true, status: 'unveraendert', kuechenEventId: ev.id, version: a.version } };
  if (ev && ev.storniert) return { code: 200, body: { ok: true, status: 'storniert', kuechenEventId: ev.id, version: a.version } };

  const pdf = await pdfAblegen(roh.pdf);   // wirft bei ungültigem PDF

  // --- Storno ---
  if (a.status === 'CANCELLED') {
    if (!ev) { await pdfLoeschen(pdf && pdf.pdfPathname); return { code: 200, body: { ok: true, status: 'unbekannt', version: a.version, hinweis: 'Zu diesem Auftrag gibt es bei der Küche kein bestätigtes Angebot.' } }; }
    const tage = (ev.officeAngebot ? ev.officeAngebot.tage.map(t => t.datum) : []);
    const fr = IA.pruefeFrist(tage, jetzt, runden);
    if (fr.gesperrt) {
      if (ev.offeneAenderung) await pdfLoeschen(ev.offeneAenderung.pdfPathname);
      ev.offeneAenderung = { version: a.version, art: 'storno', eingegangen: jetzt.toISOString(), zeilen: ['Das Angebot wurde vom Büro storniert.' + (a.grund ? ' Grund: ' + a.grund : '')], tage, gruende: fr.gruende, angebot: a };
      ereignis(ev, 'Storno vom Büro eingegangen – wartet auf Bestätigung der Küche');
      return fertig(ev, { status: 'wartet_auf_kueche', gruende: fr.gruende });
    }
    ev.storniert = true; ev.storniertAm = jetzt.toISOString(); ev.angebotVersion = a.version; ereignis(ev, 'Vom Büro storniert');
    return fertig(ev, { status: 'storniert' });
  }

  // --- Neues Angebot ---
  if (!ev) {
    const neu = await angebotUebernehmen(events, -1, a, pdf);
    const fr = IA.pruefeFrist(a.tage.map(t => t.datum), jetzt, runden);
    return fertig(neu, { status: 'angelegt', nachFrist: fr.gesperrt, hinweis: fr.gesperrt ? 'Achtung: Für mindestens einen Tag ist die Bestellung schon abgeschickt – die Küche bestellt nach (Nachbestellung).' : undefined, gruende: fr.gesperrt ? fr.gruende : undefined });
  }

  // --- Änderung ---
  const diff = IA.vergleiche(ev.officeAngebot, a);
  const fr = diff.kritisch ? IA.pruefeFrist(diff.tage, jetzt, runden) : { gesperrt: false, gruende: [] };
  if (fr.gesperrt) {
    if (ev.offeneAenderung) await pdfLoeschen(ev.offeneAenderung.pdfPathname);
    ev.offeneAenderung = { version: a.version, art: 'aenderung', eingegangen: jetzt.toISOString(), zeilen: diff.zeilen, tage: diff.tage, gruende: fr.gruende, grund: a.aenderung && a.aenderung.grund || '', angebot: a, ...(pdf || {}) };
    ereignis(ev, `Änderung (Version ${a.version}) vom Büro eingegangen – wartet auf Bestätigung der Küche`);
    return fertig(ev, { status: 'wartet_auf_kueche', gruende: fr.gruende, aenderungen: diff.zeilen });
  }
  if (ev.offeneAenderung) { await pdfLoeschen(ev.offeneAenderung.pdfPathname); }
  const neu = await angebotUebernehmen(events, idx, a, pdf);
  return fertig(neu, { status: 'uebernommen', aenderungen: diff.zeilen });
}
app.post('/api/integration/v1/angebote', angebotsNutzer, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try { const r = await angebotVerarbeiten(req.body); res.status(r.code).json(r.body); }
  catch (err) { console.error('Angebot:', err.stack || err.message); res.status(Number.isInteger(err.code) && err.code >= 400 && err.code < 600 ? err.code : 500).json({ ok: false, fehler: ['Interner Fehler beim Verarbeiten: ' + err.message] }); }
});
// Stand eines Angebots in der Küche (für das Büro): übernommene Version, offene Änderung, Entscheidung der Küche
app.get('/api/integration/v1/angebote/:officeEventId', angebotsNutzer, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const ev = (await store.getEvents()).find(e => e.officeEventId === req.params.officeEventId);
  if (!ev) return res.status(404).json({ ok: false, error: 'Unbekannter Auftrag.' });
  const o = ev.offeneAenderung, ab = ev.abgelehnteAenderung;
  res.json({ ok: true, kuechenEventId: ev.id, version: ev.angebotVersion || null, storniert: !!ev.storniert,
    offen: o ? { version: o.version, art: o.art, seit: o.eingegangen, gruende: o.gruende } : null,
    abgelehnt: ab ? { version: ab.version, am: ab.am, grund: ab.grund || '' } : null });
});
// Entscheidung der Küche über eine Änderung, die nach der Bestellfrist eingegangen ist
app.post('/api/events/:id/aenderung', requireAuth, async (req, res) => {
  const events = await store.getEvents();
  const idx = events.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Auftrag nicht gefunden.' });
  const ev = events[idx], o = ev.offeneAenderung;
  if (!o) return res.status(409).json({ error: 'Es liegt keine offene Änderung vor.' });
  const { entscheidung, grund } = req.body || {};
  if (entscheidung === 'uebernehmen') {
    if (o.art === 'storno') { ev.storniert = true; ev.storniertAm = new Date().toISOString(); ev.angebotVersion = o.version; delete ev.offeneAenderung; ereignis(ev, 'Storno von der Küche bestätigt'); }
    else { const neu = await angebotUebernehmen(events, idx, o.angebot, o.pdfPathname ? { pdfPathname: o.pdfPathname, pdfFilename: o.pdfFilename } : null); ereignis(neu, 'Änderung von der Küche bestätigt'); }
  } else if (entscheidung === 'ablehnen') {
    await pdfLoeschen(o.pdfPathname);
    ev.abgelehnteAenderung = { version: o.version, am: new Date().toISOString(), grund: String(grund || '').slice(0, 300) };
    delete ev.offeneAenderung; ereignis(ev, `Änderung (Version ${o.version}) von der Küche abgelehnt`);
  } else return res.status(400).json({ error: 'entscheidung muss "uebernehmen" oder "ablehnen" sein.' });
  await store.setEvents(events);
  await archivSynchronisieren(events).catch(err => console.error('Archiv-Sync:', err.message));
  res.json(events[idx]);
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

// --- Bestellrunden (abgeschickte Einkaufslisten) ---
app.get('/api/bestellungen', requireAuth, async (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.json(await store.getBestellungen()); });
app.put('/api/bestellungen', requireAuth, async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Liste erwartet.' });
  await store.setBestellungen(req.body);
  res.json(req.body);
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
  await sendeAngebotPdf(req, res, entry.pathname, entry.filename);
});

module.exports = app;
