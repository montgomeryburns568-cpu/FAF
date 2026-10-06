// Küchensheet-Produktionsliste: alle Gerichte des Kunden mit Anzahl; die Komponenten (aus dem Speisenkatalog erkannt)
// lassen sich per Touch durchschalten und färben: grau = offen, gelb = angefangen, grün = erledigt, rot = kein Material im Haus.
// Der Stand wird je Angebot gespeichert (draftEvent.kompStatus) und läuft über persistDraftSoon() in den Event-Datensatz.
const Produktion = (function () {
  const REIHENFOLGE = ['', 'gelb', 'gruen', 'rot'];
  const LABEL = { '': 'offen', gelb: 'angefangen', gruen: 'erledigt', rot: 'kein Material im Haus' };
  const ROLLE = { H: 'Hauptkomponente', S: 'Soße', B: 'Beilage', G: 'Gemüse' };
  const esc = s => escHtml(s);
  let model = [];

  const key = (dayId, dishId, compKey) => `${dayId}|${dishId}|${compKey}`;
  const status = k => (draftEvent.kompStatus && draftEvent.kompStatus[k]) || '';

  function komponentenVon(d) {
    if (d.komponenten && d.komponenten.length) return d.komponenten.map(c => ({ key: c.id, name: c.name, rolle: c.rolle, menge: c.menge || '' }));
    if (d.isPfanne) return d.components.map(c => ({ key: c.id, name: c.name || 'Komponente', rolle: { hauptteil: 'H', saettigung: 'B', gemuese: 'G' }[c.role] || 'H', menge: c.totalLabel || '' }));
    return [{ key: 'dish', name: d.name || '(ohne Namen)', rolle: null, menge: '', einzel: true }];
  }

  // Modell aus den berechneten Gerichten aufbauen (einmal je Küchensheet-Aufbau; Antippen rendert nur noch daraus)
  function baue(computed) {
    model = computed.days.map(day => {
      const byCat = {};
      day.dishes.forEach(d => { (byCat[d.category] = byCat[d.category] || []).push(d); });
      return {
        id: day.id, date: day.date, personen: day.personen, modus: day.modus,
        cats: CATEGORIES.filter(c => byCat[c.id] && byCat[c.id].length).map(c => ({
          id: c.id, label: c.label,
          dishes: byCat[c.id].map(d => ({
            id: d.id, name: d.name || '(ohne Namen)', personen: d.personen, label: d.totalLabel || '',
            comps: komponentenVon(d), unklar: (d.komponentenRest || []).join(', '),
            erkannt: !!((d.komponenten && d.komponenten.length) || d.isPfanne),
          })),
        })),
      };
    });
  }

  function zaehle() {
    const z = { gesamt: 0, gelb: 0, gruen: 0, rot: 0, fehlt: [] };
    model.forEach(day => day.cats.forEach(c => c.dishes.forEach(d => d.comps.forEach(k => {
      z.gesamt++;
      const s = status(key(day.id, d.id, k.key));
      if (s) z[s]++;
      if (s === 'rot') z.fehlt.push(`${d.name}${k.einzel ? '' : ' – ' + k.name}`);
    }))));
    return z;
  }

  function chipHTML(dayId, dish, k) {
    const s = status(key(dayId, dish.id, k.key));
    return `<button type="button" class="prod-chip st-${s || 'none'} ${k.rolle ? 'rolle-' + k.rolle : ''}" data-day="${esc(dayId)}" data-dish="${esc(dish.id)}" data-comp="${esc(k.key)}"
      title="${esc((k.rolle ? ROLLE[k.rolle] + ' · ' : '') + LABEL[s])} – Tippen wechselt den Status" aria-label="${esc(k.name)}: ${LABEL[s]}">
      <span class="prod-chip-name">${esc(k.name)}</span>${k.menge ? `<span class="prod-chip-menge">${esc(k.menge)}</span>` : ''}</button>`;
  }

  function html() {
    const z = zaehle();
    let h = `<div class="prod-head no-print-bg">
      <div class="prod-legend"><span class="prod-key st-none">grau: offen</span><span class="prod-key st-gelb">gelb: angefangen</span><span class="prod-key st-gruen">grün: erledigt</span><span class="prod-key st-rot">rot: kein Material im Haus</span></div>
      <div class="prod-summary"><span>${z.gesamt ? `<strong>${z.gruen}</strong> von ${z.gesamt} Komponenten erledigt${z.gelb ? ` · ${z.gelb} angefangen` : ''}${z.rot ? ` · <span class="prod-rot-text">${z.rot} ohne Material</span>` : ''}` : ''}</span>
        ${z.gesamt ? '<button type="button" class="btn-ghost small-btn prod-reset no-print">Alle zurücksetzen</button>' : ''}</div>
      ${z.fehlt.length ? `<div class="prod-fehlt">🔴 <strong>Material fehlt:</strong> ${z.fehlt.map(esc).join(' · ')}</div>` : ''}
      <p class="hint no-print" style="margin:6px 0 0">Komponente antippen: grau → gelb → grün → rot → grau.</p>
    </div>`;
    model.forEach(day => {
      h += `<div class="prod-day"><h3>${esc(day.date || 'Tag')}${day.personen ? ' · ' + day.personen + ' Personen' : ''}${day.modus === 'abend' ? ' · <span class="badge">Abend / Privat</span>' : ''}</h3>`;
      day.cats.forEach(c => {
        h += `<h4 class="prod-cat">${esc(c.label)}</h4>`;
        c.dishes.forEach(d => {
          const st = d.comps.map(k => status(key(day.id, d.id, k.key)));
          const fertig = st.filter(s => s === 'gruen').length;
          const cls = st.length && fertig === st.length ? 'all-done' : st.includes('rot') ? 'has-rot' : st.some(s => s === 'gelb' || s === 'gruen') ? 'in-arbeit' : '';
          h += `<div class="prod-dish ${cls}">
            <div class="prod-dish-head"><span class="prod-dish-name">${esc(d.name)}</span>
              <span class="prod-anzahl">${d.personen || 0} Pers.${d.label ? ' · ' + esc(d.label) : ''}</span>
              ${d.comps.length > 1 ? `<span class="prod-progress">${fertig}/${d.comps.length}</span>` : ''}</div>
            <div class="prod-chips">${d.comps.map(k => chipHTML(day.id, d, k)).join('')}</div>
            ${!d.erkannt && !['brot'].includes(c.id) ? '<div class="prod-unklar">Nicht im Speisenkatalog erkannt – nur als ganzes Gericht abhakbar.</div>' : ''}
          </div>`;
        });
      });
      h += `</div>`;
    });
    return h;
  }

  function neuZeichnen() { const el = document.getElementById('produktionsliste'); if (el) el.innerHTML = html(); }

  function init() {
    const out = document.getElementById('kuecheOutput');
    out.addEventListener('click', e => {
      const chip = e.target.closest('.prod-chip');
      if (chip) {
        const k = key(chip.dataset.day, chip.dataset.dish, chip.dataset.comp);
        draftEvent.kompStatus = draftEvent.kompStatus || {};
        const next = REIHENFOLGE[(REIHENFOLGE.indexOf(status(k)) + 1) % REIHENFOLGE.length];
        if (next) draftEvent.kompStatus[k] = next; else delete draftEvent.kompStatus[k];
        persistDraftSoon();
        neuZeichnen();
        return;
      }
      if (e.target.closest('.prod-reset')) {
        if (!confirm('Alle Farbmarkierungen dieses Angebots zurücksetzen?')) return;
        draftEvent.kompStatus = {};
        persistDraftSoon();
        neuZeichnen();
      }
    });
  }
  init();
  return { baue, html, neuZeichnen };
})();
