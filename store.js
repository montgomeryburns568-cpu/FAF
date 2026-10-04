const fs = require('fs');
const path = require('path');

const { SEED_RECIPES, DEFAULT_RULES } = require('./public/seed-data.js');

const REDIS_URL = process.env.REDIS_URL;
const useKV = !!REDIS_URL;

// ---------- Redis ueber Vercel Marketplace (Cloud-Modus) ----------
let clientPromise = null;
async function getKV() {
  if (!clientPromise) {
    const { createClient } = require('redis');
    const client = createClient({ url: REDIS_URL });
    client.on('error', err => console.error('Redis-Fehler:', err.message));
    clientPromise = client.connect().then(() => client);
  }
  return clientPromise;
}
async function kvGetOrInit(key, fallback) {
  const client = await getKV();
  const raw = await client.get(key);
  if (raw == null) { await client.set(key, JSON.stringify(fallback)); return fallback; }
  return JSON.parse(raw);
}
async function kvSet(key, data) {
  const client = await getKV();
  await client.set(key, JSON.stringify(data));
}

// ---------- lokale JSON-Dateien (Dev-Fallback, falls keine KV konfiguriert) ----------
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const FILES = {
  recipes: path.join(DATA_DIR, 'recipes.json'),
  rules: path.join(DATA_DIR, 'rules.json'),
  events: path.join(DATA_DIR, 'events.json'),
  archiv: path.join(DATA_DIR, 'archiv.json'),
  artikelzuordnung: path.join(DATA_DIR, 'artikelzuordnung.json'),
  speisenkatalog: path.join(DATA_DIR, 'speisenkatalog.json'),
};

function ensureFile(file, defaultValue) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2), 'utf-8');
}
function readJSON(file) { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
function writeJSON(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
  mirrorBackupLocal(file, data);
}
function mirrorBackupLocal(file, data) {
  const name = path.basename(file, '.json');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(BACKUP_DIR, `${name}_${stamp}.json`), JSON.stringify(data, null, 2), 'utf-8');
  pruneBackups(name);
}
function pruneBackups(name, keep = 50) {
  const all = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith(name + '_')).sort();
  const excess = all.length - keep;
  for (let i = 0; i < excess; i++) fs.unlinkSync(path.join(BACKUP_DIR, all[i]));
}
function initLocal() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  ensureFile(FILES.recipes, SEED_RECIPES);
  ensureFile(FILES.rules, DEFAULT_RULES);
  ensureFile(FILES.events, []);
  ensureFile(FILES.archiv, []);
  ensureFile(FILES.artikelzuordnung, {});
  ensureFile(FILES.speisenkatalog, {});
}

async function init() {
  if (useKV) {
    await kvGetOrInit('recipes', SEED_RECIPES);
    await kvGetOrInit('rules', DEFAULT_RULES);
    await kvGetOrInit('events', []);
    await kvGetOrInit('archiv', []);
    await kvGetOrInit('artikelzuordnung', {});
    await kvGetOrInit('speisenkatalog', {});
  } else {
    initLocal();
  }
  await seedStandardRezepte(false);
}

// ---------- Standardrezepte aus dem Speisenkatalog in die Rezepte-Datenbank übernehmen ----------
// Je Komponente ein Standardrezept (Bezugsmenge 200 g/ml, kurze Zubereitung). Es werden nur FEHLENDE Rezepte
// ergänzt (gleicher Name = vorhanden); gelöschte oder bearbeitete Rezepte kommen nicht zurück, weil sich die
// Datenbank merkt, welche Standardrezepte schon einmal übernommen wurden. force=true ergänzt alles Fehlende erneut.
const norm = s => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
const STD_MARKER_FILE = path.join(DATA_DIR, 'standardrezepte.json');
async function getStdMarker() {
  if (useKV) return kvGetOrInit('standardrezepte', { version: '', ids: [] });
  try { return JSON.parse(fs.readFileSync(STD_MARKER_FILE, 'utf-8')); } catch (e) { return { version: '', ids: [] }; }
}
async function setStdMarker(m) {
  if (useKV) await kvSet('standardrezepte', m);
  else fs.writeFileSync(STD_MARKER_FILE, JSON.stringify(m), 'utf-8');
}
async function seedStandardRezepte(force) {
  let std;
  try { std = require('./speisenkatalog/standard-rezepte.js'); } catch (e) { return { added: 0 }; }
  const marker = await getStdMarker();
  if (!force && marker.version === std.version) return { added: 0 };
  const existing = await (useKV ? kvGetOrInit('recipes', SEED_RECIPES) : Promise.resolve(readJSON(FILES.recipes)));
  const have = new Set(existing.map(r => norm(r.name)));
  const seenIds = new Set(force ? [] : marker.ids);
  const add = std.recipes.filter(r => !have.has(norm(r.name)) && !seenIds.has(r.id) && !existing.some(e => e.id === r.id));
  if (add.length) {
    const merged = existing.concat(add);
    if (useKV) await kvSet('recipes', merged); else writeJSON(FILES.recipes, merged);
  }
  await setStdMarker({ version: std.version, ids: std.recipes.map(r => r.id) });
  return { added: add.length };
}

module.exports = {
  useKV,
  init,
  seedStandardRezepte,
  async getRecipes() { return useKV ? kvGetOrInit('recipes', SEED_RECIPES) : readJSON(FILES.recipes); },
  async setRecipes(data) { if (useKV) { await kvSet('recipes', data); } else { writeJSON(FILES.recipes, data); } },
  async getRules() { return useKV ? kvGetOrInit('rules', DEFAULT_RULES) : readJSON(FILES.rules); },
  async setRules(data) { if (useKV) { await kvSet('rules', data); } else { writeJSON(FILES.rules, data); } },
  async getEvents() { return useKV ? kvGetOrInit('events', []) : readJSON(FILES.events); },
  async setEvents(data) { if (useKV) { await kvSet('events', data); } else { writeJSON(FILES.events, data); } },
  async getArchiv() { return useKV ? kvGetOrInit('archiv', []) : readJSON(FILES.archiv); },
  async setArchiv(data) { if (useKV) { await kvSet('archiv', data); } else { writeJSON(FILES.archiv, data); } },
  async getArtikelzuordnung() { return useKV ? kvGetOrInit('artikelzuordnung', {}) : readJSON(FILES.artikelzuordnung); },
  async setArtikelzuordnung(data) { if (useKV) { await kvSet('artikelzuordnung', data); } else { writeJSON(FILES.artikelzuordnung, data); } },
  // Änderungsstand des Speisenkatalogs (Austausch, Tags, To-Dos, Labels ...) – der Katalog selbst liegt als Datei im Repo
  async getSpeisenkatalog() { return useKV ? kvGetOrInit('speisenkatalog', {}) : readJSON(FILES.speisenkatalog); },
  async setSpeisenkatalog(data) { if (useKV) { await kvSet('speisenkatalog', data); } else { writeJSON(FILES.speisenkatalog, data); } },
};
