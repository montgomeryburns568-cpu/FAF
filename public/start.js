// Startseite "Übersicht": nach der Anmeldung auf einen Blick – anstehende Aufträge (aufklappbare Küchensheets), Details zum Auftrag
// und die To-Do-Liste (zum gewählten Auftrag oder als Wochenansicht aller Aufträge).
// Küchensheet und To-Do sind dieselben Elemente wie in den Reitern "Küchensheet" und "To-Do": Beim Öffnen der Startseite werden sie hierher
// verschoben (das Küchensheet unter den aufgeklappten Auftrag), beim Verlassen zurück – so bleiben alle Funktionen (Farben, Labels, Häkchen,
// Garmethode) identisch. Läuft nach app.js.
const Start = (function () {
  const K = KarteiLogik;
  const $ = id => document.getElementById(id);
  const esc = s => escHtml(s);
  const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const WT_LANG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const kurz = iso => `${WT[new Date(iso + 'T12:00:00Z').getUTCDay()]} ${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
  const lang = iso => `${WT_LANG[new Date(iso + 'T12:00:00Z').getUTCDay()]}, ${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
  const addTage = (iso, n) => { const t = new Date(iso + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  const montagVon = iso => addTage(iso, -((new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7));
  function kalenderwoche(iso) {   // ISO-Kalenderwoche
    const t = new Date(iso + 'T12:00:00Z'); const tag = (t.getUTCDay() + 6) % 7;
    t.setUTCDate(t.getUTCDate() - tag + 3);
    const j = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    return 1 + Math.round(((t - j) / 86400000 - 3 + ((j.getUTCDay() + 6) % 7)) / 7);
  }
  let verschoben = false, timer = null;
  let eingeklappt = false;          // der gewählte Auftrag ist zugeklappt
  let modus = 'auftrag', woche = 0; // To-Do-Ansicht: zum Auftrag oder Wochenansicht (Offset in Wochen)
  const speicherTimer = {};

  function onTab(tab) { if (tab === 'start') aktivieren(); else deaktivieren(); }
  function aktivieren() {
    if (!verschoben) {
      $('startParkplatz').appendChild($('kuecheOutput'));
      $('startTodoHost').appendChild($('todoOutput'));
      verschoben = true;
    }
    if (typeof state !== 'undefined' && state) { autoAuswahl(); render(); }
  }
  function deaktivieren() {
    if (!verschoben) return;
    $('tab-kuechensheet').appendChild($('kuecheOutput'));
    $('tab-todo').appendChild($('todoOutput'));
    verschoben = false;
  }

  // ---------- Aufträge ----------
  function auftraege() {
    const heute = K.heuteIso(), mit = [], ohne = [];
    (state.events || []).forEach(ev => {
      if (!ev.days || !ev.days.length) return;
      const isos = ev.days.map(d => K.parseDatumDE(d.date)).filter(Boolean).sort();
      if (!isos.length) { ohne.push(ev); return; }
      if (isos[isos.length - 1] < heute) return;   // vergangen
      mit.push({ ev, erster: isos.find(i => i >= heute) || isos[0], isos });
    });
    mit.sort((a, b) => a.erster.localeCompare(b.erster) || (a.ev.name || '').localeCompare(b.ev.name || '', 'de'));
    return { mit, ohne };
  }
  function waehle(id) {
    const sel = $('eventSelect'); if (!sel || sel.value === id) return;
    sel.value = id; sel.dispatchEvent(new Event('change'));
  }
  // Ist noch kein (gültiger) Auftrag gewählt, wird der nächste anstehende geöffnet
  function autoAuswahl() {
    const a = auftraege();
    const gewaehlt = draftEvent && state.events.find(e => e.id === draftEvent.id);
    if (gewaehlt && (a.mit.some(x => x.ev.id === gewaehlt.id) || a.ohne.some(e => e.id === gewaehlt.id))) return;
    if (a.mit.length) waehle(a.mit[0].ev.id);
  }

  function fortschrittBalken(f) {
    if (!f || !f.gesamt) return '';
    return `<span class="pl-fort" title="${f.gruen} erledigt · ${f.gelb} angefangen · ${f.rot} ohne Material von ${f.gesamt}"><span class="pl-bar"><span style="width:${Math.round(100 * f.gruen / f.gesamt)}%"></span></span> ${f.gruen}/${f.gesamt}${f.rot ? ' <span class="prod-rot-text">🔴' + f.rot + '</span>' : ''}</span>`;
  }

  // ---------- Küchensheets als aufklappbare Liste ----------
  function renderListe() {
    const a = auftraege(), host = $('startListe'), heute = K.heuteIso();
    const kueche = $('kuecheOutput');
    $('startParkplatz').appendChild(kueche);   // Küchensheet sichern, bevor die Liste neu aufgebaut wird
    const eintrag = (ev, x) => {
      const aktiv = draftEvent && draftEvent.id === ev.id, offen = aktiv && !eingeklappt;
      const datum = x ? (x.erster === heute ? 'Heute' : kurz(x.erster)) + (x.isos.length > 1 ? ' …' : '') : 'ohne Datum';
      return `<div class="start-acc ${aktiv ? 'aktiv' : ''} ${offen ? 'offen' : ''} ${x && x.erster === heute ? 'heute' : ''}" data-ev="${esc(ev.id)}">
        <button type="button" class="start-acc-kopf" aria-expanded="${offen}"><span class="acc-pfeil">▸</span>
          <span class="sa-datum">${datum}</span><strong>${esc(ev.name || 'Unbenannt')}</strong>
          <span class="hint">${ev.personen ? ev.personen + ' Gäste' : ''}${ev.modus === 'abend' ? ' · Abend' : ''}</span>
          <span class="sa-fort">${fortschrittBalken(Planung.fortschrittGesamt(ev))}</span></button>
        <div class="start-acc-body"></div></div>`;
    };
    host.innerHTML = a.mit.length || a.ohne.length
      ? a.mit.map(x => eintrag(x.ev, x)).join('') + a.ohne.map(ev => eintrag(ev, null)).join('')
      : '<div class="hint" style="padding:6px">Keine anstehenden Aufträge. Bestätigte Angebote erscheinen hier automatisch; bis dahin kannst du Angebote im Reiter „Angebot“ einlesen.</div>';
    const body = host.querySelector('.start-acc.offen .start-acc-body');
    if (body) body.appendChild(kueche);
    $('startKuecheHint').textContent = a.mit.length ? `${a.mit.length} anstehende Aufträge` : '';
  }
  // Fortschrittsbalken der Auftragsköpfe auffrischen, ohne die Liste neu aufzubauen (Küchensheet bleibt stehen)
  function aktualisiereBalken() {
    document.querySelectorAll('#startListe .start-acc').forEach(el => {
      const ev = state.events.find(e => e.id === el.dataset.ev); if (!ev) return;
      const f = el.querySelector('.sa-fort'); if (f) f.innerHTML = fortschrittBalken(Planung.fortschrittGesamt(ev));
    });
  }

  // ---------- Details ----------
  function details() {
    const box = $('startDetails'); const ev = draftEvent;
    if (!ev || !ev.days || !ev.days.length) { box.innerHTML = '<h2>Details zum Angebot</h2><p class="hint">Wähle unten einen Auftrag aus.</p>'; return; }
    let gerichte = 0, komp = 0;
    try {
      const c = computeEvent(ev, state.recipes, state.rules);
      c.days.forEach(d => d.dishes.forEach(x => { gerichte++; komp += (x.komponenten && x.komponenten.length) || (x.isPfanne ? x.components.length : 1); }));
    } catch (e) { /* nicht berechenbar */ }
    const f = Planung.fortschrittGesamt(ev);
    const bs = typeof Bestellung !== 'undefined' ? Bestellung.statusFuerEvent(ev) : null;
    const lager = ev.lagerGebucht ? '✓ Vorrat gebucht' : 'Vorrat nicht gebucht';
    const daten = ev.days.map(d => d.date).filter(Boolean);
    box.innerHTML = `<div class="start-head"><h2>${esc(ev.name || 'Unbenannt')}</h2>${ev.modus === 'abend' ? '<span class="badge">Abend / Privat</span>' : '<span class="badge">Mittag / Business</span>'}</div>
      <div class="sd-grid">
        <div><span class="hint">Termin</span><br><b>${esc(daten.join(' · ') || 'ohne Datum')}</b></div>
        <div><span class="hint">Gäste</span><br><b>${ev.personen || '?'}</b></div>
        <div><span class="hint">Gerichte / Komponenten</span><br><b>${gerichte} / ${komp}</b></div>
        <div><span class="hint">Stand Küchensheet</span><br>${f.gesamt ? fortschrittBalken(f) : '<b>–</b>'}</div>
        <div><span class="hint">To-Dos erledigt</span><br><b id="sdTodoFort">–</b></div>
        <div><span class="hint">Einkauf</span><br>${bs ? `<span class="ek-chip ${bs.klasse}">${esc(bs.text)}</span>` : '–'}</div>
      </div>
      ${ev.notiz ? `<p class="sd-notiz">${esc(ev.notiz)}</p>` : ''}
      <div class="hint" style="margin-top:6px">${lager}</div>
      <div class="actions-row" style="margin-top:8px">
        <button type="button" class="btn-ghost small-btn" data-start-goto="angebot">Angebot ansehen/bearbeiten</button>
        <button type="button" class="btn-ghost small-btn" data-start-goto="einkaufsliste">Einkaufsliste</button>
        <button type="button" class="btn-ghost small-btn" data-start-goto="kuechensheet">Küchensheet drucken</button>
        <button type="button" class="btn-ghost small-btn" data-start-goto="todo">To-Do drucken</button>
      </div>`;
    fortschritt();
  }

  // ---------- To-Do: Auftrag oder Woche ----------
  const zaehle = c => ({ gesamt: c ? c.querySelectorAll('.todo-item').length : 0, fertig: c ? c.querySelectorAll('.todo-item.checked').length : 0 });
  function fortschritt() {
    const auftrag = zaehle($('todoOutput'));
    const el = $('sdTodoFort'); if (el) el.textContent = auftrag.gesamt ? `${auftrag.fertig} von ${auftrag.gesamt}` : '–';
    const z = modus === 'woche' ? zaehle($('startWoche')) : auftrag;
    const h = $('startTodoFort');
    if (h) h.innerHTML = z.gesamt ? `<span class="pl-bar" style="width:90px"><span style="width:${Math.round(100 * z.fertig / z.gesamt)}%"></span></span> ${z.fertig} von ${z.gesamt} erledigt` : '';
  }
  // Alle To-Dos der Woche (Mo–So), nach Tag und Auftrag gruppiert; Häkchen gehören zum jeweiligen Auftrag
  function wochenHTML() {
    const von = addTage(montagVon(K.heuteIso()), 7 * woche), bis = addTage(von, 6);
    const tage = {};
    (state.events || []).forEach(ev => (ev.days || []).forEach(d => {
      const iso = K.parseDatumDE(d.date);
      if (iso && iso >= von && iso <= bis) (tage[iso] = tage[iso] || []).push({ ev, dayId: d.id });
    }));
    const isos = Object.keys(tage).sort();
    if (!isos.length) return '<div class="empty-state">Keine Aufträge in dieser Woche.</div>';
    let h = '';
    isos.forEach(iso => {
      h += `<div class="day-output"><h3>${lang(iso)}</h3>`;
      tage[iso].forEach(({ ev, dayId }) => {
        const eff = draftEvent && draftEvent.id === ev.id ? draftEvent : ev;   // das geöffnete Angebot hat den neuesten Stand
        let c; try { c = computeEvent(eff, state.recipes, state.rules); } catch (e) { return; }
        const day = c.days.find(d => d.id === dayId); if (!day) return;
        h += `<div class="woche-auftrag" data-ev="${esc(ev.id)}"><div class="woche-kopf">${esc(ev.name || 'Unbenannt')} <span class="hint">· ${ev.personen ? ev.personen + ' Gäste' : ''}</span></div>${todoGerichteHTML(eff, day)}</div>`;
      });
      h += '</div>';
    });
    return h;
  }
  function renderWoche() {
    const von = addTage(montagVon(K.heuteIso()), 7 * woche), bis = addTage(von, 6);
    $('startWocheTxt').textContent = `KW ${kalenderwoche(von)} · ${von.slice(8, 10)}.${von.slice(5, 7)}.–${bis.slice(8, 10)}.${bis.slice(5, 7)}.`;
    const box = $('startWoche');
    box.innerHTML = wochenHTML();
    box.querySelectorAll('select').forEach(s => { s.disabled = true; });   // Garmethode wird im Auftrag selbst geändert
    fortschritt();
  }
  function setModus(m) {
    modus = m;
    document.querySelectorAll('[data-todo-mode]').forEach(b => b.classList.toggle('on', b.dataset.todoMode === m));
    $('startWochenNav').hidden = m !== 'woche';
    $('startWoche').hidden = m !== 'woche';
    $('todoOutput').hidden = m === 'woche';
    $('startTodoTitel').textContent = m === 'woche' ? 'To-Do der Woche' : (draftEvent && draftEvent.name ? 'To-Do: ' + draftEvent.name : 'To-Do');
    if (m === 'woche') renderWoche(); else fortschritt();
  }
  function speichereEvent(ev) {
    clearTimeout(speicherTimer[ev.id]);
    speicherTimer[ev.id] = setTimeout(() => API.send('PUT', '/api/events/' + ev.id, ev).catch(err => console.error('To-Do speichern fehlgeschlagen:', err)), 500);
  }

  function render() {
    if (!state || $('tab-start') === null) return;
    renderListe(); details();
    setModus(modus);
  }

  function aktualisierenSoon() { clearTimeout(timer); timer = setTimeout(() => { if (verschoben && state) { details(); aktualisiereBalken(); } }, 120); }

  function init() {
    $('startListe').addEventListener('click', e => {
      const kopf = e.target.closest('.start-acc-kopf'); if (!kopf) return;
      const id = kopf.closest('.start-acc').dataset.ev;
      if (draftEvent && draftEvent.id === id) { eingeklappt = !eingeklappt; renderListe(); }
      else { eingeklappt = false; waehle(id); }
    });
    $('tab-start').addEventListener('click', e => {
      const g = e.target.closest('[data-start-goto],[data-goto]');
      if (g) { switchTab(g.dataset.startGoto || g.dataset.goto); return; }   // das Küchensheet hat keinen eigenen Reiter-Knopf
      const m = e.target.closest('[data-todo-mode]'); if (m) { setModus(m.dataset.todoMode); return; }
      const w = e.target.closest('[data-woche]'); if (w) { woche += parseInt(w.dataset.woche, 10); renderWoche(); }
    });
    // Anzeige aktualisieren, wenn Küchensheet/To-Do neu gezeichnet werden oder ein To-Do abgehakt wird
    const mo = new MutationObserver(aktualisierenSoon);
    mo.observe($('kuecheOutput'), { childList: true }); mo.observe($('todoOutput'), { childList: true });
    $('todoOutput').addEventListener('change', () => setTimeout(() => { fortschritt(); }, 0));
    // Häkchen in der Wochenansicht: gehören zum jeweiligen Auftrag
    $('startWoche').addEventListener('change', e => {
      if (!e.target.classList.contains('todo-check')) return;
      const item = e.target.closest('.todo-item'), block = e.target.closest('.woche-auftrag');
      if (!item || !block) return;
      const ev = draftEvent && draftEvent.id === block.dataset.ev ? draftEvent : state.events.find(x => x.id === block.dataset.ev);
      if (!ev) return;
      ev.todoChecks = ev.todoChecks || {};
      ev.todoChecks[item.dataset.checkId] = e.target.checked;
      item.classList.toggle('checked', e.target.checked);
      if (ev === draftEvent) persistDraftSoon(); else speichereEvent(ev);
      fortschritt();
    });
    $('eventSelect').addEventListener('change', () => { if (verschoben) { eingeklappt = false; render(); } });
  }
  init();
  return { onTab, aktivieren, render };
})();
