// Startseite "Übersicht": nach der Anmeldung auf einen Blick – anstehende Aufträge (wann, für wen), Details zum Auftrag,
// Küchensheet (Stand der Veranstaltung, Komponenten antippen) und To-Do-Liste (was ist für den Kunden zu tun, wie viel ist erledigt).
// Die beiden großen Bereiche sind dieselben Elemente wie in den Reitern "Küchensheet" und "To-Do": Beim Öffnen der Startseite werden sie hierher
// verschoben, beim Verlassen zurück – so bleiben alle Funktionen (Farben, Labels, Häkchen, Garmethode) identisch. Läuft nach app.js.
const Start = (function () {
  const K = KarteiLogik;
  const $ = id => document.getElementById(id);
  const esc = s => escHtml(s);
  const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const kurz = iso => `${WT[new Date(iso + 'T12:00:00Z').getUTCDay()]} ${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
  let verschoben = false, timer = null;

  function onTab(tab) { if (tab === 'start') aktivieren(); else deaktivieren(); }
  function aktivieren() {
    if (!verschoben) {
      $('startKuecheHost').appendChild($('kuecheOutput'));
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
  function renderStrip() {
    const a = auftraege();
    const box = $('startStrip');
    const heute = K.heuteIso();
    const karte = (x, undatiert) => {
      const ev = x.ev || x, aktiv = draftEvent && draftEvent.id === ev.id;
      const f = Planung.fortschrittGesamt(ev);
      return `<button type="button" class="start-auftrag ${aktiv ? 'on' : ''} ${!undatiert && x.erster === heute ? 'heute' : ''}" data-ev="${esc(ev.id)}">
        <span class="sa-datum">${undatiert ? 'ohne Datum' : (x.erster === heute ? 'Heute' : kurz(x.erster)) + (x.isos.length > 1 ? ' …' : '')}</span>
        <strong>${esc(ev.name || 'Unbenannt')}</strong>
        <span class="hint">${ev.personen ? ev.personen + ' Gäste' : ''}${ev.modus === 'abend' ? ' · Abend' : ''}</span>
        ${fortschrittBalken(f)}</button>`;
    };
    box.innerHTML = a.mit.length || a.ohne.length
      ? a.mit.slice(0, 16).map(x => karte(x)).join('') + a.ohne.map(ev => karte(ev, true)).join('')
      : '<div class="hint" style="padding:6px">Keine anstehenden Aufträge. Bestätigte Angebote erscheinen hier automatisch; bis dahin kannst du Angebote im Reiter „Angebot“ einlesen.</div>';
    $('startAnz').textContent = a.mit.length ? `${a.mit.length} anstehende Aufträge` : '';
  }

  // ---------- Details ----------
  function details() {
    const box = $('startDetails'); const ev = draftEvent;
    if (!ev || !ev.days || !ev.days.length) { box.innerHTML = '<h2>Details zum Angebot</h2><p class="hint">Wähle oben einen Auftrag aus.</p>'; return; }
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
  // To-Do-Fortschritt aus der angezeigten Liste
  function fortschritt() {
    const t = $('todoOutput'); if (!t) return;
    const gesamt = t.querySelectorAll('.todo-item').length, fertig = t.querySelectorAll('.todo-item.checked').length;
    const text = gesamt ? `${fertig} von ${gesamt}` : '–';
    const el = $('sdTodoFort'); if (el) el.textContent = text;
    const h = $('startTodoFort');
    if (h) h.innerHTML = gesamt ? `<span class="pl-bar" style="width:90px"><span style="width:${Math.round(100 * fertig / gesamt)}%"></span></span> ${text} erledigt` : '';
  }

  function render() {
    if (!state || $('tab-start') === null) return;
    renderStrip(); details();
    $('startTodoTitel').textContent = draftEvent && draftEvent.name ? 'To-Do: ' + draftEvent.name : 'To-Do';
    $('startKuecheHint').textContent = '';
  }

  function aktualisierenSoon() { clearTimeout(timer); timer = setTimeout(() => { if (verschoben && state) { details(); renderStrip(); } }, 120); }

  function init() {
    $('startStrip').addEventListener('click', e => { const b = e.target.closest('.start-auftrag'); if (b) waehle(b.dataset.ev); });
    $('tab-start').addEventListener('click', e => {
      const g = e.target.closest('[data-start-goto],[data-goto]');
      if (g) switchTab(g.dataset.startGoto || g.dataset.goto);   // das Küchensheet hat keinen eigenen Reiter-Knopf
    });
    // Anzeige aktualisieren, wenn Küchensheet/To-Do neu gezeichnet werden oder ein To-Do abgehakt wird
    const mo = new MutationObserver(aktualisierenSoon);
    mo.observe($('kuecheOutput'), { childList: true }); mo.observe($('todoOutput'), { childList: true });
    $('todoOutput').addEventListener('change', () => setTimeout(fortschritt, 0));
    $('eventSelect').addEventListener('change', () => { if (verschoben) { render(); } });
  }
  init();
  return { onTab, aktivieren, render };
})();
