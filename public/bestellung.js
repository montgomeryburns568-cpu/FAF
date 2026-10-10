// Wochenbestellung nach dem Bestellrhythmus (siehe bestell-logik.js): Einkaufsliste je Bestellblock Fr–Do, Bestellfrist Di 11:30, Lieferung Mi 12:00.
// Nach dem Abschicken entstehen spätere Änderungen/Aufträge als separate Nachbestell-Liste. Läuft nach app.js und nutzt dessen Globals.
const Bestellung = (function () {
  const B = BestellLogik, K = KarteiLogik;
  const $ = id => document.getElementById(id);
  const esc = s => escHtml(s);
  const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const kurz = iso => `${WT[B.wochentag(iso)]} ${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
  const kurzJ = iso => kurz(iso) + iso.slice(0, 4);
  const num = n => (Math.round(n * 100) / 100).toString().replace('.', ',');
  const runden = () => (state.bestellungen = state.bestellungen || []);
  const keyOf = (name, unit) => (name || '').toLowerCase().trim() + '|' + (unit || '').toLowerCase().trim();
  let blockStart = null;

  function kalenderwoche(iso) {
    const d = new Date(iso + 'T12:00:00Z'); const t = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - t);
    return Math.ceil(((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7);
  }
  // Der Block, dessen Bestellfrist als nächste ansteht
  function naechsterBlock() {
    const s = B.blockStart(K.heuteIso());
    for (let i = 0; i < 8; i++) { const start = B.addDays(s, 7 * i); if (!B.fristVorbei(B.blockInfo(start))) return start; }
    return s;
  }

  // Bedarf eines Blocks: alle Aufträge mit Tagen im Block, abzüglich Vorrat/Überproduktion; Mehrtages-Aufträge werden nach Tagen auf die Blöcke verteilt
  function bedarfFuerBlock(start) {
    const info = B.blockInfo(start);
    const imBlock = iso => iso && iso >= info.start && iso <= info.ende;
    const map = new Map(), nach = new Map(), auftraege = [];
    for (const ev of state.events || []) {
      if (!ev.days || !ev.days.length) continue;
      const tage = ev.days.filter(d => imBlock(K.parseDatumDE(d.date)));
      if (!tage.length) continue;
      let comp; try { comp = computeEvent(ev, state.recipes, state.rules); } catch (e) { continue; }
      const blockTage = comp.days.filter(d => tage.some(t => t.id === d.id));
      const totalsBlock = aggregateIngredients({ days: blockTage });
      const v = Vorrat.verrechne(ev, aggregateIngredients(comp));
      const faktor = new Map(v.rows.map(r => [keyOf(r.name, r.unit), r.amount > 0 ? r.rest / r.amount : 1]));
      totalsBlock.forEach(t => {
        const k = keyOf(t.name, t.unit); const f = faktor.has(k) ? faktor.get(k) : 1;
        const e = map.get(k) || { name: t.name, unit: t.unit, amount: 0 }; e.amount += t.amount * f; map.set(k, e);
      });
      v.nachbestellen.forEach(n => nach.set(n.item.id, n));
      auftraege.push({ ev, tage: blockTage.map(d => d.date), gaeste: Math.max(0, ...blockTage.map(d => d.personen || 0), ev.personen || 0) });
    }
    // Basisartikel unter Mindestbestand: einmal je Artikel nachbestellen
    nach.forEach(n => { const k = keyOf(n.item.name, n.item.einheit); const e = map.get(k) || { name: n.item.name, unit: n.item.einheit, amount: 0 }; e.amount += n.menge; e.nach = n; map.set(k, e); });
    const positionen = Array.from(map.values()).filter(p => p.amount > 1e-6).map(p => ({ name: p.name, unit: p.unit, amount: Math.round(p.amount * 100) / 100, nach: p.nach }))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
    return { positionen, auftraege, info };
  }
  const zustandFuer = (start, bedarf) => B.blockZustand(B.blockInfo(start), bedarf.positionen, runden().filter(r => r.block === start));

  function restText(info) {
    const ms = B.restZeitMs(info);
    if (ms <= 0) return null;
    const std = Math.floor(ms / 3600000), tg = Math.floor(std / 24);
    return tg >= 1 ? `noch ${tg} Tag${tg === 1 ? '' : 'e'} ${std % 24} Std.` : `noch ${std} Std. ${Math.floor((ms % 3600000) / 60000)} Min.`;
  }
  function statusChip(info, z) {
    if (z.abgeschickt.some(r => r.typ === 'haupt')) return `<span class="ek-chip ek-ok">✓ Hauptbestellung abgeschickt</span>`;
    const t = restText(info);
    if (t) { const std = B.restZeitMs(info) / 3600000; return `<span class="ek-chip ${std <= 3 ? 'ek-rot' : std <= 24 ? 'ek-warn' : 'ek-ok'}">⏰ Frist: ${t}</span>`; }
    return `<span class="ek-chip ek-rot">⚠ Frist überschritten – nicht abgeschickt</span>`;
  }

  // Frühere Blöcke, bei denen nach der Frist noch etwas offen ist
  function offenVorher() {
    const out = [];
    const s = B.blockStart(K.heuteIso());
    for (let i = -3; i <= 0; i++) {
      const start = B.addDays(s, 7 * i);
      if (start === blockStart || B.blockInfo(start).ende < K.heuteIso()) continue;   // vollständig vergangene Zeiträume sind nicht mehr bestellbar
      const d = bedarfFuerBlock(start); if (!d.auftraege.length) continue;
      const z = zustandFuer(start, d);
      if (z.fristVorbei && z.offen.length) out.push({ start, n: z.offen.length, typ: z.typ });
    }
    return out;
  }

  function render(out) {
    if (!blockStart) blockStart = naechsterBlock();
    const d = bedarfFuerBlock(blockStart), info = d.info;
    const rd = runden().filter(r => r.block === blockStart);
    const z = B.blockZustand(info, d.positionen, rd);
    const vorher = offenVorher();
    let h = `<div class="ek-kopf">
      <div class="ek-nav"><button type="button" class="btn-ghost small-btn" data-ek="prev" title="Vorherige Woche">◀</button>
        <strong>Bestellung für ${kurz(info.start)} – ${kurzJ(info.ende)} · KW ${kalenderwoche(info.start)}</strong>
        <button type="button" class="btn-ghost small-btn" data-ek="next" title="Nächste Woche">▶</button>
        <button type="button" class="btn-ghost small-btn" data-ek="heute">Nächste Frist</button></div>
      <div class="ek-fristen">Bestellfrist <b>${kurz(info.fristTag)} ${info.fristZeit} Uhr</b> · Lieferung <b>${kurz(info.lieferTag)} ${info.lieferZeit} Uhr</b> · ${statusChip(info, z)}</div>
    </div>`;
    if (vorher.length) h += `<div class="ek-alarm">⚠ Früherer Zeitraum mit offener Bestellung: ${vorher.map(v => `<button type="button" class="link-btn" data-ek="goto" data-start="${v.start}">${kurz(v.start)}–${kurz(B.addDays(v.start, 6))} (${v.n} Positionen${v.typ === 'haupt' ? ', nie abgeschickt' : ' nachzubestellen'})</button>`).join(' · ')}</div>`;
    h += `<details class="ek-auftraege"><summary><strong>${d.auftraege.length}</strong> ${d.auftraege.length === 1 ? 'Auftrag' : 'Aufträge'} in diesem Zeitraum</summary>
      ${d.auftraege.length ? `<ul>${d.auftraege.sort((a, b) => (a.tage[0] || '').localeCompare(b.tage[0] || '')).map(a => `<li>${esc(a.ev.name)} <span class="hint">· ${esc(a.tage.join(', '))} · ${a.gaeste || '?'} Gäste</span></li>`).join('')}</ul>` : '<p class="hint">Keine Aufträge mit Datum in diesem Zeitraum.</p>'}</details>`;

    const titel = z.typ === 'haupt'
      ? (z.ueberfaellig ? 'Hauptbestellung – Frist überschritten (bitte außer der Reihe bestellen)' : 'Hauptbestellung')
      : 'Nachbestellung – separate Liste (nach der Hauptbestellung hinzugekommen oder geändert)';
    h += `<h3 class="ek-titel">${titel}</h3>`;
    if (z.offen.length) {
      const items = z.offen.map(p => { const src = d.positionen.find(x => keyOf(x.name, x.unit) === keyOf(p.name, p.unit)); return { name: p.name, unit: p.unit, amount: p.amount, nach: src && src.nach ? src.nach : undefined }; });
      h += ezTabelleHTML(items);
      h += `<div class="actions-row"><button type="button" class="btn-primary" data-ek="abschicken">${z.typ === 'haupt' ? 'Hauptbestellung' : 'Nachbestellung'} als abgeschickt markieren (${z.offen.length} Positionen)</button></div>
        <p class="hint">„Abgeschickt“ merkt sich, was bestellt wurde. Kommt danach ein Auftrag dazu oder ändert sich einer, entsteht automatisch eine <b>separate Nachbestell-Liste</b> nur mit den Mehrmengen.</p>`;
    } else {
      h += z.abgeschickt.length ? '<p class="hint">✅ Alles bestellt – nichts offen. Kommt ein Auftrag dazu, erscheint hier eine separate Nachbestell-Liste.</p>'
        : '<p class="hint">Für diesen Zeitraum liegen noch keine Aufträge vor.</p>';
    }
    if (rd.length) {
      h += `<h3 class="ek-titel">Bereits abgeschickt</h3><ul class="ek-runden">${rd.filter(r => r.abgeschicktAm).sort((a, b) => a.abgeschicktAm.localeCompare(b.abgeschicktAm)).map(r => `<li>
        <details><summary><strong>${r.typ === 'haupt' ? 'Hauptbestellung' : 'Nachbestellung ' + r.nr}</strong> · ${new Date(r.abgeschicktAm).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · ${(r.positionen || []).length} Positionen${r.nachFrist ? ' · <span class="hint">nach der Frist</span>' : ''}</summary>
        <ul>${(r.positionen || []).map(p => `<li>${esc(p.name)} – ${num(p.amount)} ${esc(p.unit)}</li>`).join('')}</ul>
        <button type="button" class="btn-ghost small-btn" data-ek="zurueck" data-id="${esc(r.id)}">Als abgeschickt zurücknehmen</button></details></li>`).join('')}</ul>`;
    }
    out.innerHTML = h;
    badge();
  }

  async function abschicken() {
    const d = bedarfFuerBlock(blockStart);
    const rd = runden().filter(r => r.block === blockStart);
    const z = B.blockZustand(d.info, d.positionen, rd);
    if (!z.offen.length) return;
    if (!confirm(`${z.typ === 'haupt' ? 'Hauptbestellung' : 'Nachbestellung'} mit ${z.offen.length} Positionen als abgeschickt markieren?`)) return;
    const nr = rd.filter(r => r.typ === z.typ).length + 1;
    const jetzt = new Date().toISOString();
    const runde = { id: uid(), block: blockStart, typ: z.typ, nr, erstelltAm: jetzt, abgeschicktAm: jetzt, nachFrist: z.fristVorbei, positionen: z.offen.map(p => ({ name: p.name, unit: p.unit, amount: p.amount })), auftraege: d.auftraege.map(a => a.ev.id) };
    state.bestellungen = await API.send('PUT', '/api/bestellungen', runden().concat([runde]));
    renderEinkaufsliste();
  }

  // kleines Warnzeichen am Reiter "Einkaufsliste": Frist heute/morgen ohne abgeschickte Hauptbestellung oder offene Nachbestellung
  function badge() {
    const el = $('ekBadge'); if (!el || !state) return;
    try {
      const start = naechsterBlock(), d = bedarfFuerBlock(start);
      const z = zustandFuer(start, d);
      const std = B.restZeitMs(d.info) / 3600000;
      const hauptOffen = d.auftraege.length && !z.abgeschickt.some(r => r.typ === 'haupt') && z.offen.length && std <= 24;
      const frueher = offenVorher().length;
      el.style.display = hauptOffen || frueher || (z.typ === 'nach' && z.offen.length) ? '' : 'none';
      el.textContent = frueher ? '!' : hauptOffen ? '⏰' : '+';
      el.title = frueher ? 'Offene Bestellung aus einem früheren Zeitraum' : hauptOffen ? 'Bestellfrist in weniger als 24 Stunden' : 'Nachbestellung offen';
    } catch (e) { el.style.display = 'none'; }
  }

  function init() {
    $('ekModus').addEventListener('click', e => { const b = e.target.closest('button[data-modus]'); if (!b) return; ekModus = b.dataset.modus; renderEinkaufsliste(); });
    $('einkaufslisteOutput').addEventListener('click', async e => {
      const b = e.target.closest('[data-ek]'); if (!b) return;
      const a = b.dataset.ek;
      if (a === 'prev') blockStart = B.addDays(blockStart, -7);
      else if (a === 'next') blockStart = B.addDays(blockStart, 7);
      else if (a === 'heute') blockStart = naechsterBlock();
      else if (a === 'goto') blockStart = b.dataset.start;
      else if (a === 'abschicken') return abschicken();
      else if (a === 'zurueck') {
        if (!confirm('Diese Bestellung wieder als „nicht abgeschickt“ markieren?')) return;
        state.bestellungen = await API.send('PUT', '/api/bestellungen', runden().filter(r => r.id !== b.dataset.id));
      } else return;
      renderEinkaufsliste();
    });
    setInterval(badge, 60000);
  }
  init();
  return { render, badge, naechsterBlock };
})();
