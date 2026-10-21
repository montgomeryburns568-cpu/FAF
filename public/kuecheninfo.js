// Infobox "Küchen-Info" oben auf der Übersicht: kurzer Freitext für kücheninterne Hinweise (gilt für alle Geräte, wird auf dem Server gespeichert).
const KuecheInfo = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let daten = { text: '', geaendert: null }, bearbeiten = false, geladen = false;
  const zeit = iso => iso ? new Date(iso).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  function render() {
    const box = $('kuecheInfo'); if (!box) return;
    if (bearbeiten) {
      box.innerHTML = `<div class="kinfo-kopf"><strong>📌 Küchen-Info</strong><span class="hint">gilt für alle Geräte</span></div>
        <textarea id="kinfoText" rows="5" maxlength="4000" placeholder="z. B. Lieferung kommt später · Gäste Allergiker beachten · Herd 2 defekt …">${esc(daten.text)}</textarea>
        <div class="actions-row"><button type="button" class="btn-primary small-btn" data-kinfo="speichern">Speichern</button><button type="button" class="btn-ghost small-btn" data-kinfo="abbrechen">Abbrechen</button></div>`;
      const t = $('kinfoText'); t.focus(); t.setSelectionRange(t.value.length, t.value.length);
      return;
    }
    const leer = !daten.text.trim();
    box.innerHTML = `<div class="kinfo-kopf"><strong>📌 Küchen-Info</strong>${daten.geaendert && !leer ? `<span class="hint">zuletzt geändert: ${esc(zeit(daten.geaendert))}</span>` : ''}<button type="button" class="btn-ghost small-btn kinfo-edit" data-kinfo="bearbeiten" title="Info bearbeiten" aria-label="Info bearbeiten">✎</button></div>
      ${leer ? '<p class="hint kinfo-leer">Noch keine Info – mit ✎ eintragen (z. B. Besonderheiten des Tages, Hinweise ans Team).</p>' : `<div class="kinfo-text">${esc(daten.text)}</div>`}`;
  }

  async function laden() {
    if (bearbeiten) return;   // nichts überschreiben, während jemand tippt
    try { const d = await API.get('/api/kuecheninfo'); if (d && typeof d.text === 'string') { daten = d; geladen = true; render(); } } catch (e) { /* offline oder abgemeldet */ }
  }
  async function speichern() {
    const text = ($('kinfoText') || {}).value || '';
    try { daten = await API.send('PUT', '/api/kuecheninfo', { text }); bearbeiten = false; render(); }
    catch (e) { alert('Speichern hat nicht geklappt: ' + e.message); }
  }
  function start() {
    const box = $('kuecheInfo'); if (!box) return;
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-kinfo]'); if (!b) return;
      if (b.dataset.kinfo === 'bearbeiten') { bearbeiten = true; render(); }
      else if (b.dataset.kinfo === 'abbrechen') { bearbeiten = false; render(); }
      else if (b.dataset.kinfo === 'speichern') speichern();
    });
    box.addEventListener('keydown', e => { if (e.key === 'Escape' && bearbeiten) { bearbeiten = false; render(); } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && bearbeiten) speichern(); });
    render();
    laden();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) laden(); });
    setInterval(() => { if (!document.hidden) laden(); }, 60000);
  }

  // ---------- Box je Auftrag (in jedem Küchensheet der Übersicht) ----------
  let editEv = null, editText = '';
  const evInfo = ev => (ev && ev.kuecheInfo) || { text: '', geaendert: null };
  function evHtml(ev) {
    const d = evInfo(ev), id = esc(ev.id);
    if (editEv === ev.id) {
      return `<div class="kinfo-kopf"><strong>📌 Küchen-Info zu diesem Auftrag</strong></div>
        <textarea class="kinfo-ev-text" data-kev="${id}" rows="3" maxlength="2000" placeholder="z. B. Allergiker beachten · Anlieferung früher · Geschirr vom Kunden …">${esc(editText)}</textarea>
        <div class="actions-row"><button type="button" class="btn-primary small-btn" data-kev-act="speichern" data-kev="${id}">Speichern</button><button type="button" class="btn-ghost small-btn" data-kev-act="abbrechen" data-kev="${id}">Abbrechen</button></div>`;
    }
    const leer = !d.text.trim();
    return `<div class="kinfo-kopf"><strong>📌 Küchen-Info</strong>${d.geaendert && !leer ? `<span class="hint">zuletzt geändert: ${esc(zeit(d.geaendert))}</span>` : ''}<button type="button" class="btn-ghost small-btn kinfo-edit" data-kev-act="bearbeiten" data-kev="${id}" title="Info zu diesem Auftrag bearbeiten" aria-label="Info zu diesem Auftrag bearbeiten">✎</button></div>
      ${leer ? '<p class="hint kinfo-leer">Keine Info zu diesem Auftrag – mit ✎ eintragen.</p>' : `<div class="kinfo-text">${esc(d.text)}</div>`}`;
  }
  // alle Auftrags-Boxen an Ort und Stelle auffrischen (ohne die Liste neu aufzubauen); die gerade bearbeitete bleibt unberührt
  function zeichneEv() {
    document.querySelectorAll('[data-kinfo-ev]').forEach(box => {
      const ev = (state.events || []).find(e => e.id === box.dataset.kinfoEv); if (!ev) return;
      if (editEv === ev.id && box.querySelector('textarea')) return;
      box.innerHTML = evHtml(ev);
    });
    document.querySelectorAll('.start-acc[data-ev]').forEach(el => {
      const ev = (state.events || []).find(e => e.id === el.dataset.ev), m = el.querySelector('.sa-info');
      if (ev && m) m.textContent = evInfo(ev).text.trim() ? '📌' : '';
    });
  }
  async function speichereEv(id, text) {
    try {
      const d = await API.send('PUT', '/api/events/' + id + '/kuecheninfo', { text });
      const ev = state.events.find(e => e.id === id); if (ev) ev.kuecheInfo = d;
      if (typeof draftEvent !== 'undefined' && draftEvent && draftEvent.id === id) draftEvent.kuecheInfo = d;
      editEv = null; zeichneEv();
    } catch (e) { alert('Speichern hat nicht geklappt: ' + e.message); }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-kev-act]'); if (!b) return;
    const id = b.dataset.kev, box = b.closest('[data-kinfo-ev]');
    if (b.dataset.kevAct === 'bearbeiten') {
      editEv = id; editText = evInfo((state.events || []).find(x => x.id === id)).text;
      if (box) { box.innerHTML = evHtml({ id, kuecheInfo: { text: editText } }); const t = box.querySelector('textarea'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }
    } else if (b.dataset.kevAct === 'abbrechen') { editEv = null; zeichneEv(); }
    else if (b.dataset.kevAct === 'speichern') speichereEv(id, editText);
  });
  document.addEventListener('input', e => { if (e.target.classList && e.target.classList.contains('kinfo-ev-text')) editText = e.target.value; });
  document.addEventListener('keydown', e => {
    if (!(e.target.classList && e.target.classList.contains('kinfo-ev-text'))) return;
    if (e.key === 'Escape') { editEv = null; zeichneEv(); }
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) speichereEv(e.target.dataset.kev, e.target.value);
  });
  return { start, laden, evHtml, zeichneEv, editiert: () => editEv };
})();
