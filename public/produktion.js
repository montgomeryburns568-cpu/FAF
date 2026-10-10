// Küchensheet-Produktionsliste: alle Gerichte des Kunden mit Anzahl; die Komponenten (aus dem Speisenkatalog erkannt)
// lassen sich per Touch durchschalten und färben: grau = offen, gelb = angefangen, grün = erledigt, rot = kein Material im Haus.
// Der Stand wird je Angebot gespeichert (draftEvent.kompStatus) und läuft über persistDraftSoon() in den Event-Datensatz.
const Produktion = (function () {
  const REIHENFOLGE = ['', 'gelb', 'gruen', 'rot'];
  const LABEL = { '': 'offen', gelb: 'angefangen', gruen: 'erledigt', rot: 'kein Material im Haus' };
  const ROLLE = { H: 'Hauptkomponente', S: 'Soße', B: 'Beilage', G: 'Gemüse' };
  const esc = s => escHtml(s);
  let model = [];
  let infoOffen = false;   // Legende/Bedienhinweis im Küchensheet aufgeklappt

  const key = (dayId, dishId, compKey) => `${dayId}|${dishId}|${compKey}`;
  const status = k => (draftEvent.kompStatus && draftEvent.kompStatus[k]) || '';

  function komponentenVon(d) {
    if (d.komponenten && d.komponenten.length) return d.komponenten.map(c => ({ key: c.id, name: c.name, rolle: c.rolle, menge: c.menge || '' }));
    if (d.isPfanne) return d.components.map(c => ({ key: c.id, name: c.name || 'Komponente', rolle: { hauptteil: 'H', saettigung: 'B', gemuese: 'G' }[c.role] || 'H', menge: c.totalLabel || '' }));
    return [{ key: 'dish', name: d.name || '(ohne Namen)', rolle: null, menge: '', einzel: true }];
  }

  // Modell aus den berechneten Gerichten aufbauen (einmal je Küchensheet-Aufbau; Antippen rendert nur noch daraus)
  function baue(computed) {
    model = computed.days.map(day => {
      const byCat = {};
      day.dishes.forEach(d => { (byCat[d.category] = byCat[d.category] || []).push(d); });
      return {
        id: day.id, date: day.date, personen: day.personen, modus: day.modus,
        cats: CATEGORIES.filter(c => byCat[c.id] && byCat[c.id].length).map(c => ({
          id: c.id, label: c.label,
          dishes: byCat[c.id].map(d => ({
            id: d.id, name: d.name || '(ohne Namen)', personen: d.personen, label: d.totalLabel || '',
            regeln: d.eigeneRegeln || [], comps: komponentenVon(d), unklar: (d.komponentenRest || []).join(', '),
            erkannt: !!((d.komponenten && d.komponenten.length) || d.isPfanne),
          })),
        })),
      };
    });
  }

  function zaehle() {
    const z = { gesamt: 0, gelb: 0, gruen: 0, rot: 0, fehlt: [] };
    model.forEach(day => day.cats.forEach(c => c.dishes.forEach(d => d.comps.forEach(k => {
      z.gesamt++;
      const s = status(key(day.id, d.id, k.key));
      if (s) z[s]++;
      if (s === 'rot') z.fehlt.push(`${d.name}${k.einzel ? '' : ' – ' + k.name}`);
    }))));
    return z;
  }

  function chipHTML(dayId, dish, k) {
    const s = status(key(dayId, dish.id, k.key));
    return `<button type="button" class="prod-chip st-${s || 'none'} ${k.rolle ? 'rolle-' + k.rolle : ''}" data-day="${esc(dayId)}" data-dish="${esc(dish.id)}" data-comp="${esc(k.key)}"
      title="${esc((k.rolle ? ROLLE[k.rolle] + ' · ' : '') + LABEL[s])} – Tippen wechselt den Status" aria-label="${esc(k.name)}: ${LABEL[s]}">
      <span class="prod-chip-name">${esc(k.name)}</span>${k.menge ? `<span class="prod-chip-menge">${esc(k.menge)}</span>` : ''}</button>`;
  }

  function html() {
    const z = zaehle();
    const fort = z.gesamt
      ? `<span class="prod-fort" title="${z.gruen} von ${z.gesamt} Komponenten erledigt · ${z.gelb} angefangen · ${z.rot} ohne Material"><span class="pl-bar"><span style="width:${Math.round(100 * z.gruen / z.gesamt)}%"></span></span><strong>${z.gruen}</strong>/${z.gesamt}${z.gelb ? `<span class="prod-mini st-gelb">${z.gelb}</span>` : ''}${z.rot ? `<span class="prod-mini st-rot">${z.rot}</span>` : ''}</span>`
      : '<span></span>';
    let h = `<div class="prod-head no-print-bg">
      <div class="prod-summary">${fort}
        <span class="prod-tools no-print">${z.gesamt ? '<button type="button" class="btn-ghost small-btn prod-reset" title="Alle Farbmarkierungen zurücksetzen">Zurücksetzen</button>' : ''}<button type="button" class="btn-ghost small-btn prod-info" aria-expanded="${infoOffen}" title="Legende und Bedienung">ⓘ</button></span></div>
      <div class="prod-info-panel" ${infoOffen ? '' : 'hidden'}>
        <div class="prod-legend"><span class="prod-key st-none">grau: offen</span><span class="prod-key st-gelb">gelb: angefangen</span><span class="prod-key st-gruen">grün: erledigt</span><span class="prod-key st-rot">rot: kein Material im Haus</span></div>
        <p class="hint no-print" style="margin:6px 0 0">Komponente antippen: grau → gelb → grün → rot → grau.</p>
      </div>
      ${z.fehlt.length ? `<div class="prod-fehlt">🔴 <strong>Material fehlt:</strong> ${z.fehlt.map(esc).join(' · ')}</div>` : ''}
    </div>`;
    model.forEach(day => {
      h += `<div class="prod-day"><h3>${esc(day.date || 'Tag')}${day.personen ? ' · ' + day.personen + ' Personen' : ''}${day.modus === 'abend' ? ' · <span class="badge">Abend / Privat</span>' : ''}${model.length > 1 ? druckIcon(day.id) : ''}</h3>`;
      day.cats.forEach(c => {
        h += `<h4 class="prod-cat">${esc(c.label)}</h4>`;
        c.dishes.forEach(d => {
          const st = d.comps.map(k => status(key(day.id, d.id, k.key)));
          const fertig = st.filter(s => s === 'gruen').length;
          const cls = st.length && fertig === st.length ? 'all-done' : st.includes('rot') ? 'has-rot' : st.some(s => s === 'gelb' || s === 'gruen') ? 'in-arbeit' : '';
          h += `<div class="prod-dish ${cls}">
            <div class="prod-dish-head"><span class="prod-dish-name">${esc(d.name)}</span>
              <span class="prod-anzahl">${d.personen || 0} Pers.${d.label ? ' · ' + esc(d.label) : ''}${d.regeln.length ? ` <span title="Eigene Regel: ${esc(d.regeln.join(', '))}">⚙</span>` : ''}</span>
              ${d.comps.length > 1 ? `<span class="prod-progress">${fertig}/${d.comps.length}</span>` : ''}</div>
            <div class="prod-chips">${d.comps.map(k => chipHTML(day.id, d, k)).join('')}</div>
            ${!d.erkannt && !['brot'].includes(c.id) ? '<div class="prod-unklar">Nicht im Speisenkatalog erkannt – nur als ganzes Gericht abhakbar.</div>' : ''}
          </div>`;
        });
      });
      h += `</div>`;
    });
    return h;
  }

  function neuZeichnen() { const el = document.getElementById('produktionsliste'); if (el) el.innerHTML = html(); }

  // ---------- Etikettendruck ----------
  // Hochkant-Label (Brother PT-P700): erste 4 Buchstaben des Kunden, Wochentag, Datum (optional eine Zusatzzeile).
  // Das Label wird hier im Browser als Schwarz-Weiß-Bild gezeichnet und an das Label-Hilfsprogramm auf diesem PC geschickt
  // (label-helper/server.js), das die Raster-Befehle für den Drucker baut. Ohne Hilfsprogramm: Druck über den Browser.
  const LABEL_KEY = 'ks_label4';   // neuer Schlüssel: Werte früherer Versionen werden nicht übernommen
  const LABEL_STD = { aktiv: true, anzahl: 1, band: 24, laenge: 24.5, wochentag: 'voll', weg: 'helper', schnitt: 'alt', port: 9101, spiegelX: true, spiegelY: false };
  const BAND_PUNKTE = { 6: 32, 9: 50, 12: 70, 18: 112, 24: 128 };   // bedruckbare Breite in Punkten bei 180 dpi
  // Der PT-P700 druckt mit 180 dpi in beide Richtungen. Zwischen Druckkopf und Messer liegen 24,5 mm Band, die vor dem ersten Schnitt unbedruckt
  // mitlaufen (ein Leerstück je Auftrag). Ist das Label genau 24,5 mm lang (2 mm Rand vorn und hinten), trennt jeder Schnitt zwischen zwei Labels:
  // erst das Leerstück, dann Label für Label; das letzte wird am Ende vorgeschoben und geschnitten.
  const RAND_PUNKTE = 14, LAENGS_DPI = 180;
  const WT_VOLL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const WT_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  function labelEinst() {
    let o = {};
    try { o = JSON.parse(localStorage.getItem(LABEL_KEY) || '{}'); } catch (e) { /* ohne Speicher: Standard */ }
    return { ...LABEL_STD, ...o };
  }
  function labelEinstSpeichern(o) { try { localStorage.setItem(LABEL_KEY, JSON.stringify(o)); } catch (e) { /* ignorieren */ } }
  function kunde4(name) {
    return String(name || '').replace(/^\s*(frau|herr|dr\.?|prof\.?|familie|fam\.?|firma|fa\.?)\s+/i, '').replace(/[^A-Za-zÄÖÜäöüß]/g, '').slice(0, 4).toUpperCase();
  }
  function labelText(dayDate, kunde, info) {
    const iso = KarteiLogik.parseDatumDE(dayDate);
    const zusatz = String(info || '').trim().slice(0, 20);   // optionale Zusatzinfo (nur beim Zwischendurch-Label)
    const k = kunde4(kunde);
    if (!iso) return { kunde: k, wt: '', datum: String(dayDate || '').trim().slice(0, 10), info: zusatz };
    const wt = (labelEinst().wochentag === 'kurz' ? WT_KURZ : WT_VOLL)[new Date(iso + 'T12:00:00').getDay()];
    return { kunde: k, wt, datum: `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`, info: zusatz };
  }
  function labelGroesse(e) {
    const breite = BAND_PUNKTE[e.band] || 70;
    const gesamt = Math.round(Math.max(parseFloat(e.laenge) || 24.5, 6) * LAENGS_DPI / 25.4);   // Labellänge in Zeilen; der Drucker fügt vorn und hinten je 2 mm Rand dazu
    return { breite, hoehe: Math.max(24, gesamt - 2 * RAND_PUNKTE) };
  }
  // Zeichnet das Label hochkant: Zeilen untereinander, jede so groß wie es in die Breite passt (Zeile 0 = Vorderkante, kommt zuerst aus dem Drucker)
  function labelBild(text, e, zeilenOverride) {
    const { breite, hoehe } = labelGroesse(e);
    const c = document.createElement('canvas'); c.width = breite; c.height = hoehe;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff'; g.fillRect(0, 0, breite, hoehe);
    g.scale(1, LAENGS_DPI / 180);   // gezeichnet wird in 180-dpi-Einheiten, damit die Buchstaben nicht gestaucht werden
    const lh = hoehe * 180 / LAENGS_DPI;
    g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const zeilen = zeilenOverride || [text.kunde, text.wt, text.datum, text.info].map((t, i) => ({ t, gewicht: i === 3 ? 0.75 : 1 })).filter(z => z.t);
    const slot = lh / Math.max(1, zeilen.length);
    zeilen.forEach((z, i) => {
      g.font = 'bold 100px Arial, Helvetica, sans-serif';
      const w100 = g.measureText(z.t).width || 1;
      const fs = Math.max(6, Math.min(100 * (breite - 4) / w100, slot * 0.8) * (z.gewicht || 1));
      g.font = `bold ${fs}px Arial, Helvetica, sans-serif`;
      g.fillText(z.t, z.links ? 2 + g.measureText(z.t).width / 2 : breite / 2, slot * (i + 0.5));
    });
    const px = g.getImageData(0, 0, breite, hoehe).data;
    const stride = Math.ceil(breite / 8), daten = new Uint8Array(stride * hoehe);
    for (let y = 0; y < hoehe; y++) for (let x = 0; x < breite; x++) {
      const p = (y * breite + x) * 4;
      if (px[p] * 0.3 + px[p + 1] * 0.59 + px[p + 2] * 0.11 < 150) daten[y * stride + (x >> 3)] |= 0x80 >> (x & 7);
    }
    return { breite, hoehe, daten, url: c.toDataURL('image/png') };
  }
  const base64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const helperUrl = (e, pfad) => `http://127.0.0.1:${e.port}${pfad}`;
  async function helperAnfrage(e, pfad, body) {
    const r = await fetch(helperUrl(e, pfad), {
      method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'X-KS-Label': '1' }, body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(j.fehler || ('Fehler ' + r.status));
    return j;
  }
  // Ersatzweg ohne Hilfsprogramm: dasselbe Bild über den Browser-Druckdialog (Papierformat im Druckertreiber passend einstellen)
  function druckeImBrowser(bild, e, n) {
    const bandMm = e.band, laenge = Math.max(bild.hoehe / LAENGS_DPI * 25.4, 24.5);
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    const d = f.contentDocument;
    d.open();
    d.write(`<!doctype html><html><head><meta charset="utf-8"><title>Labels</title><style>
      @page { size: ${bandMm}mm ${laenge}mm; margin: 0; }
      html, body { margin: 0; padding: 0; }
      .l { width: ${bandMm}mm; height: ${laenge}mm; display: flex; align-items: center; justify-content: center; page-break-after: always; break-after: page; }
      .l:last-child { page-break-after: auto; break-after: auto; }
      img { width: ${bild.breite / 180 * 25.4}mm; height: ${bild.hoehe / LAENGS_DPI * 25.4}mm; image-rendering: pixelated; }
    </style></head><body>${Array.from({ length: n }, () => `<div class="l"><img src="${bild.url}"></div>`).join('')}</body></html>`);
    d.close();
    setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); }, 250);
    setTimeout(() => f.remove(), 120000);
  }
  async function druckeLabels(text, anzahl, bildOverride) {
    const e = labelEinst();
    const n = Math.max(1, Math.min(99, anzahl | 0));
    const bild = bildOverride || labelBild(text, e);
    if (e.weg === 'browser') return druckeImBrowser(bild, e, n);
    try {
      await helperAnfrage(e, '/print', {   // alle Labels in einem Auftrag: ein Leerstück vorneweg, dann jedes Label einzeln geschnitten
        bandMm: e.band, breite: bild.breite, hoehe: bild.hoehe, daten: base64(bild.daten), anzahl: n, rand: RAND_PUNKTE, spiegelX: !!e.spiegelX, spiegelY: !!e.spiegelY, schnitt: e.schnitt,
      });
    } catch (err) {
      const unerreichbar = err instanceof TypeError;   // fetch ohne Antwort: Hilfsprogramm läuft nicht
      if (confirm((unerreichbar ? 'Das Label-Hilfsprogramm ist nicht erreichbar (Datei label-helper\\start-label-helper.cmd starten).' : 'Drucken fehlgeschlagen: ' + err.message) + '\n\nStattdessen über den Browser drucken?')) druckeImBrowser(bild, e, n);
    }
  }
  // Label-Dialog. schnell = true (Knopf "Label drucken"): Kunde und Datum sind frei änderbar, so geht es auch ohne geöffnetes Angebot.
  function labelDialog(titel, dayDate, mitInfo, schnell) {
    const e = labelEinst();
    const kunde0 = (draftEvent && draftEvent.name) || '';
    let text = labelText(dayDate, kunde0);
    const iso0 = KarteiLogik.parseDatumDE(dayDate) || KarteiLogik.heuteIso();
    const ov = document.createElement('div');
    ov.className = 'kmodal-ov';
    ov.innerHTML = `<div class="kmodal" style="max-width:420px">
      <h3>Label drucken</h3>
      ${titel ? `<p><strong>${esc(titel)}</strong></p>` : ''}
      <div class="label-vorschau" style="display:inline-block;border:1px solid var(--border-strong);padding:6px;border-radius:4px;background:#fff"><img alt="Label-Vorschau" style="display:block;image-rendering:pixelated"></div>
      ${schnell ? `<label>Kunde<input type="text" id="lblKunde" value="${esc(kunde0)}" placeholder="Name – die ersten 4 Buchstaben kommen aufs Label"></label>
      <label>Datum<input type="date" id="lblDatum" value="${esc(iso0)}"></label>` : ''}
      ${mitInfo ? '<label>Zusatzinfo auf dem Label (optional, kurz halten)<input type="text" id="lblInfo" maxlength="20" placeholder="z.B. Soße, 2 GN, Allergen"></label>' : ''}
      <label>Anzahl Labels<input type="number" id="lblAnz" min="1" max="99" value="1" inputmode="numeric" pattern="[0-9]*" enterkeyhint="done" style="font-size:20px"></label>
      <div class="actions-row"><button type="button" class="btn-primary" id="lblDruck">Drucken</button><button type="button" class="btn-ghost" id="lblNein">Abbrechen</button></div></div>`;
    document.body.appendChild(ov);
    const zu = () => ov.remove();
    const anz = ov.querySelector('#lblAnz');
    const info = ov.querySelector('#lblInfo');
    const kundeEl = ov.querySelector('#lblKunde'), datumEl = ov.querySelector('#lblDatum');
    const vorschau = () => { const b = labelBild(text, e); const img = ov.querySelector('.label-vorschau img'); img.src = b.url; img.style.width = b.breite * 1.1 + 'px'; img.style.height = b.hoehe * 1.1 + 'px'; };
    const neuerText = () => {
      let datum = dayDate;
      if (datumEl && /^\d{4}-\d{2}-\d{2}$/.test(datumEl.value)) datum = `${datumEl.value.slice(8, 10)}.${datumEl.value.slice(5, 7)}.${datumEl.value.slice(0, 4)}`;
      text = labelText(datum, kundeEl ? kundeEl.value : kunde0, info ? info.value : '');
      vorschau();
    };
    neuerText();
    [info, kundeEl, datumEl].filter(Boolean).forEach(el => el.addEventListener('input', neuerText));
    anz.focus(); anz.select();   // zuerst die Anzahl (am Handy nur der Ziffernblock); Kunde/Zusatzinfo antippen schaltet auf die normale Tastatur um
    const los = () => { const n = parseInt(anz.value, 10) || 0; zu(); if (n > 0) druckeLabels(text, n); };
    ov.querySelector('#lblDruck').onclick = los;
    ov.querySelector('#lblNein').onclick = zu;
    [anz, info, kundeEl].filter(Boolean).forEach(el => el.addEventListener('keydown', ev => { if (ev.key === 'Enter') los(); if (ev.key === 'Escape') zu(); }));
    ov.addEventListener('mousedown', ev => { if (ev.target === ov) zu(); });
  }
  function initLabelEinstellungen() {
    const el = id => document.getElementById(id);
    if (!el('lblBand')) return;
    const e = labelEinst();
    el('lblBand').value = String(e.band); el('lblLaenge').value = e.laenge;
    el('lblWochentag').value = e.wochentag; el('lblWeg').value = e.weg; el('lblSchnitt').value = e.schnitt; el('lblSpiegelX').checked = !!e.spiegelX; el('lblSpiegelY').checked = !!e.spiegelY;
    const speichern = () => labelEinstSpeichern({
      ...labelEinst(), band: parseFloat(el('lblBand').value) || 12,
      laenge: Math.max(6, parseFloat(el('lblLaenge').value) || 24.5),
      wochentag: el('lblWochentag').value, weg: el('lblWeg').value, schnitt: el('lblSchnitt').value, spiegelX: el('lblSpiegelX').checked, spiegelY: el('lblSpiegelY').checked,
    });
    ['lblBand', 'lblLaenge', 'lblWochentag', 'lblWeg', 'lblSchnitt', 'lblSpiegelX', 'lblSpiegelY'].forEach(id => el(id).addEventListener('change', speichern));
    el('lblTest').addEventListener('click', () => { speichern(); druckeLabels(labelText('13.11.2026', 'Beispiel GmbH'), 1); });
    // Ausrichtung prüfen: ein "F" links oben und eine Zeile "oben" – so sieht man, ob das Label gespiegelt oder auf dem Kopf kommt
    el('lblAusrichtung').addEventListener('click', () => {
      speichern();
      const e2 = labelEinst();
      const b = labelBild({}, e2, [{ t: 'oben', gewicht: 0.7 }, { t: 'F', gewicht: 1.4, links: true }, { t: 'unten', gewicht: 0.7 }]);
      druckeLabels({}, 1, b);
    });
    el('lblPruefen').addEventListener('click', async () => {
      const out = el('lblStatus'); out.textContent = 'prüfe …';
      try {
        const s = await helperAnfrage(labelEinst(), '/status');
        out.textContent = s.gefunden ? `Hilfsprogramm läuft. Drucker: ${s.drucker || '(Trockenlauf)'}` : `Hilfsprogramm läuft, aber kein Brother PT-Drucker gefunden. Vorhanden: ${s.alleDrucker.join(', ') || 'keine'}`;
      } catch (err) { out.textContent = err instanceof TypeError ? 'Hilfsprogramm nicht erreichbar – label-helper\\start-label-helper.cmd starten.' : 'Fehler: ' + err.message; }
    });
  }
  function init() {
    initLabelEinstellungen();
    const out = document.getElementById('kuecheOutput');
    out.addEventListener('click', e => {
      if (e.target.closest('.prod-info')) { infoOffen = !infoOffen; neuZeichnen(); return; }
      const chip = e.target.closest('.prod-chip');
      if (chip) {
        const k = key(chip.dataset.day, chip.dataset.dish, chip.dataset.comp);
        draftEvent.kompStatus = draftEvent.kompStatus || {};
        const next = REIHENFOLGE[(REIHENFOLGE.indexOf(status(k)) + 1) % REIHENFOLGE.length];
        if (next) draftEvent.kompStatus[k] = next; else delete draftEvent.kompStatus[k];
        persistDraftSoon();
        neuZeichnen();
        return;
      }
      const lb = e.target.closest('.todo-print');   // Drucker-Symbol oben beim Namen: Zwischendurch-Label
      if (lb) { labelManuell(lb.dataset.day); return; }
      if (e.target.closest('.prod-reset')) {
        if (!confirm('Alle Farbmarkierungen dieses Angebots zurücksetzen?')) return;
        draftEvent.kompStatus = {};
        persistDraftSoon();
        neuZeichnen();
      }
    });
  }
  // Label aus dem Druck-Symbol neben einem Tag (To-Do, Küchensheet): Name und Datum dieses Tags, optionale Zusatzinfo
  function labelManuell(dayId) {
    const day = ((draftEvent && draftEvent.days) || []).find(d => d.id === dayId) || ((draftEvent && draftEvent.days) || [])[0];
    labelDialog((draftEvent && draftEvent.name) || 'Veranstaltung', day ? day.date : '', true);
  }
  // Knopf "Label drucken" (immer verfügbar): nächster Veranstaltungstag des geöffneten Angebots, Kunde und Datum frei änderbar
  function labelSchnell() {
    const heute = KarteiLogik.heuteIso();
    const tage = ((draftEvent && draftEvent.days) || []).map(d => ({ d, iso: KarteiLogik.parseDatumDE(d.date) })).filter(x => x.iso);
    const kommend = tage.filter(x => x.iso >= heute).sort((a, b) => a.iso.localeCompare(b.iso))[0] || tage[0];
    const iso = kommend ? kommend.iso : heute;
    labelDialog('', `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`, true, true);
  }
  init();
  return { baue, html, neuZeichnen, labelManuell, labelSchnell };
})();
