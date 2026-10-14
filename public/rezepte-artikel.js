// Rezepte: Art "Rezept" oder "Fertigprodukt" und der Umschalter "Selgros-Artikel".
// - Fertigprodukt (Pasta, Cannelloni, Dressing, Salat …): statt Zutaten und Zubereitung steht die genaue Artikelbezeichnung aus der Selgros-Artikelliste.
//   Intern wird daraus eine Zutat (Artikelname, Menge je 1 kg Gericht), damit Küchensheet, To-Do und Einkaufsliste unverändert weiterrechnen.
// - Umschalter am Rezept: zeigt je Zutat den vorgeschlagenen Selgros-Artikel (mit kleinem Bild), das Gebinde und die zu bestellende Menge für die Bezugsgröße;
//   ein anderer Artikel lässt sich wählen und wird für die Zutat gemerkt (gleiche Zuordnung wie in der Einkaufsliste).
// - Stichwort-Vorschlag: Namen mit Pasta, Nudeln, Cannelloni, Dressing, Salat … werden als "Fertig?" vorgeschlagen; bestätigt wird je Rezept.
// Läuft nach app.js und ergänzt dessen Rezepte-Formular, ohne es zu ersetzen.
const RezeptArtikel = (function () {
  const $ = id => document.getElementById(id);
  const esc = s => escHtml(s);
  const FERTIG_RE = /(^|[^a-zäöüß])(pasta|nudel|spaghetti|penne|tagliatelle|fusilli|farfalle|rigatoni|cannelloni|tortellini|tortelloni|ravioli|gnocchi|lasagne|maultaschen|dressing|salat)/i;
  const BILD_KEY = 'ks_bildvorlage';
  let typ = 'rezept', artikel = null, sicht = 'rezept';

  const vorlage = () => { try { return localStorage.getItem(BILD_KEY) || ''; } catch (e) { return ''; } };
  const setzeVorlage = v => { try { localStorage.setItem(BILD_KEY, v); } catch (e) { /* ohne Speicher */ } };
  const zuordnung = () => (state.artikelzuordnung = state.artikelzuordnung || {});
  const artikelListe = () => {
    const gesehen = new Set(), out = [];
    Object.values(zuordnung()).forEach(e => { if (e && e.name && e.artNr && !gesehen.has(String(e.artNr))) { gesehen.add(String(e.artNr)); out.push(e); } });
    return out.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  };
  const nachNr = nr => artikelListe().find(e => String(e.artNr) === String(nr));
  const istFertigVorschlag = r => r && r.typ !== 'fertig' && FERTIG_RE.test(r.name || '');

  // ---------- Bilder ----------
  function bildUrl(e) {
    if (!e) return '';
    if (e.bild) return e.bild;
    const v = vorlage();
    return v && e.artNr ? v.replace('{artNr}', encodeURIComponent(e.artNr)) : '';
  }
  function bildHtml(e) {
    const u = bildUrl(e);
    if (!u || !/^(https?:|data:image\/)/i.test(u)) return '';   // ohne Bild bleibt die Stelle leer
    return `<img class="art-bild" src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`;
  }
  // Gibt es überhaupt Bilder (Adresse-Vorlage oder Bild an einem Artikel)? Sonst entfällt die Bildspalte.
  const hatBilder = () => !!vorlage() || Object.values(zuordnung()).some(e => e && e.bild);
  async function speichereZuordnungen() { state.artikelzuordnung = await API.send('PUT', '/api/artikelzuordnung', zuordnung()); }
  async function setzeBild(artNr, url) {
    Object.values(zuordnung()).forEach(e => { if (e && String(e.artNr) === String(artNr)) { if (url) e.bild = url; else delete e.bild; } });
    await speichereZuordnungen();
  }
  async function ordneZu(zutat, art) {
    zuordnung()[normalize(zutat)] = { name: art.name, artNr: art.artNr, packAmount: art.packAmount, packUnit: art.packUnit, qty: null, exclude: false, source: 'rezept', ...(art.bild ? { bild: art.bild } : {}) };
    await speichereZuordnungen();
  }

  // Bestellmenge in Gebinden. Steht beim Gebinde nur ein Kürzel wie BT, FL oder KN (nicht umrechenbar), wird die Größe aus dem Artikelnamen gelesen
  // ("… frisch 1kg", "… 5L", "… 450-600g"; bei Bereichen der Mittelwert).
  function packAusName(name) {
    const re = /(\d+(?:[.,]\d+)?)(?:\s?-\s?(\d+(?:[.,]\d+)?))?\s?(kg|g|ml|l)\b/gi;
    let m, last = null;
    while ((m = re.exec(String(name || '')))) last = m;
    if (!last) return null;
    const a = parseFloat(last[1].replace(',', '.')), b = last[2] ? parseFloat(last[2].replace(',', '.')) : null;
    return { amount: b ? (a + b) / 2 : a, unit: last[3].toLowerCase() === 'l' ? 'l' : last[3].toLowerCase() };
  }
  function bestellAnzahl(menge, einheit, e) {
    if (!e) return null;
    const direkt = computeBestellmenge(menge, einheit, e.packAmount, e.packUnit);
    if (direkt != null) return direkt;
    const n = packAusName(e.name);
    if (!n) return null;
    const j = computeBestellmenge(menge, einheit, n.amount * (Number(e.packAmount) || 1), n.unit);
    return j;
  }

  // ---------- Anzeige im Formular ----------
  function anzeigen() {
    const art = sicht === 'artikel', fertig = typ === 'fertig';
    $('rTyp').value = typ;
    $('rBlockRezept').hidden = art || fertig;
    $('rBlockFertig').hidden = art || !fertig;
    $('rSichtArtikel').hidden = !art;
    document.querySelectorAll('.r-nur-rezept').forEach(el => { el.hidden = art || fertig; });
    $('rSicht').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.rsicht === sicht));
    hinweis();
    if (art) renderArtikelSicht(); else if (fertig) renderFertig();
  }
  function hinweis() {
    $('rFertigHinweis').hidden = !(typ !== 'fertig' && FERTIG_RE.test($('rName').value || ''));
  }
  function karteHtml(a) {
    if (!a) return '<p class="hint">Noch kein Artikel gewählt – oben suchen und anklicken.</p>';
    return `<div class="art-karte">${bildHtml(a)}<div class="art-karte-text"><strong>${esc(a.name)}</strong>
      <div class="hint">Art.-Nr. ${esc(a.artNr)} · Gebinde ${esc(a.packAmount ?? '?')} ${esc(a.packUnit || '')}</div></div>
      <button type="button" class="btn-ghost small-btn ra-bild" data-artnr="${esc(a.artNr)}" title="Bild-Adresse für diesen Artikel eintragen">🖼</button></div>`;
  }
  function renderFertig() {
    $('rArtikelKarte').innerHTML = karteHtml(artikel);
  }
  function suche() {
    const q = normalize($('rArtikelSuche').value).split(' ').filter(Boolean);
    const box = $('rArtikelTreffer');
    if (!q.length) { box.innerHTML = ''; return; }
    const t = artikelListe().filter(a => { const n = normalize(a.name); return q.every(w => n.includes(w)); }).slice(0, 12);
    box.innerHTML = t.length
      ? t.map(a => `<button type="button" class="art-treffer-zeile" data-artnr="${esc(a.artNr)}">${bildHtml(a)}<span><strong>${esc(a.name)}</strong><span class="hint"> Art.-Nr. ${esc(a.artNr)} · ${esc(a.packAmount ?? '?')} ${esc(a.packUnit || '')}</span></span></button>`).join('')
      : '<p class="hint">Kein passender Artikel in der Selgros-Artikelliste.</p>';
  }
  function setTyp(t) {
    typ = t === 'fertig' ? 'fertig' : 'rezept';
    if (typ === 'fertig' && !artikel && !$('rArtikelSuche').value) { $('rArtikelSuche').value = ($('rName').value || '').split(/\s+/)[0] || ''; suche(); }
    anzeigen();
  }

  // ---------- Umschalter "Selgros-Artikel" ----------
  function bezugsText() {
    const t = $('rRefType').value, v = $('rRefValue').value, u = $('rRefUnit').value;
    return t === 'portionen' ? `${v || '?'} Portionen` : t === 'menge' ? `${v || '?'} ${u || ''}` : 'die Formel/Komposition';
  }
  function zeilen() {   // (Zutat, Menge, Einheit) aus dem Formular – damit auch ungespeicherte Änderungen sichtbar sind
    if (typ === 'fertig') return artikel ? [{ name: artikel.name, amount: parseFloat($('rFertigMenge').value) || 1000, unit: $('rFertigUnit').value.trim() || 'g', fest: true }] : [];
    return Array.from(document.querySelectorAll('#ingredientRows .ingredient-row')).map(r => ({
      name: r.querySelector('.ing-name').value.trim(), amount: parseFloat(r.querySelector('.ing-amount').value) || 0, unit: r.querySelector('.ing-unit').value.trim(),
    })).filter(z => z.name);
  }
  function renderArtikelSicht() {
    const rows = zeilen();
    const box = $('rSichtArtikel');
    const liste = artikelListe(), mb = hatBilder();
    let h = `<datalist id="raArtikelNamen">${liste.map(a => `<option value="${esc(a.name)}"></option>`).join('')}</datalist>`;
    if (!rows.length) {
      h += '<p class="hint">Noch keine Zutaten – im Rezept eintragen, dann erscheinen hier die Selgros-Artikel.</p>';
    } else {
      h += `<p class="hint">Mengen für die Bezugsgröße des Rezepts (${esc(bezugsText())}). Orange = Vorschlag per Wortabgleich, noch nicht bestätigt.</p>
      <div class="table-scroll"><table class="summary-table art-tabelle"><thead><tr>${mb ? '<th></th>' : ''}<th>Zutat</th><th>Selgros-Artikel</th><th>Gebinde</th><th>Bestellen</th></tr></thead><tbody>
      ${rows.map(z => {
        const m = findArtikelForIngredient(z.name, zuordnung());
        const e = (m && m.entry) || null, vorschlag = !!(m && !m.confirmed);
        const anz = bestellAnzahl(z.amount, z.unit, e);
        return `<tr data-zutat="${esc(z.name)}" class="${vorschlag ? 'ez-suggested' : ''}">
          ${mb ? `<td>${bildHtml(e)}</td>` : ''}
          <td>${esc(z.name)}<div class="hint">${esc(fmtAmount(z.amount))} ${esc(z.unit)}</div></td>
          <td>${e ? `<strong>${esc(e.name)}</strong><div class="hint">Art.-Nr. ${esc(e.artNr || '–')}${vorschlag ? ' · Vorschlag' : ''}</div>` : '<span class="hint">kein Artikel gefunden</span>'}
            ${z.fest ? '' : `<input type="text" class="ra-wechsel" list="raArtikelNamen" placeholder="anderen Artikel wählen …" autocomplete="off">`}</td>
          <td>${e ? esc(`${e.packAmount ?? '?'} ${e.packUnit || ''}`) : '–'}</td>
          <td>${anz != null ? `<strong>${anz}</strong> Gebinde` : '<span class="hint">?</span>'}${e ? ` <button type="button" class="btn-ghost small-btn ra-bild" data-artnr="${esc(e.artNr)}" title="Bild-Adresse eintragen">🖼</button>` : ''}</td></tr>`;
      }).join('')}</tbody></table></div>`;
    }
    h += `<details class="ra-bildquelle"><summary>Bilder: Adresse-Vorlage für alle Artikel</summary>
      <p class="hint">Eine Bild-Adresse mit dem Platzhalter <code>{artNr}</code>, z. B. <code>https://…/{artNr}.jpg</code>. Sie gilt auf diesem Gerät für alle Artikel ohne eigenes Bild; ein einzelnes Bild trägst du über 🖼 ein.</p>
      <input type="text" id="raVorlage" value="${esc(vorlage())}" placeholder="https://…/{artNr}.jpg"></details>`;
    box.innerHTML = h;
  }

  // ---------- Liste: Tags und Filter ----------
  function listeErgaenzen() {
    const f = $('recipeTypFilter') ? $('recipeTypFilter').value : '';
    document.querySelectorAll('#recipeList .recipe-item').forEach(el => {
      const r = state.recipes.find(x => x.id === el.dataset.id); if (!r) return;
      const fertig = r.typ === 'fertig', vorschlag = istFertigVorschlag(r);
      const tags = el.querySelector('span:last-child');
      if (tags && !tags.querySelector('.tag-fertig')) tags.insertAdjacentHTML('afterbegin', fertig ? '<span class="tag tag-fertig" title="Fertigprodukt: Artikelbezeichnung statt Rezept">Fertigprodukt</span> ' : vorschlag ? '<span class="tag tag-fertig tag-vorschlag" title="Klingt nach einem Fertigprodukt – im Rezept bestätigen">Fertig?</span> ' : '');
      el.hidden = (f === 'fertig' && !fertig) || (f === 'vorschlag' && !vorschlag) || (f === 'rezept' && fertig);
    });
  }

  // ---------- Anbindung an das bestehende Formular ----------
  function nachLaden(r) {
    typ = r && r.typ === 'fertig' ? 'fertig' : 'rezept';
    artikel = r && r.artikel ? { ...(nachNr(r.artikel.artNr) || {}), ...r.artikel } : null;
    sicht = 'rezept';
    const z = r && r.ingredients && r.ingredients[0];
    $('rFertigMenge').value = typ === 'fertig' && z ? (z.amount ?? 1000) : 1000;
    $('rFertigUnit').value = typ === 'fertig' && z ? (z.unit || 'g') : 'g';
    $('rArtikelSuche').value = ''; $('rArtikelTreffer').innerHTML = '';
    anzeigen();
  }
  function nachLeeren() {
    typ = 'rezept'; artikel = null; sicht = 'rezept';
    $('rFertigMenge').value = 1000; $('rFertigUnit').value = 'g';
    $('rArtikelSuche').value = ''; $('rArtikelTreffer').innerHTML = '';
    anzeigen();
  }

  function init() {
    // bestehende Funktionen ergänzen (gleiche Namen, damit alle Aufrufer – auch das Küchensheet – die neue Fassung nutzen)
    const _laden = loadRecipeIntoForm; loadRecipeIntoForm = function (r) { _laden(r); nachLaden(r); };
    const _leeren = clearRecipeForm; clearRecipeForm = function () { _leeren(); nachLeeren(); };
    const _liste = renderRecipeList; renderRecipeList = function () { _liste(); listeErgaenzen(); };
    // Ereignisse, die in app.js die ursprünglichen Funktionen direkt gebunden haben
    ['recipeSearch'].forEach(id => $(id).addEventListener('input', listeErgaenzen));
    $('recipeCatFilter').addEventListener('change', listeErgaenzen);
    $('hideStd').addEventListener('change', listeErgaenzen);
    $('recipeTypFilter').addEventListener('change', listeErgaenzen);
    $('newRecipeBtn').addEventListener('click', nachLeeren);
    $('clearRecipeFormBtn').addEventListener('click', nachLeeren);

    $('rTyp').addEventListener('change', e => setTyp(e.target.value));
    $('rSicht').addEventListener('click', e => { const b = e.target.closest('[data-rsicht]'); if (!b) return; sicht = b.dataset.rsicht; anzeigen(); });
    $('rName').addEventListener('input', hinweis);
    $('rFertigBtn').addEventListener('click', () => setTyp('fertig'));
    $('rArtikelSuche').addEventListener('input', suche);
    $('rFertigMenge').addEventListener('input', () => { if (sicht === 'artikel') renderArtikelSicht(); });
    $('rBlockFertig').addEventListener('click', e => {
      const z = e.target.closest('.art-treffer-zeile'); if (!z) return;
      artikel = nachNr(z.dataset.artnr); $('rArtikelSuche').value = ''; $('rArtikelTreffer').innerHTML = ''; renderFertig();
    });
    ['ingredientRows'].forEach(id => { $(id).addEventListener('input', () => { if (sicht === 'artikel') renderArtikelSicht(); }); });

    // Umschalter-Ansicht: anderen Artikel wählen, Bild eintragen, Vorlage
    $('rSichtArtikel').addEventListener('change', async e => {
      if (e.target.classList.contains('ra-wechsel')) {
        const a = artikelListe().find(x => x.name.toLowerCase() === e.target.value.trim().toLowerCase());
        const zutat = e.target.closest('tr').dataset.zutat;
        if (!a) { if (e.target.value.trim()) alert('Diesen Artikel gibt es nicht in der Artikelliste – bitte aus der Vorschlagsliste wählen.'); e.target.value = ''; return; }
        await ordneZu(zutat, a); renderArtikelSicht();
      } else if (e.target.id === 'raVorlage') { setzeVorlage(e.target.value.trim()); renderArtikelSicht(); }
    });
    document.addEventListener('click', async e => {
      const b = e.target.closest('.ra-bild'); if (!b || !$('tab-speisenkatalog').contains(b)) return;
      const a = nachNr(b.dataset.artnr); if (!a) return;
      const u = prompt(`Bild-Adresse (https://…) für „${a.name}“ – leer lassen zum Entfernen:`, a.bild || '');
      if (u === null) return;
      if (u.trim() && !/^(https?:|data:image\/)/i.test(u.trim())) { alert('Bitte eine Adresse mit https:// angeben.'); return; }
      await setzeBild(a.artNr, u.trim());
      document.dispatchEvent(new Event('ks-artikel-geaendert'));
      if (artikel && String(artikel.artNr) === String(a.artNr)) artikel = { ...artikel, bild: u.trim() || undefined };
      anzeigen();
    });

    // Speichern als Fertigprodukt (vor dem normalen Speichern abfangen)
    $('recipeForm').addEventListener('submit', async e => {
      if (typ !== 'fertig') return;
      e.preventDefault(); e.stopImmediatePropagation();
      const name = $('rName').value.trim();
      if (!name) { alert('Bitte einen Namen angeben.'); return; }
      if (!artikel) { alert('Bitte einen Selgros-Artikel wählen (Fertigprodukt).'); return; }
      const menge = parseFloat($('rFertigMenge').value) || 1000, einheit = $('rFertigUnit').value.trim() || 'g';
      if (!zuordnung()[normalize(artikel.name)]) await ordneZu(artikel.name, artikel);   // damit die Einkaufsliste genau diesen Artikel nimmt
      const draft = {
        id: editingRecipeId || undefined, name, category: $('rCategory').value, temp: '',
        typ: 'fertig', artikel: { artNr: artikel.artNr, name: artikel.name, packAmount: artikel.packAmount, packUnit: artikel.packUnit },
        referenceUnit: { type: 'menge', value: 1000, unit: 'g' }, portionStufen: [],
        ingredients: [{ name: artikel.name, amount: menge, unit: einheit }], steps: '',
      };
      const idx = state.recipes.findIndex(r => r.id === editingRecipeId);
      const recipe = await API.send(idx === -1 ? 'POST' : 'PUT', idx === -1 ? '/api/recipes' : '/api/recipes/' + editingRecipeId, draft);
      if (idx === -1) state.recipes.push(recipe); else state.recipes[idx] = recipe;
      renderRecipeList(); loadRecipeIntoForm(recipe);
      const st = $('recipeSaveStatus'); st.textContent = '✅ Fertigprodukt gespeichert (' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ')'; st.style.color = 'var(--success)';
      zurRezeptListe();
    }, true);
    anzeigen();
  }
  init();
  return { istFertigVorschlag, bildHtml, nachNr, artikelListe, hatBilder };
})();
