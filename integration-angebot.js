// Empfang bestätigter Angebote aus der Office-App (Format "kuechen-angebot/1", siehe docs/integration/ANGEBOT-FORMAT.md).
// Reine Logik ohne Netzwerk/Speicher: prüfen, in einen Auftrag des Generators umwandeln, Änderungen erkennen und
// anhand des Bestellrhythmus entscheiden, ob eine Änderung automatisch durchgeht oder von der Küche bestätigt werden muss.
const fs = require('fs'), path = require('path'), vm = require('vm');
const B = require('./public/bestell-logik.js');
const { CATEGORIES, DEFAULT_RULES } = require('./public/seed-data.js');

const FORMAT = 'kuechen-angebot/1';
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim();
const isoDE = iso => iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.' + iso.slice(0, 4);
const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const tagText = iso => WT[new Date(iso + 'T12:00:00Z').getUTCDay()] + ' ' + isoDE(iso).slice(0, 6);
const gueltigesDatum = iso => ISO.test(iso) && !isNaN(new Date(iso + 'T12:00:00Z')) && new Date(iso + 'T12:00:00Z').toISOString().slice(0, 10) === iso;

// ---------- Prüfen ----------
function pruefeAngebot(b) {
  const f = [];
  if (!b || typeof b !== 'object') return ['Kein gültiges Angebot (JSON-Objekt erwartet).'];
  if (b.format !== FORMAT) f.push(`format muss "${FORMAT}" sein.`);
  if (typeof b.officeEventId !== 'string' || b.officeEventId.length < 8 || b.officeEventId.length > 80) f.push('officeEventId fehlt oder ist ungültig (Text, 8–80 Zeichen).');
  if (!['CONFIRMED', 'CANCELLED'].includes(b.status)) f.push('status muss CONFIRMED oder CANCELLED sein.');
  if (!Number.isInteger(b.version) || b.version < 1) f.push('version muss eine ganze Zahl ab 1 sein.');
  if (b.status === 'CANCELLED') return f;
  if (!b.kunde || typeof b.kunde.name !== 'string' || !b.kunde.name.trim()) f.push('kunde.name fehlt.');
  if (!Number.isInteger(b.gaesteGesamt) || b.gaesteGesamt < 1) f.push('gaesteGesamt muss eine ganze Zahl ab 1 sein.');
  if (b.modus != null && !['mittag', 'abend'].includes(b.modus)) f.push('modus muss "mittag" oder "abend" sein.');
  if (b.vegetarischAnteil != null && !(Number.isFinite(b.vegetarischAnteil) && b.vegetarischAnteil >= 0 && b.vegetarischAnteil <= 100)) f.push('vegetarischAnteil muss zwischen 0 und 100 liegen.');
  if (!Array.isArray(b.tage) || !b.tage.length) f.push('tage fehlt oder ist leer.');
  else b.tage.forEach((t, i) => {
    const p = `tage[${i}]`;
    if (!t || !gueltigesDatum(t.datum)) f.push(`${p}.datum fehlt oder ist kein Datum (JJJJ-MM-TT).`);
    if (!Number.isInteger(t && t.gaeste) || t.gaeste < 1) f.push(`${p}.gaeste muss eine ganze Zahl ab 1 sein.`);
    if (!t || !Array.isArray(t.positionen) || !t.positionen.length) { f.push(`${p}.positionen fehlt oder ist leer.`); return; }
    t.positionen.forEach((x, j) => {
      const q = `${p}.positionen[${j}]`;
      if (!x || typeof x.katalogId !== 'string' || !x.katalogId) f.push(`${q}.katalogId fehlt.`);
      if (!x || typeof x.name !== 'string' || !x.name.trim()) f.push(`${q}.name fehlt.`);
      if (!x || !Array.isArray(x.komponenten) || x.komponenten.some(k => typeof k !== 'string')) f.push(`${q}.komponenten muss eine Liste von Kennungen sein.`);
      if (x && x.personen != null && !(Number.isInteger(x.personen) && x.personen > 0)) f.push(`${q}.personen muss leer oder eine ganze Zahl ab 1 sein.`);
    });
  });
  if (b.pdf != null) {
    if (typeof b.pdf !== 'object' || typeof b.pdf.base64 !== 'string' || !b.pdf.base64) f.push('pdf braucht { "dateiname": "…", "base64": "…" }.');
  }
  return f;
}

// Nur freigegebene Felder werden übernommen (keine Kontaktdaten, keine Preise) – alles andere wird verworfen
function bereinige(b) {
  if (b.status === 'CANCELLED') return { format: b.format, officeEventId: b.officeEventId, status: 'CANCELLED', version: b.version, stand: b.stand || null, grund: typeof b.grund === 'string' ? b.grund.slice(0, 300) : '' };
  return {
    format: b.format, officeEventId: b.officeEventId, officeOfferId: typeof b.officeOfferId === 'string' ? b.officeOfferId.slice(0, 60) : null,
    status: 'CONFIRMED', version: b.version, stand: b.stand || null, katalogVersion: b.katalogVersion ?? null,
    kunde: { name: b.kunde.name.trim().slice(0, 120), kuerzel: typeof b.kunde.kuerzel === 'string' ? b.kunde.kuerzel.slice(0, 20) : '' },
    anlass: typeof b.anlass === 'string' ? b.anlass.slice(0, 120) : '', modus: b.modus || 'mittag', gaesteGesamt: b.gaesteGesamt,
    vegetarischAnteil: b.vegetarischAnteil ?? null, notiz: typeof b.notiz === 'string' ? b.notiz.slice(0, 600) : '',
    aenderung: b.aenderung && typeof b.aenderung === 'object' ? { am: b.aenderung.am || null, grund: String(b.aenderung.grund || '').slice(0, 300) } : null,
    tage: b.tage.map(t => ({
      datum: t.datum, gaeste: t.gaeste,
      positionen: t.positionen.map(x => ({
        katalogId: x.katalogId, gang: typeof x.gang === 'string' ? x.gang.slice(0, 40) : '', name: x.name.trim().slice(0, 240), komponenten: x.komponenten.slice(0, 20),
        personen: x.personen || null, wunsch: typeof x.wunsch === 'string' ? x.wunsch.slice(0, 240) : '',
      })),
    })).sort((a, c) => a.datum.localeCompare(c.datum)),
  };
}

// ---------- Kategorie ----------
function kategorieAusGang(gang) {
  const g = norm(gang);
  if (/vorspeis|salat|suppe/.test(g)) return 'vorspeise';
  if (/finger|snack|brunch/.test(g)) return 'fingerfood';
  if (/flying|empfang/.test(g)) return 'flying';
  if (/haupt|lunch/.test(g)) return 'hauptgang';
  if (/gemuse/.test(g)) return 'beilage-gemuese';
  if (/beilage|sattigung/.test(g)) return 'beilage-saettigung';
  if (/sosse|sauce/.test(g)) return 'sosse';
  if (/^brot/.test(g)) return 'brot';
  if (/dessert|nachspeise|sus/.test(g)) return 'dessert';
  return 'sonstiges';
}

// ---------- Aufteilung der Personen (gleiche Logik wie beim Einlesen eines Angebots: public/parser.js) ----------
let splitFn = null;
function autoSplit() {
  if (splitFn) return splitFn;
  const ctx = vm.createContext({ console, CATEGORIES, DEFAULT_RULES, state: { rules: DEFAULT_RULES }, uid: () => Math.random().toString(36).slice(2, 10), normalize: norm });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'public', 'parser.js'), 'utf8') + '\n;this.__autoSplitDay = autoSplitDay;', ctx);
  return (splitFn = ctx.__autoSplitDay);
}
let katalogKomp = null;
function komponentenInfo() {
  if (katalogKomp) return katalogKomp;
  try { katalogKomp = Object.fromEntries(require('./speisenkatalog/katalog-komponenten.js').komponenten.map(k => [k.id, k])); } catch (e) { katalogKomp = {}; }
  return katalogKomp;
}
const FLEISCH_GRUPPEN = new Set(['Hähnchen', 'Pute', 'Ente & Gans', 'Rind', 'Schwein', 'Kalb', 'Lamm', 'Fisch', 'Meeresfrüchte']);
// Fleisch/Fisch oder vegetarisch – aus den Komponenten des Katalogs (Hauptkomponente), sonst aus dem Namen
function hauptgangArt(pos) {
  if (/veget|vegan|veggie|tofu|falafel|seitan/i.test(pos.name)) return 'veg';
  const info = komponentenInfo();
  const komps = (pos.komponenten || []).map(id => info[id]).filter(Boolean);
  if (komps.some(k => k.rolle === 'H' && FLEISCH_GRUPPEN.has(k.gruppe))) return 'fleisch';
  if (komps.some(k => k.rolle === 'H')) return 'veg';
  return null;   // unbekannt: der Generator entscheidet nach dem Namen
}

// ---------- Angebot -> Auftrag ----------
function angebotZuEvent(a, bisher) {
  const ev = bisher ? JSON.parse(JSON.stringify(bisher)) : { id: undefined, todoChecks: {} };
  const wuensche = [];
  ev.name = a.kunde.name; ev.personen = a.gaesteGesamt; ev.modus = a.modus; ev.vegAnteil = a.vegetarischAnteil;
  ev.officeEventId = a.officeEventId; ev.officeOfferId = a.officeOfferId || null; ev.angebotVersion = a.version;
  ev.officeAngebot = a; ev.quelle = 'office';
  ev.days = a.tage.map(t => {
    const zaehler = {};
    return {
      id: 'd-' + t.datum, date: isoDE(t.datum), personen: t.gaeste,
      dishes: t.positionen.map(p => {
        const n = zaehler[p.katalogId] = (zaehler[p.katalogId] || 0) + 1;
        const category = kategorieAusGang(p.gang);
        const d = { id: `${t.datum}-${p.katalogId}-${n}`, name: p.name, category, personen: p.personen || 0, katalogId: p.katalogId, komponentenIds: p.komponenten.slice() };
        if (p.personen) d.personenFix = p.personen;
        if (category === 'hauptgang') { const art = hauptgangArt(p); if (art) d.art = art; }
        if (p.wunsch) wuensche.push(`${p.name}: ${p.wunsch}`);
        return d;
      }),
    };
  });
  const teile = [];
  if (a.anlass) teile.push('Anlass: ' + a.anlass);
  if (a.notiz) teile.push(a.notiz);
  if (wuensche.length) teile.push('Wünsche: ' + wuensche.join('; '));
  ev.notiz = teile.join(' · ');
  const split = autoSplit();
  ev.days.forEach(d => split(d, d.personen || ev.personen || 0, ev.vegAnteil));
  delete ev.offeneAenderung;
  return ev;
}

// ---------- Änderungen erkennen ----------
const posSig = p => [p.katalogId, (p.komponenten || []).slice().sort().join(','), p.personen || '', p.wunsch || '', norm(p.gang)].join('|');
function vergleiche(alt, neu) {
  const zeilen = [], tage = new Set();
  let kritisch = false;
  const kritischZeile = (text, ...betroffen) => { kritisch = true; zeilen.push(text); betroffen.forEach(t => t && tage.add(t)); };
  const alleTage = () => { alt.tage.forEach(t => tage.add(t.datum)); neu.tage.forEach(t => tage.add(t.datum)); };
  if (alt.gaesteGesamt !== neu.gaesteGesamt) { kritisch = true; zeilen.push(`Gäste gesamt: ${alt.gaesteGesamt} → ${neu.gaesteGesamt}`); alleTage(); }
  if ((alt.modus || 'mittag') !== (neu.modus || 'mittag')) { kritisch = true; zeilen.push(`Regelsatz: ${alt.modus === 'abend' ? 'Abend/Privat' : 'Mittag/Business'} → ${neu.modus === 'abend' ? 'Abend/Privat' : 'Mittag/Business'}`); alleTage(); }
  if ((alt.vegetarischAnteil ?? null) !== (neu.vegetarischAnteil ?? null)) { kritisch = true; zeilen.push(`Vegetarisch-Anteil: ${alt.vegetarischAnteil ?? 'Standard'} → ${neu.vegetarischAnteil ?? 'Standard'}`); alleTage(); }
  const altT = new Map(alt.tage.map(t => [t.datum, t])), neuT = new Map(neu.tage.map(t => [t.datum, t]));
  for (const [d, t] of altT) if (!neuT.has(d)) kritischZeile(`Tag entfällt: ${tagText(d)} (${t.positionen.length} Gerichte)`, d);
  for (const [d, t] of neuT) {
    const o = altT.get(d);
    if (!o) { kritischZeile(`Neuer Tag: ${tagText(d)} · ${t.gaeste} Gäste · ${t.positionen.length} Gerichte`, d); continue; }
    if (o.gaeste !== t.gaeste) kritischZeile(`${tagText(d)}: Gäste ${o.gaeste} → ${t.gaeste}`, d);
    const oa = o.positionen.map(posSig), na = t.positionen.map(posSig);
    const rest = oa.slice();
    t.positionen.forEach((p, i) => { const k = rest.indexOf(na[i]); if (k >= 0) rest.splice(k, 1); else kritischZeile(`${tagText(d)}: Gericht neu/geändert – ${p.name}`, d); });
    rest.forEach(sig => { const p = o.positionen.find(x => posSig(x) === sig); kritischZeile(`${tagText(d)}: Gericht entfällt/geändert – ${p ? p.name : sig.split('|')[0]}`, d); });
  }
  if (alt.kunde.name !== neu.kunde.name) zeilen.push(`Kunde: ${alt.kunde.name} → ${neu.kunde.name}`);
  if ((alt.notiz || '') !== (neu.notiz || '') || (alt.anlass || '') !== (neu.anlass || '')) zeilen.push('Notiz/Anlass geändert');
  return { kritisch, zeilen, tage: Array.from(tage).sort() };
}

// ---------- Bestellrhythmus: geht die Änderung automatisch durch? ----------
// Bestellfrist je Zeitraum Fr–Do: Dienstag 11:30 vor dem Freitag (Lieferung Mittwoch 12:00). Nach der Frist – oder sobald die Hauptbestellung
// des Zeitraums abgeschickt ist – kann eine Änderung nicht mehr einfach umgesetzt werden und muss von der Küche bestätigt werden.
function berlinJetzt(jetzt) {
  const p = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(jetzt || new Date());
  return p.replace(' ', 'T');   // 2026-10-27T15:00:00
}
function fristFuerTag(iso, jetzt, runden) {
  const start = B.blockStart(iso), info = B.blockInfo(start);
  const fristText = `${info.fristTag}T${info.fristZeit}:00`;
  const vorbei = berlinJetzt(jetzt) >= fristText;
  const gesendet = (runden || []).some(r => r.block === start && r.typ === 'haupt' && r.abgeschicktAm);
  return { tag: iso, block: start, frist: fristText, gesperrt: vorbei || gesendet, grund: gesendet ? 'Die Bestellung für diesen Zeitraum ist bereits abgeschickt.' : vorbei ? `Bestellfrist (Di ${isoDE(info.fristTag).slice(0, 6)} ${info.fristZeit} Uhr) ist vorbei.` : '' };
}
function pruefeFrist(tage, jetzt, runden) {
  const je = tage.map(t => fristFuerTag(t, jetzt, runden));
  const gesperrt = je.filter(x => x.gesperrt);
  return { gesperrt: gesperrt.length > 0, tage: je, gruende: Array.from(new Set(gesperrt.map(x => `${tagText(x.tag)}: ${x.grund}`))) };
}

module.exports = { FORMAT, pruefeAngebot, bereinige, angebotZuEvent, vergleiche, pruefeFrist, fristFuerTag, berlinJetzt, kategorieAusGang, isoDE, tagText };
