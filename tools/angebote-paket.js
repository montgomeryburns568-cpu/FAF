// Aufruf: node tools/angebote-paket.js [Ordner ...]   (ohne Angabe: die drei Angebotsordner unter C:\\Users\\forks\\Downloads)
// Liest alle Angebote (PDF und Word) aus den Ordnern auf diesem PC und erzeugt
//   data/import/angebote-paket.json   (Archiv-Einträge im Format der App; wird im Archiv über "Angebots-Paket einlesen" geladen)
//   data/import/bericht.md / bericht.json   (was wurde aufgenommen, was ausgelassen und warum)
// Dazu die Liste der Speisen, die der Speisenkatalog (noch) nicht erkennt:
//   data/import/speisen-nicht-erfasst.csv / .md
// Kundendaten liegen nur in data/ (nicht im Git).
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');
const { PDFParse } = require('pdf-parse');
const root = path.join(__dirname, '..');
const pub = path.join(root, 'public');
const seed = require(path.join(pub, 'seed-data.js'));
const kat = require(path.join(root, 'speisenkatalog', 'katalog-komponenten.js'));
const K = require(path.join(pub, 'kartei-logik.js'));
const normalize = s => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim();

// Parser und Katalog-Erkennung wie im Browser laden
const sb = { window: {}, console, CATEGORIES: seed.CATEGORIES, DEFAULT_RULES: seed.DEFAULT_RULES, state: { rules: seed.DEFAULT_RULES }, uid: () => 'x' + Math.random().toString(36).slice(2, 8), normalize };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(pub, 'katalog-todo.js'), 'utf8') + '\n;this.KT = KatalogTodo;', sb);
sb.KT.init(kat.komponenten, kat.aliase, { daten: {} });
vm.runInContext(fs.readFileSync(path.join(pub, 'parser.js'), 'utf8') + '\n;this.__api = { parseDocument, extractTotalPrice };', sb);
const { parseDocument, extractTotalPrice } = sb.__api;

const STANDARD_ORDNER = [
  'C:\\Users\\forks\\Downloads\\Angebote 2026 Forks&Friends',
  'C:\\Users\\forks\\Downloads\\Licata Catering',
  'C:\\Users\\forks\\Downloads\\Licata Allgemein',
];
const ORDNER = process.argv.length > 2 ? process.argv.slice(2) : STANDARD_ORDNER;
// Dateien, die keine Angebote sind (Name)
const KEIN_ANGEBOT = [
  [/rechnung|invoice/i, 'Rechnung'], [/pl(ae|ä)ne|grundriss|floor/i, 'Raumplan'], [/jahresr(ue|ü)ckblick|songs/i, 'kein Catering-Dokument'],
  [/ablauf/i, 'Ablaufplan'], [/^kw_|wochenplan/i, 'Wochenplan'], [/auftragsbest/i, 'Auftragsbestätigung'], [/buffetbeschriftung/i, 'Buffetbeschriftung'],
];

function walk(d) { const out = []; for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) out.push(...walk(p)); else out.push(p); } return out; }
function docxText(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('kein ZIP');
  const n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < n; i++) {
    const meth = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), lho = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nl);
    if (name === 'word/document.xml') {
      const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28), data = buf.slice(start, start + csize);
      const xml = (meth === 8 ? zlib.inflateRawSync(data) : data).toString('utf8');
      return xml.replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<\/w:p>/g, '\n').replace(/<\/w:tc>/g, '\t').replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, c) => String.fromCharCode(+c))
        .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    }
    p += 46 + nl + xl + cl;
  }
  throw new Error('word/document.xml fehlt');
}

// Kundenname wie in der App (kartei.js), zusätzlich für Word-Dateinamen mit führendem Datum
function kundeAusDateiname(fn) {
  let n = fn.replace(/\.(pdf|docx)$/i, '').replace(/(\d)pdf\b/gi, '$1').replace(/\bpdf\b/gi, ' ');
  n = n.replace(/^\d{4}-\d{2}(-\d{1,2})?(-\d{1,2})?(\s*\+\s*\d{4}-\d{2}(-\d{1,2})?)?[-\s]*/, '');        // führendes Datum (2026-04-27-28 + 2026-05-07 …)
  n = n.replace(/^(angebot|küchensheet|kuechensheet)[-_ ]*/i, '').replace(/^curtis[_ ]angebot[-_ ]*/i, '');
  n = n.split(/\s[-–]\s/)[0].replace(/\([^)]*\)/g, ' ')
    .replace(/\d{1,2}\.\s?[-–]\s?\d{1,2}\.\d{1,2}\.?(\d{2,4})?/g, ' ')          // 29.-30.09
    .replace(/\d{1,2}\.\d{1,2}\.(\d{2,4})?[-.\d]*/g, ' ').replace(/[_]+/g, ' ');
  n = n.replace(/(?<=\p{Ll})(?=\p{Lu}{2,})/gu, ' ').replace(/(?<=\p{L})\.(?=\p{L})/gu, ' ').replace(/\b(Dr|Prof)\s(?=\p{L})/gu, '$1. ').replace(/\bVer di\b/g, 'Ver.di').replace(/\be V\b/g, 'e.V.');
  return n.replace(/\s+/g, ' ').replace(/[\s\-–.]+$/, '').trim() || 'Unbekannt';
}
function kundenName(fn, parsed) {
  const aus = kundeAusDateiname(fn);
  return (/^(angebot|küchensheet|kuechensheet|curtis|\d{4}-\d{2})/i.test(fn) && aus !== 'Unbekannt') ? aus : (parsed.name || aus);
}
function geparsteGerichte(parsed) {
  const m = new Map();
  parsed.days.forEach(day => day.dishes.forEach(d => { if (d.name && !m.has(normalize(d.name))) m.set(normalize(d.name), { name: d.name, category: d.category || null, price: null, personen: d.personen || null }); }));
  return Array.from(m.values());
}

(async () => {
  const dateien = ORDNER.flatMap(o => walk(o)).filter(f => /\.(pdf|docx)$/i.test(f));
  const rep = [], eintraege = [];
  for (const f of dateien) {
    const fn = path.basename(f), ordner = path.basename(ORDNER.find(o => f.startsWith(o)));
    const info = { datei: fn, ordner, format: path.extname(f).slice(1).toLowerCase() };
    const hint = KEIN_ANGEBOT.find(([re]) => re.test(fn));
    if (hint) { rep.push({ ...info, status: 'ausgelassen', grund: hint[1] }); continue; }
    let text;
    try {
      const buf = fs.readFileSync(f);
      if (info.format === 'pdf') { const p = new PDFParse({ data: buf }); text = (await p.getText()).text; await p.destroy(); } else text = docxText(buf);
    } catch (e) { rep.push({ ...info, status: 'Fehler', grund: 'Text nicht lesbar: ' + e.message }); continue; }
    let parsed;
    try { parsed = parseDocument(text, fn); } catch (e) { rep.push({ ...info, status: 'Fehler', grund: 'Parser: ' + e.message }); continue; }
    const gerichte = geparsteGerichte(parsed);
    const istAngebotName = /angebot|^\d{4}-\d{2}/i.test(fn);
    if (!gerichte.length && (!istAngebotName || (!extractTotalPrice(text) && !parsed.personen))) { rep.push({ ...info, status: 'ausgelassen', grund: 'keine Gerichte, kein Preis erkannt' }); continue; }
    const name = kundenName(fn, parsed), dat = (parsed.days[0] && parsed.days[0].date) || '';
    const textIso = K.parseDatumDE(dat);
    const dateien = fn.match(/\d{1,2}\.\d{1,2}\.\d{4}/g) || [];
    const dateiIso = (/^(\d{4})-(\d{2})-(\d{2})/.test(fn) ? fn.slice(0, 10) : null) || (dateien.length === 1 && !/\d{1,2}\.\s?[-–]\s?\d{1,2}\./.test(fn) ? K.parseDatumDE(dateien[0]) : null);
    const iso = dateiIso || textIso || K.parseDatumDE(fn) || null;
    eintraege.push({
      source: 'pdf', format: info.format, filename: fn, pathname: null, rawText: text, customerName: name,
      eventDate: iso ? K.isoToDE(iso) : '', eventDateIso: iso || null, personen: parsed.personen || null,
      totalPrice: extractTotalPrice(text), dishes: gerichte, quelleOrdner: ordner,
      notiz: gerichte.length ? '' : 'Gerichte beim Einlesen nicht erkannt – bitte im Archiv ergänzen.',
    });
    rep.push({ ...info, status: 'aufgenommen', kunde: name, datum: iso ? K.isoToDE(iso) : '', gerichte: gerichte.length, personen: parsed.personen || null, preis: extractTotalPrice(text) });
  }

  // Doppelte zusammenführen: gleicher Kunde und Termin UND gleiche Gästezahl, Preis gleich oder bei einem der beiden unbekannt (z. B. Word und PDF zum selben Angebot).
  // Ohne Termin: gleicher Kunde, gleiche Gästezahl, mindestens einer ohne Preis. Preisvarianten bleiben getrennt erhalten. PDF hat Vorrang.
  const behalten = [];
  eintraege.sort((a, b) => (a.format === 'pdf' ? 0 : 1) - (b.format === 'pdf' ? 0 : 1));
  const preisOk = (a, b) => a.totalPrice == null || b.totalPrice == null || Math.abs(a.totalPrice - b.totalPrice) < 0.5;
  for (const e of eintraege) {
    const k = K.kundenKey(e.customerName);
    const dup = behalten.find(x => K.gleicherKunde(K.kundenKey(x.customerName), k) && x.personen === e.personen && preisOk(x, e)
      && ((x.eventDateIso && e.eventDateIso && x.eventDateIso === e.eventDateIso) || ((!x.eventDateIso || !e.eventDateIso) && (x.totalPrice == null || e.totalPrice == null))));
    if (dup) { const r = rep.find(r => r.datei === e.filename && r.status === 'aufgenommen'); r.status = 'zusammengeführt'; r.grund = 'gleiches Angebot wie ' + dup.filename; continue; }
    behalten.push(e);
  }
  const out = path.join(root, 'data', 'import'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'angebote-paket.json'), JSON.stringify({ version: 1, erstellt: new Date().toISOString(), eintraege: behalten }, null, 1));
  fs.writeFileSync(path.join(out, 'bericht.json'), JSON.stringify(rep, null, 1));

  // ---- Speisen, die der Katalog nicht erkennt ----
  const vorhandenArchiv = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'data', 'archiv.json'), 'utf8')); } catch (e) { return []; } })();
  const quellen = behalten.map(e => ({ kunde: e.customerName, datum: e.eventDate, dishes: e.dishes, quelle: 'Datei' }))
    .concat(vorhandenArchiv.map(e => ({ kunde: e.customerName, datum: e.eventDate, dishes: e.dishes || [], quelle: 'Archiv' })));
  const map = new Map();
  quellen.forEach(q => q.dishes.forEach(d => {
    const n = d.name.replace(/\s+/g, ' ').trim(); if (n.length < 3) return; const key = normalize(n);
    const e = map.get(key) || { name: n, cat: d.category || '', angebote: [] };
    const lbl = `${q.kunde}${q.datum ? ' ' + q.datum : ''}`; if (!e.angebote.includes(lbl)) e.angebote.push(lbl);
    map.set(key, e);
  }));
  // Keine Speisen: Ausstattung/Service, Satzfetzen; unwichtige Füllwörter im "Rest" ignorieren, Reste als lesbare Wörter zeigen
  const KEIN_GERICHT = /(buffettisch|stehtisch|bistrotisch|tischdecke|tischset|\\bstuhl|\\bst(ü|ue)hle|\\bdecke\\b|\\bservietten?\\b|geschirr|besteck|personal|servicekraft|kellner|aufbau|abbau|lieferung|anfahrt|miete\\b|pauschale|dekoration|\\bdeko\\b|ständer|gummiunterlage|gasgrill|grillmeister|chafing|spülen|reinigung|garderobe|beschriftung|schilder|lackfolie)/i;
  const FRAGMENT = n => n.length < 4 || /^[(\W]/.test(n) || /^(mit|und|oder|wahlweise|als|dazu|sowie|auf)\s/i.test(n) || /(topping)\s*$/i.test(n) && n.split(/\s+/).length < 5;
  const FUELL = /^(gef(ü|u)llt\w*|wahlweise|verschieden\w*|frisch\w*|dazu|sowie|aus|vegan\w*|vegetarisch\w*|mit|und|oder|vom|von|in|im|als|topping\w*|glas|auf|dem|der|die|das|ein|eine|einer|einem|einen|nach|art|dazu|passend\w*|je|pro|nur|auch|ca|etwa|bunt\w*|gemischt\w*|klein\w*|gro(ß|ss)\w*|leicht\w*|hausgemacht\w*|selbstgemacht\w*)$/i;
  const ausgeblendet = [];
  const zeilen = Array.from(map.values()).filter(e => { if (KEIN_GERICHT.test(e.name) || FRAGMENT(e.name)) { ausgeblendet.push(e.name); return false; } return true; })
    .map(e => {
      const r = sb.KT.erkenne(e.name, e.cat);
      const woerter = e.name.split(/[\s,;:()|\/]+/).filter(Boolean);
      const rest = r.rest.map(st => woerter.find(w => normalize(w).startsWith(st)) || st).filter(w => !FUELL.test(w) && w.length > 2);
      return { ...e, gefunden: r.gefunden.map(c => c.name), rest };
    });
  const keine = zeilen.filter(z => !z.gefunden.length), teil = zeilen.filter(z => z.gefunden.length && z.rest.length);
  const kat = { vorspeise: 'Vorspeise', hauptgang: 'Hauptgang', dessert: 'Dessert', fingerfood: 'Fingerfood', flying: 'Flying Empfang', brot: 'Brot', beilage: 'Beilage', 'beilage-saettigung': 'Beilage (Sättigung)', 'beilage-gemuese': 'Beilage (Gemüse)', sonstiges: 'Sonstiges' };
  const zelle = c => '"' + String(c).replace(/"/g, '""') + '"';
  const sortiert = arr => arr.slice().sort((x, y) => (kat[x.cat] || x.cat).localeCompare(kat[y.cat] || y.cat, 'de') || x.name.localeCompare(y.name, 'de'));
  const csv = ['Status;Kategorie;Gericht;Im Katalog erkannt;Nicht erkannt (Wörter);Angebote'].concat(
    sortiert(keine).map(z => ['nicht erfasst', kat[z.cat] || z.cat, z.name, '', '', z.angebote.join(' | ')].map(zelle).join(';')),
    sortiert(teil).map(z => ['teilweise erfasst', kat[z.cat] || z.cat, z.name, z.gefunden.join(' + '), z.rest.join(', '), z.angebote.join(' | ')].map(zelle).join(';'))).join('\r\n');
  fs.writeFileSync(path.join(out, 'speisen-nicht-erfasst.csv'), '\uFEFF' + csv);
  fs.writeFileSync(path.join(out, 'speisen-stats.json'), JSON.stringify({ gerichteGesamt: zeilen.length, nichtErfasst: keine.length, teilweise: teil.length, ausgeblendet: ausgeblendet.length, quellen: quellen.length }, null, 1));
  fs.writeFileSync(path.join(out, 'speisen.json'), JSON.stringify({ keine, teil, ausgeblendet }, null, 1));

  const count = s => rep.filter(r => r.status === s).length;
  console.log(`Dateien: ${dateien.length} | aufgenommen: ${behalten.length} | zusammengeführt: ${count('zusammengeführt')} | ausgelassen: ${count('ausgelassen')} | Fehler: ${count('Fehler')}`);
  console.log(`Speisen eindeutig: ${zeilen.length} | nicht erfasst: ${keine.length} | teilweise: ${teil.length} | als Nicht-Speise ausgeblendet: ${ausgeblendet.length}`);
})();
