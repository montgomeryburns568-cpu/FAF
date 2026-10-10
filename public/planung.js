// Planung: Sammelimport mehrerer Angebote und automatisch erzeugte Tages- und Wochenpläne über alle Aufträge.
// Läuft nach app.js und nutzt dessen Globals (state, API, computeEvent, aggregateIngredients, parseDocument ...).
const Planung = (function () {
  const K = KarteiLogik;
  const $ = id => document.getElementById(id);
  const esc = s => escHtml(s);
  const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const WT_LANG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  let ansicht = 'woche';
  let tag = K.heuteIso();

  // ---------- Datum-Helfer ----------
  const wochentag = iso => new Date(iso + 'T12:00:00').getDay();
  function montag(iso) { const w = wochentag(iso); return K.addDays(iso, -((w + 6) % 7)); }
  function kalenderwoche(iso) {
    const d = new Date(iso + 'T12:00:00Z'); const t = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - t);
    const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - y0) / 86400000 + 1) / 7);
  }
  const kurz = iso => `${WT[wochentag(iso)]} ${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
  const num = (n, d = 1) => (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toString().replace('.', ',');
  const fmtMenge = (g, unit) => unit === 'ml' ? (g >= 1000 ? num(g / 1000, 2) + ' l' : Math.round(g) + ' ml') : (g >= 1000 ? num(g / 1000, 2) + ' kg' : Math.round(g) + ' g');

  // ---------- Daten: Aufträge je Datum ----------
  function eintraegeAm(iso) {
    const out = [];
    for (const ev of state.events || []) {
      if (!ev.days || !ev.days.length) continue;
      const tage = ev.days.filter(d => K.parseDatumDE(d.date) === iso);
      if (tage.length) out.push({ ev, tage });
    }
    return out;
  }
  function ohneDatum() {
    return (state.events || []).filter(ev => ev.days && ev.days.length && ev.days.every(d => !K.parseDatumDE(d.date)));
  }
  function compKeys(d) {
    if (d.komponenten && d.komponenten.length) return d.komponenten.map(k => k.id);
    if (d.isPfanne) return d.components.map(c => c.id);
    return ['dish'];
  }
  // Fortschritt eines Auftrags für einen Tag (nach den Farben im Küchensheet): grün/gelb/rot von gesamt
  function fortschritt(ev, computedDay) {
    let gesamt = 0, gruen = 0, gelb = 0, rot = 0;
    computedDay.dishes.forEach(d => compKeys(d).forEach(ck => {
      gesamt++;
      const s = ev.kompStatus && ev.kompStatus[`${computedDay.id}|${d.id}|${ck}`];
      if (s === 'gruen') gruen++; else if (s === 'gelb') gelb++; else if (s === 'rot') rot++;
    }));
    return { gesamt, gruen, gelb, rot };
  }
  const berechne = (() => {   // Berechnung je Auftrag kurz zwischenspeichern (Wochenansicht ruft sie mehrfach ab)
    let cache = new Map(), sig = '';
    return ev => {
      const s = JSON.stringify([state.rules, state.recipes.length, state.vorrat && state.vorrat.length]);
      if (s !== sig) { cache = new Map(); sig = s; }
      const k = ev.id + '|' + JSON.stringify(ev.days) + (ev.modus || '') + (ev.brotStufe || '');
      if (!cache.has(k)) cache.set(k, computeEvent(ev, state.recipes, state.rules));
      return cache.get(k);
    };
  })();

  function fortschrittHTML(f) {
    if (!f.gesamt) return '';
    const pct = Math.round(100 * f.gruen / f.gesamt);
    return `<span class="pl-fort" title="${f.gruen} erledigt · ${f.gelb} angefangen · ${f.rot} ohne Material von ${f.gesamt} Komponenten"><span class="pl-bar"><span style="width:${pct}%"></span></span> ${f.gruen}/${f.gesamt}${f.rot ? ' <span class="prod-rot-text">🔴' + f.rot + '</span>' : ''}</span>`;
  }
  function notizKurz(ev) { return (ev.notiz || '').replace(/^Anlass:[^·]*·\s*/, '').slice(0, 110); }
  function oeffnenKnopf(ev) { return `<button type="button" class="btn-ghost small-btn pl-open" data-ev="${esc(ev.id)}">Küchensheet öffnen</button>`; }

  // ---------- Tagesplan ----------
  function tagesplanHTML(iso) {
    const eintraege = eintraegeAm(iso);
    if (!eintraege.length) return `<p class="hint">Für ${kurz(iso)} sind keine Aufträge geplant.</p>`;
    const comps = new Map(), gerichte = [], kunden = [];
    const pseudo = { days: [] };
    let gaeste = 0;
    eintraege.forEach(({ ev, tage }) => {
      const c = berechne(ev);
      tage.forEach(td => {
        const cd = c.days.find(x => x.id === td.id); if (!cd) return;
        const personen = td.personen || ev.personen || Math.max(0, ...cd.dishes.map(d => d.personen || 0));
        gaeste += personen || 0;
        kunden.push({ ev, cd, personen, f: fortschritt(ev, cd) });
        pseudo.days.push(cd);
        cd.dishes.forEach(d => {
          if (d.komponenten && d.komponenten.length) d.komponenten.forEach(k => {
            const key = k.id + '|' + k.unit;
            const e = comps.get(key) || { name: k.name, rolle: k.rolle, unit: k.unit, grams: 0, hatMenge: false, todo: '', quellen: [] };
            if (k.grams != null) { e.grams += k.grams; e.hatMenge = true; }
            if (!e.todo && k.todo) e.todo = k.todo;
            e.quellen.push({ kunde: ev.name, gericht: d.name, menge: k.menge });
            comps.set(key, e);
          });
          else gerichte.push({ kunde: ev.name, name: d.name, personen: d.personen, label: d.totalLabel || '', steps: d.steps || '' });
        });
      });
    });
    const rollenLabel = { H: 'Haupt', S: 'Soße', B: 'Beilage', G: 'Gemüse' };
    const compList = Array.from(comps.values()).sort((a, b) => 'HBGS'.indexOf(a.rolle) - 'HBGS'.indexOf(b.rolle) || a.name.localeCompare(b.name, 'de'));
    const zutaten = aggregateIngredients(pseudo);
    let h = `<div class="pl-summe"><strong>${eintraege.length}</strong> ${eintraege.length === 1 ? 'Auftrag' : 'Aufträge'} · <strong>${gaeste}</strong> Gäste gesamt</div>`;
    h += `<h3>Aufträge</h3><div class="table-scroll"><table class="analytics-table"><thead><tr><th>Kunde</th><th>Gäste</th><th>Hinweise</th><th>Stand</th><th></th></tr></thead><tbody>`
      + kunden.map(k => `<tr><td><strong>${esc(k.ev.name)}</strong>${k.cd.modus === 'abend' ? ' <span class="badge">Abend/Privat</span>' : ''}</td><td>${k.personen || '–'}</td><td class="hint">${esc(notizKurz(k.ev))}</td><td>${fortschrittHTML(k.f)}</td><td>${oeffnenKnopf(k.ev)}</td></tr>`).join('') + `</tbody></table></div>`;
    h += `<h3>Zu produzieren (alle Aufträge zusammen)</h3>`;
    if (compList.length) {
      h += `<div class="pl-comps">` + compList.map(c => `<details class="pl-comp"><summary><span class="pl-rolle rolle-${c.rolle}"></span><strong>${esc(c.name)}</strong> <span class="pl-menge">${c.hatMenge ? fmtMenge(c.grams, c.unit) : ''}</span>
        <span class="hint">${c.quellen.length > 1 ? c.quellen.length + ' Aufträge' : esc(c.quellen[0].kunde)}${rollenLabel[c.rolle] ? ' · ' + rollenLabel[c.rolle] : ''}</span></summary>
        <ul class="pl-quellen">${c.quellen.map(q => `<li>${esc(q.kunde)}: ${esc(q.gericht)}${q.menge ? ' – <strong>' + esc(q.menge) + '</strong>' : ''}</li>`).join('')}</ul>
        ${c.todo ? `<div class="todo-steps">${esc(c.todo)}</div>` : ''}</details>`).join('') + `</div>`;
    }
    if (gerichte.length) {
      h += `<h4 class="prod-cat">Weitere Gerichte (ohne erkannte Komponenten)</h4><ul>${gerichte.map(g => `<li><strong>${esc(g.name)}</strong> – ${esc(g.kunde)}, ${g.personen || 0} Pers.${g.label ? ' · ' + esc(g.label) : ''}</li>`).join('')}</ul>`;
    }
    if (!compList.length && !gerichte.length) h += '<p class="hint">Keine Gerichte vorhanden.</p>';
    if (zutaten.length) {
      h += `<details class="pl-zutaten"><summary><strong>Zutaten gesamt für diesen Tag (${zutaten.length})</strong></summary><div class="table-scroll"><table class="analytics-table"><tbody>`
        + zutaten.map(z => `<tr><td>${esc(z.name)}</td><td>${fmtAmount(z.amount)} ${esc(z.unit)}</td></tr>`).join('') + `</tbody></table></div></details>`;
    }
    return h;
  }

  // ---------- Wochenplan ----------
  function wochenplanHTML(mo) {
    let h = '<div class="pl-woche">';
    const pseudo = { days: [] };
    let gesamtAuftraege = 0, gesamtGaeste = 0;
    for (let i = 0; i < 7; i++) {
      const iso = K.addDays(mo, i);
      const eintraege = eintraegeAm(iso);
      let gaeste = 0;
      const heute = iso === K.heuteIso();
      let inner = '';
      eintraege.forEach(({ ev, tage }) => {
        const c = berechne(ev);
        tage.forEach(td => {
          const cd = c.days.find(x => x.id === td.id); if (!cd) return;
          const personen = td.personen || ev.personen || Math.max(0, ...cd.dishes.map(d => d.personen || 0));
          gaeste += personen || 0; gesamtAuftraege++;
          pseudo.days.push(cd);
          const f = fortschritt(ev, cd);
          inner += `<div class="pl-auftrag"><div class="pl-auftrag-kopf"><strong>${esc(ev.name)}</strong> <span class="hint">${personen || '?'} Pers.</span></div>
            <div class="hint">${esc(notizKurz(ev))}</div>
            <div class="pl-gerichte">${cd.dishes.map(d => esc(d.name)).join(' · ')}</div>${fortschrittHTML(f)}</div>`;
        });
      });
      gesamtGaeste += gaeste;
      h += `<div class="pl-tag ${heute ? 'pl-heute' : ''} ${eintraege.length ? '' : 'pl-leer'}">
        <div class="pl-tag-kopf"><button type="button" class="pl-tag-link" data-tag="${iso}">${WT_LANG[wochentag(iso)]} ${iso.slice(8, 10)}.${iso.slice(5, 7)}.</button><span class="hint">${eintraege.length ? gaeste + ' Gäste' : ''}</span></div>
        ${inner || '<div class="hint">–</div>'}</div>`;
    }
    h += '</div>';
    const zutaten = aggregateIngredients(pseudo);
    const sum = `<div class="pl-summe"><strong>${gesamtAuftraege}</strong> Aufträge · <strong>${gesamtGaeste}</strong> Gäste in dieser Woche</div>`;
    const z = zutaten.length ? `<details class="pl-zutaten"><summary><strong>Zutaten gesamt für die Woche (${zutaten.length})</strong></summary><div class="table-scroll"><table class="analytics-table"><tbody>`
      + zutaten.map(x => `<tr><td>${esc(x.name)}</td><td>${fmtAmount(x.amount)} ${esc(x.unit)}</td></tr>`).join('') + `</tbody></table></div></details>` : '';
    return sum + h + z;
  }

  // Fortschritt eines Auftrags über alle Tage (Farben aus dem Küchensheet)
  function fortschrittGesamt(ev) {
    const t = { gesamt: 0, gruen: 0, gelb: 0, rot: 0 };
    try { berechne(ev).days.forEach(d => { const f = fortschritt(ev, d); Object.keys(t).forEach(k => { t[k] += f[k]; }); }); } catch (e) { /* nicht berechenbar */ }
    return t;
  }
  function render() {
    const out = $('planungOutput'); if (!out) return;
    document.querySelectorAll('#planungAnsicht button').forEach(b => b.classList.toggle('active', b.dataset.a === ansicht));
    const mo = montag(tag);
    $('planungLabel').textContent = ansicht === 'woche'
      ? `KW ${kalenderwoche(mo)} · ${mo.slice(8, 10)}.${mo.slice(5, 7)}. – ${K.addDays(mo, 6).slice(8, 10)}.${K.addDays(mo, 6).slice(5, 7)}.${K.addDays(mo, 6).slice(0, 4)}`
      : `${WT_LANG[wochentag(tag)]}, ${K.isoToDE(tag)}`;
    $('planungDatum').value = tag;
    let h = `<h1 class="pl-titel">${ansicht === 'woche' ? 'Wochenplan' : 'Tagesplan'} · ${esc($('planungLabel').textContent)}</h1>`;
    h += ansicht === 'woche' ? wochenplanHTML(mo) : tagesplanHTML(tag);
    const od = ohneDatum();
    if (od.length) h += `<details class="pl-zutaten no-print"><summary>${od.length} Angebote ohne erkennbares Datum (nicht eingeplant)</summary><ul>${od.map(ev => `<li>${esc(ev.name)} ${oeffnenKnopf(ev)}</li>`).join('')}</ul></details>`;
    out.innerHTML = h;
  }

  // ---------- Sammelimport mehrerer Angebote ----------
  async function dateiText(file) {
    const istPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!istPdf) return await file.text();
    const r = await fetch('/api/parse-pdf', { method: 'POST', headers: { 'content-type': 'application/pdf' }, credentials: 'include', body: await file.arrayBuffer() });
    if (r.status === 401) { showLogin(); throw new Error('Nicht angemeldet.'); }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
    return (await r.json()).text;
  }
  async function sammelImport(files) {
    const status = $('fileImportStatus'), box = $('sammelErgebnis');
    const neu = [], uebersprungen = [], leer = [], fehler = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      status.textContent = `📄 ${i + 1}/${files.length}: ${f.name} …`;
      try {
        const text = await dateiText(f);
        const ev = parseDocument(text, f.name);
        delete ev.parseHinweis;
        if (!ev.days.length) { leer.push(f.name); continue; }
        // Kunde: bei Dateien "Angebot <Kunde> - …" aus dem Dateinamen (verlässlicher als der Ansprechpartner im Text)
        ev.name = typeof Kartei !== 'undefined' ? Kartei.kundenName(f, { name: ev.name }) : (ev.name || f.name.replace(/\.[a-z]+$/i, ''));
        if (typeof Kartei !== 'undefined' && Kartei.profilAufEvent(ev)) autoSplitAllDays(ev);
        // schon vorhanden? (gleicher Kunde, gleiches erstes Datum)
        const iso = K.parseDatumDE(ev.days[0].date);
        const key = K.kundenKey(ev.name);
        const dopp = (state.events || []).find(e => e.days && e.days[0] && K.kundenKey(e.name) === key && iso && K.parseDatumDE(e.days[0].date) === iso);
        if (dopp) { uebersprungen.push({ name: ev.name, datum: ev.days[0].date, datei: f.name }); continue; }
        const saved = await API.send('POST', '/api/events', ev);
        state.events.push(saved);
        neu.push({ ev: saved, datei: f.name });
      } catch (err) { fehler.push(`${f.name} (${err.message})`); }
    }
    refreshEventSelect();
    if (typeof Kartei !== 'undefined') Kartei.ladeArchiv().then(() => Kartei.render());
    if (neu.length && typeof Vorrat !== 'undefined') Vorrat.syncAlle();   // Verbrauch der neuen Aufträge im Hintergrund buchen
    status.innerHTML = `✅ ${neu.length} importiert${uebersprungen.length ? ' · ' + uebersprungen.length + ' übersprungen (schon vorhanden)' : ''}${leer.length ? ' · ' + leer.length + ' ohne erkannte Gerichte' : ''}${fehler.length ? ' · ⚠️ ' + fehler.length + ' Fehler' : ''}`;
    status.style.color = '';
    box.style.display = '';
    box.innerHTML = `<h3>Ergebnis</h3><ul class="pl-ergebnis">
      ${neu.map(n => { const ev = n.ev; const g = ev.days.reduce((s, d) => s + d.dishes.length, 0); return `<li>✅ <strong>${esc(ev.name)}</strong> · ${esc(ev.days[0].date || 'ohne Datum')} · ${ev.personen || '?'} Pers. · ${g} Gerichte <span class="hint">(${esc(n.datei)})</span></li>`; }).join('')}
      ${uebersprungen.map(u => `<li>⏭ <strong>${esc(u.name)}</strong> ${esc(u.datum)} – bereits vorhanden <span class="hint">(${esc(u.datei)})</span></li>`).join('')}
      ${leer.map(n => `<li>⚠️ ${esc(n)} – keine Gerichte erkannt</li>`).join('')}
      ${fehler.map(n => `<li>❌ ${esc(n)}</li>`).join('')}</ul>
      ${neu.length ? '<button type="button" class="btn-primary" id="sammelZurPlanung">Zur Planung</button>' : ''}`;
    const b = $('sammelZurPlanung');
    if (b) b.onclick = () => {
      const iso = K.parseDatumDE(neu[0].ev.days[0].date); if (iso) tag = iso;
      ansicht = 'woche'; switchTab('planung'); render();
    };
  }

  function init() {
    $('planungAnsicht').addEventListener('click', e => { const b = e.target.closest('button[data-a]'); if (b) { ansicht = b.dataset.a; render(); } });
    $('planungPrev').addEventListener('click', () => { tag = K.addDays(tag, ansicht === 'woche' ? -7 : -1); render(); });
    $('planungNext').addEventListener('click', () => { tag = K.addDays(tag, ansicht === 'woche' ? 7 : 1); render(); });
    $('planungHeute').addEventListener('click', () => { tag = K.heuteIso(); render(); });
    $('planungDatum').addEventListener('change', e => { if (e.target.value) { tag = e.target.value; render(); } });
    $('planungDruck').addEventListener('click', () => window.print());
    $('planungOutput').addEventListener('click', e => {
      const t = e.target.closest('.pl-tag-link'); if (t) { tag = t.dataset.tag; ansicht = 'tag'; render(); return; }
      const o = e.target.closest('.pl-open'); if (o) {
        const sel = $('eventSelect'); sel.value = o.dataset.ev; sel.dispatchEvent(new Event('change')); switchTab('kuechensheet');
      }
    });
  }
  init();
  return { render, sammelImport, fortschrittGesamt };
})();
