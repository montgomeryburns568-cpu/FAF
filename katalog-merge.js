// Zusammenführen von Änderungen am Speisenkatalog-Stand, wenn mehrere Personen gleichzeitig arbeiten (Küche UND Büro).
// Der Stand besteht aus sieben Schlüsseln: Zuordnungstabellen (id -> Wert) und einer Liste entfernter Gerichte (Menge).
//   aktuell: Stand auf dem Server    basis: Stand, den der Browser zuletzt vom Server bekommen hat    meins: Stand im Browser
// Übernommen wird jede Änderung, die der Browser seit "basis" gemacht hat – je Eintrag (id), nicht als ganzer Stand.
// Haben beide denselben Eintrag geändert, gewinnt die zuletzt gespeicherte Änderung (meins).
const KEYS = ['speisen_names', 'speisen_mods', 'speisen_custom', 'speisen_removed', 'speisen_tagmods', 'speisen_todos', 'speisen_groups'];
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function mergeKatalogDaten(aktuell, basis, meins) {
  aktuell = aktuell || {}; basis = basis || {}; meins = meins || {};
  const out = {};
  for (const k of KEYS) {
    const cur = aktuell[k], b = basis[k], m = meins[k];
    if (k === 'speisen_removed') {
      const set = new Set(Array.isArray(cur) ? cur : []);
      const bs = new Set(Array.isArray(b) ? b : []), ms = new Set(Array.isArray(m) ? m : []);
      ms.forEach(id => { if (!bs.has(id)) set.add(id); });       // von mir entfernt
      bs.forEach(id => { if (!ms.has(id)) set.delete(id); });    // von mir wiederhergestellt
      out[k] = [...set];
      continue;
    }
    const res = { ...(cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {}) };
    const mm = m && typeof m === 'object' ? m : {}, bb = b && typeof b === 'object' ? b : {};
    const ids = new Set([...Object.keys(bb), ...Object.keys(mm)]);
    ids.forEach(id => {
      if (gleich(mm[id], bb[id])) return;          // von mir unverändert
      if (mm[id] === undefined) delete res[id];    // von mir gelöscht
      else res[id] = mm[id];
    });
    out[k] = res;
  }
  return out;
}

module.exports = { mergeKatalogDaten, KEYS };
