// Preise-Sperre: Beträge in Angebots-PDFs sind geschwärzt und der Archiv-Bereich (Angebote, Kunden, Auswertung) ist gesperrt,
// bis das Preis-Passwort eingegeben wurde. Die Prüfung läuft auf dem Server; hier nur Anzeige und Dialoge.
const Preise = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const GESPERRT = ['sub-angebote', 'sub-kunden', 'sub-auswertung'];
  let st = { gesetzt: false, frei: false };

  async function aufruf(pfad, body) {
    const r = await fetch(pfad, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || r.statusText);
    return j;
  }
  const frei = () => !!st.frei;

  function anwenden() {
    const b = $('preiseBtn');
    if (b) {
      b.textContent = st.frei ? '🔓' : '🔒';
      b.setAttribute('aria-label', st.frei ? 'Preise wieder sperren' : 'Preise freischalten');
      b.classList.toggle('frei', !!st.frei);
      b.title = st.frei ? 'Preise sind sichtbar (gilt 12 Stunden) – anklicken zum Sperren' : 'Preise in Angeboten und im Archiv sind gesperrt – anklicken und Passwort eingeben';
    }
    GESPERRT.forEach(id => {
      const p = $(id); if (!p) return;
      let gate = p.querySelector(':scope > .preis-gate');
      if (!gate) {
        gate = document.createElement('div'); gate.className = 'card preis-gate';
        gate.innerHTML = '<h3>🔒 Gesperrt</h3><p class="hint">Dieser Bereich enthält Preise. Zum Ansehen bitte das Preis-Passwort eingeben.</p><button type="button" class="btn-primary" data-preise-auf>Passwort eingeben</button>';
        p.insertBefore(gate, p.firstChild);
      }
      p.classList.toggle('preis-gesperrt', !st.frei);
    });
    if (typeof AngebotVorschau !== 'undefined') AngebotVorschau.neuLaden();
  }

  async function laden() {
    try { st = await API.get('/api/preise/status'); } catch (e) { /* offline/abgemeldet: bleibt gesperrt */ }
    anwenden();
  }

  // Dialog: Passwort eingeben bzw. (beim ersten Mal oder auf Wunsch) neu festlegen
  function dialog(modus) {
    return new Promise(fertig => {
      modus = modus || (st.gesetzt ? 'eingeben' : 'festlegen');
      const ov = document.createElement('div'); ov.className = 'kmodal-ov';
      const feld = (id, text, auto) => `<label>${esc(text)}<input type="password" id="${id}" autocomplete="${auto || 'off'}"></label>`;
      const inhalt = {
        eingeben: { titel: 'Preise anzeigen', text: 'Bitte das Preis-Passwort eingeben.', felder: feld('pwA', 'Preis-Passwort', 'current-password'), ok: 'Freischalten' },
        festlegen: { titel: 'Preis-Passwort festlegen', text: 'Noch kein Preis-Passwort vorhanden. Wer es kennt, sieht Preise in Angeboten und im Archiv. Bitte gut merken.', felder: feld('pwN', 'Neues Passwort (mind. 4 Zeichen)', 'new-password') + feld('pwN2', 'Wiederholen', 'new-password'), ok: 'Festlegen' },
        aendern: { titel: 'Preis-Passwort ändern', text: '', felder: feld('pwA', 'Bisheriges Passwort', 'current-password') + feld('pwN', 'Neues Passwort (mind. 4 Zeichen)', 'new-password') + feld('pwN2', 'Wiederholen', 'new-password'), ok: 'Ändern' },
      }[modus];
      ov.innerHTML = `<div class="kmodal preis-dialog"><h3>${esc(inhalt.titel)}</h3>${inhalt.text ? `<p class="hint">${esc(inhalt.text)}</p>` : ''}${inhalt.felder}
        <p class="preis-fehler" id="pwFehler"></p>
        <div class="actions-row"><button type="button" class="btn-primary" id="pwOk">${esc(inhalt.ok)}</button><button type="button" class="btn-ghost" id="pwZu">Abbrechen</button>${modus === 'eingeben' ? '<button type="button" class="btn-ghost small-btn" id="pwAendern" style="margin-left:auto">Passwort ändern</button>' : ''}</div></div>`;
      document.body.appendChild(ov);
      const zu = ok => { ov.remove(); fertig(ok); };
      const fehler = t => { $('pwFehler').textContent = t; };
      const ersteEingabe = ov.querySelector('input'); if (ersteEingabe) ersteEingabe.focus();
      ov.querySelector('#pwZu').onclick = () => zu(false);
      ov.addEventListener('mousedown', e => { if (e.target === ov) zu(false); });
      const aendern = ov.querySelector('#pwAendern'); if (aendern) aendern.onclick = () => { ov.remove(); dialog('aendern').then(fertig); };
      const ok = async () => {
        try {
          const v = id => { const e = ov.querySelector('#' + id); return e ? e.value : ''; };
          if (modus !== 'eingeben') {
            if (v('pwN').length < 4) return fehler('Das Passwort braucht mindestens 4 Zeichen.');
            if (v('pwN') !== v('pwN2')) return fehler('Die beiden Eingaben stimmen nicht überein.');
          }
          ov.querySelector('#pwOk').disabled = true;
          if (modus === 'eingeben') await aufruf('/api/preise/entsperren', { passwort: v('pwA') });
          else await aufruf('/api/preise/setzen', { neu: v('pwN'), alt: v('pwA') });
          st = { gesetzt: true, frei: true };
          anwenden(); zu(true);
        } catch (e) { fehler(e.message); const b = ov.querySelector('#pwOk'); if (b) b.disabled = false; }
      };
      ov.querySelector('#pwOk').onclick = ok;
      ov.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); else if (e.key === 'Escape') zu(false); });
    });
  }

  async function umschalten() {
    if (st.frei) { try { await aufruf('/api/preise/sperren'); } catch (e) { /* ignorieren */ } st.frei = false; anwenden(); return; }
    await dialog();
  }

  document.addEventListener('click', e => {
    if (e.target.closest('#preiseBtn')) umschalten();
    else if (e.target.closest('[data-preise-auf]')) dialog();
  });
  return { laden, frei, dialog };
})();
