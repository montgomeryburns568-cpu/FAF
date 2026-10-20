// Angebotsreiter: Vorschau des Angebots-PDFs (so, wie der Kunde es liest), neben den Event-Daten.
// Quelle in dieser Reihenfolge: frisch geladenes PDF (noch im Browser) -> am Event gespeichertes PDF -> PDF aus dem Archiv (gleicher Kunde + Datum).
const AngebotVorschau = (() => {
  const $ = id => document.getElementById(id);
  let aktuell = null;      // { url (Blob-URL im Browser), pathname, filename, fuerEventId }
  let gezeigt = '';

  // PDF hochladen: legt es im Blob-Speicher ab (falls vorhanden) und liefert den Text für die Erkennung
  async function laden(file) {
    const buf = await file.arrayBuffer();
    const r = await fetch('/api/archiv/upload', { method: 'POST', headers: { 'content-type': 'application/pdf', 'x-filename': encodeURIComponent(file.name) }, credentials: 'include', body: buf });
    if (r.status === 401) { showLogin(); throw new Error('Nicht angemeldet.'); }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
    const result = await r.json();
    if (aktuell && aktuell.url) URL.revokeObjectURL(aktuell.url);
    aktuell = { url: URL.createObjectURL(new Blob([buf], { type: 'application/pdf' })), pathname: result.pathname || null, filename: result.filename || file.name, fuerEventId: null };
    render();
    return result;
  }
  // beim Speichern/Erkennen: PDF dem Angebot zuordnen
  function anwenden(ev, neuerEntwurf) {
    if (!ev || !aktuell) return;
    if (!neuerEntwurf && aktuell.fuerEventId && aktuell.fuerEventId !== ev.id) return;
    if (aktuell.pathname) { ev.pdfPathname = aktuell.pathname; ev.pdfFilename = aktuell.filename; }
    aktuell.fuerEventId = ev.id;
  }
  // anderes Angebot wird geöffnet: ein noch nicht gespeichertes PDF verwerfen
  function verwerfe() {
    if (aktuell && !aktuell.fuerEventId) { URL.revokeObjectURL(aktuell.url); aktuell = null; }
  }
  function archivTreffer(ev) {
    const K = typeof KarteiLogik !== 'undefined' ? KarteiLogik : null;
    const liste = (state.archiv || []).filter(e => e.pathname);
    let e = liste.find(x => x.eventId === ev.id || x.id === 'ev-' + ev.id);
    if (!e && K && ev.name && ev.days && ev.days[0] && ev.days[0].date) {
      const iso = K.parseDatumDE(ev.days[0].date), key = K.kundenKey(ev.name);
      if (iso) e = liste.find(x => K.kundenKey(x.customerName || '') === key && x.eventDateIso === iso);
    }
    return e ? `/api/archiv/${encodeURIComponent(e.id)}/pdf` : null;
  }
  function quelle() {
    const ev = typeof draftEvent !== 'undefined' ? draftEvent : null;
    if (aktuell && (!aktuell.fuerEventId || (ev && aktuell.fuerEventId === ev.id))) return { url: aktuell.url, name: aktuell.filename };
    if (!ev) return null;
    const gespeichert = (state.events || []).some(e => e.id === ev.id);
    if (ev.pdfPathname && gespeichert) return { url: `/api/events/${encodeURIComponent(ev.id)}/pdf`, name: ev.pdfFilename || '' };
    const a = archivTreffer(ev);
    return a ? { url: a, name: '' } : null;
  }
  function render() {
    const rahmen = $('avFrame'); if (!rahmen) return;
    const q = quelle(), leer = $('avLeer'), link = $('avOeffnen'), name = $('avName'), kopf = $('angebotPdfLink');
    rahmen.hidden = !q; leer.hidden = !!q; link.hidden = !q;
    if (kopf) { kopf.hidden = !q; if (q) kopf.href = q.url; }
    name.textContent = q && q.name ? q.name : '';
    if (!q) { if (gezeigt) { rahmen.removeAttribute('src'); gezeigt = ''; } return; }
    link.href = q.url;
    if (gezeigt !== q.url) { gezeigt = q.url; rahmen.src = q.url + '#toolbar=0&navpanes=0&view=FitH'; }
  }
  return { laden, anwenden, verwerfe, render };
})();
