// Schwärzt in einem Angebots-PDF alle Geldbeträge (z. B. "33,80 €", "1.250,00 €", "€ 40,00", "756,00 EUR").
// Die Beträge werden mit schwarzen Balken überdeckt; das Original-PDF bleibt unverändert, es wird nur eine Kopie ausgeliefert.
const { PDFDocument, rgb } = require('pdf-lib');

const ZAHL = '(?:\\d{1,3}(?:\\.\\d{3})+|\\d+)(?:,\\d{1,2})?';
const BETRAG = new RegExp('(?:€|EUR|Euro)\\s*' + ZAHL + '(?!\\d)|' + ZAHL + '\\s*(?:€|EUR\\b|Euro\\b)|(?:\\d{1,3}(?:\\.\\d{3})+|\\d+),\\d{2}(?!\\d)', 'g');

// grobe Zeichenbreiten (Helvetica-ähnlich, in 1/1000 em), um Beträge innerhalb einer Textzeile zu verorten
function zeichenBreite(c) {
  if (/[0-9]/.test(c)) return 556;
  if (/[.,:;!|iIjl' ]/.test(c)) return 278;
  if (c === '€') return 556;
  if (/[mMwW]/.test(c)) return 800;
  if (/[A-ZÄÖÜ]/.test(c)) return 667;
  return 530;
}
const breite = s => Array.from(s).reduce((n, c) => n + zeichenBreite(c), 0);

async function schwaerzen(buffer) {
  const { PDFParse } = require('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  const balken = [];   // { seite, x, y, w, h }
  try {
    const doc = await parser.load();
    for (let n = 1; n <= doc.numPages; n++) {
      const tc = await (await doc.getPage(n)).getTextContent();
      const items = tc.items.filter(i => i.str && i.str.trim());
      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx];
        const naechster = items[idx + 1] && /^\s*(€|Euro\b|EUR\b)/.test(items[idx + 1].str);   // Betrag und Währung stehen in getrennten Textstücken
        if (!/€|EUR|Euro|\d,\d{2}/.test(it.str) && !(naechster && /\d\s*$/.test(it.str))) continue;
        const gesamt = breite(it.str) || 1, schrift = Math.abs(it.transform[3]) || it.height || 10, x0 = it.transform[4], y0 = it.transform[5];
        const treffer = Array.from(it.str.matchAll(BETRAG));
        if (naechster) { const e = it.str.match(new RegExp(ZAHL + '\\s*$')); if (e && !treffer.some(t => t.index + t[0].length >= e.index + e[0].length)) treffer.push(Object.assign([e[0]], { index: e.index })); }
        for (const m of treffer) {
          const vorn = breite(it.str.slice(0, m.index)), lang = breite(m[0].trimEnd());
          const x = x0 + (it.width * vorn) / gesamt, w = (it.width * lang) / gesamt;
          const ganz = m.index === 0 && m[0].length === it.str.length;   // ganze Zelle: exakte Breite
          balken.push({ seite: n - 1, x: x - 2, y: y0 - schrift * 0.22, w: (ganz ? it.width : w) + 4, h: schrift * 1.22 });
        }
      }
    }
  } finally { await parser.destroy().catch(() => {}); }
  const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const seiten = pdf.getPages();
  for (const b of balken) {
    const s = seiten[b.seite]; if (!s) continue;
    s.drawRectangle({ x: b.x, y: b.y, width: b.w, height: b.h, color: rgb(0, 0, 0), borderWidth: 0 });
  }
  return { pdf: Buffer.from(await pdf.save()), anzahl: balken.length };
}

module.exports = { schwaerzen };
