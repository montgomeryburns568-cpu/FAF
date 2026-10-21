// Regeln -> Büro-Verbindung: Adresse des Büro-Programms eintragen, dauerhaften Verbindungsschlüssel erzeugen und den Text für den
// Geschäftspartner kopieren. Der Schlüssel wird nur einmal angezeigt (gespeichert ist nur sein Hash).
const BueroVerbindung = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const zeit = iso => iso ? new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  let st = null, schluessel = '';

  const kuechenAdresse = () => location.origin;
  // Text zum Einfügen in Claude: Verbindungsdaten + alle Unterlagen (Briefing, Angebotsformat, Einrichtung)
  async function uebergabeText() {
    let unterlagen = '';
    try { const r = await fetch('/api/buero-verbindung/readme', { credentials: 'include' }); if (r.ok) unterlagen = await r.text(); } catch (e) { /* ohne Unterlagen weiter */ }
    return `VERBINDUNG KÜCHEN-APP ↔ BÜRO-APP – bitte vollständig lesen

Adresse der Küchen-App:  ${kuechenAdresse()}
Verbindungsschlüssel:    ${schluessel}

Was zu tun ist:
1. Beides als Einstellungen der Büro-App ablegen (Umgebungsvariablen in Vercel, nur serverseitig), z. B. KUECHE_URL und KUECHE_KEY. Den Schlüssel niemals im Code, in Commits oder in Chats weitergeben.
2. Bei JEDEM Aufruf an die Küchen-App den Schlüssel mitschicken:  Authorization: Bearer <Schlüssel>
3. Für die eingebettete Katalog-Seite serverseitig ein kurzes Token holen:  POST ${kuechenAdresse()}/api/integration/v1/token  (mit dem Schlüssel) – die Antwort enthält die fertige Adresse für das iframe.
4. Auftrag, Format und Regeln stehen vollständig unten. Die dort genannten Dateien (docs/integration/…) sind hier im Text enthalten, ihr müsst sie nicht extra suchen.

${unterlagen ? unterlagen : '(Die ausführlichen Unterlagen konnten nicht geladen werden – sie liegen im Küchen-Repository unter docs/integration.)'}`;
  }

  async function laden() {
    try { st = await API.get('/api/buero-verbindung'); } catch (e) { st = null; }
    render();
  }
  function render() {
    const box = $('bueroVerbindung'); if (!box) return;
    if (!st) { box.innerHTML = '<p class="hint">Verbindungsstatus konnte nicht geladen werden.</p>'; return; }
    box.innerHTML = `
      <label>Internetadresse der Büro-App (damit sie unseren Katalog einbetten darf)
        <input type="text" id="bvAdresse" value="${esc((st.origins || []).join(', '))}" placeholder="z. B. https://buero.meine-firma.de"></label>
      <div class="actions-row"><button type="button" class="btn-primary small-btn" id="bvAdresseSpeichern">Adresse speichern</button><span class="hint" id="bvAdresseStatus"></span></div>
      <h3 style="margin-top:18px">Verbindungsschlüssel</h3>
      <p class="hint">${st.vorhanden
        ? `Es gibt einen Schlüssel (endet auf „…${esc(st.endung)}“), erzeugt am ${esc(zeit(st.erzeugt))}. ${st.zuletzt ? 'Zuletzt von der Büro-App benutzt: ' + esc(zeit(st.zuletzt)) + '.' : 'Bisher noch nicht benutzt.'}`
        : 'Es gibt noch keinen Schlüssel.'}
        Der Schlüssel ist wie ein Hausschlüssel für die Büro-App: Damit darf sie den Katalog nutzen und bestätigte Angebote senden – sonst nichts (kein Zugriff auf Rezepte, Vorrat oder Archiv).</p>
      ${schluessel ? `<div class="bv-schluessel"><div class="hint">Nur jetzt sichtbar – bitte kopieren:</div><code id="bvKey">${esc(schluessel)}</code>
        <div class="actions-row"><button type="button" class="btn-primary small-btn" id="bvKopieren">Schlüssel + Readme kopieren</button><button type="button" class="btn-ghost small-btn" id="bvNurKey">Nur Schlüssel kopieren</button></div>
        <p class="hint" id="bvKopiert"></p></div>` : ''}
      <div class="actions-row"><button type="button" class="btn-ghost small-btn" id="bvNeu">${st.vorhanden ? 'Neuen Schlüssel erzeugen (der alte wird ungültig)' : 'Schlüssel erzeugen'}</button></div>`;
  }
  async function kopieren(textOderPromise, hinweisId) {
    try { await navigator.clipboard.writeText(await textOderPromise); $(hinweisId).textContent = '✅ In die Zwischenablage kopiert. Jetzt einfach bei Claude (Büro-Seite) einfügen.'; }
    catch (e) { $(hinweisId).textContent = 'Kopieren hat nicht geklappt – bitte den Text markieren und mit Strg+C kopieren.'; }
  }
  function start() {
    const box = $('bueroVerbindung'); if (!box) return;
    box.addEventListener('click', async e => {
      const t = e.target;
      if (t.closest('#bvAdresseSpeichern')) {
        try { const r = await API.send('PUT', '/api/buero-verbindung', { origins: $('bvAdresse').value }); st.origins = r.origins; $('bvAdresse').value = r.origins.join(', '); $('bvAdresseStatus').textContent = '✅ Gespeichert.'; }
        catch (err) { $('bvAdresseStatus').textContent = '❌ ' + err.message; }
      } else if (t.closest('#bvNeu')) {
        if (st.vorhanden && !confirm('Neuen Schlüssel erzeugen? Der bisherige funktioniert dann sofort nicht mehr – die Büro-App braucht den neuen.')) return;
        try { const r = await API.send('POST', '/api/buero-verbindung/schluessel'); schluessel = r.schluessel; await laden(); } catch (err) { alert('Das hat nicht geklappt: ' + err.message); }
      } else if (t.closest('#bvKopieren')) { $('bvKopiert').textContent = 'Wird zusammengestellt …'; kopieren(uebergabeText(), 'bvKopiert'); }
      else if (t.closest('#bvNurKey')) kopieren(schluessel, 'bvKopiert');
    });
    laden();
  }
  return { start, laden };
})();
