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
              ${d.comps.length > 1 ? `<span class="prod-progress">${fertig}/${d.comps.length}</span>` : ''}
              <button type="button" class="btn-ghost small-btn prod-label-btn no-print" data-name="${esc(d.name)}" data-date="${esc(day.date || '')}" title="Labels für dieses Gericht drucken">🏷 Label</button></div>
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

  // ---------- Etikettendruck ----------
  // Label: erste 4 Buchstaben des Kunden, Wochentag, Datum - gedruckt über den Browser auf den Standarddrucker dieses PCs.
  const LABEL_KEY = 'ks_label';
  const LABEL_STD = { aktiv: true, breite: 15, hoehe: 10, anzahl: 1 };
  const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  function labelEinst() {
    let o = {};
    try { o = JSON.parse(localStorage.getItem(LABEL_KEY) || '{}'); } catch (e) { /* ohne Speicher: Standard */ }
    return { ...LABEL_STD, ...o };
  }
  function labelEinstSpeichern(o) { try { localStorage.setItem(LABEL_KEY, JSON.stringify(o)); } catch (e) { /* ignorieren */ } }
  function kunde4(name) {
    return String(name || '').replace(/^\s*(frau|herr|dr\.?|prof\.?|familie|fam\.?|firma|fa\.?)\s+/i, '').replace(/[^A-Za-zÄÖÜäöüß]/g, '').slice(0, 4).toUpperCase();
  }
  function labelText(dayDate, kunde) {
    const iso = KarteiLogik.parseDatumDE(dayDate);
    const k = kunde4(kunde);
    if (!iso) return { l1: k, l2: String(dayDate || '').trim().slice(0, 8) };
    const wt = WOCHENTAGE[new Date(iso + 'T12:00:00').getDay()];
    return { l1: `${k} ${wt}`.trim(), l2: `${iso.slice(8, 10)}.${iso.slice(5, 7)}.` };
  }
  function druckeLabels(text, anzahl) {
    const e = labelEinst();
    const n = Math.max(1, Math.min(99, anzahl | 0));
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    const d = f.contentDocument;
    d.open();
    d.write(`<!doctype html><html><head><meta charset="utf-8"><title>Labels</title><style>
      @page { size: ${e.breite}mm ${e.hoehe}mm; margin: 0; }
      html, body { margin: 0; padding: 0; }
      .l { width: ${e.breite}mm; height: ${e.hoehe}mm; box-sizing: border-box; overflow: hidden; page-break-after: always; break-after: page;
           display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
           font-family: Arial, Helvetica, sans-serif; font-weight: 700; line-height: 1.05; white-space: nowrap; color: #000; }
      .l:last-child { page-break-after: auto; break-after: auto; }
    </style></head><body>${Array.from({ length: n }, () => `<div class="l"><div class="a">${esc(text.l1)}</div><div class="b">${esc(text.l2)}</div></div>`).join('')}</body></html>`);
    d.close();
    // Schrift so groß wie möglich, aber innerhalb der Label-Breite
    const mm = f.contentWindow.devicePixelRatio ? 96 / 25.4 : 3.78;
    d.querySelectorAll('.l').forEach(l => {
      let fs = e.hoehe * 0.42;
      const maxW = (e.breite - 1) * mm;
      l.style.fontSize = fs + 'mm';
      for (let i = 0; i < 40 && [...l.children].some(c => c.scrollWidth > maxW); i++) { fs *= 0.95; l.style.fontSize = fs + 'mm'; }
    });
    setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); }, 200);
    setTimeout(() => f.remove(), 120000);
  }
  function labelDialog(titel, dayDate) {
    const e = labelEinst();
    const text = labelText(dayDate, draftEvent.name);
    const ov = document.createElement('div');
    ov.className = 'kmodal-ov';
    ov.innerHTML = `<div class="kmodal" style="max-width:420px">
      <h3>Labels drucken?</h3>
      <p><strong>${esc(titel)}</strong></p>
      <p class="label-vorschau" style="font:700 16px Arial,sans-serif;display:inline-block;border:1px solid var(--border-strong);padding:6px 10px;border-radius:4px;line-height:1.2;text-align:center">${esc(text.l1)}<br>${esc(text.l2)}</p>
      <label>Anzahl Labels<input type="number" id="lblAnz" min="0" max="99" value="${e.anzahl}" style="font-size:20px"></label>
      <div class="actions-row"><button type="button" class="btn-primary" id="lblDruck">Drucken</button><button type="button" class="btn-ghost" id="lblNein">Kein Label</button></div></div>`;
    document.body.appendChild(ov);
    const zu = () => ov.remove();
    const anz = ov.querySelector('#lblAnz');
    anz.focus(); anz.select();
    const los = () => { const n = parseInt(anz.value, 10) || 0; zu(); if (n > 0) { labelEinstSpeichern({ ...labelEinst(), anzahl: n }); druckeLabels(text, n); } };
    ov.querySelector('#lblDruck').onclick = los;
    ov.querySelector('#lblNein').onclick = zu;
    anz.addEventListener('keydown', ev => { if (ev.key === 'Enter') los(); if (ev.key === 'Escape') zu(); });
    ov.addEventListener('mousedown', ev => { if (ev.target === ov) zu(); });
  }
  function initLabelEinstellungen() {
    const el = id => document.getElementById(id);
    if (!el('lblBreite')) return;
    const e = labelEinst();
    el('lblBreite').value = e.breite; el('lblHoehe').value = e.hoehe; el('lblAnzahl').value = e.anzahl; el('lblAktiv').checked = !!e.aktiv;
    const speichern = () => labelEinstSpeichern({
      aktiv: el('lblAktiv').checked, breite: parseFloat(el('lblBreite').value) || LABEL_STD.breite,
      hoehe: parseFloat(el('lblHoehe').value) || LABEL_STD.hoehe, anzahl: Math.max(0, parseInt(el('lblAnzahl').value, 10) || 0),
    });
    ['lblBreite', 'lblHoehe', 'lblAnzahl', 'lblAktiv'].forEach(id => el(id).addEventListener('change', speichern));
    el('lblTest').addEventListener('click', () => { speichern(); druckeLabels(labelText('01.02.2027', 'Testkunde'), 1); });
  }
  function init() {
    initLabelEinstellungen();
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
        if (next === 'gruen' && labelEinst().aktiv) {
          const day = model.find(x => x.id === chip.dataset.day);
          const dish = day && day.cats.flatMap(c => c.dishes).find(x => x.id === chip.dataset.dish);
          const comp = dish && dish.comps.find(x => x.key === chip.dataset.comp);
          labelDialog(comp ? comp.name : 'Komponente', day ? day.date : '');
        }
        return;
      }
      const lb = e.target.closest('.prod-label-btn');
      if (lb) { labelDialog(lb.dataset.name, lb.dataset.date); return; }
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
