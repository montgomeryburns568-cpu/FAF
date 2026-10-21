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
  return { start, laden };
})();
