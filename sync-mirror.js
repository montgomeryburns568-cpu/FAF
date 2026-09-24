// Eigenstaendiges Skript, laeuft lokal (z.B. per Windows-Aufgabenplanung) und holt sich
// regelmaessig eine Kopie aller Daten von der online laufenden App - das ist der
// "Offline-Spiegel": eine lokale, lesbare JSON-Kopie, unabhaengig von Vercel/Cloudflare.
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const MIRROR_URL = process.env.MIRROR_URL;
const APP_PASSWORD = process.env.APP_PASSWORD;

const DATA_DIR = path.join(__dirname, 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const ARCHIV_PDF_DIR = path.join(DATA_DIR, 'archiv-pdfs');

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  if (!fs.existsSync(ARCHIV_PDF_DIR)) fs.mkdirSync(ARCHIV_PDF_DIR, { recursive: true });
}

function safeFilename(s) {
  return (s || 'angebot').replace(/[\\/:*?"<>|]/g, '_');
}

function writeMirrorFile(name, data) {
  const file = path.join(DATA_DIR, `${name}.json`);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(BACKUP_DIR, `${name}_${stamp}.json`), JSON.stringify(data, null, 2), 'utf-8');
  pruneBackups(name);
}

function pruneBackups(name, keep = 50) {
  const all = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith(name + '_')).sort();
  const excess = all.length - keep;
  for (let i = 0; i < excess; i++) fs.unlinkSync(path.join(BACKUP_DIR, all[i]));
}

function extractCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const first = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return first.split(';')[0];
}

async function main() {
  if (!MIRROR_URL || !APP_PASSWORD) {
    console.error('FEHLER: MIRROR_URL und/oder APP_PASSWORD fehlen in der .env.');
    process.exit(1);
  }
  ensureDirs();

  const loginResp = await fetch(`${MIRROR_URL}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: APP_PASSWORD }),
  });
  if (!loginResp.ok) throw new Error(`Login fehlgeschlagen: ${loginResp.status}`);
  const cookie = extractCookie(loginResp.headers.get('set-cookie'));
  if (!cookie) throw new Error('Kein Auth-Cookie erhalten.');

  for (const name of ['recipes', 'rules', 'events', 'archiv', 'artikelzuordnung']) {
    const resp = await fetch(`${MIRROR_URL}/api/${name}`, { headers: { cookie } });
    if (!resp.ok) throw new Error(`Abruf von ${name} fehlgeschlagen: ${resp.status}`);
    const data = await resp.json();
    writeMirrorFile(name, data);
  }

  const archiv = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'archiv.json'), 'utf-8'));
  let pdfCount = 0;
  for (const entry of archiv) {
    if (!entry.pathname) continue;
    const localName = `${entry.id}_${safeFilename(entry.filename)}`;
    const localPath = path.join(ARCHIV_PDF_DIR, localName);
    if (fs.existsSync(localPath)) continue; // PDF aendert sich nicht mehr nach Upload, kein erneuter Download noetig
    const pdfResp = await fetch(`${MIRROR_URL}/api/archiv/${entry.id}/pdf`, { headers: { cookie } });
    if (!pdfResp.ok) { console.error(`PDF-Download fuer ${entry.id} fehlgeschlagen: ${pdfResp.status}`); continue; }
    const buf = Buffer.from(await pdfResp.arrayBuffer());
    fs.writeFileSync(localPath, buf);
    pdfCount++;
  }

  console.log(`[${new Date().toISOString()}] Spiegelung erfolgreich: recipes, rules, events, archiv, artikelzuordnung aktualisiert in ${DATA_DIR} (${pdfCount} neue PDF(s) heruntergeladen)`);
}

main().catch(err => {
  console.error(`[${new Date().toISOString()}] Spiegelung fehlgeschlagen:`, err.message);
  process.exit(1);
});
