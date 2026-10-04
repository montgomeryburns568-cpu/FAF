// ---------- Hell/Dunkel-Schalter ----------
(function () {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('ks_theme', next); } catch (e) {}
  });
})();

// ---------- utilities ----------
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function round2(n) { return Math.round(n * 100) / 100; }
function normalize(s) { return (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim(); }
function fmtAmount(n) {
  if (n == null || isNaN(n)) return '?';
  if (Math.abs(n) >= 100) return Math.round(n).toString();
  return (Math.round(n * 100) / 100).toString();
}
function catLabel(id) { const c = CATEGORIES.find(c => c.id === id); return c ? c.label : id; }
function catById(id) { return CATEGORIES.find(c => c.id === id); }

// ---------- persistence (Server-API, lokal gespiegelt in data/*.json) ----------
function saveCurrentEventId(id) { localStorage.setItem('ks_currentEventId', id || ''); }
function getCurrentEventId() { return localStorage.getItem('ks_currentEventId') || null; }

const API = {
  async get(path) {
    const r = await fetch(path, { credentials: 'include' });
    if (r.status === 401) { showLogin(); throw new Error('unauthenticated'); }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
    return r.json();
  },
  async send(method, path, body) {
    const r = await fetch(path, {
      method,
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (r.status === 401) { showLogin(); throw new Error('unauthenticated'); }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
    return r.json();
  },
};

async function loadState() {
  const [recipes, rules, events, archiv, artikelzuordnung] = await Promise.all([
    API.get('/api/recipes'), API.get('/api/rules'), API.get('/api/events'), API.get('/api/archiv'),
    API.get('/api/artikelzuordnung'),
  ]);
  return { recipes, rules, events, archiv, artikelzuordnung, currentEventId: getCurrentEventId() };
}

let state = null;
let draftEvent = null; // event currently being edited in the Angebot tab


// ---------- calculation engine ----------
const NAME_MATCH_STOPWORDS = new Set(['mit', 'und', 'ein', 'eine', 'einer', 'der', 'die', 'das', 'im', 'in', 'auf', 'für', 'vom', 'vor', 'bei', 'als', 'nach', 'aus', 'wahlweise']);
function significantWords(name) {
  return normalize(name).split(/[^a-zäöüß0-9]+/).filter(w => w.length >= 5 && !NAME_MATCH_STOPWORDS.has(w));
}

function findRecipeForDish(name, recipes) {
  const n = normalize(name);
  if (!n) return null;
  let exact = recipes.find(r => normalize(r.name) === n);
  if (exact) return exact;
  let best = null;
  for (const r of recipes) {
    const rn = normalize(r.name);
    if (n.includes(rn) || rn.includes(n)) {
      if (!best || rn.length > normalize(best.name).length) best = r;
    }
  }
  if (best) return best;
  // Fuzzy-Fallback: reale Angebote formulieren Gerichte oft anders als die Rezeptdatenbank
  // ("Gemischte Blattsalate, verschiedenen bunten Toppings" statt "... mit 5 Toppings und
  // Dressing"). Reicht ein Großteil der markanten Rezept-Wörter im Gerichtsnamen vor, gilt
  // das als Treffer.
  const dishWords = new Set(significantWords(name));
  if (!dishWords.size) return null;
  let bestFuzzy = null, bestScore = 0;
  for (const r of recipes) {
    const recWords = significantWords(r.name);
    if (!recWords.length) continue;
    const shared = recWords.filter(w => dishWords.has(w)).length;
    const score = shared / recWords.length;
    if (score > bestScore) { bestScore = score; bestFuzzy = r; }
  }
  return bestScore >= 0.5 ? bestFuzzy : null;
}

// Findet die Kombination aus Portionsstufen (z.B. große/mittlere/kleine Kokotte), die die
// benötigte Personenzahl am knappsten abdeckt (wenig Verschnitt, wenig Behälter) - z.B.
// 33 Personen -> 1x groß (20P) + 1x mittel (15P) = 35P abgedeckt.
function findKokottenCombo(personen, stufen) {
  const sorted = [...stufen].sort((a, b) => b.personen - a.personen);
  if (personen <= 0 || !sorted.length) return { stufen: sorted, counts: sorted.map(() => 0), covered: 0, excess: 0, totalContainers: 0 };
  let best = null;
  function search(idx, counts, covered) {
    if (idx === sorted.length) {
      if (covered >= personen) {
        const totalContainers = counts.reduce((a, b) => a + b, 0);
        const excess = covered - personen;
        if (!best || excess < best.excess || (excess === best.excess && totalContainers < best.totalContainers)) {
          best = { counts: counts.slice(), covered, excess, totalContainers };
        }
      }
      return;
    }
    const remaining = Math.max(0, personen - covered);
    const maxCount = Math.ceil(remaining / sorted[idx].personen) + 1;
    for (let c = 0; c <= maxCount; c++) {
      counts[idx] = c;
      search(idx + 1, counts, covered + c * sorted[idx].personen);
    }
    counts[idx] = 0;
  }
  search(0, new Array(sorted.length).fill(0), 0);
  return { stufen: sorted, counts: best.counts, covered: best.covered, excess: best.excess, totalContainers: best.totalContainers };
}

function unitToGrams(unit, amount) {
  const u = (unit || '').toLowerCase();
  if (u === 'g' || u === 'ml') return amount;
  if (u === 'kg' || u === 'l') return amount * 1000;
  return null;
}

function defaultGarMethod(catId) {
  if (catId === 'hauptgang' || catId === 'beilage-saettigung' || catId === 'beilage-gemuese') return 'standard';
  return 'keiner';
}


function computePfanneComponent(comp, P, pfannenGramm, recipes, rules) {
  const garFactor = comp.garMethod === 'schmoren' ? rules.garverlustSchmoren
    : comp.garMethod === 'garzuwachs' ? rules.garzuwachs
    : comp.garMethod === 'keiner' ? 1
    : rules.garverlustStandard;
  const neededGrams = P * pfannenGramm * (comp.splitPercent / 100) * garFactor;
  const recipe = findRecipeForDish(comp.name, recipes);
  const result = {
    id: comp.id, name: comp.name, role: comp.role, splitPercent: comp.splitPercent,
    garMethod: comp.garMethod, formula: '', totalLabel: '', ingredients: [], steps: '', temp: '',
    missing: false, missingHint: '',
  };
  if (recipe) {
    let scale = 1;
    if (recipe.referenceUnit.type === 'portionen') {
      scale = (P * (comp.splitPercent / 100)) / recipe.referenceUnit.value;
      result.formula = `(${P}×${pfannenGramm}g×${comp.splitPercent}%) → ${round2(P * (comp.splitPercent / 100))} Portionen ÷ Basis ${recipe.referenceUnit.value}`;
    } else if (recipe.referenceUnit.type === 'menge') {
      const refGrams = unitToGrams(recipe.referenceUnit.unit, recipe.referenceUnit.value);
      scale = refGrams ? neededGrams / refGrams : 1;
      result.formula = `(${P}×${pfannenGramm}g×${comp.splitPercent}%×${garFactor}) = ${Math.round(neededGrams)}g ÷ Basis ${recipe.referenceUnit.value}${recipe.referenceUnit.unit} → ×${round2(scale)}`;
    } else {
      result.formula = 'Komposition (siehe Zutaten)';
    }
    result.ingredients = recipe.ingredients.map(i => ({ name: i.name, amount: round2(i.amount * scale), unit: i.unit }));
    result.steps = recipe.steps;
    result.temp = recipe.temp || '';
    result.totalLabel = recipe.referenceUnit.type === 'menge' ? `${fmtAmount(recipe.referenceUnit.value * scale)}${recipe.referenceUnit.unit}` : `${Math.round(neededGrams)}g`;
  } else {
    result.missing = true;
    result.missingHint = 'Kein Rezept hinterlegt – Formel-Schätzung.';
    result.formula = `(${P}×${pfannenGramm}g×${comp.splitPercent}%×${garFactor})`;
    result.totalLabel = `≈ ${Math.round(neededGrams)}g`;
  }
  return result;
}

// Erweitert die Berechnung um die Komponenten des Speisenkatalogs (Menge + To-Dos je Komponente).
// Rezepte aus der Rezepte-Datenbank werden je Komponente herangezogen (Zutaten + Zubereitung);
// Pfannen, Brot, Fingerfood/Flying und Gerichte mit Portionsstufen (Kokotten) behalten ihre bisherige Berechnung.
function computeDish(dish, recipes, rules) {
  const result = computeDishBase(dish, recipes, rules);
  const recipe = result.recipe ? recipes.find(r => r.id === result.recipe) : null;
  // Nur Pfannen, Brot und Gerichte mit Portionsstufen (Kokotten) behalten ihre eigene Berechnung
  const behalteAlt = result.isPfanne || ['brot', 'pfanne'].includes(dish.category)
    || (recipe && recipe.portionStufen && recipe.portionStufen.length);
  if (!behalteAlt && typeof KatalogTodo !== 'undefined') {
    const k = KatalogTodo.fuerGericht(dish, { rules, recipes, findRecipe: findRecipeForDish, unitToGrams, gesamtGramm: result.gesamtGramm, gesamtFormel: result.gesamtFormel });
    if (k) { result.komponenten = k.komponenten; result.komponentenRest = k.rest; }
  }
  return result;
}
function computeDishBase(dish, recipes, rules) {
  const cat = catById(dish.category) || catById('sonstiges');
  const role = cat.formulaRole;
  const P = dish.personen || 0;
  const garMethod = dish.garMethod || defaultGarMethod(dish.category);
  const garFactor = garMethod === 'schmoren' ? rules.garverlustSchmoren
    : garMethod === 'garzuwachs' ? rules.garzuwachs
    : garMethod === 'keiner' ? 1
    : rules.garverlustStandard;
  const recipe = findRecipeForDish(dish.name, recipes);

  const result = {
    id: dish.id, name: dish.name, category: dish.category, personen: P,
    allergene: dish.allergene || '',
    garMethod, garFactor, recipe: recipe ? recipe.id : null,
    formula: '', totalLabel: '', ingredients: [], steps: '', temp: '', missing: false, missingHint: '',
  };

  if (role === 'pfanne') {
    const pfannenGramm = rules.pfannenGrammProPortion || 350;
    const comps = (dish.pfanneComponents && dish.pfanneComponents.length) ? dish.pfanneComponents : defaultPfanneComponents('2komp', rules, dish.name);
    result.isPfanne = true;
    result.totalLabel = `${P} Portionen à ${pfannenGramm}g`;
    result.components = comps.map(c => computePfanneComponent(c, P, pfannenGramm, recipes, rules));
    result.missing = result.components.some(c => c.missing);
    return result;
  }

  if (role === 'brot') {
    const perBrot = rules.brotProPerson || 10;
    const brote = Math.ceil(P / perBrot);
    result.formula = `⌈${P}÷${perBrot}⌉ = ${brote} Brot(e)`;
    result.totalLabel = `${brote} Brot(e)`;
    result.ingredients = Object.entries(rules.brotSplit || DEFAULT_RULES.brotSplit).map(([n, share]) => ({
      name: n, amount: Math.round(brote * share * 10) / 10, unit: 'Brot',
    }));
    result.steps = recipe ? recipe.steps : '';
    return result;
  }

  if (role === 'fingerfood' || role === 'flying') {
    // "Ich würde gerne mit 4 Fingerfood-Teilen pro Person rechnen" aus dem Angebot hat Vorrang
    const teilePerPerson = dish.teilePerPerson || (role === 'flying' ? rules.flyingTeilePerPerson : rules.fingerfoodTeilePerPerson);
    let totalTeile = P * teilePerPerson;
    if (dish.multiplikator) totalTeile = totalTeile * dish.multiplikator;
    result.gesamtGramm = totalTeile * rules.fingerfoodTeilGramm;
    result.gesamtFormel = `${fmtAmount(totalTeile)} Teile × ${rules.fingerfoodTeilGramm} g`;
    const ffMatch = FINGERFOOD_TEIL_TABLE.find(f => normalize(dish.name).includes(normalize(f.name)) || normalize(f.name).includes(normalize(dish.name)));
    result.formula = `(${P}×${teilePerPerson}) = ${fmtAmount(totalTeile)} Teile`;
    if (ffMatch) {
      const stueck = totalTeile / ffMatch.teil;
      result.formula += ` → ${Math.ceil(stueck)} Stück (à ${ffMatch.teil} Teil)`;
      result.totalLabel = `${Math.ceil(stueck)} Stück`;
    } else {
      const gramm = totalTeile * rules.fingerfoodTeilGramm;
      result.formula += ` (≈ ${Math.round(gramm)}g)`;
      result.totalLabel = `${fmtAmount(totalTeile)} Teile`;
    }
    if (recipe) {
      const scale = recipe.referenceUnit.type === 'portionen' ? (P / recipe.referenceUnit.value) : 1;
      result.ingredients = recipe.ingredients.map(i => ({ name: i.name, amount: round2(i.amount * scale), unit: i.unit }));
      result.steps = recipe.steps; result.temp = recipe.temp || '';
    } else {
      result.missing = true;
      result.missingHint = 'Kein Rezept hinterlegt.';
    }
    return result;
  }

  // vorspeise / dessert / hauptgang / beilage-saettigung / beilage-gemuese / sosse / sonstiges
  const baseGram = cat.baseGram || 0;
  const roleUsesGarFactor = role === 'hauptteil' || role === 'saettigung' || role === 'gemuese';
  const neededGrams = baseGram > 0 ? P * baseGram * (roleUsesGarFactor ? garFactor : 1) : null;
  if (neededGrams != null) { result.gesamtGramm = neededGrams; result.gesamtFormel = `${P} × ${baseGram} g`; }

  if (recipe && recipe.portionStufen && recipe.portionStufen.length && !dish.multiplikator) {
    const combo = findKokottenCombo(P, recipe.portionStufen);
    const parts = combo.stufen.map((s, i) => combo.counts[i] > 0 ? `${combo.counts[i]}× ${s.label} (${s.personen}P)` : null).filter(Boolean);
    result.formula = `${P} Personen → ${parts.join(' + ') || 'keine Stufe nötig'} = ${combo.covered}P abgedeckt`;
    result.totalLabel = parts.join(' + ') || '–';
    const stufenScale = recipe.referenceUnit.value ? combo.covered / recipe.referenceUnit.value : 0;
    result.ingredients = recipe.ingredients.map(i => {
      const ingScale = i.refPersonen ? combo.covered / i.refPersonen : stufenScale;
      return { name: i.name, amount: round2(i.amount * ingScale), unit: i.unit, refPersonen: i.refPersonen || null };
    });
    result.steps = recipe.steps;
    result.temp = recipe.temp || '';
    return result;
  }

  if (recipe) {
    let scale = null;
    if (dish.multiplikator) {
      scale = dish.multiplikator;
      result.formula = `Manuell: ×${dish.multiplikator}`;
    } else if (recipe.referenceUnit.type === 'portionen') {
      scale = P / recipe.referenceUnit.value;
      result.formula = `${P} Portionen ÷ Basis ${recipe.referenceUnit.value} → ×${round2(scale)}`;
    } else if (recipe.referenceUnit.type === 'menge') {
      const refGrams = unitToGrams(recipe.referenceUnit.unit, recipe.referenceUnit.value);
      if (neededGrams != null && refGrams != null) {
        scale = neededGrams / refGrams;
        result.formula = `(${P}×${baseGram}g${roleUsesGarFactor ? '×' + garFactor : ''}) = ${Math.round(neededGrams)}g ÷ Basis ${recipe.referenceUnit.value}${recipe.referenceUnit.unit} → ×${round2(scale)}`;
      } else {
        scale = 1;
        result.formula = `Basismenge (×1) – bitte Faktor manuell prüfen`;
      }
    } else {
      scale = 1;
      result.formula = 'Komposition (siehe Zutaten)';
    }
    // Manche Zutaten (z.B. Toppings/Dressing bei Blattsalaten, eigene Kokottengröße) haben
    // eine eigene Bezugspersonenzahl, die von der Basis-Zutat des Rezepts abweicht.
    result.ingredients = recipe.ingredients.map(i => {
      const ingScale = (!dish.multiplikator && recipe.referenceUnit.type === 'portionen' && i.refPersonen)
        ? P / i.refPersonen : scale;
      return { name: i.name, amount: round2(i.amount * ingScale), unit: i.unit, refPersonen: i.refPersonen || null };
    });
    result.steps = recipe.steps;
    result.temp = recipe.temp || '';
    if (recipe.referenceUnit.type === 'menge') {
      result.totalLabel = `${fmtAmount(recipe.referenceUnit.value * scale)}${recipe.referenceUnit.unit}`;
    } else {
      result.totalLabel = `${P} Portionen`;
    }
  } else {
    result.missing = true;
    if (neededGrams != null) {
      result.formula = `(${P}×${baseGram}g${roleUsesGarFactor ? '×' + garFactor : ''})`;
      result.totalLabel = `≈ ${Math.round(neededGrams)}g`;
      result.missingHint = 'Kein Rezept hinterlegt – Formel-Schätzung.';
    } else {
      result.missingHint = 'Kein Rezept hinterlegt.';
    }
  }
  return result;
}

function computeEvent(event, recipes, rules) {
  return {
    id: event.id, name: event.name, personen: event.personen, notiz: event.notiz,
    days: event.days.map(day => ({
      id: day.id, date: day.date, personen: day.personen,
      dishes: day.dishes.map(d => computeDish(d, recipes, rules)),
    })),
  };
}

// ---------- tab navigation ----------
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tabpanel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
}
// Speisenkatalog: eigene Seite (vom Server, nur mit Anmeldung), läuft im Rahmen und speichert ihren Stand auf dem Server
let katalogLoaded = false;
async function loadKatalog() {
  if (katalogLoaded) return;
  const frame = document.getElementById('katalogFrame');
  try {
    const r = await fetch('/api/speisenkatalog/page', { credentials: 'same-origin' });
    if (!r.ok) throw new Error('Status ' + r.status);
    frame.srcdoc = await r.text();
    katalogLoaded = true;
  } catch (err) {
    frame.srcdoc = '<p style="font-family:sans-serif;padding:20px">Der Speisenkatalog konnte nicht geladen werden (' + String(err.message).replace(/[<&]/g, '') + '). Bitte Seite neu laden.</p>';
  }
}
document.getElementById('tabnav').addEventListener('click', e => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  switchTab(btn.dataset.tab);
  if (btn.dataset.tab === 'einkaufsliste') renderEinkaufsliste();
  if (btn.dataset.tab === 'speisenkatalog') loadKatalog();
  // Änderungen aus dem Speisenkatalog (To-Dos, Namen, Labels) in die To-Do-Liste übernehmen
  if (btn.dataset.tab === 'todo') KatalogTodo.refresh().then(ok => { if (ok) renderTodo(); });
});

// ---------- Angebot tab: editor rendering ----------
function categoryOptions(selected) {
  return CATEGORIES.map(c => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${c.label}</option>`).join('');
}
function garMethodOptions(selected) {
  return Object.entries(GAR_FACTORS).map(([k, v]) => `<option value="${k}" ${k === selected ? 'selected' : ''}>${v.label}</option>`).join('');
}

function renderEventFields() {
  document.getElementById('evName').value = draftEvent.name || '';
  document.getElementById('evPersonen').value = draftEvent.personen || '';
  document.getElementById('evNotiz').value = draftEvent.notiz || '';
}

function renderDaysEditor() {
  const wrap = document.getElementById('daysEditor');
  wrap.innerHTML = '';
  draftEvent.days.forEach(day => {
    const div = document.createElement('div');
    div.className = 'day-block';
    div.dataset.dayId = day.id;
    div.innerHTML = `
      <div class="day-block-header">
        <input type="text" class="day-date" value="${day.date || ''}" placeholder="z.B. 07.09.2026">
        <input type="number" class="day-personen" value="${day.personen ?? ''}" placeholder="Personen (opt.)" min="0" style="width:150px">
        <button type="button" class="btn-ghost small-btn split-btn">Personen neu verteilen</button>
        <span class="spacer"></span>
        <button type="button" class="btn-danger small-btn rm-day">Tag löschen</button>
      </div>
      <div class="dish-rows"></div>
      <button type="button" class="btn-ghost small-btn add-dish">+ Gericht</button>
    `;
    const dishRows = div.querySelector('.dish-rows');
    day.dishes.forEach(dish => dishRows.appendChild(renderDishRow(dish)));
    wrap.appendChild(div);
  });
}

function renderDishRow(dish) {
  const row = document.createElement('div');
  row.className = 'dish-row-wrap';
  row.dataset.dishId = dish.id;
  const main = document.createElement('div');
  main.className = 'dish-row';
  main.innerHTML = `
    <input type="text" class="dish-name" value="${dish.name.replace(/"/g, '&quot;')}" placeholder="Gericht">
    <select class="dish-cat"${dish.kategorieVorher ? ` title="Kategorie vom Speisenkatalog zugeordnet (Angebot: ${catLabel(dish.kategorieVorher)})" style="border-color:var(--accent)"` : ''}>${categoryOptions(dish.category)}</select>
    <input type="number" class="dish-personen" value="${dish.personen ?? ''}" min="0" placeholder="Pers.">
    <button type="button" class="btn-ghost rm small-btn">✕</button>
  `;
  row.appendChild(main);
  if (dish.category === 'pfanne') {
    row.appendChild(renderPfanneEditor(dish));
  }
  return row;
}

function renderPfanneEditor(dish) {
  if (!dish.pfanneComponents || !dish.pfanneComponents.length) {
    dish.pfanneComponents = defaultPfanneComponents('2komp', state.rules, dish.name);
  }
  const wrap = document.createElement('div');
  wrap.className = 'pfanne-editor';
  wrap.innerHTML = `
    <div class="pfanne-toolbar">
      <span class="hint">Komponenten (Anteile sollten 100% ergeben):</span>
      <button type="button" class="btn-ghost small-btn tpl-2komp">Vorlage 2 Komp.</button>
      <button type="button" class="btn-ghost small-btn tpl-3komp">Vorlage 3 Komp.</button>
      <button type="button" class="btn-ghost small-btn add-comp">+ Komponente</button>
    </div>
    <div class="pfanne-comps"></div>
  `;
  const compsEl = wrap.querySelector('.pfanne-comps');
  dish.pfanneComponents.forEach(c => compsEl.appendChild(renderPfanneCompRow(c)));
  return wrap;
}

function renderPfanneCompRow(c) {
  const row = document.createElement('div');
  row.className = 'pfanne-comp-row';
  row.dataset.compId = c.id;
  row.innerHTML = `
    <input type="text" class="comp-name" value="${c.name.replace(/"/g, '&quot;')}" placeholder="z.B. Reis">
    <select class="comp-role">
      <option value="hauptteil" ${c.role === 'hauptteil' ? 'selected' : ''}>Hauptteil</option>
      <option value="saettigung" ${c.role === 'saettigung' ? 'selected' : ''}>Sättigung</option>
      <option value="gemuese" ${c.role === 'gemuese' ? 'selected' : ''}>Gemüse</option>
    </select>
    <input type="number" class="comp-percent" value="${c.splitPercent}" min="0" max="100" style="width:70px"><span class="hint">%</span>
    <select class="comp-gar">${garMethodOptions(c.garMethod)}</select>
    <button type="button" class="btn-ghost rm-comp small-btn">✕</button>
  `;
  return row;
}

function findDay(id) { return draftEvent.days.find(d => d.id === id); }
function findDish(day, id) { return day.dishes.find(d => d.id === id); }

document.getElementById('daysEditor').addEventListener('click', e => {
  const dayEl = e.target.closest('.day-block');
  if (!dayEl) return;
  const day = findDay(dayEl.dataset.dayId);
  if (e.target.classList.contains('rm-day')) {
    draftEvent.days = draftEvent.days.filter(d => d.id !== day.id);
    renderDaysEditor();
  } else if (e.target.classList.contains('add-dish')) {
    day.dishes.push({ id: uid(), name: '', category: 'sonstiges', personen: day.personen || draftEvent.personen || 0 });
    renderDaysEditor();
  } else if (e.target.classList.contains('rm') && e.target.closest('.dish-row')) {
    const dishEl = e.target.closest('.dish-row-wrap');
    day.dishes = day.dishes.filter(d => d.id !== dishEl.dataset.dishId);
    renderDaysEditor();
  } else if (e.target.classList.contains('split-btn')) {
    autoSplitDay(day, day.personen || draftEvent.personen || 0);
    renderDaysEditor();
  } else if (e.target.classList.contains('tpl-2komp') || e.target.classList.contains('tpl-3komp')) {
    const dishEl = e.target.closest('.dish-row-wrap');
    const dish = findDish(day, dishEl.dataset.dishId);
    dish.pfanneComponents = defaultPfanneComponents(e.target.classList.contains('tpl-3komp') ? '3komp' : '2komp', state.rules, dish.name);
    renderDaysEditor();
  } else if (e.target.classList.contains('add-comp')) {
    const dishEl = e.target.closest('.dish-row-wrap');
    const dish = findDish(day, dishEl.dataset.dishId);
    dish.pfanneComponents.push({ id: uid(), name: '', role: 'gemuese', splitPercent: 0, garMethod: 'standard' });
    renderDaysEditor();
  } else if (e.target.classList.contains('rm-comp')) {
    const dishEl = e.target.closest('.dish-row-wrap');
    const dish = findDish(day, dishEl.dataset.dishId);
    const compEl = e.target.closest('.pfanne-comp-row');
    dish.pfanneComponents = dish.pfanneComponents.filter(c => c.id !== compEl.dataset.compId);
    renderDaysEditor();
  }
});
document.getElementById('daysEditor').addEventListener('input', e => {
  const dayEl = e.target.closest('.day-block');
  if (!dayEl) return;
  const day = findDay(dayEl.dataset.dayId);
  if (e.target.classList.contains('day-date')) { day.date = e.target.value; return; }
  if (e.target.classList.contains('day-personen')) { day.personen = e.target.value ? parseInt(e.target.value, 10) : null; return; }
  const dishEl = e.target.closest('.dish-row-wrap');
  if (!dishEl) return;
  const dish = findDish(day, dishEl.dataset.dishId);
  const compEl = e.target.closest('.pfanne-comp-row');
  if (compEl) {
    const comp = dish.pfanneComponents.find(c => c.id === compEl.dataset.compId);
    if (e.target.classList.contains('comp-name')) comp.name = e.target.value;
    else if (e.target.classList.contains('comp-role')) comp.role = e.target.value;
    else if (e.target.classList.contains('comp-percent')) comp.splitPercent = parseFloat(e.target.value) || 0;
    else if (e.target.classList.contains('comp-gar')) comp.garMethod = e.target.value;
    return;
  }
  if (e.target.classList.contains('dish-name')) dish.name = e.target.value;
  else if (e.target.classList.contains('dish-cat')) {
    dish.category = e.target.value;
    if (dish.category === 'pfanne' && (!dish.pfanneComponents || !dish.pfanneComponents.length)) {
      dish.pfanneComponents = defaultPfanneComponents('2komp', state.rules, dish.name);
    }
    renderDaysEditor();
  }
  else if (e.target.classList.contains('dish-personen')) dish.personen = e.target.value ? parseInt(e.target.value, 10) : 0;
});

document.getElementById('addDayBtn').addEventListener('click', () => {
  draftEvent.days.push({ id: uid(), date: '', personen: null, dishes: [] });
  renderDaysEditor();
});

document.getElementById('evName').addEventListener('input', e => draftEvent.name = e.target.value);
document.getElementById('evPersonen').addEventListener('input', e => {
  draftEvent.personen = e.target.value ? parseInt(e.target.value, 10) : null;
  // Wochenpläne enthalten keine Personenzahl: sobald sie eingetragen wird und noch kein
  // Gericht eine Personenzahl hat, wird automatisch auf die Gerichte verteilt.
  const dishes = (draftEvent.days || []).flatMap(d => d.dishes);
  if (draftEvent.personen && dishes.length && dishes.every(d => !d.personen)) {
    autoSplitAllDays(draftEvent);
    renderDaysEditor();
  }
});
document.getElementById('evNotiz').addEventListener('input', e => draftEvent.notiz = e.target.value);

let lastUploadedFilename = '';
document.getElementById('parseBtn').addEventListener('click', () => {
  const text = document.getElementById('angebotText').value;
  if (!text.trim()) return;
  draftEvent = parseDocument(text, lastUploadedFilename);
  const hint = draftEvent.parseHinweis;
  delete draftEvent.parseHinweis;
  renderEventFields();
  renderDaysEditor();
  const statusEl = document.getElementById('fileImportStatus');
  statusEl.textContent = hint ? '⚠️ ' + hint : '';
  statusEl.style.color = hint ? 'var(--danger)' : '';
});
document.getElementById('fileInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  lastUploadedFilename = file.name;
  const statusEl = document.getElementById('fileImportStatus');
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    statusEl.textContent = '📄 PDF wird gelesen …';
    try {
      const buf = await file.arrayBuffer();
      const r = await fetch('/api/parse-pdf', {
        method: 'POST', headers: { 'content-type': 'application/pdf' }, credentials: 'include', body: buf,
      });
      if (r.status === 401) { showLogin(); throw new Error('Nicht angemeldet.'); }
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
      const result = await r.json();
      document.getElementById('angebotText').value = result.text;
      statusEl.textContent = '✅ PDF-Text eingefügt – bitte kurz prüfen, ob alles sauber erkannt wurde.';
    } catch (err) {
      statusEl.textContent = '❌ PDF konnte nicht gelesen werden: ' + err.message;
    }
    return;
  }
  statusEl.textContent = '';
  const reader = new FileReader();
  reader.onload = () => { document.getElementById('angebotText').value = reader.result; };
  reader.readAsText(file, 'utf-8');
});

// ---------- event save / load / delete ----------
function refreshEventSelect() {
  const sel = document.getElementById('eventSelect');
  sel.innerHTML = '<option value="">– Neues Angebot –</option>' +
    state.events.map(e => `<option value="${e.id}">${e.name || 'Unbenannt'}</option>`).join('');
  sel.value = draftEvent && state.events.find(e => e.id === draftEvent.id) ? draftEvent.id : '';
}
document.getElementById('eventSelect').addEventListener('change', e => {
  const id = e.target.value;
  if (!id) { draftEvent = newDraftEvent(); }
  else { draftEvent = JSON.parse(JSON.stringify(state.events.find(ev => ev.id === id))); }
  saveCurrentEventId(draftEvent.id);
  renderEventFields();
  renderDaysEditor();
  renderKueche();
  renderTodo();
});
document.getElementById('deleteEventBtn').addEventListener('click', async () => {
  if (!draftEvent) return;
  const idx = state.events.findIndex(e => e.id === draftEvent.id);
  if (idx === -1) return;
  if (!confirm(`Angebot "${draftEvent.name}" wirklich löschen?`)) return;
  await API.send('DELETE', '/api/events/' + draftEvent.id);
  state.events.splice(idx, 1);
  draftEvent = newDraftEvent();
  saveCurrentEventId(null);
  refreshEventSelect();
  renderEventFields();
  renderDaysEditor();
  renderKueche();
  renderTodo();
});
async function persistEvent() {
  if (!draftEvent.name) { alert('Bitte einen Namen für das Event/Kunden angeben.'); return false; }
  const idx = state.events.findIndex(e => e.id === draftEvent.id);
  const method = idx === -1 ? 'POST' : 'PUT';
  const path = idx === -1 ? '/api/events' : '/api/events/' + draftEvent.id;
  const saved = await API.send(method, path, draftEvent);
  draftEvent = saved;
  if (idx === -1) state.events.push(saved); else state.events[idx] = saved;
  saveCurrentEventId(draftEvent.id);
  refreshEventSelect();
  return true;
}
document.getElementById('saveEventBtn').addEventListener('click', async () => {
  if (await persistEvent()) alert('Event gespeichert.');
});
document.getElementById('generateBtn').addEventListener('click', async () => {
  const rawText = document.getElementById('angebotText').value;
  if ((!draftEvent.days || draftEvent.days.length === 0) && rawText.trim()) {
    const parsed = parseDocument(rawText, lastUploadedFilename);
    draftEvent.name = draftEvent.name || parsed.name;
    draftEvent.personen = draftEvent.personen || parsed.personen;
    draftEvent.notiz = draftEvent.notiz || parsed.notiz;
    draftEvent.days = parsed.days;
    renderEventFields();
    renderDaysEditor();
  }
  if (!draftEvent.days || draftEvent.days.length === 0) {
    alert('Kein Angebot zum Verarbeiten gefunden. Bitte zuerst Text einfügen/PDF hochladen oder manuell Tage/Gerichte anlegen.');
    return;
  }
  if (!(await persistEvent())) return;
  renderKueche();
  renderTodo();
  renderEinkaufsliste();
  switchTab('kuechensheet');
});

// ---------- Küchensheet rendering ----------
function renderKueche() {
  const out = document.getElementById('kuecheOutput');
  if (!draftEvent || draftEvent.days.length === 0) {
    out.innerHTML = '<div class="empty-state">⚠️ Noch kein Angebot verarbeitet.<br>Geh zum Tab <strong>"Angebot"</strong>, füge Text ein / lade eine PDF hoch und klicke auf <strong>"Angebot einlesen"</strong>, bevor du das Küchensheet erzeugst.</div>';
    return;
  }
  const computed = computeEvent(draftEvent, state.recipes, state.rules);
  let html = `<h1>${computed.name}</h1>`;
  if (computed.notiz) html += `<p class="hint">${computed.notiz}</p>`;
  if (computed.personen) html += `<p><strong>Gesamt-Personen:</strong> ${computed.personen}</p>`;

  computed.days.forEach(day => {
    html += `<div class="day-output"><h3>${day.date || 'Tag'}${day.personen ? ' · ' + day.personen + ' Personen' : ''}</h3>`;
    const byCat = {};
    day.dishes.forEach(d => { (byCat[d.category] = byCat[d.category] || []).push(d); });
    CATEGORIES.forEach(cat => {
      const dishes = byCat[cat.id];
      if (!dishes || dishes.length === 0) return;
      html += `<div class="category-output"><h4>${cat.label}</h4>`;
      dishes.forEach(d => { html += renderDishCard(d, day.id); });
      html += `</div>`;
    });
    html += `</div>`;
  });

  const ingredientTotals = aggregateIngredients(computed);
  if (ingredientTotals.length) {
    html += `<h3>Wareneinsatz-Übersicht (aggregiert)</h3><table class="summary-table"><thead><tr><th>Zutat</th><th>Menge</th></tr></thead><tbody>`;
    ingredientTotals.forEach(i => { html += `<tr><td>${i.name}</td><td>${fmtAmount(i.amount)} ${i.unit}</td></tr>`; });
    html += `</tbody></table>`;
  }

  out.innerHTML = html;
}

function renderDishCard(d, dayId) {
  const cat = catById(d.category);
  let html = `<div class="dish-card ${d.missing ? 'missing' : ''}" data-day-id="${dayId}" data-dish-id="${d.id}">`;
  html += `<div class="dish-title"><span>${d.name || '(ohne Namen)'}</span><span>${d.totalLabel || ''}</span></div>`;
  html += `<div class="dish-meta">${d.personen} Personen${d.temp ? ' · ' + d.temp : ''}${d.allergene ? ' · Allergene: ' + d.allergene : ''}</div>`;

  if (d.isPfanne) {
    d.components.forEach(c => { html += renderComponentBlock(c); });
    html += `</div>`;
    return html;
  }

  if (d.formula) html += `<div class="dish-formula">${d.formula}</div>`;
  if (cat.formulaRole === 'hauptteil' || cat.formulaRole === 'saettigung' || cat.formulaRole === 'gemuese') {
    html += `<div class="dish-meta no-print">Garmethode: <select class="gar-select">${garMethodOptions(d.garMethod)}</select>
      Faktor manuell: <input type="number" class="mult-input" step="0.1" placeholder="auto" style="width:70px">
    </div>`;
  }
  if (d.ingredients.length) {
    html += `<ul class="ingredient-list">${d.ingredients.map(i => `<li>${fmtAmount(i.amount)} ${i.unit} ${i.name}${i.refPersonen ? ` <span class="hint">(eigene Bezugsgröße: ${i.refPersonen} Pers.)</span>` : ''}</li>`).join('')}</ul>`;
  }
  if (d.steps) html += `<div class="dish-steps">${d.steps}</div>`;
  if (d.missing) {
    html += `<div class="missing-note no-print">⚠️ ${d.missingHint} <button type="button" class="btn-ghost small-btn quick-add-recipe">Rezept anlegen</button> <button type="button" class="btn-ghost small-btn ai-suggest-recipe">✨ KI-Vorschlag</button></div>`;
  }
  html += `</div>`;
  return html;
}

function renderComponentBlock(c) {
  let html = `<div class="pfanne-comp-output ${c.missing ? 'missing' : ''}" data-comp-id="${c.id}">`;
  html += `<div class="dish-title"><span>${c.name || '(Komponente)'} <span class="hint">(${c.splitPercent}% · ${catLabel(c.role === 'hauptteil' ? 'hauptgang' : c.role === 'saettigung' ? 'beilage-saettigung' : 'beilage-gemuese')})</span></span><span>${c.totalLabel || ''}</span></div>`;
  if (c.formula) html += `<div class="dish-formula">${c.formula}</div>`;
  html += `<div class="dish-meta no-print">Garmethode: <select class="comp-gar-select">${garMethodOptions(c.garMethod)}</select></div>`;
  if (c.ingredients.length) {
    html += `<ul class="ingredient-list">${c.ingredients.map(i => `<li>${fmtAmount(i.amount)} ${i.unit} ${i.name}</li>`).join('')}</ul>`;
  }
  if (c.steps) html += `<div class="dish-steps">${c.steps}</div>`;
  if (c.missing) {
    html += `<div class="missing-note no-print">⚠️ ${c.missingHint} <button type="button" class="btn-ghost small-btn quick-add-recipe-comp">Rezept anlegen</button> <button type="button" class="btn-ghost small-btn ai-suggest-recipe-comp">✨ KI-Vorschlag</button></div>`;
  }
  html += `</div>`;
  return html;
}

function aggregateIngredients(computed) {
  const map = {};
  const addAll = (ingredients) => ingredients.forEach(i => {
    const key = i.name + '||' + i.unit;
    map[key] = (map[key] || 0) + (i.amount || 0);
  });
  computed.days.forEach(day => day.dishes.forEach(d => {
    if (d.isPfanne) d.components.forEach(c => addAll(c.ingredients));
    else addAll(d.ingredients);
  }));
  return Object.entries(map).map(([key, amount]) => {
    const [name, unit] = key.split('||');
    return { name, unit, amount };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- Einkaufsliste (Wareneinsatz -> Selgros-Artikelzuordnung) ----------
// Grobe Umrechnung in eine gemeinsame Basiseinheit, um benötigte Menge und
// Selgros-Packungsgröße vergleichbar zu machen. Nicht-physikalische Rezeptmaße
// (EL, TL, Prise, Portion, ...) lassen sich nicht automatisch umrechnen - dort
// muss die Bestellmenge manuell eingetragen werden.
function toBaseUnit(unit, amount) {
  const u = (unit || '').toLowerCase();
  if (u === 'g' || u === 'ml') return amount;
  if (u === 'kg' || u === 'l' || u === 'L') return amount * 1000;
  if (u === 'stk' || u === 'stück' || u === 'stueck') return amount;
  return null;
}
function computeBestellmenge(neededAmount, neededUnit, packAmount, packUnit) {
  const neededBase = toBaseUnit(neededUnit, neededAmount);
  const packBase = toBaseUnit(packUnit, packAmount);
  if (neededBase == null || packBase == null || !packBase) return null;
  return Math.ceil(neededBase / packBase);
}

// Rezeptzutaten heißen meist generisch ("Zwiebel", "Knoblauch"), während die aus den
// Selgros-Bestell-PDFs importierten Katalogeinträge die vollen Handelsnamen tragen
// ("Gemüsezwiebeln 25kg", "Knoblauch geschält frisch 1kg") - ein exakter Namensabgleich
// trifft daher fast nie. Als Fallback wird deshalb, wie bei der Rezeptzuordnung im
// Küchensheet, über gemeinsame markante Wörter das plausibelste Katalogprodukt gesucht.
function findArtikelForIngredient(ingredientName, artikelzuordnung) {
  const key = normalize(ingredientName);
  if (artikelzuordnung[key]) return { entry: artikelzuordnung[key], confirmed: true };
  const n = key;
  if (!n) return null;
  // Pass 1: eine der beiden Namen steckt komplett im anderen, an einer Wortgrenze beginnend
  // ("Zwiebel" am Wortanfang von "Zwiebeln" erlaubt Mehrzahl-Endungen) - aber NICHT mitten im
  // Wort, sonst würde z.B. "Salz" faelschlich in "geSALZen" gefunden.
  const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startsAtWordBoundary = (needle, haystack) => new RegExp('\\b' + escapeRe(needle)).test(haystack);
  let bestSubstr = null;
  Object.values(artikelzuordnung).forEach(entry => {
    if (!entry.name) return;
    const en = normalize(entry.name);
    if (startsAtWordBoundary(n, en) || startsAtWordBoundary(en, n)) {
      if (!bestSubstr || en.length < normalize(bestSubstr.name).length) bestSubstr = entry;
    }
  });
  if (bestSubstr) return { entry: bestSubstr, confirmed: false };
  // Pass 2: strengerer Fuzzy-Fallback - ALLE markanten Wörter der Zutat müssen im
  // Produktnamen vorkommen (nicht nur ein Teil), um zufällige Treffer über generische
  // Wörter wie "Gemüse" zu vermeiden.
  const words = significantWords(ingredientName);
  if (!words.length) return null;
  let best = null;
  Object.values(artikelzuordnung).forEach(entry => {
    if (!entry.name) return;
    const prodWords = significantWords(entry.name);
    if (!prodWords.length) return;
    if (words.every(w => prodWords.includes(w))) {
      if (!best || entry.name.length < best.name.length) best = entry;
    }
  });
  if (best) return { entry: best, confirmed: false };
  return null;
}

function renderEinkaufsliste() {
  const out = document.getElementById('einkaufslisteOutput');
  document.getElementById('einkaufslisteBestellliste').style.display = 'none';
  document.getElementById('einkaufslisteWarnHint').style.display = 'none';
  if (!draftEvent || !draftEvent.days || draftEvent.days.length === 0) {
    out.innerHTML = '<div class="empty-state">⚠️ Noch kein Angebot verarbeitet. Erzeuge zuerst ein Küchensheet im Tab "Angebot".</div>';
    return;
  }
  const computed = computeEvent(draftEvent, state.recipes, state.rules);
  const totals = aggregateIngredients(computed);
  if (!totals.length) { out.innerHTML = '<p class="hint">Keine Zutaten gefunden.</p>'; return; }

  let html = `<table class="summary-table"><thead><tr>
    <th>Zutat</th><th>Benötigt (aggregiert aus allen Gerichten)</th><th>Selgros Art.-Nr.</th><th>Packung</th><th>Bestellmenge</th><th>Aufnehmen</th>
  </tr></thead><tbody>`;
  totals.forEach(i => {
    const key = normalize(i.name);
    const match = findArtikelForIngredient(i.name, state.artikelzuordnung);
    const z = (match && match.entry) || {};
    const suggested = !!(match && !match.confirmed);
    const autoQty = computeBestellmenge(i.amount, i.unit, z.packAmount, z.packUnit);
    const qty = z.qty != null ? z.qty : autoQty;
    html += `<tr data-key="${key}" data-needed-amount="${i.amount}" data-needed-unit="${i.unit}" class="${suggested ? 'ez-suggested' : ''}">
      <td>${i.name}</td>
      <td>${fmtAmount(i.amount)} ${i.unit}</td>
      <td><input type="text" class="ez-artnr" value="${z.artNr || ''}" placeholder="Art.-Nr.">${suggested ? `<div class="hint">Vorschlag: ${z.name}</div>` : ''}</td>
      <td><input type="number" step="any" class="ez-packamount" value="${z.packAmount ?? ''}" placeholder="Menge" style="width:70px">
          <input type="text" class="ez-packunit" value="${z.packUnit || ''}" placeholder="Einheit" style="width:60px"></td>
      <td><input type="number" step="1" min="0" class="ez-qty" value="${qty ?? ''}" placeholder="?"></td>
      <td style="text-align:center"><input type="checkbox" class="ez-include" ${z.exclude ? '' : 'checked'}></td>
    </tr>`;
  });
  html += `</tbody></table>
  <p class="hint">Orange markierte Zeilen sind automatische Vorschläge (per Wortabgleich aus euren Selgros-Bestellungen) und noch nicht bestätigt. Beim Ändern/Speichern einer Zeile wird die Zuordnung fest für diese Zutat gemerkt.</p>`;
  out.innerHTML = html;
}

async function saveEinkaufslisteRow(row) {
  const key = row.dataset.key;
  const name = row.children[0].textContent;
  const artNr = row.querySelector('.ez-artnr').value.trim();
  const packAmount = parseFloat(row.querySelector('.ez-packamount').value) || null;
  const packUnit = row.querySelector('.ez-packunit').value.trim();
  const qtyVal = row.querySelector('.ez-qty').value;
  const qty = qtyVal ? parseInt(qtyVal, 10) : null;
  const exclude = !row.querySelector('.ez-include').checked;
  state.artikelzuordnung[key] = { name, artNr, packAmount, packUnit, qty, exclude };
  state.artikelzuordnung = await API.send('PUT', '/api/artikelzuordnung', state.artikelzuordnung);
}

document.getElementById('einkaufslisteOutput').addEventListener('change', async (e) => {
  const row = e.target.closest('tr');
  if (!row) return;
  if (e.target.classList.contains('ez-artnr') || e.target.classList.contains('ez-packamount') || e.target.classList.contains('ez-packunit')) {
    const packAmount = parseFloat(row.querySelector('.ez-packamount').value) || null;
    const packUnit = row.querySelector('.ez-packunit').value.trim();
    const autoQty = computeBestellmenge(parseFloat(row.dataset.neededAmount), row.dataset.neededUnit, packAmount, packUnit);
    if (autoQty != null) row.querySelector('.ez-qty').value = autoQty;
  }
  await saveEinkaufslisteRow(row);
});

document.getElementById('fillSelgrosCartBtn').addEventListener('click', () => {
  const rows = Array.from(document.querySelectorAll('#einkaufslisteOutput tr[data-key]'));
  const lines = [];
  rows.forEach(row => {
    const included = row.querySelector('.ez-include').checked;
    const artNr = row.querySelector('.ez-artnr').value.trim();
    const qty = parseInt(row.querySelector('.ez-qty').value, 10);
    const name = row.children[0].textContent;
    if (included && artNr && qty > 0) lines.push(`${artNr};${qty};${name}`);
  });
  document.getElementById('bestelllisteText').value = lines.join('\n');
  document.getElementById('einkaufslisteWarnHint').style.display = 'block';
  document.getElementById('einkaufslisteBestellliste').style.display = lines.length ? 'block' : 'none';
  if (!lines.length) alert('Keine Artikel mit Art.-Nr. und Bestellmenge ausgewählt (Häkchen, Art.-Nr. und Menge > 0 prüfen).');
});

document.getElementById('kuecheOutput').addEventListener('input', e => {
  const card = e.target.closest('.dish-card');
  if (!card) return;
  const day = findDay(card.dataset.dayId);
  const dish = findDish(day, card.dataset.dishId);
  const compBlock = e.target.closest('.pfanne-comp-output');
  if (compBlock && e.target.classList.contains('comp-gar-select')) {
    const comp = dish.pfanneComponents.find(c => c.id === compBlock.dataset.compId);
    comp.garMethod = e.target.value;
  } else if (e.target.classList.contains('gar-select')) dish.garMethod = e.target.value;
  else if (e.target.classList.contains('mult-input')) dish.multiplikator = e.target.value ? parseFloat(e.target.value) : null;
  else return;
  renderKueche();
  renderTodo();
});
document.getElementById('kuecheOutput').addEventListener('click', e => {
  const card = e.target.closest('.dish-card');
  if (!card) return;
  const day = findDay(card.dataset.dayId);
  const dish = findDish(day, card.dataset.dishId);
  if (e.target.classList.contains('quick-add-recipe-comp') || e.target.classList.contains('ai-suggest-recipe-comp')) {
    const compBlock = e.target.closest('.pfanne-comp-output');
    const comp = dish.pfanneComponents.find(c => c.id === compBlock.dataset.compId);
    const catId = comp.role === 'hauptteil' ? 'hauptgang' : comp.role === 'saettigung' ? 'beilage-saettigung' : 'beilage-gemuese';
    switchTab('rezepte');
    clearRecipeForm();
    document.getElementById('rName').value = comp.name;
    document.getElementById('rCategory').value = catId;
    if (e.target.classList.contains('ai-suggest-recipe-comp')) runAiSuggest(comp.name, catId);
  } else if (e.target.classList.contains('quick-add-recipe') || e.target.classList.contains('ai-suggest-recipe')) {
    switchTab('rezepte');
    clearRecipeForm();
    document.getElementById('rName').value = dish.name;
    document.getElementById('rCategory').value = dish.category;
    if (e.target.classList.contains('ai-suggest-recipe')) runAiSuggest(dish.name, dish.category);
  }
});
document.getElementById('printKuecheBtn').addEventListener('click', () => window.print());

// ---------- To-Do rendering ----------
function renderTodo() {
  const out = document.getElementById('todoOutput');
  if (!draftEvent || draftEvent.days.length === 0) {
    out.innerHTML = '<div class="empty-state">⚠️ Noch kein Angebot verarbeitet.<br>Geh zum Tab <strong>"Angebot"</strong>, füge Text ein / lade eine PDF hoch und klicke auf <strong>"Angebot einlesen"</strong>, bevor du das Küchensheet erzeugst.</div>';
    return;
  }
  const computed = computeEvent(draftEvent, state.recipes, state.rules);
  draftEvent.todoChecks = draftEvent.todoChecks || {};
  let html = `<h1>To-Do: ${computed.name}</h1>`;
  computed.days.forEach(day => {
    html += `<div class="day-output"><h3>${day.date || 'Tag'}</h3>`;
    day.dishes.forEach(d => {
      if (d.isPfanne) {
        d.components.forEach(c => {
          const checkId = day.id + '_' + d.id + '_' + c.id;
          const checked = !!draftEvent.todoChecks[checkId];
          html += `<div class="todo-item ${checked ? 'checked' : ''}" data-check-id="${checkId}">
            <input type="checkbox" class="todo-check" ${checked ? 'checked' : ''}>
            <div class="todo-text">
              <span class="todo-formula">${c.formula || ''}</span>
              ${c.totalLabel ? '<strong> ' + c.totalLabel + '</strong>' : ''}
              ${c.name} (${d.name}) ${c.steps ? '– ' + c.steps : ''}
              ${c.missing ? ' <em>(kein Rezept hinterlegt)</em>' : ''}
            </div>
          </div>`;
        });
        return;
      }
      if (d.komponenten && d.komponenten.length) {
        html += renderKomponentenTodo(d, day);
        return;
      }
      const checkId = day.id + '_' + d.id;
      const checked = !!draftEvent.todoChecks[checkId];
      html += `<div class="todo-item ${checked ? 'checked' : ''}" data-check-id="${checkId}">
        <input type="checkbox" class="todo-check" ${checked ? 'checked' : ''}>
        <div class="todo-text">
          <span class="todo-formula">${d.formula || ''}</span>
          ${d.totalLabel ? '<strong> ' + d.totalLabel + '</strong>' : ''}
          ${d.name} ${d.steps ? '– ' + d.steps : ''}
          ${d.missing ? ' <em>(kein Rezept hinterlegt)</em>' : ''}
        </div>
      </div>`;
    });
    html += `</div>`;
  });
  out.innerHTML = html;
}
function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }

// Zutatenmenge lesbar: g -> kg, ml -> l, sinnvoll gerundet
function fmtZutat(i) {
  let a = i.amount, u = i.unit || '';
  if (a == null || isNaN(a)) return i.name;
  if (/^(Prise|Spritzer)$/i.test(u)) return i.name + ' nach Geschmack';
  // Löffelmengen ab ca. 3 Stück als Gramm/Milliliter angeben (1 EL ≈ 15, 1 TL ≈ 5)
  if (/^EL$/i.test(u) && a >= 3) { a *= 15; u = 'g/ml'; }
  else if (/^TL$/i.test(u) && a >= 6) { a *= 5; u = 'g/ml'; }
  if (/^(Stk|Zehe|Zehen|Zweig|Zweige|Blatt|Scheibe|Scheiben|Bund|Pck)$/i.test(u)) a = Math.ceil(a - 0.001);   // Stückzahlen aufrunden
  if (u === 'g' && a >= 1000) { a /= 1000; u = 'kg'; }
  else if (u === 'ml' && a >= 1000) { a /= 1000; u = 'l'; }
  const shown = a >= 100 ? Math.round(a) : a >= 10 ? Math.round(a * 10) / 10 : Math.round(a * 100) / 100;
  return `${String(shown).replace('.', ',')}${u ? ' ' + u : ''} ${i.name}`;
}

// Gericht mit erkannten Speisenkatalog-Komponenten: je Komponente Menge (aus den Referenzdaten) + To-Dos
const KOMP_ROLE_LABEL = { H: 'Hauptkomponente', S: 'Soße', B: 'Beilage', G: 'Gemüse' };
function renderKomponentenTodo(d, day) {
  let html = `<div class="todo-dish"><div class="todo-dish-title"><strong>${escHtml(d.name)}</strong><span class="hint"> · ${d.personen} Personen${['vorspeise', 'dessert', 'sonstiges'].includes(d.category) && d.totalLabel ? ' · ' + escHtml(d.totalLabel) : ''}</span></div>`;
  d.komponenten.forEach(k => {
    const checkId = day.id + '_' + d.id + '_k' + k.id;
    const checked = !!draftEvent.todoChecks[checkId];
    const gar = (k.garMethod && k.menge)
      ?` <select class="todo-comp-gar no-print" data-day="${day.id}" data-dish="${d.id}" data-comp="${k.id}" title="Garmethode für diese Komponente">${garMethodOptions(k.garMethod)}</select>` : '';
    html += `<div class="todo-item todo-komp ${checked ? 'checked' : ''}" data-check-id="${checkId}">
      <input type="checkbox" class="todo-check" ${checked ? 'checked' : ''}>
      <div class="todo-text">
        <div class="todo-komp-head">${k.menge ? '<strong class="todo-menge">' + escHtml(k.menge) + '</strong> ' : ''}<strong>${escHtml(k.name)}</strong> <span class="hint">(${KOMP_ROLE_LABEL[k.rolle] || ''}${k.refLabel ? '' : ''})</span>${gar}</div>
        ${k.formel ? `<div class="todo-formula">${escHtml(k.formel)}</div>` : ''}
        ${k.zutaten && k.zutaten.length ? `<div class="todo-zutaten"><span class="hint">Zutaten${k.menge ? ' für ' + escHtml(k.menge) : ''}:</span> ${k.zutaten.map(i => escHtml(fmtZutat(i))).join(' · ')}</div>` : ''}
        ${k.todo ? `<div class="todo-steps">${escHtml(k.todo)}${k.temp ? ' (' + escHtml(k.temp) + ')' : ''}</div><div class="hint no-print" style="font-size:11px">Quelle: ${escHtml(k.todoQuelle)}</div>`
          : '<div class="todo-steps hint">Noch kein To-Do im Speisenkatalog hinterlegt.</div>'}
      </div>
    </div>`;
  });
  if (d.komponentenRest && d.komponentenRest.length) {
    html += `<div class="hint no-print" style="margin:4px 0 0 28px">Nicht zugeordnet: ${d.komponentenRest.map(escHtml).join(', ')}</div>`;
  }
  return html + `</div>`;
}

let todoSaveTimer = null;
function persistDraftSoon() {
  const idx = state.events.findIndex(ev => ev.id === draftEvent.id);
  if (idx === -1) return;
  state.events[idx] = draftEvent;
  clearTimeout(todoSaveTimer);
  todoSaveTimer = setTimeout(() => {
    API.send('PUT', '/api/events/' + draftEvent.id, draftEvent).catch(err => console.error('To-Do speichern fehlgeschlagen:', err));
  }, 500);
}
document.getElementById('todoOutput').addEventListener('change', e => {
  if (e.target.classList.contains('todo-comp-gar')) {
    const dish = findDish(findDay(e.target.dataset.day), e.target.dataset.dish);
    dish.compGar = dish.compGar || {};
    dish.compGar[e.target.dataset.comp] = e.target.value;
    persistDraftSoon();
    renderTodo();
    return;
  }
  if (!e.target.classList.contains('todo-check')) return;
  const item = e.target.closest('.todo-item');
  const checkId = item.dataset.checkId;
  draftEvent.todoChecks[checkId] = e.target.checked;
  item.classList.toggle('checked', e.target.checked);
  persistDraftSoon();
});
document.getElementById('printTodoBtn').addEventListener('click', () => window.print());

// ---------- Rezepte tab ----------
function refreshCategorySelect() {
  document.getElementById('rCategory').innerHTML = categoryOptions('vorspeise');
}
function renderRecipeList() {
  const q = normalize(document.getElementById('recipeSearch').value);
  const listEl = document.getElementById('recipeList');
  const hideStd = document.getElementById('hideStd') && document.getElementById('hideStd').checked;
  const items = state.recipes.filter(r => (!q || normalize(r.name).includes(q)) && !(hideStd && r.standard));
  listEl.innerHTML = items.map(r => `
    <div class="recipe-item" data-id="${r.id}">
      <span>${r.name}</span>
      <span>${r.standard ? '<span class="tag" title="Standardrezept aus dem Speisenkatalog (Bezugsmenge 200 g/ml) – bitte prüfen">Standard</span> ' : ''}<span class="tag">${catLabel(r.category)}</span></span>
    </div>
  `).join('') || '<p class="hint">Keine Rezepte gefunden.</p>';
}
document.getElementById('recipeSearch').addEventListener('input', renderRecipeList);
document.getElementById('hideStd').addEventListener('change', renderRecipeList);
document.getElementById('stdImportBtn').addEventListener('click', async () => {
  const btn = document.getElementById('stdImportBtn');
  btn.disabled = true;
  try {
    const r = await API.send('POST', '/api/recipes/standard-import');
    state.recipes = r.recipes;
    renderRecipeList();
    alert(r.added ? `${r.added} Standardrezepte ergänzt (Bezugsmenge 200 g/ml, im Rezepte-Tab mit „Standard“ markiert).` : 'Alle Standardrezepte sind bereits vorhanden.');
  } catch (err) { alert('Fehler: ' + err.message); }
  finally { btn.disabled = false; }
});
document.getElementById('recipeList').addEventListener('click', e => {
  const item = e.target.closest('.recipe-item');
  if (!item) return;
  loadRecipeIntoForm(state.recipes.find(r => r.id === item.dataset.id));
});

function stufeRowHTML(s) {
  return `<div class="dish-price-row">
    <input type="text" class="stufe-label" value="${(s?.label || '').replace(/"/g, '&quot;')}" placeholder="z.B. groß">
    <input type="number" class="stufe-personen" value="${s?.personen ?? ''}" min="1" placeholder="Personen">
    <button type="button" class="btn-ghost rm small-btn">✕</button>
  </div>`;
}
function renderStufenRows(stufen) {
  document.getElementById('stufenRows').innerHTML = (stufen && stufen.length ? stufen : []).map(stufeRowHTML).join('');
}
document.getElementById('addStufeBtn').addEventListener('click', () => {
  document.getElementById('stufenRows').insertAdjacentHTML('beforeend', stufeRowHTML({}));
});
document.getElementById('stufenRows').addEventListener('click', e => {
  if (e.target.classList.contains('rm')) e.target.closest('.dish-price-row').remove();
});

function ingredientRowHTML(ing) {
  return `<div class="ingredient-row">
    <input type="text" class="ing-name" value="${(ing?.name || '').replace(/"/g, '&quot;')}" placeholder="Zutat">
    <input type="number" class="ing-amount" value="${ing?.amount ?? ''}" step="any" placeholder="Menge">
    <input type="text" class="ing-unit" value="${ing?.unit || ''}" placeholder="Einheit">
    <input type="number" class="ing-refpersonen" value="${ing?.refPersonen ?? ''}" min="1" placeholder="Bezugspers." title="Nur ausfüllen, wenn diese Zutat eine eigene Bezugspersonenzahl hat (z.B. Toppings bei Blattsalaten: eigene Kokottengröße statt der Salat-Bezugsgröße). Leer = nutzt den Referenz-Wert oben.">
    <button type="button" class="btn-ghost rm small-btn">✕</button>
  </div>`;
}
function renderIngredientRows(ingredients) {
  const wrap = document.getElementById('ingredientRows');
  wrap.innerHTML = (ingredients && ingredients.length ? ingredients : [{}]).map(ingredientRowHTML).join('');
}
document.getElementById('addIngredientBtn').addEventListener('click', () => {
  document.getElementById('ingredientRows').insertAdjacentHTML('beforeend', ingredientRowHTML({}));
});
document.getElementById('ingredientRows').addEventListener('click', e => {
  if (e.target.classList.contains('rm')) e.target.closest('.ingredient-row').remove();
});

let editingRecipeId = null;
function loadRecipeIntoForm(r) {
  editingRecipeId = r.id;
  document.getElementById('recipeFormTitle').textContent = 'Rezept bearbeiten';
  document.getElementById('rName').value = r.name;
  document.getElementById('rCategory').value = r.category;
  document.getElementById('rTemp').value = r.temp || '';
  document.getElementById('rRefType').value = r.referenceUnit.type;
  document.getElementById('rRefValue').value = r.referenceUnit.value ?? '';
  document.getElementById('rRefUnit').value = r.referenceUnit.unit || '';
  document.getElementById('rSteps').value = r.steps || '';
  renderIngredientRows(r.ingredients);
  renderStufenRows(r.portionStufen);
  toggleRefFields();
}
function clearRecipeForm() {
  editingRecipeId = null;
  document.getElementById('recipeFormTitle').textContent = 'Neues Rezept';
  document.getElementById('recipeForm').reset();
  document.getElementById('rCategory').value = 'vorspeise';
  document.getElementById('rRefType').value = 'portionen';
  document.getElementById('aiSuggestStatus').textContent = '';
  renderIngredientRows([]);
  renderStufenRows([]);
  toggleRefFields();
}
function toggleRefFields() {
  const type = document.getElementById('rRefType').value;
  const showValUnit = type !== 'formel';
  document.getElementById('rRefValueWrap').style.display = showValUnit ? '' : 'none';
  document.getElementById('rRefUnitWrap').style.display = (showValUnit && type === 'menge') ? '' : 'none';
}
document.getElementById('rRefType').addEventListener('change', toggleRefFields);
document.getElementById('newRecipeBtn').addEventListener('click', clearRecipeForm);
document.getElementById('clearRecipeFormBtn').addEventListener('click', clearRecipeForm);

async function runAiSuggest(name, categoryId) {
  const statusEl = document.getElementById('aiSuggestStatus');
  const btns = document.querySelectorAll('.ai-suggest-recipe, .ai-suggest-recipe-comp, #aiSuggestBtn');
  btns.forEach(b => b.disabled = true);
  statusEl.textContent = '✨ KI denkt nach …';
  try {
    const suggestion = await API.send('POST', '/api/suggest-recipe', { name, categoryLabel: catLabel(categoryId) });
    document.getElementById('rRefType').value = (suggestion.referenceUnit && suggestion.referenceUnit.type) || 'portionen';
    document.getElementById('rRefValue').value = (suggestion.referenceUnit && suggestion.referenceUnit.value) ?? '';
    document.getElementById('rRefUnit').value = (suggestion.referenceUnit && suggestion.referenceUnit.unit) || '';
    toggleRefFields();
    renderIngredientRows(suggestion.ingredients || []);
    document.getElementById('rSteps').value = suggestion.steps || '';
    document.getElementById('rTemp').value = suggestion.temp || '';
    statusEl.textContent = '✅ KI-Vorschlag eingefügt – bitte prüfen, ggf. anpassen und speichern.';
  } catch (err) {
    statusEl.textContent = '❌ ' + err.message;
  } finally {
    btns.forEach(b => b.disabled = false);
  }
}
document.getElementById('aiSuggestBtn').addEventListener('click', () => {
  const name = document.getElementById('rName').value.trim();
  if (!name) { alert('Bitte zuerst einen Namen eingeben.'); return; }
  runAiSuggest(name, document.getElementById('rCategory').value);
});
document.getElementById('deleteRecipeBtn').addEventListener('click', async () => {
  if (!editingRecipeId) return;
  if (!confirm('Rezept wirklich löschen?')) return;
  await API.send('DELETE', '/api/recipes/' + editingRecipeId);
  state.recipes = state.recipes.filter(r => r.id !== editingRecipeId);
  renderRecipeList();
  clearRecipeForm();
});
document.getElementById('recipeForm').addEventListener('submit', async e => {
  e.preventDefault();
  const ingredients = Array.from(document.querySelectorAll('#ingredientRows .ingredient-row')).map(row => ({
    name: row.querySelector('.ing-name').value.trim(),
    amount: parseFloat(row.querySelector('.ing-amount').value) || 0,
    unit: row.querySelector('.ing-unit').value.trim(),
    refPersonen: row.querySelector('.ing-refpersonen').value ? parseInt(row.querySelector('.ing-refpersonen').value, 10) : null,
  })).filter(i => i.name);
  const portionStufen = Array.from(document.querySelectorAll('#stufenRows .dish-price-row')).map(row => ({
    label: row.querySelector('.stufe-label').value.trim(),
    personen: row.querySelector('.stufe-personen').value ? parseInt(row.querySelector('.stufe-personen').value, 10) : 0,
  })).filter(s => s.label && s.personen > 0);
  const refType = document.getElementById('rRefType').value;
  const draft = {
    id: editingRecipeId || undefined,
    name: document.getElementById('rName').value.trim(),
    category: document.getElementById('rCategory').value,
    temp: document.getElementById('rTemp').value.trim(),
    referenceUnit: {
      type: refType,
      value: refType === 'formel' ? null : (parseFloat(document.getElementById('rRefValue').value) || 0),
      unit: refType === 'menge' ? document.getElementById('rRefUnit').value.trim() : '',
    },
    portionStufen,
    ingredients,
    steps: document.getElementById('rSteps').value.trim(),
  };
  if (!draft.name) { alert('Bitte einen Namen angeben.'); return; }
  const idx = state.recipes.findIndex(r => r.id === editingRecipeId);
  const method = idx === -1 ? 'POST' : 'PUT';
  const path = idx === -1 ? '/api/recipes' : '/api/recipes/' + editingRecipeId;
  const recipe = await API.send(method, path, draft);
  if (idx === -1) state.recipes.push(recipe); else state.recipes[idx] = recipe;
  renderRecipeList();
  loadRecipeIntoForm(recipe);
});

// ---------- Regeln tab ----------
const RULE_FIELDS = [
  { key: 'vorspeiseGramm', label: 'Vorspeise: Gramm pro Person' },
  { key: 'hauptteilGramm', label: 'Hauptgang: Gramm Hauptteil pro Portion' },
  { key: 'saettigungGramm', label: 'Sättigungsbeilage: Gramm pro Portion' },
  { key: 'gemueseGramm', label: 'Gemüsebeilage: Gramm pro Portion' },
  { key: 'sosseGramm', label: 'Soße: ml pro Portion (Hauptgang)' },
  { key: 'garverlustStandard', label: 'Garverlust-Faktor (Standard)' },
  { key: 'garverlustSchmoren', label: 'Garverlust-Faktor (Schmoren/Braten)' },
  { key: 'garzuwachs', label: 'Garzuwachs-Faktor' },
  { key: 'fingerfoodTeilGramm', label: 'Fingerfood: Gramm pro Teil' },
  { key: 'fingerfoodTeilePerPerson', label: 'Fingerfood: Teile pro Person' },
  { key: 'flyingTeilePerPerson', label: 'Flying Empfang: Teile pro Person' },
  { key: 'brotProPerson', label: 'Brot: Personen pro Brot' },
  { key: 'pfannenGrammProPortion', label: 'Pfannengericht: Gramm gesamt pro Portion' },
];
function renderRulesForm() {
  document.getElementById('rulesForm').innerHTML = RULE_FIELDS.map(f => `
    <label>${f.label}<input type="number" step="any" data-rule="${f.key}" value="${state.rules[f.key] != null ? state.rules[f.key] : (DEFAULT_RULES[f.key] != null ? DEFAULT_RULES[f.key] : '')}"></label>
  `).join('');
  syncCategoryBaseGrams();
}
function syncCategoryBaseGrams() {
  catById('vorspeise').baseGram = state.rules.vorspeiseGramm;
  catById('dessert').baseGram = state.rules.vorspeiseGramm;
  catById('hauptgang').baseGram = state.rules.hauptteilGramm;
  catById('beilage-saettigung').baseGram = state.rules.saettigungGramm;
  catById('beilage-gemuese').baseGram = state.rules.gemueseGramm;
  catById('fingerfood').baseGram = state.rules.fingerfoodTeilGramm;
  catById('flying').baseGram = state.rules.fingerfoodTeilGramm;
}
document.getElementById('saveRulesBtn').addEventListener('click', async () => {
  document.querySelectorAll('[data-rule]').forEach(inp => {
    state.rules[inp.dataset.rule] = parseFloat(inp.value) || 0;
  });
  state.rules = await API.send('PUT', '/api/rules', state.rules);
  syncCategoryBaseGrams();
  renderKueche();
  renderTodo();
  alert('Regeln gespeichert.');
});
document.getElementById('resetRulesBtn').addEventListener('click', async () => {
  if (!confirm('Regeln auf Standardwerte zurücksetzen?')) return;
  const fresh = JSON.parse(JSON.stringify(DEFAULT_RULES));
  state.rules = await API.send('PUT', '/api/rules', fresh);
  renderRulesForm();
});

// ---------- Referenz tab ----------
function renderReferenz() {
  const sections = [
    ['Portionen & Grammangaben', REFERENCE_NOTES.portionen],
    ['Garverlust / Garzuwachs / Schälverlust', REFERENCE_NOTES.garverlust],
    ['Pfannen-Kompositionsregeln', REFERENCE_NOTES.pfannen],
    ['Synergie-Muster (Produktionstemperaturen & Resteverwertung)', REFERENCE_NOTES.synergie],
  ];
  document.getElementById('referenzOutput').innerHTML = sections.map(([title, items]) => `
    <div class="ref-section"><h3>${title}</h3><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul></div>
  `).join('');
}

// ---------- Archiv tab ----------
let archivDraft = null;

function dishPriceRowHTML(d) {
  return `<div class="dish-price-row">
    <input type="text" class="ad-dish-name" value="${(d?.name || '').replace(/"/g, '&quot;')}" placeholder="Gericht">
    <input type="number" class="ad-dish-price" value="${d?.price ?? ''}" step="0.01" min="0" placeholder="Preis (€)">
    <button type="button" class="btn-ghost rm small-btn">✕</button>
  </div>`;
}
function renderDishPriceRows(dishes) {
  document.getElementById('adDishRows').innerHTML = (dishes && dishes.length ? dishes : [{}]).map(dishPriceRowHTML).join('');
}
document.getElementById('adAddDishBtn').addEventListener('click', () => {
  document.getElementById('adDishRows').insertAdjacentHTML('beforeend', dishPriceRowHTML({}));
});
document.getElementById('adDishRows').addEventListener('click', e => {
  if (e.target.classList.contains('rm')) e.target.closest('.dish-price-row').remove();
});

document.getElementById('archivFileInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const statusEl = document.getElementById('archivImportStatus');
  statusEl.textContent = '📄 PDF wird gelesen …';
  try {
    const buf = await file.arrayBuffer();
    const r = await fetch('/api/archiv/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/pdf', 'x-filename': encodeURIComponent(file.name) },
      credentials: 'include', body: buf,
    });
    if (r.status === 401) { showLogin(); throw new Error('Nicht angemeldet.'); }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
    const result = await r.json();
    const parsed = parseDocument(result.text, result.filename);
    const dishMap = new Map();
    parsed.days.forEach(day => day.dishes.forEach(d => { if (d.name && !dishMap.has(normalize(d.name))) dishMap.set(normalize(d.name), { name: d.name, price: null }); }));
    archivDraft = {
      filename: result.filename, pathname: result.pathname, rawText: result.text,
      customerName: parsed.name, eventDate: parsed.days[0]?.date || '', personen: parsed.personen,
      dishes: Array.from(dishMap.values()), totalPrice: extractTotalPrice(result.text),
    };
    document.getElementById('adKunde').value = archivDraft.customerName || '';
    document.getElementById('adDatum').value = archivDraft.eventDate || '';
    document.getElementById('adPersonen').value = archivDraft.personen || '';
    document.getElementById('adGesamtpreis').value = archivDraft.totalPrice ?? '';
    renderDishPriceRows(archivDraft.dishes);
    document.getElementById('archivDraftForm').style.display = '';
    statusEl.textContent = '✅ Erkannt – bitte prüfen, Preise ergänzen und speichern.';
  } catch (err) {
    statusEl.textContent = '❌ ' + err.message;
  }
});

document.getElementById('adCancelBtn').addEventListener('click', () => {
  archivDraft = null;
  document.getElementById('archivDraftForm').style.display = 'none';
  document.getElementById('archivFileInput').value = '';
  document.getElementById('archivImportStatus').textContent = '';
});

document.getElementById('adSaveBtn').addEventListener('click', async () => {
  if (!archivDraft) return;
  const dishes = Array.from(document.querySelectorAll('#adDishRows .dish-price-row')).map(row => ({
    name: row.querySelector('.ad-dish-name').value.trim(),
    price: row.querySelector('.ad-dish-price').value ? parseFloat(row.querySelector('.ad-dish-price').value) : null,
  })).filter(d => d.name);
  const entry = {
    filename: archivDraft.filename, pathname: archivDraft.pathname, rawText: archivDraft.rawText,
    customerName: document.getElementById('adKunde').value.trim() || 'Unbekannt',
    eventDate: document.getElementById('adDatum').value.trim(),
    personen: document.getElementById('adPersonen').value ? parseInt(document.getElementById('adPersonen').value, 10) : null,
    totalPrice: document.getElementById('adGesamtpreis').value ? parseFloat(document.getElementById('adGesamtpreis').value) : null,
    dishes,
  };
  const saved = await API.send('POST', '/api/archiv', entry);
  state.archiv.push(saved);
  archivDraft = null;
  document.getElementById('archivDraftForm').style.display = 'none';
  document.getElementById('archivFileInput').value = '';
  document.getElementById('archivImportStatus').textContent = '✅ Im Archiv gespeichert.';
  renderArchivList();
  renderArchivAnalytics();
});

function renderArchivList() {
  const out = document.getElementById('archivList');
  if (!out) return;
  const q = normalize(document.getElementById('archivSearch').value);
  const items = (state.archiv || []).filter(e => {
    if (!q) return true;
    if (normalize(e.customerName || '').includes(q)) return true;
    return (e.dishes || []).some(d => normalize(d.name).includes(q));
  }).sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
  out.innerHTML = items.map(e => `
    <div class="archiv-item" data-id="${e.id}">
      <div class="archiv-item-title"><span>${e.customerName || 'Unbekannt'} ${e.eventDate ? '· ' + e.eventDate : ''}</span><span>${e.totalPrice != null ? e.totalPrice.toFixed(2) + ' €' : ''}</span></div>
      <div class="archiv-item-meta">${e.personen ? e.personen + ' Personen · ' : ''}${(e.dishes || []).length} Gerichte · hochgeladen ${e.uploadedAt ? new Date(e.uploadedAt).toLocaleDateString('de-DE') : ''}</div>
      <div class="archiv-item-dishes">${(e.dishes || []).map(d => d.name + (d.price != null ? ` (${d.price.toFixed(2)}€)` : '')).join(', ')}</div>
      <div class="archiv-item-actions">
        <a class="btn-ghost small-btn" href="/api/archiv/${e.id}/pdf" target="_blank" rel="noopener">PDF ansehen</a>
        <button type="button" class="btn-danger small-btn archiv-delete">Löschen</button>
      </div>
    </div>
  `).join('') || '<p class="hint">Noch keine Angebote im Archiv.</p>';
}
document.getElementById('archivSearch').addEventListener('input', renderArchivList);
document.getElementById('archivList').addEventListener('click', async e => {
  if (!e.target.classList.contains('archiv-delete')) return;
  const item = e.target.closest('.archiv-item');
  const id = item.dataset.id;
  if (!confirm('Diesen Archiv-Eintrag inkl. PDF wirklich löschen?')) return;
  await API.send('DELETE', '/api/archiv/' + id);
  state.archiv = state.archiv.filter(e => e.id !== id);
  renderArchivList();
  renderArchivAnalytics();
});

function renderArchivAnalytics() {
  const out = document.getElementById('archivAnalytics');
  if (!out) return;
  const archiv = state.archiv || [];
  if (!archiv.length) { out.innerHTML = '<p class="hint">Noch keine Daten für eine Auswertung.</p>'; return; }

  const kundenCount = new Map();
  archiv.forEach(e => { const k = e.customerName || 'Unbekannt'; kundenCount.set(k, (kundenCount.get(k) || 0) + 1); });
  const kundenRows = Array.from(kundenCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);

  const dishStats = new Map();
  archiv.forEach(e => (e.dishes || []).forEach(d => {
    const key = normalize(d.name);
    const entry = dishStats.get(key) || { name: d.name, count: 0, priceSum: 0, priceCount: 0 };
    entry.count += 1;
    if (d.price != null) { entry.priceSum += d.price; entry.priceCount += 1; }
    dishStats.set(key, entry);
  }));
  const dishRows = Array.from(dishStats.values()).sort((a, b) => b.count - a.count).slice(0, 20);

  const withPrice = archiv.filter(e => e.totalPrice != null);
  const avgTotal = withPrice.length ? withPrice.reduce((s, e) => s + e.totalPrice, 0) / withPrice.length : null;

  out.innerHTML = `
    <p class="hint">${archiv.length} Angebote im Archiv${avgTotal != null ? ' · Ø Gesamtpreis ' + avgTotal.toFixed(2) + ' €' : ''}</p>
    <h3>Kunden-Häufigkeit</h3>
    <table class="analytics-table"><thead><tr><th>Kunde</th><th>Anzahl Angebote</th></tr></thead><tbody>
      ${kundenRows.map(([name, count]) => `<tr><td>${name}</td><td>${count}</td></tr>`).join('')}
    </tbody></table>
    <h3 style="margin-top:14px">Gerichte-Häufigkeit</h3>
    <table class="analytics-table"><thead><tr><th>Gericht</th><th>Anzahl</th><th>Ø Preis</th></tr></thead><tbody>
      ${dishRows.map(d => `<tr><td>${d.name}</td><td>${d.count}</td><td>${d.priceCount ? (d.priceSum / d.priceCount).toFixed(2) + ' €' : '–'}</td></tr>`).join('')}
    </tbody></table>
  `;
}

// ---------- login gate ----------
function showLogin() {
  document.getElementById('appRoot').style.display = 'none';
  document.getElementById('loginOverlay').style.display = 'flex';
}
function hideLogin() {
  document.getElementById('loginOverlay').style.display = 'none';
  document.getElementById('appRoot').style.display = '';
}
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const pwInput = document.getElementById('loginPassword');
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try {
    const r = await fetch('/api/login', {
      method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ password: pwInput.value }),
    });
    if (!r.ok) { errEl.textContent = (await r.json()).error || 'Login fehlgeschlagen.'; return; }
    pwInput.value = '';
    hideLogin();
    boot();
  } catch (err) {
    errEl.textContent = 'Verbindung fehlgeschlagen.';
  }
});
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST', credentials: 'include' });
  showLogin();
});

// ---------- init ----------
function render() {
  refreshCategorySelect();
  clearRecipeForm();
  renderRecipeList();
  renderRulesForm();
  renderReferenz();

  const savedId = state.currentEventId;
  const saved = savedId ? state.events.find(e => e.id === savedId) : null;
  draftEvent = saved ? JSON.parse(JSON.stringify(saved)) : newDraftEvent();
  refreshEventSelect();
  renderEventFields();
  renderDaysEditor();
  renderKueche();
  renderTodo();
  renderArchivList();
  renderArchivAnalytics();
}
async function boot() {
  try {
    state = await loadState();
    await KatalogTodo.load();   // Speisenkatalog (Komponenten + To-Dos) für die To-Do-Liste
    render();
  } catch (err) {
    console.error(err);
  }
}
(async function start() {
  const me = await fetch('/api/me', { credentials: 'include' }).then(r => r.json());
  if (me.authenticated) { hideLogin(); boot(); } else { showLogin(); }
})();
