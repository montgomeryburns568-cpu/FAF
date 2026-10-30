// ================= Buffets & Menüs (fertige Empfehlungen) =================
// Wird von build.js an der Stelle /*__PAKETE_JS__*/ in katalog-template.html eingesetzt und teilt sich dessen Variablen (DB, state, eff, mutate, …).
// Die Pakete selbst stehen in pakete-daten.js (DB.pakete). Änderungen am Stand (PAKETE, gespeichert als "speisen_pakete") überlagern sie je Paket:
//   PAKETE[id] = Paket (geändert oder eigenes Paket) | { removed: true } (ausgeblendet)
const NIVEAU_NAMEN = { 1: 'Budget', 2: 'Standard', 3: 'Hochwertig', 4: 'Exklusiv' };
const ZIELGRUPPEN = [
  { name: 'Business & Büro', farbe: '#2563eb', icon: '💼', farbe2: '#1e3a8a' },
  { name: 'Privat & Feiern', farbe: '#db2777', icon: '🎉', farbe2: '#831843' },
  { name: 'Gesund & Nachhaltig', farbe: '#16a34a', icon: '🌿', farbe2: '#14532d' },
  { name: 'Vegetarisch & Vegan', farbe: '#84a312', icon: '🥦', farbe2: '#3f6212' },
];
const MAHLZEITEN = ['Lunch', 'Mittagessen', 'Abendessen', 'Snackbuffet'];
const MAHLZEIT_INFO = { Lunch: 'leicht, meist kalt', Mittagessen: 'warmes Mittagessen', Abendessen: 'Abendessen und Feiern', Snackbuffet: 'kleine Häppchen' };
const FORMATE = ['Warmes Buffet', 'Kaltes Buffet', 'Fingerfood', 'Stehempfang', 'Menü'];
const FORMAT_ICON = { 'Warmes Buffet': '🍲', 'Kaltes Buffet': '🥗', Fingerfood: '🥢', Stehempfang: '🥂', 'Menü': '🍽️' };
const ERNAEHRUNG = { mischkost: 'Mischkost', vegetarisch: 'Vegetarisch', vegan: 'Vegan' };
const pstate = { q: '', zg: '', mahlzeit: '', format: '', niveau: '', ern: '', hidden: false };
const POPEN = new Set();   // aufgeklappte Pakete
const zgOf = name => ZIELGRUPPEN.find(z => z.name === name) || ZIELGRUPPEN[0];
const bildOk = u => typeof u === 'string' && /^(https:\/\/|\/[^\/]|data:image\/(jpeg|png|webp);base64,)/.test(u);

// Pakete des Grundbestands plus eigene; je Eintrag das wirksame Paket (p) und sein Zustand
function allPaketeEff() {
  const seeds = DB.pakete || [], out = [];
  seeds.forEach(s => {
    const m = PAKETE[s.id];
    if (m && m.removed) out.push({ p: s, status: 'ausgeblendet' });
    else if (m) out.push({ p: Object.assign({}, m, { id: s.id }), status: 'geaendert' });
    else out.push({ p: s, status: 'standard' });
  });
  Object.entries(PAKETE).forEach(([id, m]) => { if (m && !m.removed && !seeds.some(s => s.id === id)) out.push({ p: Object.assign({}, m, { id }), status: 'eigen' }); });
  return out;
}
const paketDishIds = p => [...new Set((p.gaenge || []).flatMap(g => g.gerichte || []))];
const paketDishName = id => { const g = dishOf(id); return g ? eff(g).name : null; };
const paketDishes = p => paketDishIds(p).filter(id => dishOf(id) && !REMOVED.has(id));
const nivDots = n => '●'.repeat(n) + '○'.repeat(4 - n);

function paketBild(p) {
  const z = zgOf(p.zielgruppe);
  const url = bildOk(p.bild) ? p.bild : (DB.paketBilder && DB.paketBilder[p.format + '|' + p.mahlzeit]) || (DB.paketBilder && DB.paketBilder[p.format]) || '';
  if (url && bildOk(url)) return `<div class="pimg" style="background-image:url('${esc(url).replace(/'/g, '%27')}')"></div>`;
  return `<div class="pimg ph" style="background:linear-gradient(135deg,${z.farbe},${z.farbe2})"><span>${FORMAT_ICON[p.format] || z.icon}</span></div>`;
}
function paketMatch(e) {
  const p = e.p;
  if (pstate.zg && p.zielgruppe !== pstate.zg) return false;
  if (pstate.mahlzeit && p.mahlzeit !== pstate.mahlzeit) return false;
  if (pstate.format && p.format !== pstate.format) return false;
  if (pstate.niveau && String(p.niveau) !== pstate.niveau) return false;
  if (pstate.ern === 'vegetarisch' ? p.ernaehrung === 'mischkost' : pstate.ern && p.ernaehrung !== pstate.ern) return false;
  if (pstate.q) {
    const hay = norm([p.name, p.text, (p.anlass || []).join(' '), p.zielgruppe, p.mahlzeit, p.format, NIVEAU_NAMEN[p.niveau], ERNAEHRUNG[p.ernaehrung], (p.gaenge || []).map(g => g.titel + ' ' + g.gerichte.map(paketDishName).join(' ')).join(' ')].join(' '));
    if (!norm(pstate.q).split(/\s+/).filter(Boolean).every(w => hay.includes(w))) return false;
  }
  return pstate.hidden ? e.status === 'ausgeblendet' : e.status !== 'ausgeblendet';
}
function paketHtml(e) {
  const p = e.p, open = POPEN.has(p.id), ids = paketDishes(p), ro = !!(EMB && EMB.readonly);
  const badges = [
    `<span class="pb">${esc(p.mahlzeit)}</span>`, `<span class="pb">${FORMAT_ICON[p.format] || ''} ${esc(p.format)}</span>`,
    p.ernaehrung !== 'mischkost' ? `<span class="pb ern-${esc(p.ernaehrung)}">${esc(ERNAEHRUNG[p.ernaehrung] || '')}</span>` : '',
    e.status === 'geaendert' ? '<span class="pb mod">angepasst</span>' : e.status === 'eigen' ? '<span class="pb mod">eigenes Paket</span>' : '',
  ].join('');
  let details = '';
  if (open) {
    details = `<div class="pdetails">
      ${(p.gaenge || []).map(g => `<div class="pgt">${esc(g.titel)}${g.hinweis ? ` <span class="pgh">${esc(g.hinweis)}</span>` : ''}</div><ul class="pl">${g.gerichte.map(id => {
        const n = paketDishName(id);
        return n == null ? `<li class="gone">${esc(id)} (nicht mehr im Katalog)</li>` : REMOVED.has(id) ? `<li class="gone">${esc(n)} (aus dem Katalog entfernt)</li>` : `<li><span class="pdish" data-pdish="${esc(id)}" title="Im Gerichte-Katalog zeigen">${esc(n)}</span></li>`;
      }).join('')}</ul>`).join('')}
      ${p.hinweis ? `<div class="note">${esc(p.hinweis)}</div>` : ''}
      ${(p.anlass || []).length ? `<div class="meta">Passt zu: ${esc(p.anlass.join(', '))}</div>` : ''}
      <div class="rowbtns">${e.status === 'ausgeblendet'
        ? `<button class="link" data-prestore="${esc(p.id)}">Paket wieder einblenden</button>`
        : `${EMB && EMB.select ? `<button class="link" data-pselect="${esc(p.id)}"><b>+ Alle Gerichte zum Angebot</b></button>` : ''}<button class="link" data-pcopytxt="${esc(p.id)}">Als Text kopieren</button>${ro ? '' : `<button class="link" data-pedit="${esc(p.id)}">Bearbeiten</button><button class="link" data-pdup="${esc(p.id)}">Als eigenes Paket kopieren</button>${e.status === 'geaendert' ? `<button class="link" data-preset="${esc(p.id)}">Änderungen zurücksetzen</button>` : ''}<button class="link danger" data-phide="${esc(p.id)}">${e.status === 'eigen' ? 'Paket löschen' : 'Paket ausblenden'}</button>`}<button class="link" data-pclose="${esc(p.id)}">Zuklappen</button>`}</div>
    </div>`;
  }
  return `<div class="pcard ${open ? 'open' : ''} ${e.status === 'ausgeblendet' ? 'rem' : ''}" data-pcard="${esc(p.id)}">
    <div class="pclick" data-ptoggle="${esc(p.id)}">${paketBild(p)}<span class="pn n${p.niveau}" title="Niveau: ${esc(NIVEAU_NAMEN[p.niveau])}">${nivDots(p.niveau)} ${esc(NIVEAU_NAMEN[p.niveau])}</span></div>
    <div class="pbody"><div class="pname" data-ptoggle="${esc(p.id)}">${esc(p.name)}</div>
      <div class="pbadges">${badges}</div>
      <div class="ptext">${esc(p.text || '')}</div>
      <div class="meta">${ids.length} Gerichte${(p.gaenge || []).length ? ' · ' + (p.gaenge || []).map(g => esc(g.titel)).join(', ') : ''}</div>
      ${details}
    </div></div>`;
}
function renderPakete() {
  const all = allPaketeEff();
  const sichtbar = all.filter(paketMatch);
  const versteckt = all.filter(e => e.status === 'ausgeblendet').length;
  document.getElementById('stats').textContent = `· ${all.length - versteckt} Pakete`;
  const rb = document.getElementById('showRem');
  rb.title = pstate.hidden ? 'Zurück zu den Paketen' : `Ausgeblendete Pakete (${versteckt})`;
  document.getElementById('remN').textContent = versteckt || '';
  rb.classList.toggle('active', pstate.hidden);
  document.getElementById('pzg').innerHTML = `<button class="zg${pstate.zg ? '' : ' on'}" data-zg="">Alle</button>` + ZIELGRUPPEN.map(z => {
    const n = all.filter(e => e.p.zielgruppe === z.name && (pstate.hidden ? e.status === 'ausgeblendet' : e.status !== 'ausgeblendet')).length;
    return `<button class="zg${pstate.zg === z.name ? ' on' : ''}" data-zg="${esc(z.name)}" style="--zc:${z.farbe}">${z.icon} ${esc(z.name)} <span class="count">${n}</span></button>`;
  }).join('');
  let html = '';
  ZIELGRUPPEN.forEach(z => {
    const list = sichtbar.filter(e => e.p.zielgruppe === z.name).sort((a, b) => a.p.niveau - b.p.niveau || MAHLZEITEN.indexOf(a.p.mahlzeit) - MAHLZEITEN.indexOf(b.p.mahlzeit) || a.p.name.localeCompare(b.p.name, 'de'));
    if (!list.length) return;
    html += secHtml('P:' + z.name, z.name, list.length + ' Pakete', `<div class="pgrid">${list.map(paketHtml).join('')}</div>`, { farbe: z.farbe, standard: true });
  });
  if (!html) html = `<div class="empty">${pstate.hidden ? 'Keine ausgeblendeten Pakete.' : 'Kein Paket für diese Auswahl. Filter zurücksetzen oder mit „+ Neues Paket“ eines anlegen.'}</div>`;
  const y = window.scrollY;
  document.getElementById('main').innerHTML = html;
  window.scrollTo(0, y);
}
function paketText(p) {
  const z = [p.mahlzeit, p.format, NIVEAU_NAMEN[p.niveau]].concat(p.ernaehrung !== 'mischkost' ? [ERNAEHRUNG[p.ernaehrung]] : []).join(' · ');
  let t = p.name + '\n' + z + '\n' + (p.text ? p.text + '\n' : '');
  (p.gaenge || []).forEach(g => {
    const namen = g.gerichte.filter(id => dishOf(id) && !REMOVED.has(id)).map(paketDishName);
    if (namen.length) t += '\n' + g.titel + (g.hinweis ? ' (' + g.hinweis + ')' : '') + ':\n' + namen.map(n => '- ' + n).join('\n') + '\n';
  });
  if (p.hinweis) t += '\nHinweis: ' + p.hinweis + '\n';
  return t.trim();
}
function kopiere(text, meldung) {
  const fallback = () => { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* ignorieren */ } ta.remove(); toast(ok ? meldung : 'Kopieren nicht möglich.'); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => toast(meldung), fallback); else fallback();
}
function selectPaket(id) {
  const e = allPaketeEff().find(x => x.p.id === id); if (!e) return;
  const ids = paketDishes(e.p);
  ids.forEach(did => selectDish(did, true));
  tellParent({ type: 'ks-katalog:add-package', paket: { id: e.p.id, name: e.p.name, niveau: NIVEAU_NAMEN[e.p.niveau], gerichte: ids } });
  toast('Paket „' + e.p.name + '“: ' + ids.length + ' Gerichte zum Angebot hinzugefügt.');
}
function paketKopieAnlegen(id) {
  const e = allPaketeEff().find(x => x.p.id === id); if (!e) return;
  const nid = 'pu-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  mutate(() => { PAKETE[nid] = Object.assign(JSON.parse(JSON.stringify(e.p)), { id: nid, name: e.p.name + ' (Kopie)' }); POPEN.add(nid); });
  toast('Kopie angelegt – jetzt über „Bearbeiten“ anpassen.');
}

// ---- Paket bearbeiten ----
const pe = { draft: null, alle: [] };
function peBild() {
  const d = pe.draft, u = bildOk(d.bild) ? d.bild : '';
  document.getElementById('peImg').innerHTML = u ? `<div class="pimg" style="background-image:url('${esc(u).replace(/'/g, '%27')}');height:120px"></div>` : '<div class="hint">Kein eigenes Bild: es wird ein Platzhalter angezeigt.</div>';
  document.getElementById('peUrl').value = u.startsWith('data:') ? '' : u;
  document.getElementById('peImgDel').style.display = u ? '' : 'none';
}
function peDrawGaenge(focusGi) {
  const d = pe.draft;
  document.getElementById('peGaenge').innerHTML = d.gaenge.map((g, gi) => `<div class="peg" data-gi="${gi}">
    <div class="peg-head"><input type="text" class="pe-gt" data-gf="titel" value="${esc(g.titel)}" placeholder="Gang (z. B. Hauptgang)" autocomplete="off"><input type="text" class="pe-gh" data-gf="hinweis" value="${esc(g.hinweis || '')}" placeholder="Hinweis (z. B. drei Gerichte zur Wahl)" autocomplete="off">
      <button type="button" class="ib" data-gup title="Nach oben">↑</button><button type="button" class="ib" data-gdown title="Nach unten">↓</button><button type="button" class="ib" data-gdel title="Gang entfernen">×</button></div>
    <div class="peg-dishes">${g.gerichte.map((id, di) => { const n = paketDishName(id); return `<span class="pe-chip${n == null || REMOVED.has(id) ? ' gone' : ''}">${esc(n == null ? id + ' (nicht mehr im Katalog)' : n)}<b data-ddel="${di}" title="Entfernen">×</b></span>`; }).join('') || '<span class="hint">Noch kein Gericht</span>'}</div>
    <input type="text" class="pe-search" data-gi="${gi}" placeholder="Gericht suchen und hinzufügen …" autocomplete="off"><div class="pe-res"></div></div>`).join('') || '<div class="hint">Noch kein Gang.</div>';
  if (focusGi != null) { const s = document.querySelector('.pe-search[data-gi="' + focusGi + '"]'); if (s) s.focus(); }
}
function peOpen(id) {
  let p;
  if (id) { const e = allPaketeEff().find(x => x.p.id === id); if (!e) return; p = JSON.parse(JSON.stringify(e.p)); }
  else p = { id: 'pu-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: '', text: '', zielgruppe: pstate.zg || ZIELGRUPPEN[0].name, mahlzeit: pstate.mahlzeit || 'Mittagessen', format: pstate.format || 'Warmes Buffet', niveau: +pstate.niveau || 2, ernaehrung: pstate.ern || 'mischkost', anlass: [], hinweis: '', bild: '', gaenge: [{ titel: 'Hauptgang', hinweis: '', gerichte: [] }] };
  p.anlass = p.anlass || []; p.gaenge = p.gaenge || [];
  pe.draft = p;
  pe.alle = allDishes().filter(g => !REMOVED.has(g.id)).map(g => ({ id: g.id, name: eff(g).name }));
  const opt = (arr, cur) => arr.map(v => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(v)}</option>`).join('');
  document.getElementById('peTitle').textContent = id ? 'Paket bearbeiten' : 'Neues Paket';
  document.getElementById('peBody').innerHTML = `
    <label>Name</label><input type="text" data-f="name" value="${esc(p.name)}" autocomplete="off">
    <label>Beschreibung (ein bis zwei Sätze, was der Kunde bekommt)</label><textarea data-f="text" style="min-height:70px">${esc(p.text || '')}</textarea>
    <div class="pe-row">
      <div><label>Zielgruppe</label><select data-f="zielgruppe">${opt(ZIELGRUPPEN.map(z => z.name), p.zielgruppe)}</select></div>
      <div><label>Mahlzeit</label><select data-f="mahlzeit">${opt(MAHLZEITEN, p.mahlzeit)}</select></div>
      <div><label>Format</label><select data-f="format">${opt(FORMATE, p.format)}</select></div>
      <div><label>Niveau</label><select data-f="niveau">${[1, 2, 3, 4].map(n => `<option value="${n}"${n === p.niveau ? ' selected' : ''}>${NIVEAU_NAMEN[n]}</option>`).join('')}</select></div>
      <div><label>Ernährung</label><select data-f="ernaehrung">${Object.entries(ERNAEHRUNG).map(([k, v]) => `<option value="${k}"${k === p.ernaehrung ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
    </div>
    <label>Passt zu (Stichworte, mit Komma getrennt – wird bei der Suche gefunden)</label><input type="text" data-f="anlass" value="${esc((p.anlass || []).join(', '))}" autocomplete="off">
    <label>Hinweis für uns (optional)</label><input type="text" data-f="hinweis" value="${esc(p.hinweis || '')}" autocomplete="off">
    <label>Bild</label><div id="peImg"></div>
    <div class="tagrow"><input type="text" id="peUrl" placeholder="Bildadresse (https://…) einfügen" autocomplete="off"><button type="button" id="peFile">Bild hochladen …</button><button type="button" id="peImgDel">Entfernen</button></div>
    <input type="file" id="peFileIn" accept="image/*" style="display:none">
    <label>Gänge und Gerichte</label><div id="peGaenge"></div>
    <div class="tagrow"><button type="button" id="peAddGang">+ Gang hinzufügen</button></div>`;
  document.getElementById('peFoot').innerHTML = '<button type="button" id="peCancel">Abbrechen</button>' + '<button type="button" id="peSave" class="primary">Speichern</button>';
  peBild(); peDrawGaenge();
  document.getElementById('pe').classList.add('open');
  document.getElementById('peBody').querySelector('[data-f="name"]').focus();
}
const peClose = () => document.getElementById('pe').classList.remove('open');
function bildAusDatei(file, fertig) {
  const r = new FileReader();
  r.onerror = () => toast('Bild konnte nicht gelesen werden.');
  r.onload = () => {
    const img = new Image();
    img.onerror = () => toast('Das ist kein Bild, das ich lesen kann.');
    img.onload = () => {
      const s = Math.min(1, 720 / img.width), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      let q = 0.74, url = c.toDataURL('image/jpeg', q);
      while (url.length > 110000 && q > 0.4) { q -= 0.1; url = c.toDataURL('image/jpeg', q); }
      fertig(url);
    };
    img.src = r.result;
  };
  r.readAsDataURL(file);
}
function peSave() {
  const d = pe.draft;
  if (!d.name.trim()) { toast('Bitte einen Namen eingeben.'); document.querySelector('#peBody [data-f="name"]').focus(); return; }
  d.name = d.name.trim();
  d.gaenge = d.gaenge.filter(g => g.gerichte.length || g.titel.trim()).map(g => ({ titel: (g.titel || '').trim() || 'Gerichte', hinweis: (g.hinweis || '').trim() || undefined, gerichte: g.gerichte }));
  if (!d.gaenge.some(g => g.gerichte.length)) { toast('Bitte mindestens ein Gericht hinzufügen.'); return; }
  const clean = JSON.parse(JSON.stringify(d));
  if (!clean.hinweis) delete clean.hinweis;
  if (!bildOk(clean.bild)) delete clean.bild;
  if (JSON.stringify(KEYS()).length + JSON.stringify(clean).length > 1500000) { toast('Der Speicher für Änderungen ist fast voll (große Bilder?). Bitte ein kleineres Bild nehmen.'); return; }
  const seed = (DB.pakete || []).find(s => s.id === clean.id);
  const gleich = seed && JSON.stringify(Object.assign({ hinweis: undefined, bild: undefined }, seed)) === JSON.stringify(Object.assign({ hinweis: undefined, bild: undefined }, clean));
  peClose();
  mutate(() => { if (gleich) delete PAKETE[clean.id]; else PAKETE[clean.id] = clean; POPEN.add(clean.id); });
}
(function peEvents() {
  const body = document.getElementById('peBody');
  body.addEventListener('input', ev => {
    const d = pe.draft, t = ev.target;
    if (t.dataset.f) { d[t.dataset.f] = t.dataset.f === 'anlass' ? t.value.split(',').map(x => x.trim()).filter(Boolean) : t.dataset.f === 'niveau' ? +t.value : t.value; return; }
    if (t.id === 'peUrl') { d.bild = t.value.trim(); const v = bildOk(d.bild) ? d.bild : ''; document.getElementById('peImg').innerHTML = v ? `<div class="pimg" style="background-image:url('${esc(v).replace(/'/g, '%27')}');height:120px"></div>` : ''; document.getElementById('peImgDel').style.display = d.bild ? '' : 'none'; return; }
    const gEl = t.closest('.peg'); if (!gEl) return;
    const gi = +gEl.dataset.gi, g = d.gaenge[gi];
    if (t.dataset.gf) { g[t.dataset.gf] = t.value; return; }
    if (t.classList.contains('pe-search')) {
      const q = norm(t.value).split(/\s+/).filter(Boolean), res = gEl.querySelector('.pe-res');
      if (!q.length) { res.innerHTML = ''; return; }
      const treffer = pe.alle.filter(x => !g.gerichte.includes(x.id) && q.every(w => norm(x.name).includes(w))).slice(0, 10);
      res.innerHTML = treffer.map(x => `<div class="pe-hit" data-hit="${esc(x.id)}">${esc(x.name)}</div>`).join('') || '<div class="hint">Nichts gefunden.</div>';
    }
  });
  body.addEventListener('click', ev => {
    const d = pe.draft, t = ev.target;
    if (t.id === 'peFile') { document.getElementById('peFileIn').click(); return; }
    if (t.id === 'peImgDel') { d.bild = ''; peBild(); return; }
    if (t.id === 'peAddGang') { d.gaenge.push({ titel: '', hinweis: '', gerichte: [] }); peDrawGaenge(d.gaenge.length - 1); return; }
    const gEl = t.closest('.peg'); if (!gEl) return;
    const gi = +gEl.dataset.gi, g = d.gaenge[gi];
    if (t.closest('[data-gdel]')) { d.gaenge.splice(gi, 1); peDrawGaenge(); return; }
    if (t.closest('[data-gup]') && gi > 0) { d.gaenge.splice(gi - 1, 0, d.gaenge.splice(gi, 1)[0]); peDrawGaenge(); return; }
    if (t.closest('[data-gdown]') && gi < d.gaenge.length - 1) { d.gaenge.splice(gi + 1, 0, d.gaenge.splice(gi, 1)[0]); peDrawGaenge(); return; }
    if (t.dataset.ddel != null) { g.gerichte.splice(+t.dataset.ddel, 1); peDrawGaenge(); return; }
    const hit = t.closest('[data-hit]'); if (hit) { if (!g.gerichte.includes(hit.dataset.hit)) g.gerichte.push(hit.dataset.hit); peDrawGaenge(gi); }
  });
  body.addEventListener('change', ev => {
    if (ev.target.id !== 'peFileIn') return;
    const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
    bildAusDatei(f, url => { pe.draft.bild = url; peBild(); });
  });
  document.getElementById('peFoot').addEventListener('click', ev => {
    if (ev.target.id === 'peCancel') peClose(); else if (ev.target.id === 'peSave') peSave();
  });
  document.getElementById('pe').addEventListener('click', ev => { if (ev.target.id === 'pe') peClose(); });
})();

// ---- Bedienung der Paket-Ansicht ----
function bindPaketBedienung() {
  const rd = () => { if (state.view === 'P') renderPakete(); };
  document.getElementById('pq').oninput = e => { pstate.q = e.target.value; rd(); };
  [['pMahl', 'mahlzeit'], ['pFormat', 'format'], ['pNiveau', 'niveau'], ['pErn', 'ern']].forEach(([id, k]) => { document.getElementById(id).onchange = e => { pstate[k] = e.target.value; rd(); }; });
  document.getElementById('pClear').onclick = () => { Object.assign(pstate, { q: '', zg: '', mahlzeit: '', format: '', niveau: '', ern: '' }); document.getElementById('pq').value = ''; ['pMahl', 'pFormat', 'pNiveau', 'pErn'].forEach(i => document.getElementById(i).value = ''); rd(); };
  document.getElementById('pNew').onclick = () => { if (EMB && EMB.readonly) { toast('Nur Lesezugriff.'); return; } peOpen(null); };
  document.getElementById('pzg').onclick = e => { const b = e.target.closest('[data-zg]'); if (!b) return; pstate.zg = b.dataset.zg; rd(); };
}
function paketKlick(e) {
  const t = e.target, id = k => { const el = t.closest('[' + k + ']'); return el && el.getAttribute(k); };
  let v;
  if ((v = id('data-pselect'))) { selectPaket(v); return true; }
  if ((v = id('data-pcopytxt'))) { const x = allPaketeEff().find(a => a.p.id === v); if (x) kopiere(paketText(x.p), 'Paket „' + x.p.name + '“ als Text kopiert.'); return true; }
  if ((v = id('data-pedit'))) { peOpen(v); return true; }
  if ((v = id('data-pdup'))) { paketKopieAnlegen(v); return true; }
  if ((v = id('data-preset'))) { mutate(() => { delete PAKETE[v]; }); return true; }
  if ((v = id('data-phide'))) {
    const x = allPaketeEff().find(a => a.p.id === v); if (!x) return true;
    if (x.status === 'eigen') dlgOpen({ title: 'Paket löschen?', sub: '„' + x.p.name + '“ ist ein eigenes Paket und wird gelöscht.', buttons: [{ label: 'Abbrechen' }, { label: 'Löschen', cls: 'primary', fn: () => mutate(() => { delete PAKETE[v]; POPEN.delete(v); }) }] });
    else mutate(() => { PAKETE[v] = { removed: true }; POPEN.delete(v); });
    return true;
  }
  if ((v = id('data-prestore'))) { mutate(() => { delete PAKETE[v]; if (!allPaketeEff().some(a => a.status === 'ausgeblendet')) pstate.hidden = false; }); return true; }
  if ((v = id('data-pdish'))) { const n = paketDishName(v); Object.assign(state, { q: n || '', kueche: '', gang: '', sammlung: '', tag: '', comp: '', showRemoved: false }); document.getElementById('q').value = n || ''; setTab('D'); window.scrollTo(0, 0); return true; }
  if ((v = id('data-pclose'))) { POPEN.delete(v); renderPakete(); return true; }
  if ((v = id('data-ptoggle'))) { if (POPEN.has(v)) POPEN.delete(v); else POPEN.add(v); renderPakete(); return true; }
  return false;
}
