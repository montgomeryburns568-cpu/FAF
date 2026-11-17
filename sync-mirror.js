// Eigenstaendiges Skript, laeuft lokal (per Windows-Aufgabenplanung) und haelt den "Offline-Spiegel" aktuell:
// eine lokale, lesbare JSON-Kopie aller Daten der online laufenden App, unabhaengig von Vercel.
//
// Ablauf (siehe verlauf.js): Die App legt bei jeder echten Aenderung sofort einen Kontrollpunkt an und zaehlt dabei
// einen Aenderungsstand hoch. Dieses Skript fragt nur diesen Zaehler ab (ein winziger Aufruf). Hat er sich nicht
// geaendert, passiert nichts. Hat er sich geaendert, werden genau die neuen Kontrollpunkte geholt: jeder landet als
// Backup in data/backups/, der neueste als aktueller Stand in data/<bereich>.json.
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const MIRROR_URL = (process.env.MIRROR_URL || '').replace(/\/+$/, '');
const APP_PASSWORD = process.env.APP_PASSWORD;

const DATA_DIR = process.env.MIRROR_DATA_DIR || path.join(__dirname, 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const ARCHIV_PDF_DIR = path.join(DATA_DIR, 'archiv-pdfs');
const STAND_DATEI = path.join(DATA_DIR, 'verlauf-stand.json');
const SITZUNG_DATEI = path.join(DATA_DIR, 'sitzung.json');
const BACKUPS_BEHALTEN = 200;

const BEREICHE = ['recipes', 'rules', 'events', 'archiv', 'artikelzuordnung', 'speisenkatalog', 'kunden', 'vorrat', 'bestellungen', 'kuecheninfo'];
const apiPfad = name => (name === 'speisenkatalog' ? 'speisenkatalog/state' : name);

function ensureDirs() {
  for (const d of [DATA_DIR, BACKUP_DIR, ARCHIV_PDF_DIR]) if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}
const liesJSON = datei => { try { return JSON.parse(fs.readFileSync(datei, 'utf-8')); } catch (e) { return null; } };
const safeFilename = s => (s || 'angebot').replace(/[\\/:*?"<>|]/g, '_');
const stempel = iso => iso.replace(/[:.]/g, '-');

function schreibeAtomar(datei, inhalt) {
  const tmp = datei + '.tmp';
  fs.writeFileSync(tmp, inhalt, 'utf-8');
  fs.renameSync(tmp, datei);
}

function pruneBackups(name) {
  const all = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith(name + '_')).sort();
  for (let i = 0; i < all.length - BACKUPS_BEHALTEN; i++) fs.unlinkSync(path.join(BACKUP_DIR, all[i]));
}

// Vollstaendiger Abgleich (erster Lauf oder Neuanfang): schreibt nur Bereiche, die sich gegenueber der lokalen Kopie geaendert haben.
function writeMirrorFile(name, data) {
  const file = path.join(DATA_DIR, `${name}.json`);
  const json = JSON.stringify(data, null, 2);
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf-8') === json) return false;
  schreibeAtomar(file, json);
  fs.writeFileSync(path.join(BACKUP_DIR, `${name}_${stempel(new Date().toISOString())}.json`), json, 'utf-8');
  pruneBackups(name);
  return true;
}

function extractCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const first = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return first.split(';')[0];
}

const holen = (pfad, cookie) => fetch(`${MIRROR_URL}${pfad}`, { headers: { cookie } });
async function holeJSON(pfad, cookie) {
  const r = await holen(pfad, cookie);
  if (!r.ok) throw new Error(`Abruf von ${pfad} fehlgeschlagen: ${r.status}`);
  return r.json();
}

// Anmeldung; das Anmelde-Cookie wird lokal gemerkt, damit die haeufige Standabfrage ohne erneutes Login auskommt.
async function anmelden() {
  const loginResp = await fetch(`${MIRROR_URL}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: APP_PASSWORD }),
  });
  if (!loginResp.ok) throw new Error(`Login fehlgeschlagen: ${loginResp.status}`);
  const cookie = extractCookie(loginResp.headers.get('set-cookie'));
  if (!cookie) throw new Error('Kein Auth-Cookie erhalten.');
  fs.writeFileSync(SITZUNG_DATEI, JSON.stringify({ cookie }), 'utf-8');
  return cookie;
}

// Angebots-PDFs sind ohne Preis-Passwort geschwaerzt. Fuer die Sicherung der Originale PREIS_PASSWORD in die .env eintragen.
async function preiseEntsperren(cookie) {
  if (!process.env.PREIS_PASSWORD) {
    console.error('Hinweis: PREIS_PASSWORD fehlt in der .env – neue Angebots-PDFs werden deshalb nicht gesichert (sie wären geschwärzt).');
    return null;
  }
  const pr = await fetch(`${MIRROR_URL}/api/preise/entsperren`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ passwort: process.env.PREIS_PASSWORD }) });
  const pc = extractCookie(pr.headers.get('set-cookie'));
  if (pr.ok && pc) return cookie + '; ' + pc;
  console.error('Preis-Passwort wurde nicht akzeptiert – PDFs werden nicht gesichert.');
  return null;
}

async function vollAbgleich(cookie) {
  const geaendert = [];
  for (const name of BEREICHE) {
    if (writeMirrorFile(name, await holeJSON(`/api/${apiPfad(name)}`, cookie))) geaendert.push(name);
  }
  return geaendert;
}

// Holt alle Kontrollpunkte mit id > seit. Zusammengefasste Kontrollpunkte (gleicher Beginn) ueberschreiben ihr Backup.
async function kontrollpunkteHolen(cookie, seit) {
  const uebersicht = await holeJSON('/api/verlauf', cookie);
  const geaendert = [];
  for (const name of BEREICHE) {
    const neu = (uebersicht.bereiche[name] || []).filter(e => e.id > seit).sort((a, b) => a.id - b.id);
    let letzter = null;
    for (const e of neu) {
      const r = await holen(`/api/verlauf/${name}/${e.slot}`, cookie);
      if (r.status === 404) continue; // inzwischen durch neuere ersetzt
      if (!r.ok) throw new Error(`Kontrollpunkt ${name}/${e.slot}: ${r.status}`);
      const json = JSON.stringify(await r.json(), null, 2);
      fs.writeFileSync(path.join(BACKUP_DIR, `${name}_${stempel(e.beginn)}.json`), json, 'utf-8');
      letzter = json;
    }
    if (letzter) {
      schreibeAtomar(path.join(DATA_DIR, `${name}.json`), letzter);
      pruneBackups(name);
      geaendert.push(`${name} (${neu.length})`);
    }
  }
  return geaendert;
}

async function pdfsSichern(cookie) {
  const archiv = liesJSON(path.join(DATA_DIR, 'archiv.json')) || [];
  let anzahl = 0;
  for (const entry of archiv) {
    if (!entry.pathname) continue;
    const localPath = path.join(ARCHIV_PDF_DIR, `${entry.id}_${safeFilename(entry.filename)}`);
    if (fs.existsSync(localPath)) continue; // PDF aendert sich nach dem Upload nicht mehr
    const pdfResp = await holen(`/api/archiv/${entry.id}/pdf`, cookie);
    if (!pdfResp.ok) { console.error(`PDF-Download fuer ${entry.id} fehlgeschlagen: ${pdfResp.status}`); continue; }
    if (pdfResp.headers.get('x-preise') !== 'frei') { console.error(`PDF ${entry.id}: Server lieferte die geschwärzte Fassung – nicht gesichert.`); continue; }
    fs.writeFileSync(localPath, Buffer.from(await pdfResp.arrayBuffer()));
    anzahl++;
  }
  return anzahl;
}

async function main() {
  if (!MIRROR_URL || !APP_PASSWORD) {
    console.error('FEHLER: MIRROR_URL und/oder APP_PASSWORD fehlen in der .env.');
    process.exit(1);
  }
  ensureDirs();

  // 1. Nur den Aenderungsstand abfragen (mit gemerkter Anmeldung, sonst neu anmelden)
  let cookie = (liesJSON(SITZUNG_DATEI) || {}).cookie;
  let r = cookie ? await holen('/api/verlauf/stand', cookie) : null;
  if (!r || r.status === 401) { cookie = await anmelden(); r = await holen('/api/verlauf/stand', cookie); }
  const ohneKontrollpunkte = r.status === 404; // App noch ohne Kontrollpunkt-Funktion: wie frueher alles vergleichen
  if (!r.ok && !ohneKontrollpunkte) throw new Error(`Abfrage des Aenderungsstands fehlgeschlagen: ${r.status}`);
  const stand = ohneKontrollpunkte ? null : (await r.json()).stand;

  const lokal = liesJSON(STAND_DATEI);
  const alleDateienDa = BEREICHE.every(n => fs.existsSync(path.join(DATA_DIR, `${n}.json`)));
  const nichtsZuTun = !ohneKontrollpunkte && lokal && lokal.stand === stand && alleDateienDa;

  if (!nichtsZuTun) {
    // 2. Es gibt Aenderungen: neue Kontrollpunkte holen (oder beim ersten Mal / nach einem Neuanfang alles abgleichen)
    const mitPreisen = await preiseEntsperren(cookie);
    const anfrageCookie = mitPreisen || cookie;
    let geaendert;
    if (ohneKontrollpunkte || !lokal || !alleDateienDa || stand < lokal.stand) {
      geaendert = await vollAbgleich(anfrageCookie);
    } else {
      geaendert = await kontrollpunkteHolen(anfrageCookie, lokal.stand);
      if (!geaendert.length) geaendert = await vollAbgleich(anfrageCookie); // Stand gestiegen, aber keine Kontrollpunkte: sicherheitshalber alles
    }
    const pdfs = mitPreisen ? await pdfsSichern(anfrageCookie) : 0;
    if (!ohneKontrollpunkte) fs.writeFileSync(STAND_DATEI, JSON.stringify({ stand }), 'utf-8');
    if (geaendert.length || pdfs) {
      console.log(`[${new Date().toISOString()}] Spiegelung: ${geaendert.join(', ') || 'keine Datenänderung'} (${pdfs} neue PDF(s)) in ${DATA_DIR}`);
    }
  }
  fs.writeFileSync(path.join(DATA_DIR, 'letzte-spiegelung.txt'), new Date().toISOString() + '\n', 'utf-8');
}

main().catch(err => {
  console.error(`[${new Date().toISOString()}] Spiegelung fehlgeschlagen:`, err.message);
  process.exit(1);
});
