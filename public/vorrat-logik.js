// Vorrat (Basisartikel wie Salz, Pfeffer, Öl): Zuordnung von Rezeptzutaten zu Vorratsartikeln und Verrechnung des Bedarfs
// mit Vorrat und Überproduktion. Reine Logik; läuft im Browser (vor vorrat.js) und in Node-Tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VorratLogik = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const norm = s => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
  const EPS = 1e-6;

  // Rezeptmaß -> Basismenge. typ: 'g' | 'ml' | 'vol' (Löffelmaße: gelten für g und ml) | 'stk'
  function toBasis(unit, amount) {
    const a = Number(amount);
    if (amount == null || amount === '' || isNaN(a)) return null;
    const u = String(unit || '').toLowerCase().replace(/\./g, '').trim();
    if (u === 'g') return { typ: 'g', menge: a };
    if (u === 'kg') return { typ: 'g', menge: a * 1000 };
    if (u === 'ml') return { typ: 'ml', menge: a };
    if (u === 'cl') return { typ: 'ml', menge: a * 10 };
    if (u === 'l') return { typ: 'ml', menge: a * 1000 };
    if (u === 'el') return { typ: 'vol', menge: a * 15 };
    if (u === 'tl') return { typ: 'vol', menge: a * 5 };
    if (u === 'prise') return { typ: 'vol', menge: a * 0.5 };
    if (u === 'spritzer') return { typ: 'vol', menge: a * 2 };
    if (/^(stk|stück|stueck|zehe|zehen|zweig|zweige|blatt|bund|pck|scheibe|scheiben)$/.test(u)) return { typ: 'stk', menge: a };
    return null;
  }
  const typPasst = (typ, einheit) => (typ === 'vol' && (einheit === 'g' || einheit === 'ml')) || (typ === 'g' && einheit === 'g') || (typ === 'ml' && einheit === 'ml') || (typ === 'stk' && einheit === 'Stk');
  // Menge einer Überproduktion (kg/g/l/ml/Stk) in Basiseinheit
  function ueberBasis(menge, einheit) {
    const e = String(einheit || '').toLowerCase();
    if (e === 'kg') return { typ: 'g', menge: menge * 1000 };
    if (e === 'g') return { typ: 'g', menge };
    if (e === 'l') return { typ: 'ml', menge: menge * 1000 };
    if (e === 'ml') return { typ: 'ml', menge };
    if (e === 'stk' || e === 'packung') return { typ: 'stk', menge };
    return null;
  }

  const terms = s => String(s || '').split(',').map(norm).filter(Boolean);
  function begriffe(item) { return Array.from(new Set([norm(item.name)].concat(terms(item.begriffe)).filter(Boolean))); }
  function trifft(n, t) {
    if (!t) return false;
    if (t.length >= 4) return n.includes(t);
    return new RegExp('(^| )' + t + '|' + t + '( |$)').test(n);   // kurze Begriffe (z.B. "öl") nur am Wortanfang/-ende
  }
  // Passenden Vorratsartikel zu einem Zutatennamen finden (längster passender Begriff gewinnt)
  function findeArtikel(name, liste) {
    const n = norm(name);
    if (!n) return null;
    let best = null, bestLen = 0;
    for (const it of liste || []) {
      if (terms(it.ohne).some(t => n.includes(t))) continue;
      for (const t of begriffe(it)) if (trifft(n, t) && t.length > bestLen) { best = it; bestLen = t.length; }
    }
    return best;
  }

  // Bedarf (aggregierte Zutaten) gegen Vorrat und Überproduktion rechnen.
  //  totals:      [{name, unit, amount}]
  //  vorrat:      [{id, name, einheit, bestand, mindest, nachbestellung, begriffe, ohne}]
  //  reserviert:  {itemId: Basismenge}  – Bedarf anderer, noch nicht gebuchter Aufträge
  //  ueber:       [{key, name, menge, einheit}] – offene Überproduktion (nicht abgelaufen)
  //  passtFn:     (zutat, ueberName) -> bool
  function verrechne(totals, vorrat, reserviert, ueber, passtFn) {
    reserviert = reserviert || {};
    const belegtV = {}, belegtU = {};
    const rows = totals.map(t => {
      const row = { name: t.name, unit: t.unit, amount: t.amount, rest: t.amount, ausVorrat: null, ausUeber: [], gedeckt: false };
      const b = toBasis(t.unit, t.amount);
      if (!b || b.menge <= EPS) return row;
      let rest = b.menge;
      const it = findeArtikel(t.name, vorrat);
      if (it && typPasst(b.typ, it.einheit)) {
        const frei = Math.max(0, (Number(it.bestand) || 0) - (reserviert[it.id] || 0) - (belegtV[it.id] || 0));
        const dk = Math.min(rest, frei);
        belegtV[it.id] = (belegtV[it.id] || 0) + dk;
        row.ausVorrat = { id: it.id, name: it.name, einheit: it.einheit, menge: dk, bedarf: b.menge };
        rest -= dk;
      }
      if (rest > EPS && passtFn) {
        for (const u of ueber || []) {
          if (rest <= EPS) break;
          if (!passtFn(t.name, u.name)) continue;
          const ub = ueberBasis(Number(u.menge), u.einheit);
          if (!ub || !(ub.typ === b.typ || (b.typ === 'vol' && (ub.typ === 'g' || ub.typ === 'ml')))) continue;
          const frei = Math.max(0, ub.menge - (belegtU[u.key] || 0));
          const dk = Math.min(rest, frei);
          if (dk <= EPS) continue;
          belegtU[u.key] = (belegtU[u.key] || 0) + dk;
          row.ausUeber.push({ key: u.key, name: u.name, menge: dk, typ: ub.typ });
          rest -= dk;
        }
      }
      row.rest = b.menge > EPS ? t.amount * Math.max(0, rest) / b.menge : t.amount;
      row.gedeckt = rest <= EPS;
      return row;
    });
    // Basisartikel unter Mindestbestand (nach diesem und allen anderen Aufträgen) werden nachbestellt
    const nachbestellen = [];
    for (const it of vorrat || []) {
      if (!(Number(it.mindest) > 0)) continue;
      const prognose = (Number(it.bestand) || 0) - (reserviert[it.id] || 0) - (belegtV[it.id] || 0);
      if (prognose < Number(it.mindest)) nachbestellen.push({ item: it, prognose, menge: Number(it.nachbestellung) > 0 ? Number(it.nachbestellung) : Number(it.mindest) });
    }
    return { rows, nachbestellen, belegtV, belegtU };
  }

  const STANDARD_ARTIKEL = [
    { name: 'Salz', einheit: 'g', begriffe: 'salz, meersalz', ohne: 'salzgurke, salzbrezel, salzstange' },
    { name: 'Pfeffer', einheit: 'g', begriffe: 'pfeffer' },
    { name: 'Zucker', einheit: 'g', begriffe: 'zucker', ohne: 'puderzucker, vanillezucker' },
    { name: 'Mehl', einheit: 'g', begriffe: 'mehl, weizenmehl' },
    { name: 'Speiseöl', einheit: 'ml', begriffe: 'öl, olivenöl, rapsöl, sonnenblumenöl, speiseöl, pflanzenöl', ohne: 'ölsardinen' },
    { name: 'Essig', einheit: 'ml', begriffe: 'essig' },
    { name: 'Paprikapulver', einheit: 'g', begriffe: 'paprikapulver, paprika edelsüß' },
    { name: 'Muskat', einheit: 'g', begriffe: 'muskat' },
    { name: 'Gemüsebrühe', einheit: 'g', begriffe: 'gemüsebrühe, brühe, instantbrühe' },
    { name: 'Senf', einheit: 'g', begriffe: 'senf' },
    { name: 'Backpulver', einheit: 'g', begriffe: 'backpulver' },
    { name: 'Stärke', einheit: 'g', begriffe: 'speisestärke, stärke, maisstärke' },
  ];

  return { norm, toBasis, typPasst, ueberBasis, begriffe, findeArtikel, verrechne, STANDARD_ARTIKEL };
});
