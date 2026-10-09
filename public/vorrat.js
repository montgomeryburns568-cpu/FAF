// Vorrat: Basisartikel (Salz, Pfeffer, Öl ...) mit Bestand, die nicht bei jedem Auftrag neu bestellt werden. Der Bedarf jedes Angebots wird
// zuerst gegen Vorrat und Überproduktion verrechnet; nur der Rest landet auf der Einkaufsliste. Der Verbrauch wird im Hintergrund gebucht
// (automatisch beim Nachtrag nach der Produktion oder per Knopf in der Einkaufsliste), unterschreitet ein Artikel den Mindestbestand,
// wird er zur Nachbestellung vorgeschlagen. Logik: vorrat-logik.js. Läuft nach app.js und nutzt dessen Globals.
const Vorrat = (function () {
  const L = VorratLogik;
  const $ = id => document.getElementById(id);
  const esc = s => escHtml(s);
  const num = (n, d = 1) => n == null || isNaN(n) ? '–' : (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toString().replace('.', ',');
  const liste = () => (state.vorrat = state.vorrat || []);
  const heute = () => KarteiLogik.heuteIso();
  const menge = (n, einheit) => {
    if (einheit === 'g' && Math.abs(n) >= 1000) return num(n / 1000, 2) + ' kg';
    if (einheit === 'ml' && Math.abs(n) >= 1000) return num(n / 1000, 2) + ' l';
    return num(n, Math.abs(n) >= 100 ? 0 : 1) + ' ' + einheit;
  };

  async function speichern() { state.vorrat = await API.send('PUT', '/api/vorrat', liste()); }

  function bedarfVon(ev) {
    const comp = computeEvent(ev, state.recipes, state.rules);
    return aggregateIngredients(comp);
  }
  // Bedarf anderer, noch nicht gebuchter Aufträge (heute oder später) je Vorratsartikel – damit zwei Aufträge nicht denselben Salzvorrat "doppelt" nutzen
  function reserviert(exceptId) {
    const out = {};
    for (const ev of state.events || []) {
      if (ev.id === exceptId || ev.lagerGebucht || !ev.days || !ev.days.length) continue;
      const iso = KarteiLogik.eventDatum(ev).iso;
      if (!iso || iso < heute()) continue;
      try {
        bedarfVon(ev).forEach(t => {
          const b = L.toBasis(t.unit, t.amount); const it = L.findeArtikel(t.name, liste());
          if (b && it && L.typPasst(b.typ, it.einheit)) out[it.id] = (out[it.id] || 0) + b.menge;
        });
      } catch (e) { /* Angebot nicht berechenbar */ }
    }
    return out;
  }
  // Als 'doch nicht vorrätig' abgehakte Zutaten dieses Auftrags (Einkaufsliste, Bereich 'Theoretisch vorrätig')
  const ohne = ev => new Set(Object.keys(ev.vorratAus || {}));
  // Offene Überproduktion; zusatz = vom eigenen Auftrag bereits gebuchte Mengen (wieder dazurechnen)
  function ueberListe(zusatz) {
    return typeof Kartei === 'undefined' ? [] : Kartei.ueberFuerVerrechnung(zusatz);
  }
  // Bedarf des Auftrags gegen Vorrat und Überproduktion. Ist der Verbrauch schon gebucht, wird der eigene Anteil für die Rechnung wieder
  // zum Bestand gezählt – die Einkaufsliste zeigt so immer, was für DIESEN Auftrag noch zu bestellen ist.
  function verrechne(ev, totals) {
    const g = ev.lagerGebucht;
    const vorr = g ? liste().map(it => { const b = (g.vorrat || []).find(x => x.id === it.id); return b ? { ...it, bestand: (Number(it.bestand) || 0) + b.menge } : it; }) : liste();
    const r = L.verrechne(totals, vorr, reserviert(ev.id), ueberListe(g ? g.ueber : null), KarteiLogik.passt, ohne(ev));
    return { rows: r.rows, nachbestellen: r.nachbestellen, gebucht: !!g };
  }

  // ---------- Verbrauch im Hintergrund buchen ----------
  // Jedes Mal, wenn ein Auftrag gespeichert/erzeugt wird (To-Do entsteht oder ändert sich), wird sein Verbrauch an Vorratsartikeln und
  // Überproduktion automatisch vom Bestand abgezogen. Eine frühere Buchung desselben Auftrags wird dabei zuerst zurückgenommen,
  // damit Änderungen am Angebot nicht doppelt zählen.
  async function zurueckbuchen(ev) {
    const b = ev.lagerGebucht; if (!b) return;
    (b.vorrat || []).forEach(x => { const it = liste().find(i => i.id === x.id); if (it) it.bestand = Math.round(((Number(it.bestand) || 0) + x.menge) * 100) / 100; });
    if ((b.vorrat || []).length) await speichern();
    if ((b.ueber || []).length && typeof Kartei !== 'undefined') await Kartei.ueberZurueck(b.ueber);
    delete ev.lagerGebucht;
  }
  async function verbuchen(ev) {
    const totals = bedarfVon(ev);
    const r = L.verrechne(totals, liste(), reserviert(ev.id), ueberListe(), KarteiLogik.passt, ohne(ev));
    const vSum = {}, uSum = {};
    r.rows.forEach(row => {
      if (row.ausVorrat && row.ausVorrat.menge > 0) vSum[row.ausVorrat.id] = (vSum[row.ausVorrat.id] || 0) + row.ausVorrat.menge;
      row.ausUeber.forEach(u => { uSum[u.key] = (uSum[u.key] || 0) + u.menge; });
    });
    const buchung = { am: new Date().toISOString(), vorrat: [], ueber: [] };
    liste().forEach(it => { const m = vSum[it.id]; if (m > 0) { it.bestand = Math.round(Math.max(0, (Number(it.bestand) || 0) - m) * 100) / 100; buchung.vorrat.push({ id: it.id, menge: m }); } });
    if (buchung.vorrat.length) await speichern();
    if (Object.keys(uSum).length && typeof Kartei !== 'undefined') buchung.ueber = await Kartei.ueberReduzieren(Object.entries(uSum).map(([key, basis]) => ({ key, basis })));
    return buchung;
  }
  let laeuft = false, nochmal = null;
  async function sync(ev) {
    if (!ev || !ev.days || !ev.days.length) return;
    if (laeuft) { nochmal = ev; return; }          // läuft schon: danach noch einmal mit dem neuesten Stand
    if (!liste().length && !ueberListe().length && !ev.lagerGebucht) return;
    laeuft = true;
    try {
      await zurueckbuchen(ev);
      ev.lagerGebucht = await verbuchen(ev);
      await eventSpeichern(ev);
    } catch (e) { console.error('Vorrat buchen:', e.message); }
    finally {
      laeuft = false;
      if (nochmal) { const n = nochmal; nochmal = null; await sync(n); }
    }
    if ($('tab-vorrat') && $('tab-vorrat').classList.contains('active')) renderVorrat();
  }
  // Alle noch nicht gebuchten Aufträge ab heute (frühester zuerst) buchen - so bleiben keine 'Phantom-Reservierungen' übrig
  async function syncAlle() {
    if (!liste().length) return;
    const offen = (state.events || []).filter(ev => !ev.lagerGebucht && ev.days && ev.days.length && (KarteiLogik.eventDatum(ev).iso || '') >= heute())
      .sort((a, b) => KarteiLogik.eventDatum(a).iso.localeCompare(KarteiLogik.eventDatum(b).iso));
    for (const ev of offen) await sync(ev);
    if (($('tab-vorrat') || {}).classList && $('tab-vorrat').classList.contains('active')) renderVorrat();
  }
  // Auftrag gelöscht: Bestände wieder freigeben
  async function freigeben(ev) {
    if (!ev || !ev.lagerGebucht) return;
    try { await zurueckbuchen(ev); } catch (e) { console.error('Vorrat freigeben:', e.message); }
  }
  async function eventSpeichern(ev) {
    const saved = await API.send('PUT', '/api/events/' + ev.id, ev);
    const i = state.events.findIndex(e => e.id === ev.id);
    if (i >= 0) state.events[i] = saved;
    if (draftEvent && draftEvent.id === ev.id && draftEvent !== ev) { draftEvent.lagerGebucht = saved.lagerGebucht; if (!saved.lagerGebucht) delete draftEvent.lagerGebucht; }
  }
  async function neuBuchen(ev) { await sync(ev); renderVorrat(); if (typeof renderEinkaufsliste === 'function') renderEinkaufsliste(); }

  // ---------- Einkaufsliste: Hinweis + Knopf ----------
  function buchungHTML(ev) {
    if (ev.lagerGebucht) {
      const b = ev.lagerGebucht;
      return `<div class="vorrat-box">✅ Verbrauch automatisch aus dem Lager gebucht (${(b.vorrat || []).length} Vorratsartikel${(b.ueber || []).length ? ', ' + b.ueber.length + ' Überproduktion' : ''}, Stand ${new Date(b.am).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}). Die Buchung passt sich bei jedem Speichern des Angebots an. <button type="button" class="btn-ghost small-btn vorrat-neu">Jetzt neu berechnen</button></div>`;
    }
    if (!state.events.find(e => e.id === ev.id)) return '<div class="vorrat-box hint">Angebot speichern („Küchensheet &amp; To-Do erzeugen“), dann wird der Verbrauch automatisch vom Vorrat abgezogen.</div>';
    return '<div class="vorrat-box hint">Noch nicht gebucht – beim nächsten Speichern des Angebots wird der Verbrauch automatisch vom Vorrat abgezogen. <button type="button" class="btn-ghost small-btn vorrat-neu">Jetzt buchen</button></div>';
  }
  function zeileHinweis(row) {
    const t = [];
    if (row.ausVorrat && row.ausVorrat.menge > 0) t.push(`${menge(row.ausVorrat.menge, row.ausVorrat.einheit)} aus dem Vorrat`);
    if (row.ausUeber.length) t.push(row.ausUeber.map(u => `${menge(u.menge, u.typ === 'ml' ? 'ml' : u.typ === 'stk' ? 'Stk' : 'g')} aus Überproduktion (${esc(u.name)})`).join(', '));
    return t.length ? `<div class="lager-hint">📦 Bedarf ${fmtAmount(row.amount)} ${esc(row.unit)} – ${t.join(' + ')}</div>` : '';
  }
  // Abgetrennter Bereich "Theoretisch vorrätig": durch Vorrat/Überproduktion gedeckte Zutaten mit Haken. Haken weg = doch nicht da,
  // die benötigte Menge rutscht in die Bestellliste (und wird nicht mehr vom Bestand abgezogen).
  function vorraetigHTML(rows) {
    const liste = rows.filter(r => r.gedeckt || r.ausgeschlossen);
    if (!liste.length) return '';
    return `<div class="vorraetig-box"><h3>Theoretisch vorrätig</h3>
      <p class="hint">Diese Zutaten sind laut Vorrat bzw. Überproduktion vorhanden und stehen nicht in der Bestellliste. Ist etwas in Wirklichkeit nicht da: Haken entfernen – die benötigte Menge rutscht dann in die Bestellliste.</p>
      <table class="summary-table vorraetig-table"><thead><tr><th style="width:44px">Da?</th><th>Zutat</th><th>Benötigt</th><th>Quelle</th></tr></thead><tbody>
      ${liste.map(r => {
        const quelle = r.ausgeschlossen ? '<em>als nicht vorrätig markiert – wird bestellt</em>'
          : [r.ausVorrat && r.ausVorrat.menge > 0 ? `Vorrat „${esc(r.ausVorrat.name)}“` : '', r.ausUeber.length ? 'Überproduktion (' + r.ausUeber.map(u => esc(u.name)).join(', ') + ')' : ''].filter(Boolean).join(' + ');
        return `<tr class="${r.ausgeschlossen ? 'vorraetig-aus' : ''}"><td style="text-align:center"><input type="checkbox" class="vorraetig-cb" data-name="${esc(r.name)}" ${r.ausgeschlossen ? '' : 'checked'}></td>
          <td>${esc(r.name)}</td><td>${fmtAmount(r.amount)} ${esc(r.unit)}</td><td class="hint">${quelle}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  }

  // ---------- Reiter "Vorrat" ----------
  function statusVon(it, plan) {
    const best = Number(it.bestand) || 0, min = Number(it.mindest) || 0;
    const prog = best - (plan || 0);
    if (!best && !min) return ['⚪', 'Bestand eintragen'];
    if (prog <= 0) return ['🔴', 'leer – nachbestellen'];
    if (min > 0 && prog < min) return ['🟠', 'unter Mindestbestand'];
    return ['🟢', 'ok'];
  }
  function renderVorrat() {
    const box = $('vorratListe'); if (!box) return;
    const plan = reserviert(null);
    const rows = liste();
    box.innerHTML = rows.length ? `<div class="table-scroll"><table class="analytics-table vorrat-table"><thead><tr>
        <th></th><th>Artikel</th><th>Bestand</th><th>Einheit</th><th>Mindest&shy;bestand</th><th>Nach&shy;bestellmenge</th><th>Suchbegriffe (Komma)</th><th>Offene Aufträge</th><th></th></tr></thead><tbody>
      ${rows.map(it => { const p = plan[it.id] || 0; const [ic, tx] = statusVon(it, p); return `<tr data-id="${esc(it.id)}">
        <td title="${tx}">${ic}</td>
        <td><input type="text" class="v-name" value="${esc(it.name)}" placeholder="z.B. Salz"></td>
        <td><input type="number" class="v-bestand" step="any" min="0" value="${it.bestand ?? ''}" style="width:90px"> <button type="button" class="btn-ghost small-btn v-plus" title="Wareneingang zubuchen">＋</button></td>
        <td><select class="v-einheit">${['g', 'ml', 'Stk'].map(e => `<option ${it.einheit === e ? 'selected' : ''}>${e}</option>`).join('')}</select></td>
        <td><input type="number" class="v-mindest" step="any" min="0" value="${it.mindest ?? ''}" style="width:80px"></td>
        <td><input type="number" class="v-nach" step="any" min="0" value="${it.nachbestellung ?? ''}" style="width:80px" placeholder="= Mindest"></td>
        <td><input type="text" class="v-begriffe" value="${esc(it.begriffe || '')}" placeholder="salz, meersalz"><input type="text" class="v-ohne" value="${esc(it.ohne || '')}" placeholder="nicht zuordnen: salzgurke" style="margin-top:4px"></td>
        <td class="hint">${p > 0 ? 'geplant: ' + menge(p, it.einheit) : '–'}</td>
        <td><button type="button" class="btn-ghost small-btn v-del" title="Artikel löschen">✕</button></td></tr>`; }).join('')}
      </tbody></table></div>` : '<p class="hint">Noch keine Vorratsartikel. Mit „Standardartikel ergänzen“ startest du mit Salz, Pfeffer, Öl usw., danach trägst du den Bestand ein.</p>';
    const nied = rows.filter(it => { const [ic] = statusVon(it, plan[it.id] || 0); return ic === '🟠' || ic === '🔴'; });
    $('vorratStatus').innerHTML = nied.length ? `⚠️ ${nied.length} Artikel unter Mindestbestand bzw. leer – sie erscheinen in der Einkaufsliste als Nachbestellung: ${nied.map(i => esc(i.name)).join(', ')}` : '';
  }
  function sammeln() {
    return Array.from(document.querySelectorAll('#vorratListe tbody tr')).map(tr => {
      const alt = liste().find(i => i.id === tr.dataset.id) || {};
      const n = c => { const v = tr.querySelector(c).value; return v === '' ? null : parseFloat(v); };
      return { ...alt, id: tr.dataset.id, name: tr.querySelector('.v-name').value.trim(), bestand: n('.v-bestand') ?? 0, einheit: tr.querySelector('.v-einheit').value,
        mindest: n('.v-mindest') ?? 0, nachbestellung: n('.v-nach') ?? 0, begriffe: tr.querySelector('.v-begriffe').value.trim(), ohne: tr.querySelector('.v-ohne').value.trim() };
    });
  }
  function init() {
    $('vorratAdd').addEventListener('click', async () => {
      state.vorrat = sammeln().concat([{ id: uid(), name: '', einheit: 'g', bestand: 0, mindest: 0, nachbestellung: 0, begriffe: '', ohne: '' }]);
      await speichern(); renderVorrat();
      const last = document.querySelector('#vorratListe tbody tr:last-child .v-name'); if (last) last.focus();
    });
    $('vorratStandard').addEventListener('click', async () => {
      const have = new Set(sammeln().map(i => L.norm(i.name)));
      const neu = L.STANDARD_ARTIKEL.filter(a => !have.has(L.norm(a.name))).map(a => ({ id: uid(), bestand: 0, mindest: 0, nachbestellung: 0, ohne: '', ...a }));
      state.vorrat = sammeln().concat(neu); await speichern(); renderVorrat(); syncAlle();
    });
    $('vorratListe').addEventListener('change', async () => { state.vorrat = sammeln().filter(i => i.name || i.begriffe); await speichern(); renderVorrat(); syncAlle(); });
    $('vorratListe').addEventListener('click', async e => {
      const tr = e.target.closest('tr'); if (!tr) return;
      if (e.target.closest('.v-del')) {
        if (!confirm('Vorratsartikel löschen?')) return;
        state.vorrat = sammeln().filter(i => i.id !== tr.dataset.id); await speichern(); renderVorrat();
      } else if (e.target.closest('.v-plus')) {
        const it = liste().find(i => i.id === tr.dataset.id); if (!it) return;
        const v = prompt(`Wareneingang für „${it.name}“ – Menge in ${it.einheit} (z.B. 5000 für 5 kg):`);
        const n = parseFloat(String(v || '').replace(',', '.')); if (!n || n <= 0) return;
        state.vorrat = sammeln(); state.vorrat.find(i => i.id === tr.dataset.id).bestand = (Number(it.bestand) || 0) + n;
        await speichern(); renderVorrat();
      }
    });
    $('einkaufslisteOutput').addEventListener('change', async e => {
      const cb = e.target.closest('.vorraetig-cb'); if (!cb || !draftEvent) return;
      draftEvent.vorratAus = draftEvent.vorratAus || {};
      const k = L.norm(cb.dataset.name);
      if (cb.checked) delete draftEvent.vorratAus[k]; else draftEvent.vorratAus[k] = true;
      // gespeicherte Angebote: Buchung nachziehen (nicht Vorhandenes wird nicht abgezogen); sonst nur neu anzeigen
      if (state.events.find(x => x.id === draftEvent.id)) await sync(draftEvent); else if (typeof persistDraftSoon === 'function') persistDraftSoon();
      if (typeof renderEinkaufsliste === 'function') renderEinkaufsliste();
    });
    $('einkaufslisteOutput').addEventListener('click', async e => {
      if (draftEvent && e.target.closest('.vorrat-neu')) await neuBuchen(draftEvent);
    });
  }
  init();
  return { verrechne, reserviert, sync, syncAlle, freigeben, buchungHTML, zeileHinweis, vorraetigHTML, renderVorrat };
})();
