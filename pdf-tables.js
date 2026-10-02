// Wochenpläne sind Tabellen (Montag-Freitag in Spalten). pdf-parse getText() liefert deren
// Zellen ohne Spaltenzuordnung - getTable() liefert sie als Zeilen/Zellen. Diese Hilfsfunktion
// macht daraus einen Textblock, den der Parser im Browser (public/parser.js) wieder einliest:
//   === TABELLE ===
//   Montag | Dienstag | ...
//   Zelle | Zelle | ...
//   === ENDE TABELLE ===
const WEEKDAYS = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];

function joinCellLines(cell) {
  const lines = String(cell || '').split('\n').map(l => l.trim()).filter(Boolean);
  let out = '';
  for (const line of lines) {
    if (!out) out = line;
    else if (/[A-Za-zÄÖÜäöüß]-$/.test(out)) out += line; // Silbentrennung "Spinat-" + "Käsekruste"
    else out += ' ' + line;
  }
  return out.replace(/\|/g, '/');
}

function isWeekdayTable(table) {
  const header = (table[0] || []).map(c => String(c || '').trim().toLowerCase());
  return header.filter(h => WEEKDAYS.includes(h)).length >= 3;
}

function buildTableBlock(tableResult) {
  const blocks = [];
  for (const page of (tableResult && tableResult.pages) || []) {
    for (const table of page.tables || []) {
      if (!isWeekdayTable(table)) continue;
      const rows = table.map(row => row.map(joinCellLines).join(' | '));
      blocks.push('=== TABELLE ===\n' + rows.join('\n') + '\n=== ENDE TABELLE ===');
    }
  }
  return blocks.join('\n\n');
}

function looksLikeWochenplan(text) {
  return /Zeitraum\s+KW\s*\d+/i.test(text) || (/Montag/.test(text) && /Dienstag/.test(text) && /Freitag/.test(text));
}

module.exports = { buildTableBlock, looksLikeWochenplan };
