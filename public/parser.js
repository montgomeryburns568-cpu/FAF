// Angebots-Parser (Text -> Event mit Tagen/Gerichten), Wochenplan-Parser und Pfannen-Helfer.
// Wird im Browser als klassisches Skript vor app.js geladen und in den Node-Tests
// (_test_extracts/) per vm mit denselben Globals ausgeführt - eine Quelle für beides.
// Erwartet die Globals uid(), normalize(), CATEGORIES, DEFAULT_RULES und state.rules.

// ---------- default draft ----------
function newDraftEvent() {
  return { id: uid(), name: '', personen: null, notiz: '', days: [], todoChecks: {} };
}

// ---------- Kategorien & Abschnitte ----------
// Erkennt sowohl das interne "vom Büro bestätigte" Format (nackte Datumszeilen, nackte
// Kategoriewörter, ein Gericht pro Zeile) als auch die Kunden-Angebote von Licata Catering /
// Forks & Friends: Fließtext mit Grußzeile, "anbei Ihr Menüvorschlag ... für die
// Veranstaltung am X mit N Personen", frei benannte Abschnitte ("Fingerfood – Begleitend",
// "3-Gänge-Menü", "Snack-Buffet", ggf. mit Datum davor) und darin Kategorie-Überschriften
// ("Vorspeisen, Snacks & Fingerfood:", "Hauptgang:", ...) mit Aufzählungspunkten.
const CATEGORY_KEYWORDS = [
  { id: 'vorspeise', words: ['vorspeise', 'vorspeisen', 'salate'] },
  { id: 'fingerfood', words: ['fingerfood', 'snacks', 'snack', 'fingerfood-buffet', 'snackbuffet', 'brunch'] },
  { id: 'flying', words: ['flying empfang', 'flying', 'empfang'] },
  { id: 'hauptgang', words: ['hauptgang', 'hauptspeise', 'hauptspeisen', 'lunch'] },
  { id: 'beilage-saettigung', words: ['beilage', 'beilagen'] },
  { id: 'sosse', words: ['soße', 'soßen', 'sauce', 'sossen'] },
  { id: 'dessert', words: ['dessert', 'desserts', 'nachspeise'] },
];
function matchCategory(line) {
  const trimmed = line.trim();
  const hasColon = /:\s*$/.test(trimmed);
  const low = normalize(trimmed).replace(/:$/, '').trim();
  if (!low || low.length > 40) return null;
  // Exakte Übereinstimmung (auch ohne Doppelpunkt) ist immer ein Treffer - deckt nackte
  // Kategoriewörter und feste zusammengesetzte Überschriften wie "Snackbuffet" ab.
  for (const c of CATEGORY_KEYWORDS) {
    if (c.words.some(w => low === w)) return c.id;
  }
  if (!hasColon) return null;
  // Zusammengesetzte Überschriften mit Doppelpunkt wie "Vorspeisen als Fingerfood:" -
  // hier gewinnt das Kategoriewort, das am weitesten hinten in der Zeile steht (das "als X"
  // am Ende beschreibt die tatsächliche Darreichungsform/Kategorie). Ohne Doppelpunkt würden
  // sonst Fließtext-Überschriften faelschlich matchen.
  let best = null, bestPos = -1;
  for (const c of CATEGORY_KEYWORDS) {
    for (const w of c.words) {
      const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
      const m = low.match(re);
      if (m && m.index > bestPos) { bestPos = m.index; best = c.id; }
    }
  }
  return best;
}

// Die Überschrift "Vorspeisen, Snacks & Fingerfood:" steht in JEDEM Abschnitt - in einem
// Fingerfood-/Snack-Buffet sind das Fingerfood-Teile, in einem Gänge-Menü echte Vorspeisen.
// Explizites "Vorspeisen als Fingerfood" bleibt Fingerfood.
function resolveCategory(line, sectionKind) {
  const cat = matchCategory(line);
  if (cat === 'fingerfood' && sectionKind === 'menue') {
    const low = normalize(line);
    if (/vorspeise/.test(low) && !/\bals\b/.test(low)) return 'vorspeise';
  }
  return cat;
}

// "Gesamtpreis" beendet ein Angebot immer endgueltig (Preistabelle, danach nur noch AGB-Text).
const HARD_STOPWORDS = ['gesamtpreis'];
// Diese Abschnitte enthalten keine Kuechen-relevanten Gerichte, koennen aber MITTEN im
// Dokument zwischen zwei echten Speise-Abschnitten stehen (z.B. "Transportkosten" vor
// "Fingerfood"). Deshalb nur ueberspringen, nicht das gesamte Parsing abbrechen.
const SOFT_STOPWORDS = [
  'transportkosten', 'getranke', 'getränke', 'servicepersonal', 'zusatzliches equipment',
  'zusätzliches equipment', 'ablauf', 'zahlungsbedingungen', 'anlieferung',
  'anpassung der personenanzahl', 'mitternachtssnack', 'warum sie sich fur uns entscheiden sollten',
  'warum sie sich für uns entscheiden sollten', 'kaffeepause-buffet', 'kaffeepause', 'equipment',
  'ablauf/ absprachen', 'ablauf & logistik',
  'personal', 'mietmaterial', 'konditionen', 'probeessen', 'stehtische', 'lieferung au',
  'zusatzkosten', 'location', 'optional: technik', 'textil', 'geschirr',
  'sekt', 'aperitif', 'prosecco',
];
function matchStopword(line, list) {
  const low = normalize(line).replace(/[:–-]\s*$/, '').trim();
  if (!low) return false;
  return list.some(w => low === w || low.startsWith(w));
}
function isHardStop(line) { return matchStopword(line, HARD_STOPWORDS); }
function isSoftStop(line) { return matchStopword(line, SOFT_STOPWORDS); }
function isStopLine(line) { return isHardStop(line) || isSoftStop(line); }
function isBulletLine(line) { return /^[•\-–]\s+/.test(line); }
// Manche Angebote verschachteln einen Bullet-Char direkt vor einem Gedankenstrich
// ("• - Blattsalate..."), daher wiederholt entfernen statt nur einmal.
function stripBullet(line) { return line.replace(/^(?:[•\-–]\s+)+/, '').trim(); }
function looksLikePriceRow(line) { return /\d+[.,]\d{2}\s*€/.test(line); }

// Wiederkehrende Angebots-Floskeln ("Gerne biete ich Ihnen ... Folgende Speisen könnte ich
// mir gut vorstellen:") stehen typischerweise zwischen Abschnittstitel/Kategorie-Überschrift
// und der eigentlichen (nackten) Gerichteliste - kein Bullet, aber auch kein Gericht.
function looksLikeIntroSentence(line) {
  if (/:\s*$/.test(line)) return true;
  if (/^(gerne|selbstverständlich|wir\s|ich\s|bitte\s|folgende|der preis|in dem preis|für ihre veranstaltung|außerdem|zusätzlich)/i.test(line)
    || /(biete ich|könnte ich|vorstellen|passe (sie|ich)|geben sie)/i.test(line)) return true;
  // Ganze Sätze (Punkt am Ende bzw. Satzgrenze mitten in der Zeile, mehrere Wörter) sind
  // Fließtext, keine Gerichtsnamen.
  if (line.split(/\s+/).length < 5) return false;
  return /[a-zäöüß]{3,}[.!]\s*$/.test(line) || /[a-zäöüß]{3,}[.!?]\s+[A-ZÄÖÜ]/.test(line);
}
const INTRO_STARTERS = /^(gerne|wie gewünscht|wie gewuenscht|wir haben uns erlaubt|ich würde|ich wuerde)\b/i;

const FINGERFOOD_SECTION_RE = /fingerfood|canap|snack|empfang|gluhwein|cocktail|apero|happchen|flying/;
const MENUE_SECTION_RE = /menu|gang|buffet|brunch|lunch|mittag|abendessen|kinderessen/;
function sectionKindOf(title) {
  const t = normalize(title);
  if (FINGERFOOD_SECTION_RE.test(t)) return 'fingerfood';
  if (MENUE_SECTION_RE.test(t)) return 'menue';
  return null;
}

// ---------- Kopfdaten ----------
function extractCustomerName(lines, filename) {
  // 1) Adressblock direkt unter dem Briefkopf ("Licata Catering · Rothschildallee 16a · 60389
  //    Frankfurt"): Firmen-/Kundenname, bis die Straßenzeile (Ziffern) beginnt.
  const lh = lines.findIndex(l => /Rothschildallee 16a/.test(l) && /Licata|Forks/i.test(l));
  if (lh >= 0) {
    const parts = [];
    for (let j = lh + 1; j < Math.min(lines.length, lh + 5); j++) {
      const l = lines[j];
      if (!l) continue;
      if (/\d|@/.test(l) || /^(Ihr Gesprächspartner|Abteilung|Telefon|Datum|Angebot)\b/i.test(l)) break;
      parts.push(l);
    }
    if (parts.length) return parts.join(' ').trim();
  }
  // 2) Grußzeile ("Hallo Philipp," / "Guten Tag Frau Zehner,")
  for (const line of lines) {
    const m = line.match(/^(?:Hallo|Guten Tag)\s+([^,]{2,40}),\s*$/i);
    if (m && m[1].trim()) return m[1].trim();
  }
  // 3) Adresse über der PLZ-Zeile
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const line = lines[i];
    if (/^\d{4,5}\s+[A-ZÄÖÜ]/.test(line)) {
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const cand = lines[j];
        if (!cand) continue;
        if (/^[A-ZÄÖÜ][\wäöüßÄÖÜ.-]*(\s+[A-ZÄÖÜ0-9][\wäöüßÄÖÜ.-]*){0,3}$/.test(cand) &&
            !/\d{4,}/.test(cand) && !/:/.test(cand) && cand.length < 45 &&
            !/straße|str\.|allee|weg|platz|ring/i.test(cand)) {
          return cand.trim();
        }
      }
      break;
    }
  }
  return nameFromFilename(filename);
}

function nameFromFilename(filename) {
  if (!filename) return '';
  let n = filename.replace(/\.pdf$/i, '');
  n = n.replace(/^(vorab[-_\s]*)?(angebot|küchensheet|kuechensheet|auftragsbestaetigung|curtis_angebot)[-_\s]*/i, '');
  n = n.replace(/^KW[-_\s]*\d+[-_\s]*/i, '');
  n = n.replace(/[-_]?\s*\d{1,2}[.\/]\s*[-–]?\s*\d{0,2}[.\/]?\d{2,4}.*/, '');
  n = n.replace(/[_]/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return n;
}

// Name der Ansprechperson aus der Grußzeile, falls der Kundenname aus dem Adressblock kommt
function extractContactName(lines) {
  for (const line of lines) {
    const m = line.match(/^(?:Hallo|Guten Tag)\s+([^,]{2,40}),\s*$/i);
    if (m && m[1].trim()) return m[1].trim();
  }
  return '';
}

function extractAnlass(lines) {
  for (const line of lines) {
    const m = line.match(/^Angebot\s+für\s+(.+?)\s+am\s+\d/i);
    if (m && !/^Ihre Veranstaltung$/i.test(m[1].trim())) return m[1].trim();
  }
  return '';
}

function extractEventDate(lines, fullText) {
  for (const line of lines) {
    const m = line.match(/(?:Veranstaltung|Feier)\s+am\s+([\d.\s–-]+\d{2,4})/i) ||
      line.match(/^Angebot\s+für.*\s+am\s+([\d.\s–-]+\d{2,4})/i);
    if (m) return m[1].trim();
  }
  const m2 = fullText.match(/(?<!Datum:\s{0,20})(\d{1,2}\.(?:\s?[–-]\s?\d{1,2}\.)?\d{1,2}\.\d{2,4})/);
  return m2 ? m2[1].trim() : '';
}

function extractPersonen(fullText) {
  let m = fullText.match(/von\s+(?:ca\.?\s*)?(\d+)\s*Personen/i);
  if (m) return parseInt(m[1], 10);
  m = fullText.match(/mit\s+(?:ca\.?\s*)?(\d+)\s*Personen/i);
  if (m) return parseInt(m[1], 10);
  m = fullText.match(/(\d+)\s*Pax/i);
  if (m) return parseInt(m[1], 10);
  m = fullText.match(/mit\s+(?:ca\.?\s*)?(\d+)\s*Erwachsenen/i);
  if (m) return parseInt(m[1], 10);
  return null;
}

function parseGermanNumber(s) { return parseFloat(s.replace(/\./g, '').replace(',', '.')); }
function extractTotalPrice(fullText) {
  const lines = fullText.split(/\r?\n/);
  let found = null;
  for (const line of lines) {
    if (/gesamtpreis/i.test(line)) {
      const m = line.match(/([\d.]+,\d{2})\s*€/);
      if (m) found = parseGermanNumber(m[1]);
    }
  }
  return found;
}

function extractLogistikNotiz(fullText) {
  const parts = [];
  let m = fullText.match(/Anlieferung\s+um\s+([\d:]+\s*Uhr)/i);
  if (m) parts.push('Anlieferung: ' + m[1]);
  m = fullText.match(/Abholung\s+am\s+([\d.]+)\s+ab\s+([\d:]+\s*Uhr)/i);
  if (m) parts.push('Abholung: ' + m[1] + ' ab ' + m[2]);
  else { m = fullText.match(/Abholung\s+.*?ab\s+([\d:]+\s*Uhr)/i); if (m) parts.push('Abholung ab ' + m[1]); }
  return parts.join(' · ');
}

// Preistabelle ("Leistung Anzahl Einzeln Gesamt"): je Leistung die Personenzahl (Anzahl).
// Damit bekommt jeder Abschnitt seine eigene Personenzahl (z.B. Getränke 30, Menü 38).
function extractPriceRows(allLines, fromIdx) {
  const rows = [];
  for (let i = fromIdx; i < allLines.length; i++) {
    const l = allLines[i];
    if (/^Nettobetrag|^Gesamtpreis brutto|^Gesamtpreis\s+[\d.]+,\d{2}/.test(l)) break;
    const m = l.match(/^(.+?)\s+(\d+)\s+([\d.]+,\d{2})\s*€\s+([\d.]+,\d{2})\s*€$/);
    if (m) rows.push({ label: m[1].trim(), anzahl: parseInt(m[2], 10) });
  }
  return rows;
}
function priceKey(label) {
  return normalize(label).replace(/\d{1,2}\.\d{1,2}\.(\d{2,4})?/g, '').replace(/[·–\-+×x]/g, ' ').replace(/\s+/g, ' ').trim();
}
function personenFromPriceRows(rows, sectionTitle) {
  const key = priceKey(sectionTitle);
  if (!key) return null;
  let hit = rows.find(r => priceKey(r.label) === key);
  if (!hit) hit = rows.find(r => { const k = priceKey(r.label); return k.length > 6 && (k.includes(key) || key.includes(k)); });
  if (!hit) {
    const kw = key.split(' ').filter(w => w.length >= 5);
    if (kw.length) hit = rows.find(r => { const rw = priceKey(r.label).split(' ').filter(w => w.length >= 5); return rw.length && kw.some(w => rw.includes(w)) && sectionKindOf(r.label) === sectionKindOf(sectionTitle); });
  }
  return hit && hit.anzahl > 1 ? hit.anzahl : null;
}

// Kopf-/Fußzeilen (Briefkopf, "Seite N", Adresszeilen), die sich auf jeder PDF-Seite
// wiederholen, verfälschen sonst Gerichte-Erkennung (haengen sich an das letzte Gericht).
// Generisch erkannt: kurze Zeilen, die 3+ mal identisch im Dokument vorkommen.
function stripBoilerplateLines(rawLines) {
  const counts = new Map();
  rawLines.forEach(l => { if (l && l.length < 80) counts.set(l, (counts.get(l) || 0) + 1); });
  // Kategorie-Überschriften ("Hauptgang:", "Dessert:", ...) wiederholen sich bei
  // Mehrtages-Angeboten pro Tag und dürfen trotz Wiederholung nie als Briefkopf/Footer-
  // Rauschen entfernt werden - sonst verliert jeder Tag seine Kategorie-Zuordnung.
  const noisy = new Set(Array.from(counts.entries()).filter(([l, c]) => c >= 3 && !matchCategory(l)).map(([l]) => l));
  return rawLines
    .filter(l => !noisy.has(l) && !/^Seite\s+\d+$/i.test(l) && !/^--\s*\d+\s*of\s*\d+\s*--$/.test(l))
    .filter(l => !/^www\.[^\s]+$/i.test(l));
}

function repairPdfLigatures(text) {
  // Manche PDF-Schriftarten liefern "ff" als kaputtes Ligatur-Glyph (z.B. "BuƯet" statt "Buffet").
  return text.replace(/Ư/g, 'ff').replace(/ư/g, 'ff');
}

// ---------- Datum-Helfer ----------
function dateKey(s) {
  const m = (s || '').match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})?/);
  if (!m) return '';
  let y = m[3] || '';
  if (y.length === 2) y = '20' + y;
  return `${m[1].padStart(2, '0')}.${m[2].padStart(2, '0')}.${y}`;
}
const DATE_PREFIX_RE = /^(\d{1,2}\.\d{1,2}\.(?:\d{2,4})?)\s*(?:[–\-:]\s*)?(.*)$/;

// ---------- Menü-Abschnitte lesen ----------
// Zustandsautomat über die Zeilen des Menü-Bereichs (vor "Gesamtpreis"). Merkt sich
// aktuellen Tag, Abschnitt (Titel/Art), Kategorie und ob gerade ein Nicht-Speisen-Abschnitt
// (Getränke, Transport, Personal, ...) läuft, dessen Aufzählungen ignoriert werden.
function parseMenuLines(lines, eventDate) {
  const days = [];
  const dayByKey = {};
  let currentDay = null;
  let skip = false;
  let category = 'sonstiges';
  let section = null; // { title, kind, teile }
  let lastDish = null;
  let sawBulletInCat = false;
  let bareCount = 0;   // Gerichte ohne Aufzählungspunkt in der aktuellen Kategorie
  let listEnded = false; // Fließtext nach einer nackten Gerichteliste beendet diese
  let inIntro = false;   // Einleitungsabsatz direkt nach einem Abschnittstitel ("Gerne biete ich ...")
  let introLines = 0;
  let prevWasSkipTitle = false; // Zeile direkt nach einer Nicht-Speisen-Überschrift (umbrochener Titel)
  const resetCat = () => { lastDish = null; sawBulletInCat = false; bareCount = 0; listEnded = false; };

  function dayFor(dateStr) {
    const k = dateKey(dateStr);
    if (k && dayByKey[k]) { currentDay = dayByKey[k]; return currentDay; }
    const d = { id: uid(), date: dateStr, personen: null, dishes: [] };
    days.push(d);
    if (k) dayByKey[k] = d;
    currentDay = d;
    return d;
  }
  function ensureDay() { return currentDay || dayFor(eventDate || ''); }
  function addDish(name, cat) {
    const d = { id: uid(), name, category: cat, personen: null };
    if (section) {
      d.section = section.title;
      if (section.teile && (cat === 'fingerfood' || cat === 'flying')) d.teilePerPerson = section.teile;
    }
    ensureDay().dishes.push(d);
    lastDish = d;
    return d;
  }
  function nextIntro(i) {
    let seen = 0;
    for (let j = i + 1; j < lines.length && seen < 2; j++) {
      if (!lines[j]) continue;
      seen++;
      if (INTRO_STARTERS.test(lines[j])) return j;
      return -1;
    }
    return -1;
  }
  function startSection(title, i) {
    section = { title: title.trim(), kind: sectionKindOf(title), teile: null };
    skip = false;
    category = section.kind === 'fingerfood' ? 'fingerfood' : section.kind === 'menue' ? 'hauptgang' : 'sonstiges';
    resetCat();
    // "Ich würde gerne mit 4 Fingerfood-Teilen pro Person rechnen" steht im Einleitungstext
    const intro = lines.slice(i + 1, i + 6).join(' ');
    const tm = intro.match(/(\d+)\s*Fingerfood-?\s*Teil\w*\s+pro\s+Person/i);
    if (tm) section.teile = parseInt(tm[1], 10);
    inIntro = true; introLines = 0;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) { lastDish = null; continue; } // Leerzeile beendet jede Fortsetzungskette
    if (isHardStop(line)) break;

    // --- Zeile beginnt mit Datum ---
    const dm = line.match(DATE_PREFIX_RE);
    if (dm && line.length < 100 && !/uhr|datum:/i.test(line)) {
      const rest = (dm[2] || '').trim();
      const isOldDayHeader = !rest || /\bpax\b|personen|\d+\s*%/i.test(rest);
      if (isOldDayHeader) {
        const pm = line.match(/(\d+)\s*(pax|person)/i);
        const d = { id: uid(), date: line, personen: pm ? parseInt(pm[1], 10) : null, dishes: [] };
        days.push(d); currentDay = d;
        skip = false; category = 'sonstiges'; section = null; resetCat();
        continue;
      }
      if (isSoftStop(rest)) { skip = true; section = null; category = 'sonstiges'; resetCat(); continue; }
      if (sectionKindOf(rest) || nextIntro(i) >= 0) {
        dayFor(dm[1]);
        startSection(rest, i);
        continue;
      }
      // "05.10.2026 Pasta mit Tomatensauce" - Tagesgericht mit Datum davor
      if (!skip && section && section.kind) {
        dayFor(dm[1]);
        addDish(rest, category === 'sonstiges' ? 'hauptgang' : category);
        bareCount++;
      }
      continue;
    }

    if (isSoftStop(line)) { skip = true; section = null; category = 'sonstiges'; inIntro = false; resetCat(); prevWasSkipTitle = true; continue; }
    const wasSkipTitle = prevWasSkipTitle;
    prevWasSkipTitle = false;
    // Umbrochene Überschrift eines Nicht-Speisen-Abschnitts ("Getränke – Wasser + ... Longdrinks +"
    // / "Cocktails"): die Folgezeile gehört noch zum Titel, nicht zu einem neuen Abschnitt.
    if (wasSkipTitle && !isBulletLine(line) && line.length < 40 && nextIntro(i) >= 0) { prevWasSkipTitle = true; continue; }

    const catId = resolveCategory(line, section && section.kind);
    if (catId) { category = catId; skip = false; inIntro = false; resetCat(); continue; }

    // --- neuer Abschnitt: kurze Titelzeile, direkt gefolgt von "Gerne biete ich ..." ---
    // (nur am Einleitungssatz erkennbar - Stichwörter allein reichen nicht, sonst würde
    // "Canapes mit Roastbeef" als Abschnitt statt als Gericht gelesen)
    if (!isBulletLine(line) && line.length <= 80 && !/[.:]\s*$/.test(line) && line.split(/\s+/).length <= 9
        && nextIntro(i) >= 0) {
      startSection(line, i);
      continue;
    }

    if (skip) continue; // Nicht-Speisen-Abschnitt (Getränke/Transport/Personal/...)

    // Einleitungsabsatz des Abschnitts überspringen (endet mit ":" - "... gut vorstellen:" -,
    // spätestens beim ersten Aufzählungspunkt oder nach 6 Zeilen)
    if (inIntro) {
      if (isBulletLine(line)) inIntro = false;
      else {
        introLines++;
        if (/:\s*$/.test(line) || introLines >= 6) inIntro = false;
        continue;
      }
    }

    if (isBulletLine(line)) {
      const nm = stripBullet(line);
      // Ein Bullet, der mit "mit ..." beginnt (z.B. "mit wahlweise Hähnchen als Topping"), ist
      // eine Ergänzung zum vorherigen Gericht, auch wenn er als eigener Punkt gesetzt wurde.
      if (nm && lastDish && /^mit\s+/i.test(nm)) { lastDish.name += ' ' + nm; continue; }
      if (nm) { addDish(nm, category); sawBulletInCat = true; }
      continue;
    }
    if (looksLikePriceRow(line)) { lastDish = null; if (bareCount > 0) listEnded = true; continue; }
    // Kurze Zeile direkt nach einem Aufzählungspunkt (kein Satzende, keine Leerzeile
    // dazwischen) = umgebrochene Fortsetzung. Lange, satzartige Zeilen sind dagegen meist
    // Fließtext, der nach der Liste weitergeht (z.B. "Der Preis für das Buffet...").
    // Nur relevant innerhalb einer "•"/"-"-Liste: bei nacktem Format (keine Aufzählungspunkte
    // ueberhaupt) ist jede Zeile ein eigenes Gericht, sonst wuerden mehrere Gerichte ohne
    // Bullet faelschlich zu einem verschmelzen.
    if (lastDish && sawBulletInCat) {
      const looksLikeContinuation = line.length < 60 && !/[.!?]\s*$/.test(line);
      if (looksLikeContinuation) { lastDish.name += ' ' + line; continue; }
      lastDish = null;
    }
    // Nackte Zeile ohne Aufzählungspunkt: nur als eigenes Gericht werten, wenn diese Kategorie
    // noch keine "•"/"-"-Punkte benutzt hat (Kompatibilität zum alten, punktlosen Format)
    if (category !== 'sonstiges' && !sawBulletInCat && !listEnded) {
      if (looksLikeIntroSentence(line)) { if (bareCount > 0) listEnded = true; }
      else { addDish(line, category); bareCount++; }
    }
  }
  return days.filter(d => d.dishes.length || d.personen);
}

// Nachbearbeitung je Gericht: "für 25 Personen"-Angaben, Pfannengerichte, Brot.
function finalizeDishes(days, priceRows) {
  days.forEach(d => d.dishes.forEach(dish => {
    dish.name = dish.name.replace(/\s+/g, ' ').replace(/\s+[—–-]\s*$/, '').trim();
    const pm = dish.name.match(/\s*,?\s*(?:nur\s+)?für\s+(\d+)\s*Personen\b/i);
    if (pm) { dish.personenFix = parseInt(pm[1], 10); dish.name = dish.name.replace(pm[0], '').trim(); }
    // Pfannengerichte werden anhand des Namens erkannt - unabhängig davon, unter welcher
    // Überschrift sie im Angebot stehen ("Italienische Reispfanne" stand schon unter "Dessert:").
    if (['hauptgang', 'dessert', 'sonstiges', 'vorspeise'].includes(dish.category) && /pfanne(?!k)/i.test(dish.name)) {
      dish.category = 'pfanne';
      dish.pfanneComponents = defaultPfanneComponents(guessProteinName(dish.name) ? '3komp' : '2komp', state.rules, dish.name);
    }
    // Brotauswahl zaehlt nicht zu den Vorspeisen und bekommt daher keinen Anteil an deren
    // Personen-Aufteilung ab - eigene Kategorie mit eigener Formel (1 Brot / 10 Personen).
    if (/brotauswahl/i.test(dish.name)) dish.category = 'brot';
    if (dish.section && priceRows && priceRows.length) {
      const p = personenFromPriceRows(priceRows, dish.section);
      if (p) dish.sectionPersonen = p;
    }
  }));
}

function parseAngebot(text, filename) {
  const fullText = repairPdfLigatures(text);
  const allLines = stripBoilerplateLines(fullText.split(/\r?\n/).map(l => l.trim()));

  const letterheadName = allLines.some(l => /Rothschildallee 16a/.test(l) && /Licata|Forks/i.test(l));
  const name = extractCustomerName(allLines, filename) || 'Neues Angebot';
  const personen = extractPersonen(fullText);
  const eventDate = extractEventDate(allLines, fullText);

  // Preistabellen & Fließtext am Ende (Transportkosten/Gesamtpreis/...) enthalten oft
  // dieselben Datumsangaben nochmal - daher nur bis zum Ende des Menü-Abschnitts scannen.
  let menuEnd = allLines.length;
  for (let i = 0; i < allLines.length; i++) { if (isHardStop(allLines[i])) { menuEnd = i; break; } }
  const lines = allLines.slice(0, menuEnd);
  const priceRows = menuEnd < allLines.length ? extractPriceRows(allLines, menuEnd) : [];

  const days = parseMenuLines(lines, eventDate);
  finalizeDishes(days, priceRows);

  const notizParts = [];
  const anlass = extractAnlass(allLines);
  if (anlass) notizParts.push('Anlass: ' + anlass);
  const kontakt = extractContactName(allLines);
  if (kontakt && letterheadName && !normalize(name).includes(normalize(kontakt.replace(/^(frau|herr)\s+/i, '')))) notizParts.push('Kontakt: ' + kontakt);
  const logistik = extractLogistikNotiz(fullText);
  if (logistik) notizParts.push(logistik);

  const event = newDraftEvent();
  event.name = name;
  event.personen = personen || null;
  event.notiz = notizParts.join(' · ');
  event.days = days;
  autoSplitAllDays(event);
  return event;
}

function autoSplitAllDays(event) {
  for (const day of event.days) autoSplitDay(day, day.personen || event.personen || 0);
}
function splitGroupOf(catId) { return catId === 'pfanne' ? 'hauptgang' : catId; }
// Verteilt die Personen je Abschnitt+Kategorie gleichmäßig auf die Gerichte. Abschnitte mit
// eigener Personenzahl in der Preistabelle (dish.sectionPersonen) nutzen diese; Gerichte mit
// "für 25 Personen" (dish.personenFix) behalten ihre Zahl, die übrigen teilen den Rest.
function autoSplitDay(day, totalPersonen) {
  const groups = {};
  for (const d of day.dishes) {
    const key = (d.section || '') + '||' + splitGroupOf(d.category);
    (groups[key] = groups[key] || []).push(d);
  }
  for (const key in groups) {
    const dishes = groups[key];
    const sp = dishes.find(d => d.sectionPersonen);
    const total = sp ? sp.sectionPersonen : totalPersonen;
    const fixed = dishes.filter(d => d.personenFix);
    const free = dishes.filter(d => !d.personenFix);
    fixed.forEach(d => { d.personen = d.personenFix; });
    if (!free.length) continue;
    let remaining = total - fixed.reduce((s, d) => s + d.personenFix, 0);
    if (remaining <= 0) remaining = total;
    const base = Math.floor(remaining / free.length);
    const rest = remaining - base * free.length;
    free.forEach((d, i) => { d.personen = base + (i < rest ? 1 : 0); });
  }
}

// ---------- Dokumenttyp ----------
function detectDocumentType(text, filename) {
  if (/Zeitraum\s+KW\s*\d+/i.test(text) || /^(vorab[-_\s]*)?KW[-_\s]*\d+/i.test(filename || '')) {
    if (/Montag[\s\S]{0,40}Dienstag/i.test(text) || /=== TABELLE ===/.test(text)) return 'wochenplan';
  }
  if (/Menüvorschlag|Angebot\s+für\s+.+\s+am\s+\d|Veranstaltung\s+am\s+\d|hier das Angebot|hier die Übersicht|Folgende Speisen/i.test(text)) return 'angebot';
  if (/Vorspeise|Hauptgang|Dessert|Fingerfood/i.test(text)) return 'angebot';
  return 'sonstiges';
}

function parseDocument(text, filename) {
  const type = detectDocumentType(text, filename);
  if (type === 'wochenplan') return parseWochenplan(text, filename);
  const event = parseAngebot(text, filename);
  if (type === 'sonstiges') {
    event.parseHinweis = 'Dieses PDF sieht nicht nach einem Speisen-Angebot oder Wochenplan aus (z.B. Equipment-Miete, Auftragsbestätigung, Plan) - es wurden daher keine Gerichte übernommen.';
  } else if (!event.days.length) {
    event.parseHinweis = 'Es konnten keine Gerichte erkannt werden. Bitte Tage/Gerichte manuell anlegen.';
  }
  return event;
}

// ---------- Wochenplan (Tabelle Montag-Freitag) ----------
const WEEKDAYS = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
const WP_DESSERT_RE = /milchreis|creme\b|crème|mousse|windbeutel|kuchen|pudding|tiramisu|\beis\b|obst|kompott|grütze|gruetze|crumble|panna cotta|brûlée|bruelee|catalan|torte|waffel|schmarrn|dessert/i;
const WP_ALLERGEN_RE = /\s*\((?:\d{1,2}\s*,\s*)*\d{1,2}\)/g;

function formatDate(d) {
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
}
function parseDateParts(s) {
  const m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])) : null;
}

// Tabellenblock, den der Server beim PDF-Import anhängt (pdf-parse getTable), bzw. Text mit
// "=== TABELLE ===" ... "=== ENDE TABELLE ===" und Zellen getrennt durch " | ".
function extractTableBlock(text) {
  const m = text.match(/=== TABELLE ===\s*\n([\s\S]*?)\n\s*=== ENDE TABELLE ===/);
  if (!m) return null;
  const rows = m[1].split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => l.split(/\s\|\s/).map(c => c.trim()));
  return rows.length >= 2 ? rows : null;
}

function cleanWochenplanCell(cell) {
  const allergene = [];
  let nm = cell.replace(WP_ALLERGEN_RE, m => { allergene.push(m.replace(/[()\s]/g, '')); return ''; });
  nm = nm.replace(/\s*[–-]\s+[–-]\s+/g, ' – ').replace(/,\s*[–-]\s+/g, ', ');
  nm = nm.replace(/\s+/g, ' ').replace(/\s*[–-]\s*$/, '').trim();
  return { name: nm, allergene: allergene.join(',') };
}
function guessWochenplanCategory(name, rowIdx, rowCount) {
  if (/salat\b/i.test(name) && !/hähnchen|fleisch|thunfisch/i.test(name)) return 'vorspeise';
  if (rowIdx === rowCount - 1 && rowCount >= 3) return WP_DESSERT_RE.test(name) ? 'dessert' : 'vorspeise';
  if (WP_DESSERT_RE.test(name) && rowCount === 1) return 'hauptgang';
  if (WP_DESSERT_RE.test(name) && rowIdx > 0) return 'dessert';
  return 'hauptgang';
}

function parseWochenplan(text, filename) {
  const fullText = repairPdfLigatures(text);
  const rows = extractTableBlock(fullText);
  const zm = fullText.match(/Zeitraum\s+KW\s*(\d+)\s*[-–]\s*(\d{1,2}\.\d{1,2}\.\d{4})/i);
  const kw = zm ? zm[1] : ((filename || '').match(/KW[-_\s]*(\d+)/i) || [])[1] || '';
  const startDate = zm ? parseDateParts(zm[2]) : null;
  const baseName = nameFromFilename(filename) || 'Wochenplan';

  const event = newDraftEvent();
  event.name = kw ? `${baseName} · KW ${kw}` : baseName;
  event.wochenplan = true;
  const notizParts = [];
  if (zm) {
    const zr = fullText.match(/Zeitraum\s+KW\s*\d+\s*[-–]\s*(\d{1,2}\.\d{1,2}\.\d{4})\s*bis\s*([\d.]+)/i);
    notizParts.push(`Wochenplan KW ${kw}: ${zr ? zr[1] + ' – ' + zr[2] : ''}`.trim());
  }
  const rich = fullText.match(/Richtwert[^)]*?(\d+\s*[-–]\s*\d+\s*Gramm\s+Fleisch)/i);
  if (rich) notizParts.push('Richtwert: ' + rich[1] + ' pro Person (mind. 1 Stück)');
  event.notiz = notizParts.join(' · ');

  if (!rows) {
    event.parseHinweis = 'Die Wochenplan-Tabelle wurde nicht erkannt. Bitte die PDF über "Datei hochladen" einlesen (der Text allein enthält die Spaltenzuordnung nicht).';
    return event;
  }
  const header = rows[0].map(c => normalize(c));
  const dayCols = [];
  header.forEach((h, idx) => { const wd = WEEKDAYS.indexOf(h); if (wd >= 0) dayCols.push({ idx, wd }); });
  if (!dayCols.length) {
    event.parseHinweis = 'Keine Wochentage in der Tabelle gefunden.';
    return event;
  }
  const body = rows.slice(1);
  const startWd = startDate ? (startDate.getUTCDay() + 6) % 7 : dayCols[0].wd;
  const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

  event.days = dayCols.map(({ idx, wd }) => {
    let dateLabel = dayNames[wd];
    if (startDate) {
      const d = new Date(startDate.getTime() + (wd - startWd) * 86400000);
      dateLabel = `${dayNames[wd]} ${formatDate(d)}`;
    }
    const day = { id: uid(), date: dateLabel, personen: null, dishes: [] };
    let prev = null;
    body.forEach((row, rowIdx) => {
      const cell = (row[idx] || '').trim();
      if (!cell) return;
      // Bullet-Liste unter einem Gericht (z.B. Taco-Station: "• Fisch, Fleisch • Salat ...")
      // gehört zum Gericht darüber (Bestandteile), ist kein eigenes Gericht.
      if (/^•/.test(cell) && prev) {
        const parts = cell.split('•').map(s => s.replace(/[;,]\s*$/, '').trim()).filter(Boolean);
        prev.name += ` (Bestandteile: ${parts.join('; ')})`;
        return;
      }
      const { name, allergene } = cleanWochenplanCell(cell);
      if (!name) return;
      const dish = { id: uid(), name, category: guessWochenplanCategory(name, rowIdx, body.length), personen: null };
      if (allergene) dish.allergene = allergene;
      day.dishes.push(dish);
      prev = dish;
    });
    return day;
  }).filter(d => d.dishes.length);

  finalizeDishes(event.days, null);
  event.parseHinweis = 'Wochenpläne enthalten keine Personenzahl - bitte oben bei "Personen (gesamt)" eintragen (die Gerichte werden dann verteilt).';
  return event;
}

// ---------- Pfannengerichte ----------
const SAETTIGUNG_KEYWORDS = [
  { re: /reis/i, name: 'Reis' },
  { re: /schupfnudel/i, name: 'Schupfnudeln' },
  { re: /kartoffel/i, name: 'Kartoffeln' },
  { re: /nudel|pasta|penne|spaghetti|fusilli/i, name: 'Nudeln' },
  { re: /couscous/i, name: 'Couscous' },
  { re: /quinoa/i, name: 'Quinoa' },
  { re: /bulgur/i, name: 'Bulgur' },
];
function guessSaettigungName(dishName) {
  if (!dishName) return 'Sättigungsbeilage';
  const hit = SAETTIGUNG_KEYWORDS.find(k => k.re.test(dishName));
  return hit ? hit.name : 'Sättigungsbeilage';
}

// Eiweiß-Komponente einer Pfanne ("Gemüsepfanne mit Reis, Hähnchenfleisch und Hoisinsoße")
const PROTEIN_KEYWORDS = [
  { re: /hähnchen|haehnchen|huhn|chicken/i, name: 'Hähnchenfleisch' },
  { re: /pute|puten/i, name: 'Putenfleisch' },
  { re: /rind|hack/i, name: 'Rindfleisch' },
  { re: /schwein|speck|schinken/i, name: 'Schweinefleisch' },
  { re: /lachs|fisch|garnele|shrimp|thunfisch/i, name: 'Fisch/Meeresfrüchte' },
  { re: /tofu/i, name: 'Tofu' },
  { re: /fleisch|wurst/i, name: 'Fleisch' },
];
function guessProteinName(dishName) {
  const hit = PROTEIN_KEYWORDS.find(k => k.re.test(dishName || ''));
  return hit ? hit.name : '';
}

// "Gemüse" wird in den Rezepten fast immer als gebratenes Zucchini/Auberginen/Paprika-Gemüse
// verstanden - NICHT die separate "Gemüseauswahl" (TK-Gemüsebeilage, ein eigenes Gericht).
// Eindeutiger Name verhindert, dass die Rezeptsuche die beiden verwechselt.
const DEFAULT_PFANNE_GEMUESE_NAME = 'Gebratenes Gemüse (Zucchini, Aubergine, Paprika)';

function defaultPfanneComponents(mode, rules, dishName) {
  const saettigungName = guessSaettigungName(dishName);
  if (mode === '3komp') {
    const [a, b, c] = rules.pfanne3KompSplit || DEFAULT_RULES.pfanne3KompSplit;
    return [
      { id: uid(), name: guessProteinName(dishName) || 'Hauptteil', role: 'hauptteil', splitPercent: a, garMethod: 'standard' },
      { id: uid(), name: saettigungName, role: 'saettigung', splitPercent: b, garMethod: 'garzuwachs' },
      { id: uid(), name: DEFAULT_PFANNE_GEMUESE_NAME, role: 'gemuese', splitPercent: c, garMethod: 'standard' },
    ];
  }
  const [a, b] = rules.pfanne2KompSplit || DEFAULT_RULES.pfanne2KompSplit;
  return [
    { id: uid(), name: DEFAULT_PFANNE_GEMUESE_NAME, role: 'gemuese', splitPercent: a, garMethod: 'standard' },
    { id: uid(), name: saettigungName, role: 'saettigung', splitPercent: b, garMethod: 'garzuwachs' },
  ];
}
