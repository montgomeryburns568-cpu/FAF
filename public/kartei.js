// Archiv, Kundenkartei, Nachtrag und Überproduktions-Lager (Oberfläche). Logik: kartei-logik.js.
// Läuft nach app.js und nutzt dessen Globals (state, API, escHtml, normalize, switchTab, draftEvent ...).
const Kartei = (function () {
  const K = KarteiLogik;
  const $ = id => document.getElementById(id);
  const esc = s => escHtml(s);
  const num = (n, d = 1) => n == null || isNaN(n) ? '–' : (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toString().replace('.', ',');
  const eur = n => n == null ? '–' : num(n, 2) + ' €';
  const fmtIso = iso => K.isoToDE(iso);
  const ART_LABEL = { fleisch: 'Fleisch/Fisch', veg: 'vegetarisch' };
  const BROT_STUFEN = { weniger: 'weniger Brot (×0,8)', normal: 'normal', mehr: 'mehr Brot (×1,25)', vielmehr: 'viel mehr Brot (×1,5)' };
  const EINHEITEN = ['kg', 'g', 'l', 'Stk', 'Portionen', 'GN', 'Blech', 'Packung'];
  let sub = 'angebote';
  let offenKunde = null;          // aufgeklappter Kunde (Schlüssel)
  let lagerAlle = false;
  let ideenOffen = new Set();

  const artFn = d => (typeof hauptgangArt === 'function' ? hauptgangArt(d) : 'veg');
  const komponenten = () => window._katalogKomp || [];
  const heute = () => K.heuteIso();

  function gruppen() { return K.kundenGruppieren(state.archiv || [], state.kunden || []); }
  function gruppeFuerName(name) {
    const k = K.kundenKey(name);
    return gruppen().find(g => g.keys.some(x => K.gleicherKunde(x, k))) || null;
  }
  async function speichereKunden() { state.kunden = await API.send('PUT', '/api/kunden', state.kunden); }
  async function ladeArchiv() { try { state.archiv = (await API.get('/api/archiv')).filter(e => !e.ausgeblendet); } catch (e) { /* offline */ } }
  function eintragById(id) { return (state.archiv || []).find(e => e.id === id); }
  async function speichereEintrag(e) {
    const saved = await API.send('PUT', '/api/archiv/' + e.id, e);
    const i = state.archiv.findIndex(x => x.id === e.id); if (i >= 0) state.archiv[i] = saved;
    return saved;
  }

  // ---------- Unter-Navigation ----------
  function setSub(name) {
    sub = name;
    document.querySelectorAll('#archivSubnav .subtab-btn').forEach(b => b.classList.toggle('active', b.dataset.sub === name));
    document.querySelectorAll('.subpanel').forEach(p => p.classList.toggle('active', p.id === 'sub-' + name));
    render();
  }

  // ---------- Angebote ----------
  function nachtragOffen(e) {
    const iso = e.eventDateIso; return !e.nachtrag && iso && iso < heute() && !e.keinNachtrag;
  }
  function renderAngebote() {
    const out = $('archivList'); if (!out) return;
    const q = normalize($('archivSearch').value);
    const f = $('archivFilter').value;
    let items = (state.archiv || []).filter(e => {
      if (f === 'offen' && !nachtragOffen(e)) return false;
      if (f === 'nachtrag' && !e.nachtrag) return false;
      if (f === 'pdf' && e.source === 'generator') return false;
      if (f === 'generator' && e.source !== 'generator') return false;
      if (!q) return true;
      return normalize(e.customerName || '').includes(q) || (e.dishes || []).some(d => normalize(d.name).includes(q));
    });
    items = items.sort((a, b) => (b.eventDateIso || b.uploadedAt || '').localeCompare(a.eventDateIso || a.uploadedAt || ''));
    const offen = (state.archiv || []).filter(nachtragOffen).length;
    $('archivCount').textContent = `${items.length} von ${(state.archiv || []).length} Angeboten${offen ? ' · ' + offen + ' Nachträge offen' : ''}`;
    $('archivKeinNTBtn').style.display = f === 'offen' && items.length ? '' : 'none';
    out.innerHTML = items.map(e => {
      const n = e.nachtrag;
      const quelle = e.source === 'generator' ? 'Küchensheet-Generator' : e.pathname ? 'PDF' : 'Text';
      return `<div class="archiv-item" data-id="${esc(e.id)}">
        <div class="archiv-item-title"><span>${esc(e.customerName || 'Unbekannt')}${e.eventDate ? ' · ' + esc(e.eventDate) : ''}</span><span>${e.totalPrice != null ? eur(e.totalPrice) : ''}</span></div>
        <div class="archiv-item-meta">${e.personen ? e.personen + ' Personen · ' : ''}${(e.dishes || []).length} Gerichte · ${quelle}
          ${n ? ' · <span class="badge badge-ok">Nachtrag erfasst</span>' : nachtragOffen(e) ? ' · <span class="badge badge-warn">Nachtrag offen</span>' : ''}
          ${n && n.ueberproduktion && n.ueberproduktion.length ? ' · <span class="badge">' + n.ueberproduktion.length + ' Überproduktion</span>' : ''}</div>
        <div class="archiv-item-dishes">${(e.dishes || []).map(d => esc(d.name) + (d.price != null ? ` (${num(d.price, 2)}€)` : '')).join(', ')}</div>
        ${n ? nachtragKurz(n) : ''}
        <div class="archiv-item-actions">
          <button type="button" class="btn-primary small-btn" data-act="nachtrag">${n ? 'Nachtrag ansehen/bearbeiten' : 'Nachtrag ausfüllen'}</button>
          <button type="button" class="btn-ghost small-btn" data-act="edit">Bearbeiten</button>
          <button type="button" class="btn-ghost small-btn" data-act="kunde">Kundenkartei</button>
          ${e.pathname ? `<a class="btn-ghost small-btn" href="/api/archiv/${esc(e.id)}/pdf" target="_blank" rel="noopener">PDF ansehen</a>` : ''}
          ${e.source === 'generator' && e.eventId ? `<button type="button" class="btn-ghost small-btn" data-act="oeffnen">Im Generator öffnen</button>` : ''}
          <button type="button" class="btn-danger small-btn" data-act="loeschen">Löschen</button>
        </div>
      </div>`;
    }).join('') || '<p class="hint">Keine Angebote gefunden.</p>';
  }
  function nachtragKurz(n) {
    const z = [];
    if (n.gaesteTatsaechlich) z.push(`Gäste tatsächlich: ${n.gaesteTatsaechlich}`);
    if (n.bewertung) z.push('★'.repeat(n.bewertung));
    if (n.brot) z.push('Brot: ' + { zuwenig: 'zu wenig', passend: 'passend', zuviel: 'zu viel' }[n.brot]);
    if (n.fleischVeg) z.push({ fleisch: 'mehr Fleisch gewünscht', passend: 'Fleisch/Veg passend', veg: 'mehr vegetarisch gewünscht' }[n.fleischVeg]);
    const ue = (n.ueberproduktion || []).map(u => `${esc(u.name)} ${u.menge != null ? num(u.menge) + ' ' + esc(u.einheit || '') : ''}${u.status && u.status !== 'offen' ? ' (' + u.status + ')' : ''}`);
    const un = (n.unterproduktion || []).map(u => esc(u.name));
    return `<div class="nachtrag-kurz">
      ${z.length ? `<div>${z.join(' · ')}</div>` : ''}
      ${ue.length ? `<div><strong>Überproduktion:</strong> ${ue.join(', ')}</div>` : ''}
      ${un.length ? `<div><strong>Unterproduktion:</strong> ${un.join(', ')}</div>` : ''}
      ${n.besonderheiten ? `<div><strong>Besonderheiten:</strong> ${esc(n.besonderheiten)}</div>` : ''}
      ${n.feedback ? `<div><strong>Feedback:</strong> ${esc(n.feedback)}</div>` : ''}
    </div>`;
  }

  // ---------- Import (PDF) ----------
  let archivDraft = null;
  function dishPriceRowHTML(d) {
    return `<div class="dish-price-row">
      <input type="text" class="ad-dish-name" value="${esc(d?.name || '')}" placeholder="Gericht" data-cat="${esc(d?.category || '')}">
      <input type="number" class="ad-dish-price" value="${d?.price ?? ''}" step="0.01" min="0" placeholder="Preis (€)">
      <button type="button" class="btn-ghost rm small-btn">✕</button>
    </div>`;
  }
  function renderDishPriceRows(dishes) { $('adDishRows').innerHTML = (dishes && dishes.length ? dishes : [{}]).map(dishPriceRowHTML).join(''); }
  function geparsteGerichte(parsed) {
    const map = new Map();
    parsed.days.forEach(day => day.dishes.forEach(d => { if (d.name && !map.has(normalize(d.name))) map.set(normalize(d.name), { name: d.name, category: d.category || null, price: null, personen: d.personen || null }); }));
    return Array.from(map.values());
  }
  async function pdfLesen(file) {
    const buf = await file.arrayBuffer();
    const r = await fetch('/api/archiv/upload', { method: 'POST', headers: { 'content-type': 'application/pdf', 'x-filename': encodeURIComponent(file.name) }, credentials: 'include', body: buf });
    if (r.status === 401) { showLogin(); throw new Error('Nicht angemeldet.'); }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
    return r.json();
  }
  // "Angebot Tokonoma Club - 21.05.2026.pdf" -> "Tokonoma Club" (der Kunde steht im Dateinamen oft verlässlicher als der
  // Ansprechpartner im Angebotstext); sonst Name aus dem Angebot
  function kundeAusDateiname(fn) {
    return fn.replace(/\.pdf$/i, '').replace(/^(angebot|küchensheet|kuechensheet)[-_ ]*/i, '').split(/\s[-–]\s/)[0]
      .replace(/\([^)]*\)/g, ' ').replace(/\d{1,2}\.\d{1,2}\.(\d{2,4})?[-.\d]*/g, ' ').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').replace(/[\s\-–.]+$/, '').trim() || 'Unbekannt';
  }
  function kundenName(file, parsed) {
    const ausDatei = kundeAusDateiname(file.name);
    return /^(angebot|küchensheet|kuechensheet)/i.test(file.name) && ausDatei !== 'Unbekannt' ? ausDatei : (parsed.name || ausDatei);
  }
  async function einzelnerImport(file) {
    const statusEl = $('archivImportStatus');
    const result = await pdfLesen(file);
    const parsed = parseDocument(result.text, result.filename);
    archivDraft = {
      filename: result.filename, pathname: result.pathname, rawText: result.text,
      customerName: kundenName(file, parsed), eventDate: parsed.days[0]?.date || '', personen: parsed.personen,
      dishes: geparsteGerichte(parsed), totalPrice: extractTotalPrice(result.text),
    };
    $('adKunde').value = archivDraft.customerName || '';
    $('adDatum').value = archivDraft.eventDate || '';
    $('adPersonen').value = archivDraft.personen || '';
    $('adGesamtpreis').value = archivDraft.totalPrice ?? '';
    renderDishPriceRows(archivDraft.dishes);
    $('archivDraftForm').style.display = '';
    statusEl.textContent = '✅ Erkannt – bitte prüfen, Preise ergänzen und speichern.';
  }
  // Mehrere PDFs auf einmal: automatisch erkennen und archivieren; bereits vorhandene Angebote (gleicher Kunde + Datum
  // bzw. gleiche Datei) werden ergänzt statt doppelt angelegt.
  async function massenImport(files) {
    const statusEl = $('archivImportStatus');
    let neu = 0, ergaenzt = 0, fehler = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      statusEl.textContent = `📄 ${i + 1}/${files.length}: ${file.name} …`;
      try {
        const result = await pdfLesen(file);
        const parsed = parseDocument(result.text, result.filename);
        if (!parsed.days.length) { fehler.push(file.name + ' (keine Gerichte erkannt)'); continue; }
        const name = kundenName(file, parsed);
        const dat = parsed.days[0]?.date || '';
        const iso = K.parseDatumDE(dat) || K.parseDatumDE(file.name);
        const fnKey = normalize(file.name).replace(/\s+/g, '');
        const k = K.kundenKey(name);
        const vorhanden = (state.archiv || []).find(e => (e.filename && normalize(e.filename).replace(/\s+/g, '') === fnKey)
          || (iso && e.eventDateIso === iso && K.gleicherKunde(K.kundenKey(e.customerName), k)));
        const gerichte = geparsteGerichte(parsed);
        if (vorhanden) {
          if (vorhanden.pathname && vorhanden.rawText) continue;   // schon vollständig archiviert
          await speichereEintrag({ ...vorhanden, filename: result.filename, pathname: result.pathname, rawText: result.text, totalPrice: vorhanden.totalPrice ?? extractTotalPrice(result.text) });
          ergaenzt++;
        } else {
          const saved = await API.send('POST', '/api/archiv', {
            source: 'pdf', filename: result.filename, pathname: result.pathname, rawText: result.text, customerName: name,
            eventDate: dat || (iso ? K.isoToDE(iso) : ''), eventDateIso: iso, personen: parsed.personen || null,
            totalPrice: extractTotalPrice(result.text), dishes: gerichte,
          });
          state.archiv.push(saved); neu++;
        }
      } catch (err) { fehler.push(file.name + ' (' + err.message + ')'); }
    }
    statusEl.innerHTML = `✅ ${neu} neu archiviert, ${ergaenzt} ergänzt${fehler.length ? ' · ⚠️ ' + fehler.length + ' nicht importiert: ' + esc(fehler.slice(0, 5).join('; ')) : ''}`;
    render();
  }
  function initImport() {
    $('archivFileInput').addEventListener('change', async e => {
      const files = Array.from(e.target.files || []); if (!files.length) return;
      try { if (files.length === 1) { $('archivImportStatus').textContent = '📄 PDF wird gelesen …'; await einzelnerImport(files[0]); } else await massenImport(files); }
      catch (err) { $('archivImportStatus').textContent = '❌ ' + err.message; }
      e.target.value = '';
    });
    $('adAddDishBtn').addEventListener('click', () => $('adDishRows').insertAdjacentHTML('beforeend', dishPriceRowHTML({})));
    $('adDishRows').addEventListener('click', e => { if (e.target.classList.contains('rm')) e.target.closest('.dish-price-row').remove(); });
    $('adCancelBtn').addEventListener('click', () => { archivDraft = null; $('archivDraftForm').style.display = 'none'; $('archivImportStatus').textContent = ''; });
    $('adSaveBtn').addEventListener('click', async () => {
      if (!archivDraft) return;
      const dishes = Array.from(document.querySelectorAll('#adDishRows .dish-price-row')).map(row => ({
        name: row.querySelector('.ad-dish-name').value.trim(), category: row.querySelector('.ad-dish-name').dataset.cat || null,
        price: row.querySelector('.ad-dish-price').value ? parseFloat(row.querySelector('.ad-dish-price').value) : null,
      })).filter(d => d.name);
      const datum = $('adDatum').value.trim();
      const saved = await API.send('POST', '/api/archiv', {
        source: 'pdf', filename: archivDraft.filename, pathname: archivDraft.pathname, rawText: archivDraft.rawText,
        customerName: $('adKunde').value.trim() || 'Unbekannt', eventDate: datum, eventDateIso: K.parseDatumDE(datum),
        personen: $('adPersonen').value ? parseInt($('adPersonen').value, 10) : null,
        totalPrice: $('adGesamtpreis').value ? parseFloat($('adGesamtpreis').value) : null, dishes,
      });
      state.archiv.push(saved);
      archivDraft = null; $('archivDraftForm').style.display = 'none';
      $('archivImportStatus').textContent = '✅ Im Archiv gespeichert.';
      render();
    });
    $('archivSearch').addEventListener('input', renderAngebote);
    $('archivFilter').addEventListener('change', renderAngebote);
    // Alte/Probe-Angebote, für die kein Nachtrag mehr erfasst werden soll, sammelt man mit einem Klick ab
    $('archivKeinNTBtn').addEventListener('click', async () => {
      const q = normalize($('archivSearch').value);
      const ziel = (state.archiv || []).filter(e => nachtragOffen(e) && (!q || normalize(e.customerName || '').includes(q) || (e.dishes || []).some(d => normalize(d.name).includes(q))));
      if (!ziel.length || !confirm(`${ziel.length} angezeigte Angebote als „kein Nachtrag nötig“ markieren?`)) return;
      for (const e of ziel) await speichereEintrag({ ...e, keinNachtrag: true });
      render();
    });
    $('archivList').addEventListener('click', async e => {
      const btn = e.target.closest('[data-act]'); if (!btn) return;
      const id = btn.closest('.archiv-item').dataset.id; const eintrag = eintragById(id); if (!eintrag) return;
      if (btn.dataset.act === 'nachtrag') nachtragOeffnen(id);
      else if (btn.dataset.act === 'edit') eintragBearbeiten(id);
      else if (btn.dataset.act === 'kunde') { const g = gruppeFuerName(eintrag.customerName); offenKunde = g ? g.key : null; setSub('kunden'); }
      else if (btn.dataset.act === 'oeffnen') {
        const ev = state.events.find(x => x.id === eintrag.eventId);
        if (!ev) return alert('Dieses Angebot wurde im Generator gelöscht – es bleibt nur im Archiv erhalten.');
        $('eventSelect').value = ev.id; $('eventSelect').dispatchEvent(new Event('change')); switchTab('angebot');
      } else if (btn.dataset.act === 'loeschen') {
        if (!confirm('Diesen Archiv-Eintrag inkl. PDF und Nachtrag wirklich löschen?')) return;
        if (eintrag.eventId) await API.send('PUT', '/api/archiv/' + id, { ...eintrag, ausgeblendet: true });   // bleibt als Merker bestehen, damit der Abgleich mit dem Generator ihn nicht neu anlegt
        else await API.send('DELETE', '/api/archiv/' + id);
        state.archiv = state.archiv.filter(x => x.id !== id);
        render();
      }
    });
  }

  // ---------- Modal ----------
  function modal(html, onReady) {
    closeModal();
    const ov = document.createElement('div'); ov.className = 'kmodal-ov'; ov.id = 'kmodal';
    ov.innerHTML = `<div class="kmodal">${html}</div>`;
    ov.addEventListener('mousedown', e => { if (e.target === ov) closeModal(); });
    document.body.appendChild(ov);
    if (onReady) onReady(ov.querySelector('.kmodal'));
    return ov;
  }
  function closeModal() { const m = $('kmodal'); if (m) m.remove(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  function eintragBearbeiten(id) {
    const e = eintragById(id);
    modal(`<h3>Eintrag bearbeiten</h3>
      <label>Kunde<input type="text" id="mbKunde" value="${esc(e.customerName)}"></label>
      <div class="field-row"><label>Datum<input type="text" id="mbDatum" value="${esc(e.eventDate || '')}" placeholder="TT.MM.JJJJ"></label>
      <label>Personen<input type="number" id="mbPers" value="${e.personen ?? ''}" min="0"></label>
      <label>Gesamtpreis (€)<input type="number" id="mbPreis" value="${e.totalPrice ?? ''}" step="0.01" min="0"></label></div>
      <p class="hint">Preise je Gericht:</p>
      <div id="mbDishes">${(e.dishes || []).map(dishPriceRowHTML).join('')}</div>
      <div class="actions-row"><button class="btn-primary" id="mbSave">Speichern</button><button class="btn-ghost" id="mbCancel">Abbrechen</button></div>`, m => {
      m.querySelector('#mbDishes').addEventListener('click', ev => { if (ev.target.classList.contains('rm')) ev.target.closest('.dish-price-row').remove(); });
      m.querySelector('#mbCancel').onclick = closeModal;
      m.querySelector('#mbSave').onclick = async () => {
        const datum = m.querySelector('#mbDatum').value.trim();
        const dishes = Array.from(m.querySelectorAll('#mbDishes .dish-price-row')).map(row => ({
          name: row.querySelector('.ad-dish-name').value.trim(), category: row.querySelector('.ad-dish-name').dataset.cat || null,
          price: row.querySelector('.ad-dish-price').value ? parseFloat(row.querySelector('.ad-dish-price').value) : null,
        })).filter(d => d.name);
        await speichereEintrag({ ...e, customerName: m.querySelector('#mbKunde').value.trim() || 'Unbekannt', eventDate: datum, eventDateIso: K.parseDatumDE(datum),
          personen: m.querySelector('#mbPers').value ? parseInt(m.querySelector('#mbPers').value, 10) : null,
          totalPrice: m.querySelector('#mbPreis').value ? parseFloat(m.querySelector('#mbPreis').value) : null, dishes, manuell: true });
        closeModal(); render();
      };
    });
  }

  // ---------- Nachtrag ----------
  function ueRowHTML(u) {
    return `<div class="nt-row ue-row" data-id="${esc(u.id)}">
      <input type="text" class="ue-name" list="ueNamen" value="${esc(u.name)}" placeholder="Was ist übrig? (z.B. Kartoffeln)">
      <input type="number" class="ue-menge" value="${u.menge ?? ''}" step="any" min="0" placeholder="Menge">
      <select class="ue-einheit">${EINHEITEN.map(x => `<option ${x === u.einheit ? 'selected' : ''}>${x}</option>`).join('')}</select>
      <select class="ue-klasse" title="Haltbarkeit">${Object.entries(K.LAGER_KLASSEN).map(([k, v]) => `<option value="${k}" ${k === u.klasse ? 'selected' : ''}>${esc(v.label)} – ${v.tage} T</option>`).join('')}</select>
      <input type="text" class="ue-notiz" value="${esc(u.notiz || '')}" placeholder="Notiz (z.B. gekühlt, GN 1/1)">
      <input type="hidden" class="ue-status" value="${esc(u.status || 'offen')}"><input type="hidden" class="ue-bis" value="${esc(u.haltbarBis || '')}">
      <button type="button" class="btn-ghost small-btn nt-rm">✕</button></div>`;
  }
  function unRowHTML(u) {
    return `<div class="nt-row un-row"><input type="text" class="un-name" value="${esc(u.name || '')}" placeholder="Was war zu wenig? (z.B. Brot, vegetarische Portionen)">
      <input type="text" class="un-notiz" value="${esc(u.notiz || '')}" placeholder="Notiz"><button type="button" class="btn-ghost small-btn nt-rm">✕</button></div>`;
  }
  function nachtragOeffnen(id) {
    const e = eintragById(id); if (!e) return;
    const n = e.nachtrag ? JSON.parse(JSON.stringify(e.nachtrag)) : K.neuerNachtrag();
    const gerichte = (e.dishes || []).map(d => d.name);
    const chips = gerichte.map(g => `<button type="button" class="chip" data-g="${esc(g)}">+ ${esc(g)}</button>`).join('');
    modal(`<h3>Nachtrag · ${esc(e.customerName)}${e.eventDate ? ' · ' + esc(e.eventDate) : ''}</h3>
      <p class="hint">${e.personen ? e.personen + ' Personen geplant · ' : ''}${gerichte.length} Gerichte. Je mehr Details, desto genauer die nächste Kalkulation für diesen Kunden.</p>
      <div class="field-row">
        <label>Gäste tatsächlich<input type="number" id="ntGaeste" min="0" value="${n.gaesteTatsaechlich ?? ''}"></label>
        <label>Gesamteindruck<select id="ntBew"><option value="">–</option>${[5, 4, 3, 2, 1].map(i => `<option value="${i}" ${n.bewertung === i ? 'selected' : ''}>${'★'.repeat(i)}</option>`).join('')}</select></label>
        <label>Brot<select id="ntBrot"><option value="">–</option><option value="zuwenig" ${n.brot === 'zuwenig' ? 'selected' : ''}>zu wenig</option><option value="passend" ${n.brot === 'passend' ? 'selected' : ''}>passend</option><option value="zuviel" ${n.brot === 'zuviel' ? 'selected' : ''}>zu viel</option></select></label>
        <label>Fleisch / Vegetarisch<select id="ntFv"><option value="">–</option><option value="fleisch" ${n.fleischVeg === 'fleisch' ? 'selected' : ''}>mehr Fleisch gewünscht</option><option value="passend" ${n.fleischVeg === 'passend' ? 'selected' : ''}>passend</option><option value="veg" ${n.fleischVeg === 'veg' ? 'selected' : ''}>mehr vegetarisch gewünscht</option></select></label>
      </div>
      <h4>Überproduktion – was ist übrig?</h4>
      <datalist id="ueNamen">${gerichte.map(g => `<option value="${esc(g)}">`).join('')}</datalist>
      <div id="ntUe">${(n.ueberproduktion || []).map(ueRowHTML).join('')}</div>
      <div class="nt-add"><button type="button" class="btn-ghost small-btn" id="ntUeAdd">+ Posten</button> <span class="hint">Schnell aus dem Angebot:</span> ${chips}</div>
      <h4>Unterproduktion – was hat gefehlt?</h4>
      <div id="ntUn">${(n.unterproduktion || []).map(unRowHTML).join('')}</div>
      <button type="button" class="btn-ghost small-btn" id="ntUnAdd">+ Posten</button>
      <label>Besonderheiten (Allergien, Wünsche, Ablauf, Logistik …)<textarea id="ntBes" rows="3">${esc(n.besonderheiten || '')}</textarea></label>
      <label>Feedback des Kunden<textarea id="ntFb" rows="2">${esc(n.feedback || '')}</textarea></label>
      <label>Merkmale für die Kundenkartei (Komma getrennt – z.B. „isst viel Brot, kein Schweinefleisch, kommt später“)<input type="text" id="ntTags" value="${esc((n.kundenTags || []).join(', '))}"></label>
      <div class="actions-row"><button class="btn-primary" id="ntSave">Nachtrag speichern</button><button class="btn-ghost" id="ntCancel">Abbrechen</button>
        ${e.nachtrag ? '<button class="btn-danger" id="ntDel" style="margin-left:auto">Nachtrag löschen</button>' : ''}</div>`, m => {
      const ue = m.querySelector('#ntUe'), un = m.querySelector('#ntUn');
      m.querySelector('#ntUeAdd').onclick = () => ue.insertAdjacentHTML('beforeend', ueRowHTML(K.neuesLagerItem('')));
      m.querySelector('#ntUnAdd').onclick = () => un.insertAdjacentHTML('beforeend', unRowHTML({}));
      m.querySelectorAll('.chip').forEach(c => c.onclick = () => ue.insertAdjacentHTML('beforeend', ueRowHTML(K.neuesLagerItem(c.dataset.g))));
      m.addEventListener('click', ev => { if (ev.target.classList.contains('nt-rm')) ev.target.closest('.nt-row').remove(); });
      // Lagerart passend zum Namen vorschlagen, solange der Nutzer sie nicht selbst geändert hat
      ue.addEventListener('change', ev => {
        const row = ev.target.closest('.ue-row'); if (!row) return;
        if (ev.target.classList.contains('ue-klasse')) row.dataset.manuell = '1';
        if (ev.target.classList.contains('ue-name') && !row.dataset.manuell) row.querySelector('.ue-klasse').value = K.lagerklasseRaten(ev.target.value);
      });
      m.querySelector('#ntCancel').onclick = closeModal;
      if (e.nachtrag) m.querySelector('#ntDel').onclick = async () => {
        if (!confirm('Nachtrag inkl. Überproduktions-Posten löschen?')) return;
        await speichereEintrag({ ...e, nachtrag: null }); closeModal(); render();
      };
      m.querySelector('#ntSave').onclick = async () => {
        const g = m.querySelector('#ntGaeste').value;
        const neu = {
          ...n, erfasstAm: n.erfasstAm || new Date().toISOString(), gaesteTatsaechlich: g ? parseInt(g, 10) : null,
          bewertung: m.querySelector('#ntBew').value ? parseInt(m.querySelector('#ntBew').value, 10) : null,
          brot: m.querySelector('#ntBrot').value, fleischVeg: m.querySelector('#ntFv').value,
          ueberproduktion: Array.from(ue.querySelectorAll('.ue-row')).map(r => ({
            id: r.dataset.id, name: r.querySelector('.ue-name').value.trim(), menge: r.querySelector('.ue-menge').value ? parseFloat(r.querySelector('.ue-menge').value) : null,
            einheit: r.querySelector('.ue-einheit').value, klasse: r.querySelector('.ue-klasse').value, notiz: r.querySelector('.ue-notiz').value.trim(),
            status: r.querySelector('.ue-status').value || 'offen', haltbarBis: r.querySelector('.ue-bis').value || null,
          })).filter(u => u.name),
          unterproduktion: Array.from(un.querySelectorAll('.un-row')).map(r => ({ name: r.querySelector('.un-name').value.trim(), notiz: r.querySelector('.un-notiz').value.trim() })).filter(u => u.name),
          besonderheiten: m.querySelector('#ntBes').value.trim(), feedback: m.querySelector('#ntFb').value.trim(),
          kundenTags: m.querySelector('#ntTags').value.split(',').map(t => t.trim()).filter(Boolean),
        };
        await speichereEintrag({ ...e, nachtrag: neu });
        await tagsInProfil(e.customerName, neu.kundenTags);
        closeModal(); render();
      };
    });
  }
  async function tagsInProfil(name, tags) {
    if (!tags || !tags.length) return;
    const g = gruppeFuerName(name);
    let p = g && g.profil;
    if (!p) { p = { id: uid(), name, aliase: [], tags: [], brot: 'normal', vegAnteil: null, herkunft: '', typ: '', kontakt: '', notiz: '' }; state.kunden.push(p); }
    p.tags = Array.from(new Set((p.tags || []).concat(tags)));
    await speichereKunden();
  }

  // ---------- Kunden ----------
  function renderKunden() {
    const out = $('archivKunden'); if (!out) return;
    const q = normalize($('kundenSuche').value);
    const gs = gruppen().map(g => ({ g, st: K.kundenStatistik(g.eintraege, artFn) }))
      .filter(x => !q || normalize(x.g.name).includes(q) || (x.g.profil && (x.g.profil.tags || []).some(t => normalize(t).includes(q)) ))
      .sort((a, b) => b.st.anzahl - a.st.anzahl || a.g.name.localeCompare(b.g.name));
    const wied = gs.filter(x => x.st.anzahl >= 2).length;
    $('kundenCount').textContent = `${gs.length} Kunden · ${wied} wiederkehrend`;
    out.innerHTML = gs.map(({ g, st }) => {
      const p = g.profil || {};
      const offen = offenKunde === g.key;
      return `<div class="kunde-card ${offen ? 'open' : ''}" data-key="${esc(g.key)}">
        <div class="kunde-head" data-act="toggle"><div><strong>${esc(g.name)}</strong>
          ${st.anzahl >= 2 ? `<span class="badge badge-ok">${st.anzahl}× Kunde</span>` : st.anzahl === 1 ? '<span class="badge">1 Veranstaltung</span>' : '<span class="badge">neu angelegt</span>'}
          ${(p.tags || []).map(t => `<span class="tag-chip">${esc(t)}</span>`).join('')}</div>
          <div class="hint">${st.letzter ? 'zuletzt ' + fmtIso(st.letzter) : ''}${st.personenSchnitt ? ' · Ø ' + num(st.personenSchnitt, 0) + ' Pers.' : ''}${st.preisProPerson ? ' · Ø ' + eur(st.preisProPerson) + '/Pers.' : ''}</div></div>
        ${offen ? kundeDetail(g, st) : ''}
      </div>`;
    }).join('') || '<p class="hint">Noch keine Kunden – sie entstehen automatisch aus den Angeboten.</p>';
  }
  function kundeDetail(g, st) {
    const p = g.profil || { tags: [], brot: 'normal' };
    const fv = st.fleisch + st.veg;
    const andere = gruppen().filter(x => x.key !== g.key);
    return `<div class="kunde-detail">
      <div class="kunde-cols">
        <div>
          <h4>Profil</h4>
          <label>Name<input type="text" class="kp-name" value="${esc(p.name || g.name)}"></label>
          <div class="field-row"><label>Art (Firma, Privat, Hochzeit …)<input type="text" class="kp-typ" value="${esc(p.typ || '')}"></label>
          <label>Herkunft / Esskultur<input type="text" class="kp-herkunft" value="${esc(p.herkunft || '')}" placeholder="z.B. türkisch, indisch, regional"></label></div>
          <label>Vorlieben &amp; No-Gos (Komma getrennt)<input type="text" class="kp-tags" value="${esc((p.tags || []).join(', '))}" placeholder="kein Schwein, kein Rind, halal, vegetarisch-lastig, isst viel Brot"></label>
          <div class="field-row"><label>Brotverbrauch<select class="kp-brot">${Object.entries(BROT_STUFEN).map(([k, v]) => `<option value="${k}" ${(p.brot || 'normal') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          <label>Vegetarisch-Anteil Hauptgang (%)<input type="number" class="kp-veg" min="0" max="100" value="${p.vegAnteil ?? ''}" placeholder="Standard 33"></label></div>
          <label>Ansprechpartner / Kontakt<input type="text" class="kp-kontakt" value="${esc(p.kontakt || '')}"></label>
          <label>Notizen<textarea class="kp-notiz" rows="3">${esc(p.notiz || '')}</textarea></label>
          <div class="actions-row"><button type="button" class="btn-primary small-btn" data-act="profil-speichern">Profil speichern</button>
            <select class="kp-merge"><option value="">Mit anderem Kunden zusammenführen …</option>${andere.map(x => `<option value="${esc(x.key)}">${esc(x.name)}</option>`).join('')}</select>
            <button type="button" class="btn-ghost small-btn" data-act="merge">Zusammenführen</button></div>
          ${(p.aliase || []).length ? `<p class="hint">Auch bekannt als: ${(p.aliase || []).map(esc).join(', ')}</p>` : ''}
        </div>
        <div>
          <h4>Auswertung</h4>
          <table class="analytics-table"><tbody>
            <tr><td>Veranstaltungen</td><td>${st.anzahl}${st.erster ? ` (seit ${fmtIso(st.erster)})` : ''}</td></tr>
            <tr><td>Ø Abstand</td><td>${st.intervallTage != null ? num(st.intervallTage, 0) + ' Tage' : '–'}</td></tr>
            <tr><td>Gäste gesamt / Ø</td><td>${st.personenSumme || '–'} / ${st.personenSchnitt ? num(st.personenSchnitt, 0) : '–'}</td></tr>
            <tr><td>Ø Angebotssumme / pro Person</td><td>${eur(st.preisSchnitt)} / ${eur(st.preisProPerson)}</td></tr>
            <tr><td>Hauptgänge Fleisch/Fisch : vegetarisch</td><td>${fv ? `${st.fleisch} : ${st.veg} (${num(100 * st.fleisch / fv, 0)} % : ${num(100 * st.veg / fv, 0)} %)` : '–'}</td></tr>
            <tr><td>Nachträge</td><td>${st.nachtraege} von ${st.anzahl}${st.gaesteFaktor ? ` · Gäste im Schnitt ${num(100 * st.gaesteFaktor, 0)} % der Planung` : ''}</td></tr>
            <tr><td>Brot-Rückmeldungen</td><td>${Object.entries(st.brot).map(([k, v]) => `${{ zuwenig: 'zu wenig', passend: 'passend', zuviel: 'zu viel' }[k]}: ${v}×`).join(', ') || '–'}</td></tr>
            <tr><td>Überproduktion (häufig)</td><td>${st.ueberproduktion.slice(0, 5).map(u => esc(u.name) + ' ' + u.anzahl + '×').join(', ') || '–'}</td></tr>
            <tr><td>Unterproduktion</td><td>${Array.from(new Set(st.unterproduktion)).map(esc).join(', ') || '–'}</td></tr>
          </tbody></table>
          <h4>Beliebte Gerichte</h4>
          <div>${st.topGerichte.map(t => `<span class="tag-chip">${esc(t.name)}${t.anzahl > 1 ? ' ×' + t.anzahl : ''}</span>`).join('') || '<span class="hint">–</span>'}</div>
          ${st.besonderheiten.length ? `<h4>Besonderheiten aus Nachträgen</h4><ul>${st.besonderheiten.map(b => `<li><span class="hint">${esc(b.datum)}:</span> ${esc(b.text)}</li>`).join('')}</ul>` : ''}
        </div>
      </div>
      <h4>Veranstaltungen</h4>
      ${g.eintraege.slice().sort((a, b) => (b.eventDateIso || '').localeCompare(a.eventDateIso || '')).map(e => `<div class="kunde-event"><strong>${esc(e.eventDate || 'ohne Datum')}</strong> · ${e.personen || '?'} Pers. · ${(e.dishes || []).map(d => esc(d.name)).join(', ')}
        <button type="button" class="btn-ghost small-btn" data-act="nachtrag" data-id="${esc(e.id)}">${e.nachtrag ? 'Nachtrag' : 'Nachtrag ausfüllen'}</button></div>`).join('') || '<p class="hint">Noch keine Veranstaltungen.</p>'}
    </div>`;
  }
  function initKunden() {
    $('kundenSuche').addEventListener('input', renderKunden);
    $('archivKunden').addEventListener('click', async e => {
      const btn = e.target.closest('[data-act]'); if (!btn) return;
      const card = btn.closest('.kunde-card'); const key = card.dataset.key;
      const g = gruppen().find(x => x.key === key); if (!g) return;
      if (btn.dataset.act === 'toggle') { offenKunde = offenKunde === key ? null : key; renderKunden(); return; }
      if (btn.dataset.act === 'nachtrag') { nachtragOeffnen(btn.dataset.id); return; }
      if (btn.dataset.act === 'profil-speichern') {
        let p = g.profil;
        if (!p) { p = { id: uid(), aliase: [] }; state.kunden.push(p); }
        const v = c => card.querySelector('.' + c).value;
        Object.assign(p, {
          name: v('kp-name').trim() || g.name, typ: v('kp-typ').trim(), herkunft: v('kp-herkunft').trim(),
          tags: v('kp-tags').split(',').map(t => t.trim()).filter(Boolean), brot: v('kp-brot'),
          vegAnteil: v('kp-veg') !== '' ? Math.max(0, Math.min(100, parseInt(v('kp-veg'), 10))) : null,
          kontakt: v('kp-kontakt').trim(), notiz: v('kp-notiz').trim(),
        });
        await speichereKunden(); offenKunde = K.kundenKey(p.name); renderKunden(); renderKundenHinweis();
      }
      if (btn.dataset.act === 'merge') {
        const zielKey = card.querySelector('.kp-merge').value; if (!zielKey) return;
        const andere = gruppen().find(x => x.key === zielKey); if (!andere) return;
        if (!confirm(`„${andere.name}“ wird mit „${g.name}“ zusammengeführt (alle Veranstaltungen zählen zu einem Kunden).`)) return;
        let p = g.profil; if (!p) { p = { id: uid(), name: g.name, aliase: [], tags: [], brot: 'normal' }; state.kunden.push(p); }
        const namen = new Set([andere.name].concat(andere.keys, andere.profil ? [andere.profil.name].concat(andere.profil.aliase || []) : []).concat(andere.eintraege.map(e => e.customerName)));
        p.aliase = Array.from(new Set((p.aliase || []).concat(Array.from(namen))));
        if (andere.profil) { p.tags = Array.from(new Set((p.tags || []).concat(andere.profil.tags || []))); state.kunden = state.kunden.filter(x => x !== andere.profil); }
        await speichereKunden(); offenKunde = K.kundenKey(p.name); renderKunden();
      }
    });
  }

  // ---------- Überproduktions-Lager ----------
  function bestand(alle) { return K.lagerBestand(state.archiv || [], heute(), alle); }
  function ideenHTML(name) {
    const i = K.ideenFuer(name, komponenten());
    if (!i.kuratiert.length && !i.katalog.length) return '<div class="ideen hint">Keine Vorschläge gefunden – Idee? Einfach im Speisenkatalog nach der Zutat suchen.</div>';
    return `<div class="ideen"><strong>Mögliche Angebote:</strong> ${i.kuratiert.map(x => `<span class="tag-chip">${esc(x)}</span>`).join('')}
      ${i.katalog.length ? `<div class="hint" style="margin-top:4px">Aus dem Speisenkatalog: ${i.katalog.map(x => `<span class="tag-chip kat">${esc(x)}</span>`).join('')}</div>` : ''}</div>`;
  }
  const AMPEL = { ok: ['🟢', 'frisch genug'], bald: ['🟠', 'bald verbrauchen'], abgelaufen: ['🔴', 'vermutlich nicht mehr verwendbar'] };
  function renderLager() {
    const out = $('archivLager'); if (!out) return;
    const rows = bestand(false).filter(r => lagerAlle || r.ampel !== 'abgelaufen');
    const nAbg = bestand(false).filter(r => r.ampel === 'abgelaufen').length;
    const offenNT = (state.archiv || []).filter(nachtragOffen).sort((a, b) => b.eventDateIso.localeCompare(a.eventDateIso));
    $('lagerCount').textContent = `${rows.length} Posten${nAbg && !lagerAlle ? ` (+ ${nAbg} abgelaufen ausgeblendet)` : ''}`;
    $('lagerAlleBtn').textContent = lagerAlle ? 'Abgelaufene ausblenden' : 'Abgelaufene anzeigen';
    out.innerHTML = (rows.length ? `<div class="table-scroll"><table class="analytics-table lager-table"><thead><tr><th></th><th>Was</th><th>Menge</th><th>Haltbar bis</th><th>Von</th><th></th></tr></thead><tbody>
      ${rows.map(r => `<tr class="ampel-${r.ampel}" data-e="${esc(r.eintragId)}" data-i="${esc(r.itemId)}">
        <td title="${AMPEL[r.ampel][1]}">${AMPEL[r.ampel][0]}</td>
        <td><strong>${esc(r.name)}</strong><div class="hint">${esc(r.klasseLabel)}${r.notiz ? ' · ' + esc(r.notiz) : ''}</div></td>
        <td>${r.menge != null ? num(r.menge) + ' ' + esc(r.einheit) : '–'}</td>
        <td><input type="date" class="lg-bis" value="${esc(r.haltbarBis || '')}">${r.tageRest != null ? `<div class="hint">${r.tageRest < 0 ? 'seit ' + (-r.tageRest) + ' T abgelaufen' : r.tageRest === 0 ? 'heute letzter Tag' : 'noch ' + r.tageRest + ' T'}</div>` : ''}</td>
        <td>${esc(r.kunde)}<div class="hint">${esc(r.datum)}</div></td>
        <td class="lg-actions"><button type="button" class="btn-ghost small-btn" data-act="ideen">Ideen</button>
          <button type="button" class="btn-ghost small-btn" data-act="menge">Menge</button>
          <button type="button" class="btn-success small-btn" data-act="verbraucht">verbraucht</button>
          <button type="button" class="btn-ghost small-btn" data-act="entsorgt">entsorgt</button></td></tr>
        ${ideenOffen.has(r.eintragId + r.itemId) ? `<tr class="ideen-row"><td></td><td colspan="5">${ideenHTML(r.name)}</td></tr>` : ''}`).join('')}
      </tbody></table></div>` : '<p class="hint">Keine offene Überproduktion. Nach jeder Veranstaltung kann im Archiv ein Nachtrag mit Überproduktion erfasst werden.</p>')
      + (offenNT.length ? `<h3 style="margin-top:18px">Nachtrag fehlt noch (${offenNT.length})</h3><p class="hint">Veranstaltungen in der Vergangenheit ohne Nachtrag – bitte Überproduktion &amp; Besonderheiten eintragen.</p>
        ${offenNT.slice(0, 12).map(e => `<div class="kunde-event" data-id="${esc(e.id)}"><strong>${esc(e.customerName)}</strong> · ${esc(e.eventDate)} · ${e.personen || '?'} Pers.
          <button type="button" class="btn-primary small-btn" data-act="nachtrag">Nachtrag ausfüllen</button>
          <button type="button" class="btn-ghost small-btn" data-act="keiner" title="Kein Nachtrag nötig (z.B. Probeessen)">kein Nachtrag nötig</button></div>`).join('')}` : '');
    updateBadges();
  }
  function lagerPosten(eid, iid) {
    const e = eintragById(eid); if (!e || !e.nachtrag) return {};
    return { e, it: (e.nachtrag.ueberproduktion || []).find(x => x.id === iid) };
  }
  function initLager() {
    $('lagerAlleBtn').addEventListener('click', () => { lagerAlle = !lagerAlle; renderLager(); });
    $('archivLager').addEventListener('click', async e => {
      const btn = e.target.closest('[data-act]'); if (!btn) return;
      if (btn.dataset.act === 'nachtrag') return nachtragOeffnen(btn.closest('[data-id]').dataset.id);
      if (btn.dataset.act === 'keiner') {
        const ent = eintragById(btn.closest('[data-id]').dataset.id); await speichereEintrag({ ...ent, keinNachtrag: true }); return render();
      }
      const tr = btn.closest('tr'); const { e: ent, it } = lagerPosten(tr.dataset.e, tr.dataset.i); if (!it) return;
      if (btn.dataset.act === 'ideen') { const k = tr.dataset.e + tr.dataset.i; ideenOffen.has(k) ? ideenOffen.delete(k) : ideenOffen.add(k); return renderLager(); }
      if (btn.dataset.act === 'menge') {
        const v = prompt(`Verbleibende Menge von „${it.name}“ (${it.einheit}):`, it.menge ?? ''); if (v == null) return;
        const n = parseFloat(String(v).replace(',', '.')); if (isNaN(n)) return;
        it.menge = n; if (n <= 0) it.status = 'verbraucht';
      } else it.status = btn.dataset.act;   // verbraucht | entsorgt
      await speichereEintrag(ent); render();
    });
    $('archivLager').addEventListener('change', async e => {
      if (!e.target.classList.contains('lg-bis')) return;
      const tr = e.target.closest('tr'); const { e: ent, it } = lagerPosten(tr.dataset.e, tr.dataset.i); if (!it) return;
      it.haltbarBis = e.target.value || null; await speichereEintrag(ent); render();
    });
  }

  // ---------- Auswertung ----------
  function renderAuswertung() {
    const out = $('archivAnalytics'); if (!out) return;
    const archiv = state.archiv || [];
    if (!archiv.length) { out.innerHTML = '<p class="hint">Noch keine Daten für eine Auswertung.</p>'; return; }
    const gs = gruppen().filter(g => g.eintraege.length);
    const stAlle = K.kundenStatistik(archiv, artFn);
    const stK = gs.map(g => ({ g, st: K.kundenStatistik(g.eintraege, artFn) }));
    const umsatz = archiv.reduce((s, e) => s + (e.totalPrice || 0), 0);
    const monate = {};
    archiv.forEach(e => { if (e.eventDateIso) { const m = e.eventDateIso.slice(0, 7); monate[m] = (monate[m] || 0) + 1; } });
    const mk = Object.keys(monate).sort(); const mmax = Math.max(1, ...Object.values(monate));
    const fv = stAlle.fleisch + stAlle.veg;
    const ue = {};
    archiv.forEach(e => e.nachtrag && (e.nachtrag.ueberproduktion || []).forEach(u => { const k = normalize(u.name); ue[k] = ue[k] || { name: u.name, n: 0 }; ue[k].n++; }));
    out.innerHTML = `
      <div class="kpi-row">
        <div class="kpi"><div class="kpi-n">${archiv.length}</div><div class="hint">Angebote</div></div>
        <div class="kpi"><div class="kpi-n">${gs.length}</div><div class="hint">Kunden</div></div>
        <div class="kpi"><div class="kpi-n">${stK.filter(x => x.st.anzahl >= 2).length}</div><div class="hint">wiederkehrend</div></div>
        <div class="kpi"><div class="kpi-n">${num(stAlle.personenSchnitt, 0)}</div><div class="hint">Ø Gäste</div></div>
        <div class="kpi"><div class="kpi-n">${eur(stAlle.preisProPerson)}</div><div class="hint">Ø pro Person</div></div>
        <div class="kpi"><div class="kpi-n">${umsatz ? eur(umsatz) : '–'}</div><div class="hint">Angebotssummen (erfasst)</div></div>
      </div>
      <h3>Wiederkehrende Kunden</h3>
      <table class="analytics-table"><thead><tr><th>Kunde</th><th>Anzahl</th><th>Gäste Ø</th><th>zuletzt</th><th>Ø Abstand</th></tr></thead><tbody>
        ${stK.filter(x => x.st.anzahl >= 2).sort((a, b) => b.st.anzahl - a.st.anzahl).slice(0, 15).map(({ g, st }) => `<tr><td>${esc(g.name)}</td><td>${st.anzahl}</td><td>${num(st.personenSchnitt, 0)}</td><td>${fmtIso(st.letzter)}</td><td>${st.intervallTage != null ? num(st.intervallTage, 0) + ' T' : '–'}</td></tr>`).join('') || '<tr><td colspan="5" class="hint">Noch keine wiederkehrenden Kunden.</td></tr>'}
      </tbody></table>
      <h3 style="margin-top:14px">Hauptgänge: Fleisch/Fisch zu vegetarisch</h3>
      ${fv ? `<div class="bar2"><span style="width:${100 * stAlle.fleisch / fv}%">${num(100 * stAlle.fleisch / fv, 0)} % Fleisch/Fisch</span><span class="v" style="width:${100 * stAlle.veg / fv}%">${num(100 * stAlle.veg / fv, 0)} % vegetarisch</span></div><p class="hint">Gezählt nach angebotenen Gerichten (${stAlle.fleisch} : ${stAlle.veg}); die Kalkulation nutzt 2/3 : 1/3.</p>` : '<p class="hint">–</p>'}
      <h3 style="margin-top:14px">Veranstaltungen pro Monat</h3>
      <div class="months">${mk.map(m => `<div class="month"><div class="mbar" style="height:${8 + 52 * monate[m] / mmax}px" title="${monate[m]} Veranstaltungen"></div><div class="hint">${m.slice(5)}/${m.slice(2, 4)}</div><div>${monate[m]}</div></div>`).join('') || '<p class="hint">Keine Datumsangaben vorhanden.</p>'}</div>
      <h3 style="margin-top:14px">Gerichte-Häufigkeit</h3>
      <table class="analytics-table"><thead><tr><th>Gericht</th><th>Anzahl</th></tr></thead><tbody>
        ${stAlle.topGerichte.concat([]).map(d => `<tr><td>${esc(d.name)}</td><td>${d.anzahl}</td></tr>`).join('')}
      </tbody></table>
      ${Object.keys(ue).length ? `<h3 style="margin-top:14px">Häufigste Überproduktion</h3><p>${Object.values(ue).sort((a, b) => b.n - a.n).slice(0, 12).map(u => `<span class="tag-chip">${esc(u.name)} ×${u.n}</span>`).join('')}</p>` : ''}`;
  }

  // ---------- Hinweise im Angebot-Tab ----------
  function renderLagerHinweis() {
    const box = $('lagerHinweis'); if (!box) return;
    const b = bestand(false).filter(r => r.ampel !== 'abgelaufen');
    if (!b.length) { box.style.display = 'none'; return; }
    const gerichte = [];
    (draftEvent && draftEvent.days || []).forEach(d => (d.dishes || []).forEach(x => x.name && gerichte.push(x.name)));
    const treffer = K.lagerTreffer(b, gerichte);
    const trefferIds = new Set(treffer.map(t => t.lager.eintragId + t.lager.itemId));
    box.style.display = '';
    box.innerHTML = `<h2>Überproduktion auf Lager <span class="badge">${b.length}</span></h2>
      <p class="hint">Aus früheren Veranstaltungen übrig – bitte bevorzugt einplanen. Haltbarkeit nach Lagerart berücksichtigt.</p>
      ${treffer.length ? `<div class="note-ok">💡 Passt zum aktuellen Angebot: ${treffer.map(t => `<strong>${esc(t.lager.name)}</strong> (${t.lager.menge != null ? num(t.lager.menge) + ' ' + esc(t.lager.einheit) : 'Menge offen'}) → ${t.gerichte.map(esc).join(', ')}`).join(' · ')}</div>` : ''}
      <div class="lager-chips">${b.slice(0, 12).map(r => {
        const k = 'h' + r.eintragId + r.itemId;
        return `<div class="lager-chip ampel-${r.ampel} ${trefferIds.has(r.eintragId + r.itemId) ? 'treffer' : ''}" data-k="${esc(k)}">
          <span>${AMPEL[r.ampel][0]} <strong>${esc(r.name)}</strong> ${r.menge != null ? num(r.menge) + ' ' + esc(r.einheit) : ''}</span>
          <span class="hint">${r.tageRest != null ? (r.tageRest === 0 ? 'heute letzter Tag' : 'noch ' + r.tageRest + ' T') : ''} · ${esc(r.kunde)}</span>
          <button type="button" class="btn-ghost small-btn" data-ideen="${esc(k)}">Ideen</button>
          ${ideenOffen.has(k) ? ideenHTML(r.name) : ''}</div>`;
      }).join('')}</div>${b.length > 12 ? `<p class="hint">… und ${b.length - 12} weitere im Archiv unter „Überproduktion“.</p>` : ''}`;
  }
  function renderKundenHinweis() {
    const box = $('kundenHinweis'); if (!box) return;
    const name = ($('evName').value || '').trim();
    const g = name ? gruppeFuerName(name) : null;
    if (!g || (!g.eintraege.length && !g.profil)) { box.style.display = 'none'; return; }
    // das gerade bearbeitete Angebot zählt nicht als frühere Veranstaltung
    const frueher = g.eintraege.filter(e => !(draftEvent && e.eventId === draftEvent.id));
    const st = K.kundenStatistik(frueher, artFn);
    const p = g.profil || {};
    const teile = [];
    if (frueher.length) teile.push(`<strong>${frueher.length}× Kunde</strong>, zuletzt ${st.letzter ? fmtIso(st.letzter) : '–'}${st.personenSchnitt ? ', Ø ' + num(st.personenSchnitt, 0) + ' Gäste' : ''}`);
    if ((p.tags || []).length) teile.push('Merkmale: ' + p.tags.map(esc).join(', '));
    if (p.herkunft) teile.push('Esskultur: ' + esc(p.herkunft));
    if (p.brot && p.brot !== 'normal') teile.push('Brot: ' + BROT_STUFEN[p.brot]);
    if (p.vegAnteil != null) teile.push(`Vegetarisch-Anteil Hauptgang: ${p.vegAnteil} %`);
    const brot = Object.entries(st.brot).filter(([k]) => k !== 'passend');
    if (brot.length) teile.push('Brot früher: ' + brot.map(([k, v]) => `${{ zuwenig: 'zu wenig', zuviel: 'zu viel' }[k]} (${v}×)`).join(', '));
    if (st.unterproduktion.length) teile.push('Früher zu knapp: ' + Array.from(new Set(st.unterproduktion)).slice(0, 5).map(esc).join(', '));
    if (st.ueberproduktion.length) teile.push('Früher übrig geblieben: ' + st.ueberproduktion.slice(0, 5).map(u => esc(u.name)).join(', '));
    if (st.besonderheiten.length) teile.push('Besonderheiten: ' + st.besonderheiten.slice(-2).map(b => esc(b.text)).join(' | '));
    if (p.notiz) teile.push('Notiz: ' + esc(p.notiz));
    if (!teile.length) { box.style.display = 'none'; return; }
    box.style.display = '';
    box.innerHTML = `<h2>Kundenkartei: ${esc(g.name)}</h2><ul class="kunden-hinweis">${teile.map(t => `<li>${t}</li>`).join('')}</ul>`;
  }
  // Profil-Werte (Brot, Vegetarisch-Anteil) in ein Angebot übernehmen, solange dort nichts anderes eingestellt ist
  function profilAufEvent(ev) {
    const g = ev.name ? gruppeFuerName(ev.name) : null; const p = g && g.profil;
    if (!p) return false;
    let geaendert = false;
    if (!ev.brotStufe && p.brot && p.brot !== 'normal') { ev.brotStufe = p.brot; geaendert = true; }
    if (ev.vegAnteil == null && p.vegAnteil != null) { ev.vegAnteil = p.vegAnteil; geaendert = true; }
    return geaendert;
  }
  // Lagerhinweis für die Einkaufsliste: welche Zutat ist (teilweise) schon da?
  function lagerFuerZutat(zutatName) {
    return bestand(false).filter(r => r.ampel !== 'abgelaufen' && K.passt(zutatName, r.name));
  }

  function updateBadges() {
    const b = bestand(false).filter(r => r.ampel !== 'abgelaufen').length;
    const nt = (state.archiv || []).filter(nachtragOffen).length;
    const lb = $('lagerBadge'); if (lb) lb.textContent = b ? ' (' + b + ')' : '';
    const ab = $('archivBadge'); if (ab) ab.textContent = nt ? ' ' + nt : '';
    if (ab) ab.style.display = nt ? '' : 'none';
  }

  function render() {
    if (!state) return;
    state.kunden = state.kunden || [];
    renderAngebote(); renderKunden(); renderLager(); renderAuswertung(); renderLagerHinweis(); renderKundenHinweis(); updateBadges();
  }

  // ---------- Nachtrag direkt aus Küchensheet / To-Do ----------
  async function nachtragFuerAktuellesEvent() {
    if (!draftEvent || !draftEvent.days || !draftEvent.days.length) return alert('Bitte zuerst ein Angebot verarbeiten.');
    if (!state.events.find(e => e.id === draftEvent.id)) return alert('Bitte das Angebot zuerst speichern („Event speichern“) – danach kann der Nachtrag erfasst werden.');
    await ladeArchiv();
    const e = (state.archiv || []).find(x => x.eventId === draftEvent.id);
    if (!e) return alert('Archiv-Eintrag noch nicht vorhanden – bitte Seite neu laden.');
    nachtragOeffnen(e.id);
  }

  function init() {
    $('archivSubnav').addEventListener('click', e => { const b = e.target.closest('.subtab-btn'); if (b) setSub(b.dataset.sub); });
    initImport(); initKunden(); initLager();
    document.querySelectorAll('.nachtrag-btn').forEach(b => b.addEventListener('click', nachtragFuerAktuellesEvent));
    $('lagerHinweis').addEventListener('click', e => {
      const b = e.target.closest('[data-ideen]'); if (!b) return;
      const k = b.dataset.ideen; ideenOffen.has(k) ? ideenOffen.delete(k) : ideenOffen.add(k); renderLagerHinweis();
    });
    $('evName').addEventListener('input', () => renderKundenHinweis());
  }
  init();

  return { render, renderLagerHinweis, renderKundenHinweis, profilAufEvent, lagerFuerZutat, ladeArchiv, gruppeFuerName, BROT_STUFEN, nachtragFuerAktuellesEvent };
})();
