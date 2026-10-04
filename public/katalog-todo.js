// Speisenkatalog-Anbindung für die To-Do-Liste:
// erkennt in einem Gerichtsnamen die Komponenten des Speisenkatalogs (Hauptkomponente, Soße, Beilage, Gemüse),
// berechnet je Komponente die zuzubereitende Menge aus den Referenzdaten (Regeln) und liefert die To-Dos des Katalogs.
const KatalogTodo = (function () {
  let comps = [];       // wirksame Komponenten (mit Umbenennungen/Labels/To-Dos aus dem Katalog-Stand)
  let ready = false;
  let loadingPromise = null;

  // ---- Text-Normalisierung: Groß-/Kleinschreibung, Umlaute, "Sauce"="Soße", Wortendungen (Dativ etc.) ----
  const STOP = new Set(['mit', 'und', 'oder', 'in', 'im', 'an', 'auf', 'zu', 'dazu', 'von', 'vom', 'der', 'die', 'das', 'dem', 'den', 'einer', 'einem', 'ein', 'eine', 'aus', 'nach', 'art', 'wahlweise', 'nur', 'frisch', 'frischen', 'frischem', 'frischer', 'leicht', 'leichter', 'zart', 'zarte']);
  function nk(s) {
    return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/ß/g, 'ss').replace(/sauce/g, 'sosse').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function stem(w) {
    if (w.length < 5) return w;
    let s = w.replace(/(en|em|er|es)$/, '');
    if (s === w) s = w.replace(/e$/, '');
    return s.length >= 3 ? s : w;
  }
  const tokens = s => nk(s).split(' ').filter(Boolean).map(stem);

  // ---- Daten laden ----
  let byId = {};
  function build(komponenten, state, aliase) {
    const d = (state && state.daten) || {};
    const names = d.speisen_names || {}, groups = d.speisen_groups || {}, todos = d.speisen_todos || {};
    const eff = komponenten.map(c => {
      const g = groups[c.id];
      const name = names[c.id] || c.name;
      return {
        id: c.id, name, rolle: (g && g.rolle) || c.rolle, gruppe: (g && g.gruppe) || c.gruppe,
        gar: c.gar, todo: todos[c.id] != null ? todos[c.id] : (c.todo || ''),
      };
    }).filter(c => c.rolle !== 'E');
    byId = Object.fromEntries(eff.map(c => [c.id, c]));
    // Suchbegriffe: Komponentenname + Schreibweisen aus den Katalog-Gerichten (Aliase)
    comps = [];
    eff.forEach(c => { if (nk(c.name).length >= 4) comps.push({ c, tok: tokens(c.name) }); });
    (aliase || window._katalogAlias || []).forEach(([text, id]) => {
      const c = byId[id];
      if (c && nk(text).length >= 4) comps.push({ c, tok: tokens(text) });
    });
    comps = comps.filter(e => e.tok.length);
    ready = true;
  }
  function load() {
    if (!loadingPromise) {
      loadingPromise = fetch('/api/speisenkatalog/komponenten', { credentials: 'include', cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error('Status ' + r.status); return r.json(); })
        .then(j => { window._katalogKomp = j.komponenten; window._katalogAlias = j.aliase || []; build(j.komponenten, j.state, j.aliase); })
        .catch(err => { console.error('Speisenkatalog nicht geladen:', err.message); loadingPromise = null; });
    }
    return loadingPromise;
  }
  // Änderungen im Katalog (To-Dos, Namen, Labels) neu holen
  async function refresh() {
    try {
      const r = await fetch('/api/speisenkatalog/state', { credentials: 'include', cache: 'no-store' });
      if (!r.ok || !window._katalogKomp) return false;
      build(window._katalogKomp, await r.json(), window._katalogAlias);
      return true;
    } catch (e) { return false; }
  }

  // ---- Komponenten im Gerichtsnamen erkennen ----
  const ROLE_PRIO = {
    hauptgang: ['H', 'S', 'B', 'G'], 'beilage-saettigung': ['B', 'H', 'G', 'S'], 'beilage-gemuese': ['G', 'B', 'H', 'S'],
    sosse: ['S', 'H'], default: ['H', 'G', 'S', 'B'],
  };
  function erkenne(dishName, catId) {
    const dt = tokens(dishName);
    if (!dt.length || !ready) return { gefunden: [], rest: [] };
    const prio = ROLE_PRIO[catId] || ROLE_PRIO.default;
    const cands = [];
    for (const e of comps) {
      const n = e.tok.length, c = e.c;
      for (let i = 0; i + n <= dt.length; i++) {
        let ok = true;
        for (let k = 0; k < n; k++) if (dt[i + k] !== e.tok[k]) { ok = false; break; }
        if (ok) cands.push({ c, start: i, end: i + n, chars: e.tok.join('').length, p: prio.indexOf(c.rolle) < 0 ? 99 : prio.indexOf(c.rolle) });
      }
    }
    cands.sort((a, b) => (b.end - b.start) - (a.end - a.start) || b.chars - a.chars || a.p - b.p);
    const used = new Array(dt.length).fill(false);
    const picked = [];
    for (const cd of cands) {
      if (cd.p === 99 && prio.length) continue;
      let free = true;
      for (let k = cd.start; k < cd.end; k++) if (used[k]) { free = false; break; }
      if (!free) continue;
      for (let k = cd.start; k < cd.end; k++) used[k] = true;
      picked.push(cd);
    }
    picked.sort((a, b) => a.start - b.start);
    const rest = dt.filter((t, i) => !used[i] && t.length >= 5 && !STOP.has(t));
    // dieselbe Komponente nicht doppelt aufführen
    const gesehen = new Set();
    const gefunden = picked.map(p => p.c).filter(c => !gesehen.has(c.id) && gesehen.add(c.id));
    return { gefunden, rest };
  }

  // ---- Mengen aus den Referenzdaten ----
  function garFactorOf(method, rules) {
    return method === 'schmoren' ? rules.garverlustSchmoren : method === 'garzuwachs' ? rules.garzuwachs : method === 'keiner' ? 1 : rules.garverlustStandard;
  }
  const GAR_LABEL = { standard: 'Standard', schmoren: 'Schmoren', garzuwachs: 'Garzuwachs', keiner: 'kein Faktor' };
  function fmtMenge(g, unit) {
    const big = unit === 'ml' ? 'l' : 'kg';
    if (g >= 1000) return (Math.round(g / 10) / 100).toString().replace('.', ',') + ' ' + big;
    return Math.round(g) + ' ' + unit;
  }
  const num = n => (Math.round(n * 100) / 100).toString().replace('.', ',');

  // Gramm pro Person für eine Komponente je nach Rolle und Gerichts-Kategorie (null = keine feste Referenz)
  function proPerson(rolle, catId, rules) {
    const haupt = catId === 'hauptgang';
    if (rolle === 'H' && haupt) return { g: rules.hauptteilGramm, label: 'Hauptteil', unit: 'g' };
    if (rolle === 'S' && (haupt || catId === 'sosse')) return { g: rules.sosseGramm != null ? rules.sosseGramm : 80, label: 'Soße', unit: 'ml', ohneGar: true };
    const beilage = haupt || catId === 'beilage-saettigung' || catId === 'beilage-gemuese';
    if (rolle === 'B' && beilage) return { g: rules.saettigungGramm, label: 'Sättigungsbeilage', unit: 'g' };
    if (rolle === 'G' && beilage) return { g: rules.gemueseGramm, label: 'Gemüse', unit: 'g' };
    return null;
  }

  // Rezept aus der Rezepte-Datenbank für eine Komponente (falls vorhanden): Zutaten auf die Menge skalieren
  function rezeptZutaten(comp, grams, P, share, recipes, findRecipe, unitToGrams) {
    const recipe = findRecipe(comp.name, recipes);
    if (!recipe) return null;
    let scale = null;
    if (recipe.referenceUnit.type === 'portionen') scale = (P * share) / recipe.referenceUnit.value;
    else if (recipe.referenceUnit.type === 'menge') { const ref = unitToGrams(recipe.referenceUnit.unit, recipe.referenceUnit.value); if (ref && grams) scale = grams / ref; }
    if (scale == null) return { zutaten: [], steps: recipe.steps || '', temp: recipe.temp || '' };
    return {
      zutaten: recipe.ingredients.map(i => ({ name: i.name, amount: Math.round(i.amount * scale * 100) / 100, unit: i.unit })),
      steps: recipe.steps || '', temp: recipe.temp || '',
    };
  }

  // Hauptfunktion: Komponentenliste mit Menge + To-Dos für ein Gericht des Angebots
  function fuerGericht(dish, ctx) {
    if (!ready) return null;
    const { rules, recipes, findRecipe, unitToGrams } = ctx;
    const catId = dish.category;
    const P = dish.personen || 0;
    const { gefunden, rest } = erkenne(dish.name, catId);
    if (!gefunden.length) return null;
    const gleicheRolle = {};
    gefunden.forEach(c => { gleicheRolle[c.rolle] = (gleicheRolle[c.rolle] || 0) + 1; });
    const liste = gefunden.map(c => {
      const ref = proPerson(c.rolle, catId, rules);
      const override = dish.compGar && dish.compGar[c.id];
      const garMethod = ref && ref.ohneGar ? null : (override || c.gar || (ref ? 'standard' : null));
      const factor = garMethod ? garFactorOf(garMethod, rules) : 1;
      const share = 1 / gleicheRolle[c.rolle];
      let grams = null, formel = '';
      if (ref && P > 0) {
        const roh = P * ref.g * share;
        grams = roh * factor;
        formel = `${P} × ${num(ref.g)} ${ref.unit}${share < 1 ? ' × ' + num(share) : ''}${garMethod && factor !== 1 ? ' × ' + num(factor) + ' (' + GAR_LABEL[garMethod] + ')' : ''}`;
      }
      const rez = grams != null || ref == null ? rezeptZutaten(c, grams, P, share, recipes, findRecipe, unitToGrams) : null;
      return {
        id: c.id, name: c.name, rolle: c.rolle, gruppe: c.gruppe,
        refLabel: ref ? ref.label : '', garMethod, grams, unit: ref ? ref.unit : 'g',
        menge: grams != null ? fmtMenge(grams, ref.unit) : '', formel,
        todo: (c.todo || '').trim(), rezept: rez,
      };
    });
    return { komponenten: liste, rest: [...new Set(rest)].slice(0, 6) };
  }

  return { load, refresh, fuerGericht, erkenne, isReady: () => ready, GAR_LABEL };
})();
