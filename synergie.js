// Synergie-Empfehlung für die Angebotserstellung im Büro: Gerichte (und Komponenten), die in bestätigten, anstehenden Aufträgen ohnehin produziert
// werden. Wer sie für einen neuen Auftrag wieder anbietet, spart Aufwand und Einkauf (z. B. dieselbe Orangen-Mandelsoße am selben Tag).
// Reine Logik ohne Netzwerk; die Antwort enthält keine Kundennamen, nur Gericht, Termin und Gästezahl.
const KL = require('./public/kartei-logik.js');
const B = require('./public/bestell-logik.js');

const norm = s => String(s || '').toLowerCase().replace(/ß/g, 'ss').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const tagText = iso => `${WT[new Date(iso + 'T12:00:00Z').getUTCDay()]} ${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
const ROLLE = { H: 'Hauptkomponente', S: 'Soße', B: 'Beilage', G: 'Gemüse', E: 'Extra' };
const CAT_GANG = { vorspeise: 'Vorspeise', hauptgang: 'Hauptgang', dessert: 'Dessert', fingerfood: 'Fingerfood Snacks', flying: 'Fingerfood Snacks', 'beilage-saettigung': 'Beilagen', 'beilage-gemuese': 'Beilagen', sosse: 'Soße', brot: 'Brot', sonstiges: 'Sonstiges' };

// passung: Verhältnis eines Termins zum Wunschtermin des neuen Angebots
function passung(tage, datum) {
  if (!datum) return { stufe: 0, text: 'ohne Wunschtermin' };
  if (tage.some(t => t.datum === datum)) return { stufe: 3, text: 'gleicher Tag' };
  const block = B.blockStart(datum);
  if (tage.some(t => B.blockStart(t.datum) === block)) return { stufe: 2, text: 'gleiche Bestellwoche' };
  return { stufe: 1, text: 'anderer Zeitraum' };
}
function begruendung(p, tage, anzahl, gaeste) {
  const wann = tage.slice(0, 3).map(t => tagText(t.datum)).join(', ');
  const wo = anzahl > 1 ? `in ${anzahl} bestätigten Aufträgen (${wann})` : `in einem bestätigten Auftrag (${wann})`;
  if (p.stufe === 3) return `Wird am selben Tag ${wo} ohnehin für ${gaeste} Gäste produziert – gleich mitproduzieren spart Aufwand und Einkauf.`;
  if (p.stufe === 2) return `Wird in derselben Bestellwoche ${wo} produziert – gemeinsame Bestellung, Einkauf und Vorbereitung.`;
  return `Wird ${wo} produziert.`;
}

// events: Aufträge der Küche; gerichte: Grundkatalog [{id,name,gang,ids}]; komponenten: { id: {id,name,rolle} }; heute: 'JJJJ-MM-TT'; datum: Wunschtermin oder null
function synergien({ events, gerichte, komponenten, heute, datum, max = 12 }) {
  const nachId = new Map((gerichte || []).map(g => [g.id, g]));
  const nachName = new Map((gerichte || []).map(g => [norm(g.name), g]));
  const gerichtMap = new Map(), kompMap = new Map();
  for (const ev of events || []) {
    if (!ev || ev.archiviert || ev.storniert || !Array.isArray(ev.days)) continue;
    for (const day of ev.days) {
      const iso = KL.parseDatumDE(day.date);
      if (!iso || iso < heute) continue;   // nur anstehende Termine
      for (const d of day.dishes || []) {
        const g = (d.katalogId && nachId.get(d.katalogId)) || nachName.get(norm(d.name)) || null;
        const id = d.katalogId || (g && g.id);
        if (!id) continue;   // nicht im Speisenkatalog zu finden: kann das Büro nicht gezielt wieder anbieten
        const e = gerichtMap.get(id) || { katalogId: id, name: g ? g.name : d.name, gang: g ? g.gang : (CAT_GANG[d.category] || 'Sonstiges'), tage: new Map(), auftraege: new Set(), ids: (d.komponentenIds && d.komponentenIds.length ? d.komponentenIds : (g && g.ids) || []) };
        e.auftraege.add(ev.id);
        const t = e.tage.get(iso) || { datum: iso, tag: tagText(iso), gaeste: 0 };
        t.gaeste += Number(d.personen) || 0; e.tage.set(iso, t);
        gerichtMap.set(id, e);
        for (const kid of e.ids) {
          const c = komponenten[kid]; if (!c || c.rolle === 'E') continue;
          const k = kompMap.get(kid) || { id: kid, name: c.name, rolle: c.rolle, rolleText: ROLLE[c.rolle], auftraege: new Set(), tage: new Map() };
          k.auftraege.add(ev.id); k.tage.set(iso, (k.tage.get(iso) || 0) + (Number(d.personen) || 0)); kompMap.set(kid, k);
        }
      }
    }
  }
  const gerichteListe = Array.from(gerichtMap.values()).map(e => {
    const tage = Array.from(e.tage.values()).sort((a, b) => a.datum.localeCompare(b.datum));
    const p = passung(tage, datum), gaeste = tage.reduce((s, t) => s + t.gaeste, 0);
    // verwandte Gerichte: gleiche Hauptkomponente (z. B. ebenfalls Orangen-Mandelsoße oder dieselbe Hähnchenbrust)
    const haupt = e.ids.find(i => komponenten[i] && komponenten[i].rolle === 'H');
    const verwandt = haupt ? (gerichte || []).filter(g => g.id !== e.katalogId && !gerichtMap.has(g.id) && (g.ids || []).includes(haupt))
      .map(g => ({ g, geteilt: (g.ids || []).filter(i => e.ids.includes(i)).length })).sort((a, b) => b.geteilt - a.geteilt).slice(0, 4)
      .map(x => ({ katalogId: x.g.id, name: x.g.name, gang: x.g.gang, gemeinsameKomponenten: x.geteilt })) : [];
    return {
      katalogId: e.katalogId, name: e.name, gang: e.gang, passung: p.text, anzahlAuftraege: e.auftraege.size, gaesteGesamt: gaeste, tage: tage.map(t => ({ datum: t.datum, tag: t.tag, gaeste: t.gaeste })),
      begruendung: begruendung(p, tage, e.auftraege.size, gaeste),
      komponenten: e.ids.map(i => komponenten[i]).filter(c => c && c.rolle !== 'E').map(c => ({ id: c.id, name: c.name, rolle: c.rolle })),
      verwandteGerichte: verwandt, _stufe: p.stufe,
    };
  }).sort((a, b) => b._stufe - a._stufe || b.anzahlAuftraege - a.anzahlAuftraege || b.gaesteGesamt - a.gaesteGesamt || a.name.localeCompare(b.name, 'de'))
    .slice(0, max).map(({ _stufe, ...rest }) => rest);
  const komponentenListe = Array.from(kompMap.values()).map(k => {
    const tage = Array.from(k.tage.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([d, g]) => ({ datum: d, tag: tagText(d), gaeste: g }));
    const p = passung(tage, datum);
    return { id: k.id, name: k.name, rolle: k.rolle, rolleText: k.rolleText, anzahlAuftraege: k.auftraege.size, passung: p.text, tage, _stufe: p.stufe };
  }).filter(k => !datum || k._stufe >= 2).sort((a, b) => b._stufe - a._stufe || b.anzahlAuftraege - a.anzahlAuftraege || a.name.localeCompare(b.name, 'de'))
    .slice(0, max).map(({ _stufe, ...rest }) => rest);
  return { format: 'kuechen-synergien/1', stand: new Date().toISOString(), datum: datum || null, gerichte: gerichteListe, komponenten: komponentenListe };
}

module.exports = { synergien };
