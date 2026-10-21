// Angebote aus der Office-App: Hinweis im Angebotsreiter (Herkunft, Verlauf), Entscheidung der Küche bei Änderungen nach der Bestellfrist,
// Nachladen neuer/geänderter Aufträge und Abgleich mit dem Vorrat (Storno, geänderte Mengen).
const OfficeAngebote = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const zeit = iso => iso ? new Date(iso).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  let laeuft = false;

  function render() {
    const box = $('officeHinweis'); if (!box) return;
    const ev = typeof draftEvent !== 'undefined' ? draftEvent : null;
    const offene = (state.events || []).filter(e => e.offeneAenderung).length;
    const tab = document.querySelector('[data-tab="angebot"]');
    if (tab) { let b = tab.querySelector('.office-badge'); if (!b && offene) { b = document.createElement('span'); b.className = 'badge badge-warn office-badge'; tab.appendChild(b); } if (b) { b.textContent = offene || ''; b.hidden = !offene; } }
    if (!ev || !ev.officeEventId) { box.style.display = 'none'; box.innerHTML = ''; return; }
    const o = ev.offeneAenderung;
    const verlauf = (ev.buero || []).slice(-4).reverse().map(x => `<li><span class="hint">${esc(zeit(x.am))}</span> ${esc(x.text)}</li>`).join('');
    box.style.display = '';
    box.innerHTML = `<div class="office-kopf">📨 <strong>Vom Büro bestätigt</strong>${ev.officeOfferId ? ' · Angebot ' + esc(ev.officeOfferId) : ''} · Version ${esc(ev.angebotVersion || 1)}${ev.storniert ? ' · <span class="badge badge-warn">storniert</span>' : ''}</div>
      ${o ? `<div class="office-offen"><strong>⚠ ${o.art === 'storno' ? 'Storno' : 'Änderung'} vom Büro wartet auf deine Bestätigung</strong> <span class="hint">(Version ${esc(o.version)}, eingegangen ${esc(zeit(o.eingegangen))})</span>
        <ul>${(o.zeilen || []).map(z => `<li>${esc(z)}</li>`).join('')}</ul>
        ${o.grund ? `<p class="hint">Grund laut Büro: ${esc(o.grund)}</p>` : ''}
        <p class="hint">Warum nicht automatisch: ${esc((o.gruende || []).join(' · '))}</p>
        <div class="actions-row"><button type="button" class="btn-primary small-btn" data-office="uebernehmen">${o.art === 'storno' ? 'Storno bestätigen' : 'Änderung übernehmen'}</button><button type="button" class="btn-ghost small-btn" data-office="ablehnen">Ablehnen</button></div></div>` : ''}
      ${verlauf ? `<details class="office-verlauf"><summary class="hint">Verlauf</summary><ul>${verlauf}</ul></details>` : ''}`;
  }

  async function entscheiden(art) {
    const ev = draftEvent; if (!ev || !ev.offeneAenderung) return;
    let grund = '';
    if (art === 'ablehnen') { grund = prompt('Grund für die Ablehnung (optional – das Büro kann ihn sehen):', ''); if (grund === null) return; }
    else if (!confirm(ev.offeneAenderung.art === 'storno' ? 'Storno bestätigen? Der Auftrag wird aus Planung und Einkauf genommen.' : 'Änderung übernehmen? Küchensheet, To-Do und Einkaufsliste werden angepasst. Prüfe danach, ob schon Bestelltes ergänzt werden muss.')) return;
    try {
      const neu = await API.send('POST', '/api/events/' + ev.id + '/aenderung', { entscheidung: art, grund });
      const i = state.events.findIndex(e => e.id === neu.id); if (i >= 0) state.events[i] = neu;
      draftEvent = JSON.parse(JSON.stringify(neu));
      uebernehmenInAnsicht();
      await abgleich();
    } catch (e) { alert('Das hat nicht geklappt: ' + e.message); }
  }
  function uebernehmenInAnsicht() {
    refreshEventSelect(); renderEventFields(); renderDaysEditor(); renderKueche(); renderTodo(); if (typeof renderEinkaufsliste === 'function') renderEinkaufsliste();
  }

  // Storno -> aus dem System nehmen (Vorrat freigeben); geänderte Aufträge -> Verbrauch im Vorrat neu verrechnen
  async function abgleich() {
    for (const ev of (state.events || []).slice()) {
      try {
        if (ev.storniert) {
          if (typeof Vorrat !== 'undefined') await Vorrat.freigeben(ev);
          await API.send('DELETE', '/api/events/' + ev.id);
          state.events = state.events.filter(e => e.id !== ev.id);
          if (draftEvent && draftEvent.id === ev.id) { draftEvent = newDraftEvent(); saveCurrentEventId(null); }
          uebernehmenInAnsicht();
        } else if (ev.lagerAbgleich) {
          delete ev.lagerAbgleich;
          if (typeof Vorrat !== 'undefined') await Vorrat.sync(ev);
          await API.send('PUT', '/api/events/' + ev.id, ev);
        }
      } catch (e) { console.error('Büro-Abgleich:', e.message); }
    }
  }

  // Neue oder geänderte Aufträge vom Server holen
  async function aktualisieren() {
    if (laeuft) return; laeuft = true;
    try {
      const serverAlle = await API.get('/api/events');
      const archiviert = serverAlle.filter(e => e.archiviert), server = serverAlle.filter(e => !e.archiviert);
      let geaendert = false, infoNeu = false;
      // anderswo archivierte Aufträge hier ausblenden, anderswo zurückgeholte wieder einblenden
      const archIds = new Set(archiviert.map(e => e.id));
      if (state.events.some(e => archIds.has(e.id))) { state.events = state.events.filter(e => !archIds.has(e.id)); geaendert = true; }
      if (JSON.stringify((state.archivierteEvents || []).map(e => e.id).sort()) !== JSON.stringify(archiviert.map(e => e.id).sort())) { state.archivierteEvents = archiviert; geaendert = true; }
      for (const s of server) {
        const i = state.events.findIndex(e => e.id === s.id);
        if (i < 0) { state.events.push(s); geaendert = true; continue; }
        const l = state.events[i];
        if (((l.kuecheInfo || {}).geaendert || '') !== ((s.kuecheInfo || {}).geaendert || '')) {
          l.kuecheInfo = s.kuecheInfo; infoNeu = true;
          if (typeof draftEvent !== 'undefined' && draftEvent && draftEvent.id === s.id) draftEvent.kuecheInfo = s.kuecheInfo;
        }
        if ((l.angebotVersion || 0) !== (s.angebotVersion || 0) || ((l.offeneAenderung || {}).version || 0) !== ((s.offeneAenderung || {}).version || 0) || !!l.storniert !== !!s.storniert || !!l.lagerAbgleich !== !!s.lagerAbgleich) {
          state.events[i] = s; geaendert = true;
          if (draftEvent && draftEvent.id === s.id) draftEvent = JSON.parse(JSON.stringify(s));
        }
      }
      if (geaendert) uebernehmenInAnsicht(); else render();
      if (infoNeu && typeof KuecheInfo !== 'undefined') KuecheInfo.zeichneEv();
      await abgleich();
    } catch (e) { /* offline oder abgemeldet */ } finally { laeuft = false; }
  }

  function start() {
    document.addEventListener('click', e => { const b = e.target.closest('[data-office]'); if (b) entscheiden(b.dataset.office); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) aktualisieren(); });
    setInterval(() => { if (!document.hidden) aktualisieren(); }, 60000);
    aktualisieren();
  }
  return { render, start, aktualisieren };
})();
