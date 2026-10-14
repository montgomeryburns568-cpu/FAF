// Speisenkatalog › Selgros-Zuordnung: Zutaten (und Komponenten) aus den Rezepten mit tatsächlichen Selgros-Artikeln verknüpfen.
// Schema: Zutat(en)  →  Selgros-Artikel, z. B. Ofenkartoffeln / Rosmarinkartoffeln / Backkartoffeln → Speisekartoffeln vorwiegend festkochend 10kg.
// Mehrere Zutatennamen können auf einen Artikel zeigen. Ein Vorsortieren schlägt Verknüpfungen vor (Wortvergleich + Häufigkeit in euren Bestellungen);
// übernommen wird erst nach deiner Bestätigung. Gespeichert wird in der gleichen Zuordnung wie in der Einkaufsliste (state.artikelzuordnung):
// Schlüssel = normalisierter Zutatenname, Wert = Artikel. Artikel aus der Bestellhistorie (source "selgros-bestellhistorie"/"manuell") bilden die Artikelliste.
// Läuft nach app.js und rezepte-artikel.js.
const SelgrosZuordnung = (function () {
  const $ = id => document.getElementById(id);
  const esc = s => escHtml(s);
  const H = typeof SELGROS_HAEUFIGKEIT !== 'undefined' ? SELGROS_HAEUFIGKEIT : {};
  let sichtbarOffen = 60, filter = '', cache = new Map(), zeigeVerknuepft = true;
  let ansicht = 'zuordnung', sortKey = 'name', sortUp = true, artFilter = '';   // Ansicht: Zuordnung oder Artikelliste

  // ---------- Daten ----------
  const zu = () => (state.artikelzuordnung = state.artikelzuordnung || {});
  const istKatalog = e => !!(e && (e.source === 'selgros-bestellhistorie' || e.source === 'manuell'));
  function katalog() {   // Artikelliste (eindeutig nach Art.-Nr.)
    const m = new Map();
    Object.values(zu()).forEach(e => { if (istKatalog(e) && e.artNr && !m.has(String(e.artNr))) m.set(String(e.artNr), e); });
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }
  const artikelNachNr = nr => katalog().find(a => String(a.artNr) === String(nr));
  // Rezeptnamen kurz darstellen (nur die erste Variante vor dem " / ")
  const rezeptKurz = (liste, max) => { const l = liste || []; return l.slice(0, max).map(n => n.split(' / ')[0]).join(', ') + (l.length > max ? ' …' : ''); };
  function zutatenAusRezepten() {   // normalisierter Name -> { name, n } (n = in wie vielen Rezepten)
    const m = new Map();
    (state.recipes || []).forEach(r => {
      const gesehen = new Set();
      (r.ingredients || []).forEach(i => {
        const k = normalize(i.name || ''); if (!k || gesehen.has(k)) return; gesehen.add(k);
        const e = m.get(k) || { name: (i.name || '').trim(), n: 0, namen: {}, rezepte: [] };
        e.n++; if (e.rezepte.length < 40) e.rezepte.push(r.name); e.namen[i.name.trim()] = (e.namen[i.name.trim()] || 0) + 1;
        m.set(k, e);
      });
    });
    m.forEach(e => { e.name = Object.entries(e.namen).sort((a, b) => b[1] - a[1])[0][0]; });
    return m;
  }
  // Verknüpfungen: Artikel (Art.-Nr.) -> Zutatennamen; dazu "kein Artikel nötig"
  function ordnung() {
    const zut = zutatenAusRezepten(), gruppen = new Map(), keinArtikel = [], verknuepft = new Set();
    Object.entries(zu()).forEach(([key, e]) => {
      if (!e) return;
      const name = (zut.get(key) && zut.get(key).name) || e.name || key;
      if (istKatalog(e)) { if (!zut.has(key)) return; }   // Artikel, der selbst als Zutat vorkommt (z. B. Fertigprodukt): zählt als verknüpft mit sich selbst
      if (e.exclude && !e.artNr) { keinArtikel.push({ key, name }); verknuepft.add(key); return; }
      if (!e.artNr) return;
      const nr = String(e.artNr), g = gruppen.get(nr) || { artikel: artikelNachNr(nr) || { name: e.name, artNr: e.artNr, packAmount: e.packAmount, packUnit: e.packUnit, bild: e.bild }, namen: [] };
      g.namen.push({ key, name, selbst: istKatalog(e), n: (zut.get(key) || {}).n || 0, rezepte: (zut.get(key) || {}).rezepte || [] });
      gruppen.set(nr, g); verknuepft.add(key);
    });
    const offen = Array.from(zut.entries()).filter(([k]) => !verknuepft.has(k)).map(([key, v]) => ({ key, name: v.name, n: v.n, rezepte: v.rezepte })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'de'));
    return { gruppen: Array.from(gruppen.values()).sort((a, b) => a.artikel.name.localeCompare(b.artikel.name, 'de')), keinArtikel, offen, zutaten: zut };
  }

  // ---------- Vorschläge ----------
  const STOP = new Set(['mit', 'und', 'oder', 'aus', 'vom', 'von', 'der', 'die', 'das', 'dem', 'den', 'ein', 'eine', 'frisch', 'frische', 'frischer', 'frisches', 'nach', 'etwa', 'geschmack', 'evtl', 'optional', 'bio', 'tiefgekuhlt', 'tiefgekuhlte', 'ohne', 'fur', 'zum', 'zur', 'klein', 'kleine', 'kleiner', 'gross', 'grosse', 'grosser', 'stk', 'stuck']);
  // Oberbegriffe: Zubereitungsarten und Sorten sollen auf den Basisartikel zeigen
  const SYNONYME = {
    ofenkartoffeln: 'speisekartoffeln', rosmarinkartoffeln: 'speisekartoffeln', backkartoffeln: 'speisekartoffeln', bratkartoffeln: 'speisekartoffeln', salzkartoffeln: 'speisekartoffeln',
    pellkartoffeln: 'speisekartoffeln', kartoffeln: 'speisekartoffeln', kartoffel: 'speisekartoffeln', kartoffelspalten: 'speisekartoffeln', kartoffelwurfel: 'speisekartoffeln', kartoffelspalte: 'speisekartoffeln',
    ei: 'eier', eier: 'eier', tomatenwurfel: 'tomaten', gurkenwurfel: 'gurke', karottenraspel: 'karotten', zwiebelwurfel: 'zwiebeln',
  };
  const stem = w => { const s = w.replace(/(en|er|es|n|e|s)$/, ''); return s.length >= 4 ? s : w; };
  function tokens(s) {
    return Array.from(new Set(normalize(s || '').replace(/ß/g, 'ss').split(/[^a-z0-9]+/).filter(w => w && !/\d/.test(w) && w.length >= 2 && !STOP.has(w))));
  }
  // Wie gut passt ein Wort der Zutat (z) zu einem Wort des Artikels (a)? Bei zusammengesetzten Wörtern zählt das Ende (Erdnuss|butter ist Butter, Butter|toast nicht).
  function tokenGleich(z, a) {
    const sz = stem(z), sa = stem(a);
    if (sz === sa) return 1;
    const diff = Math.abs(sz.length - sa.length), kurz = Math.min(sz.length, sa.length);
    if (kurz >= 4) {
      const [lang, kurzes] = sz.length >= sa.length ? [sz, sa] : [sa, sz];
      if (diff <= 2 && lang.startsWith(kurzes) && /^(e|n|en|s|er|es)?$/.test(lang.slice(kurzes.length))) return 0.9;   // nur Beugungsendungen: Zwiebel / Zwiebeln (nicht Sesam / Sesamöl)
      if (lang.endsWith(kurzes)) return sa.length > sz.length ? 0.8 : 0.6;        // Artikel genauer (Cocktailtomaten für Tomaten) / Zutat genauer (Sojasoße für Soße)
    }
    let i = 0; while (i < sz.length && i < sa.length && sz[sz.length - 1 - i] === sa[sa.length - 1 - i]) i++;
    return i >= 7 ? 0.7 : 0;   // gemeinsamer Wortstamm am Ende (…kartoffel)
  }
  function bewerte(zutatTokens, art) {
    const at = tokens(art.name); if (!at.length || !zutatTokens.length) return 0;
    let summe = 0; const benutzt = new Set();
    zutatTokens.forEach(z => {
      let best = 0, bi = -1;
      at.forEach((a, i) => { const m = tokenGleich(z, a); if (m > best) { best = m; bi = i; } });
      summe += best; if (bi >= 0 && best > 0) benutzt.add(bi);
    });
    const abdeckung = summe / zutatTokens.length;
    if (abdeckung < 0.6) return 0;
    const praezision = benutzt.size / at.length;
    return abdeckung * 0.7 + praezision * 0.25 + Math.min(Number(H[art.artNr]) || 0, 6) / 6 * 0.05;   // Abdeckung: wie viele Wörter der Zutat; Präzision: wie wenig Fremdwörter im Artikel
  }
  function vorschlaege(name) {
    const key = normalize(name);
    if (cache.has(key)) return cache.get(key);
    let zt = tokens(name);
    const syn = zt.map(t => SYNONYME[t]).filter(Boolean);
    if (syn.length) zt = Array.from(new Set(zt.map(t => SYNONYME[t] || t)));
    const liste = katalog().map(a => ({ a, s: bewerte(zt, a) })).filter(x => x.s >= 0.55).sort((x, y) => y.s - x.s || (H[y.a.artNr] || 0) - (H[x.a.artNr] || 0) || x.a.name.length - y.a.name.length).slice(0, 3);
    cache.set(key, liste); return liste;
  }
  const sicherheit = s => s >= 0.9 ? ['sicher', 'sz-sicher'] : s >= 0.75 ? ['wahrscheinlich', 'sz-wahr'] : ['möglich', 'sz-moeglich'];

  // ---------- Speichern ----------
  async function speichern() { state.artikelzuordnung = await API.send('PUT', '/api/artikelzuordnung', zu()); }
  const bild = a => (typeof RezeptArtikel !== 'undefined' ? RezeptArtikel.bildHtml(a) : '<span class="art-bild art-leer">🛒</span>');
  function eintragFuer(name, a) {
    return { name: a.name, artNr: a.artNr, packAmount: a.packAmount, packUnit: a.packUnit, qty: null, exclude: false, source: 'zuordnung', ...(a.bild ? { bild: a.bild } : {}) };
  }
  async function verknuepfe(namen, a) {
    namen.forEach(n => { const k = normalize(n); if (k && !istKatalog(zu()[k])) zu()[k] = eintragFuer(n, a); });
    await speichern(); render();
  }
  async function loese(key) { if (zu()[key] && !istKatalog(zu()[key])) { delete zu()[key]; await speichern(); render(); } }
  async function keinArtikelNoetig(key, name) { zu()[key] = { name, artNr: '', packAmount: null, packUnit: '', qty: null, exclude: true, source: 'zuordnung' }; await speichern(); render(); }

  // ---------- Anzeige ----------
  function artikelKarte(a, zusatz) {
    return `<div class="art-karte sz-karte">${bild(a)}<div class="art-karte-text"><strong>${esc(a.name)}</strong>
      <div class="hint">Art.-Nr. ${esc(a.artNr)} · Gebinde ${esc(a.packAmount ?? '?')} ${esc(a.packUnit || '')}${H[a.artNr] ? ` · ${H[a.artNr]}× bestellt` : ''}</div></div>${zusatz || ''}</div>`;
  }
  function vorschlagKnopf(v) {
    const [txt, kl] = sicherheit(v.s);
    return `<button type="button" class="sz-vorschlag ${kl}" data-artnr="${esc(v.a.artNr)}" title="Mit diesem Artikel verknüpfen">${bild(v.a)}<span class="sz-vtext"><strong>${esc(v.a.name)}</strong><span class="hint">Art.-Nr. ${esc(v.a.artNr)} · ${esc(v.a.packAmount ?? '?')} ${esc(v.a.packUnit || '')} · ${txt}</span></span><span class="sz-ok">✓</span></button>`;
  }
  const passt = (text, q) => !q || normalize(text).includes(q);

  function render() {
    const box = $('skSelgros'); if (!box) return;
    cache = cache.size > 4000 ? new Map() : cache;
    if (ansicht === 'artikel') { renderArtikelliste(box); return; }
    const o = ordnung(), q = normalize(filter), alle = o.zutaten.size;
    const verk = alle - o.offen.length;
    const offenGefiltert = o.offen.filter(z => passt(z.name, q));
    const gruppenGefiltert = o.gruppen.filter(g => passt(g.artikel.name, q) || g.namen.some(n => passt(n.name, q)));
    let h = `${ansichtSeg()}<div class="sz-kopf">
      <div><h2 style="margin:0">Selgros-Zuordnung</h2><span class="hint">Zutat → Artikel: ${verk} von ${alle} Zutaten verknüpft · ${katalog().length} Artikel in der Liste</span></div>
      <span class="sz-tools"><input type="search" id="szFilter" placeholder="Zutat oder Artikel suchen …" value="${esc(filter)}">
        <button type="button" class="btn-primary small-btn" id="szVorsortieren" title="Vorschläge für alle offenen Zutaten prüfen">Vorsortieren</button>
        <button type="button" class="btn-ghost small-btn" id="szNeuerArtikel">＋ Artikel</button></span></div>
      <datalist id="szArtikelNamen">${katalog().map(a => `<option value="${esc(a.name)}"></option>`).join('')}</datalist>
      <datalist id="szOffeneNamen">${o.offen.slice(0, 400).map(z => `<option value="${esc(z.name)}"></option>`).join('')}</datalist>
      <div id="szNeuForm" class="card sz-neu" hidden>
        <strong>Neuen Selgros-Artikel in die Liste aufnehmen</strong>
        <div class="field-row"><label>Artikelname<input type="text" id="szNName" placeholder="z.B. Mozzarella gerieben 1kg"></label><label>Art.-Nr.<input type="text" id="szNNr"></label>
          <label>Gebinde<input type="number" step="any" id="szNMenge" placeholder="Menge"></label><label>Einheit<input type="text" id="szNEinheit" placeholder="kg / l / Stk"></label></div>
        <div class="actions-row"><button type="button" class="btn-primary small-btn" id="szNSpeichern">Aufnehmen</button><button type="button" class="btn-ghost small-btn" id="szNZu">Abbrechen</button></div></div>`;

    // Offene Zutaten
    h += `<h3 class="sz-h">Noch ohne Artikel (${offenGefiltert.length})</h3>`;
    if (!offenGefiltert.length) h += `<p class="hint">${o.offen.length ? 'Keine Treffer.' : '✅ Alle Zutaten sind verknüpft.'}</p>`;
    offenGefiltert.slice(0, sichtbarOffen).forEach(z => {
      const v = vorschlaege(z.name);
      h += `<div class="sz-zeile" data-key="${esc(z.key)}" data-name="${esc(z.name)}">
        <div class="sz-zutat"><strong>${esc(z.name)}</strong><span class="hint" title="${esc((z.rezepte || []).join(' · '))}">in ${z.n} Rezept${z.n === 1 ? '' : 'en'}: ${esc(rezeptKurz(z.rezepte, 3))}</span></div>
        <div class="sz-pfeil">→</div>
        <div class="sz-ziel">${v.length ? v.map(vorschlagKnopf).join('') : '<span class="hint">Kein Vorschlag – Artikel suchen:</span>'}
          <div class="sz-aktionen"><input type="text" class="sz-suche" list="szArtikelNamen" placeholder="anderen Artikel suchen …" autocomplete="off">
          <button type="button" class="btn-ghost small-btn sz-nein" title="Für diese Zutat wird nichts bestellt (z. B. Wasser)">kein Artikel</button></div></div></div>`;
    });
    if (offenGefiltert.length > sichtbarOffen) h += `<div class="actions-row"><button type="button" class="btn-ghost" id="szMehr">Weitere ${Math.min(60, offenGefiltert.length - sichtbarOffen)} anzeigen (${offenGefiltert.length - sichtbarOffen} übrig)</button></div>`;

    // Verknüpfungen
    h += `<h3 class="sz-h"><button type="button" class="sz-faltung" id="szFalt">${zeigeVerknuepft ? '▾' : '▸'}</button> Verknüpft (${verk}${gruppenGefiltert.length !== o.gruppen.length ? ', ' + gruppenGefiltert.length + ' Artikel gefunden' : ''})</h3>`;
    if (zeigeVerknuepft) {
      gruppenGefiltert.forEach(g => {
        h += `<div class="sz-zeile sz-gruppe" data-artnr="${esc(g.artikel.artNr)}">
          <div class="sz-zutat sz-chips">${g.namen.sort((a, b) => b.n - a.n).map(n => `<span class="sz-chip" title="${n.selbst ? 'Name des Artikels selbst' : 'in ' + n.n + ' Rezepten: ' + esc(rezeptKurz(n.rezepte, 6))}">${esc(n.name)}${n.selbst ? '' : ` <button type="button" class="sz-ab" data-key="${esc(n.key)}" title="Verknüpfung lösen" aria-label="Verknüpfung lösen">✕</button>`}</span>`).join('')}
            <input type="text" class="sz-plus" list="szOffeneNamen" placeholder="＋ Zutat" autocomplete="off"></div>
          <div class="sz-pfeil">→</div>
          <div class="sz-ziel">${artikelKarte(g.artikel, `<button type="button" class="btn-ghost small-btn ra-bild" data-artnr="${esc(g.artikel.artNr)}" title="Bild-Adresse eintragen">🖼</button>`)}</div></div>`;
      });
      if (o.keinArtikel.length) h += `<div class="sz-zeile"><div class="sz-zutat sz-chips">${o.keinArtikel.map(n => `<span class="sz-chip">${esc(n.name)} <button type="button" class="sz-ab" data-key="${esc(n.key)}" title="Wieder öffnen" aria-label="Wieder öffnen">✕</button></span>`).join('')}</div><div class="sz-pfeil">→</div><div class="sz-ziel"><span class="hint">kein Artikel nötig (wird nicht bestellt)</span></div></div>`;
      if (!gruppenGefiltert.length && !o.keinArtikel.length) h += '<p class="hint">Noch nichts verknüpft.</p>';
    }
    box.innerHTML = h;
  }

  // ---------- Artikelliste: alle Selgros-Artikel auf einen Blick ----------
  const ansichtSeg = () => `<div class="sz-seg"><span class="seg" role="group" aria-label="Ansicht"><button type="button" data-szansicht="zuordnung" class="${ansicht === 'zuordnung' ? 'on' : ''}">Zuordnung</button><button type="button" data-szansicht="artikel" class="${ansicht === 'artikel' ? 'on' : ''}">Artikelliste (${katalog().length})</button></span></div>`;
  function artikelZeilen(o) {
    const verkn = new Map(o.gruppen.map(g => [String(g.artikel.artNr), g.namen.filter(n => !n.selbst).map(n => n.name)]));
    return katalog().map(a => ({ a, n: Number(H[a.artNr]) || 0, zutaten: verkn.get(String(a.artNr)) || [] }));
  }
  function artikelSortiert(zeilen) {
    const f = { name: x => x.a.name.toLowerCase(), nr: x => Number(x.a.artNr) || 0, n: x => x.n, verkn: x => x.zutaten.length, gebinde: x => (x.a.packUnit || '') + String(x.a.packAmount ?? '').padStart(8, '0') }[sortKey] || (x => x.a.name.toLowerCase());
    return zeilen.slice().sort((x, y) => { const a = f(x), b = f(y); const c = typeof a === 'number' ? a - b : String(a).localeCompare(String(b), 'de'); return (sortUp ? c : -c) || x.a.name.localeCompare(y.a.name, 'de'); });
  }
  function renderArtikelliste(box) {
    const o = ordnung(), q = normalize(filter);
    const alle = artikelZeilen(o);
    let z = alle.filter(x => passt(x.a.name + ' ' + x.a.artNr + ' ' + x.zutaten.join(' '), q));
    if (artFilter === 'verknuepft') z = z.filter(x => x.zutaten.length);
    if (artFilter === 'offen') z = z.filter(x => !x.zutaten.length);
    z = artikelSortiert(z);
    const mitZutat = alle.filter(x => x.zutaten.length).length;
    const kopfTh = (key, text) => `<th class="sz-sort" data-szsort="${key}">${text}${sortKey === key ? (sortUp ? ' ▲' : ' ▼') : ''}</th>`;
    box.innerHTML = `${ansichtSeg()}<div class="sz-kopf">
      <div><h2 style="margin:0">Selgros-Artikelliste</h2><span class="hint">${alle.length} Artikel · ${mitZutat} mit verknüpften Zutaten · ${alle.length - mitZutat} noch ohne · ${z.length} angezeigt</span></div>
      <span class="sz-tools"><input type="search" id="szFilter" placeholder="Artikel, Art.-Nr. oder Zutat suchen …" value="${esc(filter)}">
        <select id="szArtFilter" title="Anzeige einschränken"><option value="">Alle Artikel</option><option value="verknuepft" ${artFilter === 'verknuepft' ? 'selected' : ''}>Mit Zutaten verknüpft</option><option value="offen" ${artFilter === 'offen' ? 'selected' : ''}>Noch ohne Zutat</option></select>
        <button type="button" class="btn-ghost small-btn" id="szCsv" title="Liste als Tabelle (CSV) herunterladen">CSV</button>
        <button type="button" class="btn-ghost small-btn" id="szNeuerArtikel2">＋ Artikel</button></span></div>
      <div class="table-scroll"><table class="summary-table sz-tab"><thead><tr><th></th>${kopfTh('name', 'Artikel')}${kopfTh('nr', 'Art.-Nr.')}${kopfTh('gebinde', 'Gebinde')}${kopfTh('n', 'Bestellt')}${kopfTh('verkn', 'Verknüpfte Zutaten')}</tr></thead><tbody>
      ${z.map(x => `<tr><td>${bild(x.a)}</td><td><strong>${esc(x.a.name)}</strong></td><td>${esc(x.a.artNr)}</td><td>${esc(x.a.packAmount ?? '?')} ${esc(x.a.packUnit || '')}</td><td>${x.n ? x.n + '×' : '–'}</td>
        <td>${x.zutaten.length ? x.zutaten.slice(0, 8).map(n => `<span class="sz-chip">${esc(n)}</span>`).join(' ') + (x.zutaten.length > 8 ? ` <span class="hint">+${x.zutaten.length - 8}</span>` : '') : '<span class="hint">–</span>'}</td></tr>`).join('') || '<tr><td colspan="6" class="hint">Keine Artikel gefunden.</td></tr>'}
      </tbody></table></div>`;
  }
  function csvHerunterladen() {
    const o = ordnung(), zeilen = artikelSortiert(artikelZeilen(o));
    const c = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
    const text = ['Artikelname;Art-Nr;Gebinde-Menge;Gebinde-Einheit;Bestellungen;Verknuepfte Zutaten']
      .concat(zeilen.map(x => [c(x.a.name), c(x.a.artNr), c(x.a.packAmount), c(x.a.packUnit), c(x.n || ''), c(x.zutaten.join(' | '))].join(';'))).join('\r\n');
    const blob = new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'selgros-artikelliste.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // ---------- Vorsortieren: Vorschläge prüfen und gesammelt übernehmen ----------
  function vorsortieren() {
    const o = ordnung();
    const kand = o.offen.map(z => ({ z, v: vorschlaege(z.name)[0] })).filter(x => x.v);
    const ov = document.createElement('div'); ov.className = 'kmodal-ov';
    const zeile = (x, i) => `<label class="sz-vs"><input type="checkbox" data-i="${i}" ${x.v.s >= 0.9 ? 'checked' : ''}>
      <span><strong>${esc(x.z.name)}</strong> <span class="hint">(${x.z.n}×)</span> → ${esc(x.v.a.name)} <span class="hint">${sicherheit(x.v.s)[0]}</span></span></label>`;
    ov.innerHTML = `<div class="kmodal" style="max-width:760px"><h3>Vorsortieren</h3>
      <p class="hint">Für ${kand.length} von ${o.offen.length} offenen Zutaten gibt es einen Vorschlag. Haken setzen, was stimmt – nichts wird ohne dein Okay übernommen. Nur „sicher“ ist vorangehakt; bei „wahrscheinlich“ und „möglich“ bitte kurz prüfen.</p>
      <div class="sz-vsliste">${kand.map(zeile).join('') || '<p class="hint">Keine Vorschläge.</p>'}</div>
      <div class="actions-row"><button type="button" class="btn-primary" id="szVsOk">Markierte übernehmen</button><button type="button" class="btn-ghost" id="szVsAlle">Alle markieren</button><button type="button" class="btn-ghost" id="szVsNein">Keine</button><button type="button" class="btn-ghost" id="szVsZu">Abbrechen</button></div></div>`;
    document.body.appendChild(ov);
    const boxes = () => Array.from(ov.querySelectorAll('input[type=checkbox]'));
    ov.querySelector('#szVsZu').onclick = () => ov.remove();
    ov.querySelector('#szVsAlle').onclick = () => boxes().forEach(b => { b.checked = true; });
    ov.querySelector('#szVsNein').onclick = () => boxes().forEach(b => { b.checked = false; });
    ov.querySelector('#szVsOk').onclick = async () => {
      let n = 0;
      boxes().filter(b => b.checked).forEach(b => { const x = kand[+b.dataset.i]; const k = normalize(x.z.name); if (!istKatalog(zu()[k])) { zu()[k] = eintragFuer(x.z.name, x.v.a); n++; } });
      ov.remove(); if (n) await speichern(); render();
    };
    ov.addEventListener('mousedown', e => { if (e.target === ov) ov.remove(); });
  }

  function init() {
    const box = $('skSelgros'); if (!box) return;
    box.addEventListener('click', async e => {
      const t = e.target;
      const vor = t.closest('.sz-vorschlag');
      if (vor) { const z = vor.closest('.sz-zeile'); await verknuepfe([z.dataset.name], artikelNachNr(vor.dataset.artnr)); return; }
      if (t.closest('.sz-ab')) { await loese(t.closest('.sz-ab').dataset.key); return; }
      if (t.closest('.sz-nein')) { const z = t.closest('.sz-zeile'); await keinArtikelNoetig(z.dataset.key, z.dataset.name); return; }
      const sw = t.closest('[data-szansicht]'); if (sw) { ansicht = sw.dataset.szansicht; render(); return; }
      const so = t.closest('[data-szsort]'); if (so) { if (sortKey === so.dataset.szsort) sortUp = !sortUp; else { sortKey = so.dataset.szsort; sortUp = sortKey === 'name' || sortKey === 'nr' || sortKey === 'gebinde'; } render(); return; }
      if (t.closest('#szCsv')) { csvHerunterladen(); return; }
      if (t.closest('#szNeuerArtikel2')) { ansicht = 'zuordnung'; render(); $('szNeuForm').hidden = false; $('szNName').focus(); return; }
      if (t.closest('#szVorsortieren')) { vorsortieren(); return; }
      if (t.closest('#szNeuerArtikel')) { $('szNeuForm').hidden = false; $('szNName').focus(); return; }
      if (t.closest('#szNZu')) { $('szNeuForm').hidden = true; return; }
      if (t.closest('#szNSpeichern')) {
        const name = $('szNName').value.trim(), nr = $('szNNr').value.trim();
        if (!name || !nr) { alert('Bitte Artikelname und Art.-Nr. angeben.'); return; }
        zu()[normalize(name)] = { name, artNr: nr, packAmount: parseFloat($('szNMenge').value) || null, packUnit: $('szNEinheit').value.trim(), qty: null, exclude: false, source: 'manuell' };
        await speichern(); cache = new Map(); render(); return;
      }
      if (t.closest('#szMehr')) { sichtbarOffen += 60; render(); return; }
      if (t.closest('#szFalt')) { zeigeVerknuepft = !zeigeVerknuepft; render(); }
    });
    box.addEventListener('change', async e => {
      const t = e.target;
      if (t.id === 'szArtFilter') { artFilter = t.value; render(); return; }
      if (t.classList.contains('sz-suche')) {
        const a = katalog().find(x => x.name.toLowerCase() === t.value.trim().toLowerCase());
        if (!a) { if (t.value.trim()) alert('Diesen Artikel gibt es nicht in der Liste – bitte aus den Vorschlägen wählen oder oben mit „＋ Artikel“ aufnehmen.'); t.value = ''; return; }
        await verknuepfe([t.closest('.sz-zeile').dataset.name], a);
      } else if (t.classList.contains('sz-plus')) {
        const name = t.value.trim(); if (!name) return;
        const a = artikelNachNr(t.closest('.sz-zeile').dataset.artnr); if (a) await verknuepfe([name], a);
      }
    });
    box.addEventListener('input', e => {
      if (e.target.id !== 'szFilter') return;
      filter = e.target.value; sichtbarOffen = 60;
      const pos = e.target.selectionStart; render();
      const f = $('szFilter'); f.focus(); try { f.setSelectionRange(pos, pos); } catch (err) { /* ignorieren */ }
    });
    document.addEventListener('ks-artikel-geaendert', () => { if (!box.hidden) render(); });
  }
  init();
  return { render, vorschlaege };
})();
