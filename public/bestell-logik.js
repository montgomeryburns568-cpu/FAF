// Bestellrhythmus: Einkaufslisten müssen spätestens Dienstag 11:30 abgeschickt sein, die Lieferung kommt Mittwoch um 12:00.
// Die Lieferung am Mittwoch deckt alle Aufträge von Freitag (zwei Tage später) bis Donnerstag der Folgewoche.
//   Beispiel: Aufträge Fr 09.10. – Do 15.10. → Bestellfrist Di 06.10. 11:30 → Lieferung Mi 07.10. 12:00
// Aufträge, die nach der Frist eingehen (oder sich danach ändern), landen auf einer SEPARATEN Nachbestell-Liste.
// Reine Logik ohne Oberfläche; läuft im Browser (vor bestellung.js) und in Node-Tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BestellLogik = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const REGEL = { blockStartTag: 5 /* Freitag */, fristTagVorBlock: 3 /* Dienstag */, fristZeit: '11:30', lieferTagVorBlock: 2 /* Mittwoch */, lieferZeit: '12:00' };
  const pad = n => String(n).padStart(2, '0');
  function addDays(iso, n) {
    const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const wochentag = iso => new Date(iso + 'T12:00:00Z').getUTCDay();   // 0 = Sonntag
  // Freitag des Bestellblocks (Fr–Do), in dem ein Datum liegt
  function blockStart(iso) { return addDays(iso, -((wochentag(iso) - REGEL.blockStartTag + 7) % 7)); }
  function blockInfo(startIso) {
    return {
      start: startIso, ende: addDays(startIso, 6),
      fristTag: addDays(startIso, -REGEL.fristTagVorBlock), fristZeit: REGEL.fristZeit,
      lieferTag: addDays(startIso, -REGEL.lieferTagVorBlock), lieferZeit: REGEL.lieferZeit,
    };
  }
  // lokale Zeit "JJJJ-MM-TT" + "HH:MM" -> Date
  const zeitpunkt = (iso, hhmm) => { const [h, m] = hhmm.split(':').map(Number); const [y, mo, d] = iso.split('-').map(Number); return new Date(y, mo - 1, d, h, m, 0, 0); };
  const fristZeitpunkt = info => zeitpunkt(info.fristTag, info.fristZeit);
  const fristVorbei = (info, jetzt) => (jetzt || new Date()) > fristZeitpunkt(info);
  // Restzeit bis zur Frist in Millisekunden (negativ = überschritten)
  const restZeitMs = (info, jetzt) => fristZeitpunkt(info) - (jetzt || new Date());

  // Positionen als Map "name|einheit" -> Menge
  const key = p => (p.name || '').toLowerCase().trim() + '|' + (p.unit || '').toLowerCase().trim();
  function zuMap(positionen) {
    const m = new Map();
    (positionen || []).forEach(p => {
      const k = key(p); const e = m.get(k) || { name: p.name, unit: p.unit, amount: 0 };
      e.amount += Number(p.amount) || 0; m.set(k, e);
    });
    return m;
  }
  // Was fehlt gegenüber bereits Bestelltem? (nur positive Differenzen; sinkender Bedarf erzeugt keine Position)
  function differenz(bedarf, bestellt) {
    const b = zuMap(bedarf), s = zuMap(bestellt), out = [];
    b.forEach((e, k) => {
      const diff = e.amount - ((s.get(k) || {}).amount || 0);
      if (diff > 1e-6) out.push({ name: e.name, unit: e.unit, amount: Math.round(diff * 100) / 100 });
    });
    return out.sort((a, c) => a.name.localeCompare(c.name, 'de'));
  }
  // Zustand eines Blocks: runden = bereits abgeschickte Listen (Haupt + Nachbestellungen) des Blocks
  //  - noch nichts abgeschickt:      offene Liste = gesamter Bedarf ("Hauptbestellung"); nach der Frist als "überfällig" markiert
  //  - schon abgeschickt:            offene Liste = Bedarf minus bereits Bestelltes ("Nachbestellung"), nur wenn etwas fehlt
  function blockZustand(info, bedarf, runden, jetzt) {
    const abgeschickt = (runden || []).filter(r => r.abgeschicktAm);
    const bestellt = abgeschickt.flatMap(r => r.positionen || []);
    const hatHaupt = abgeschickt.some(r => r.typ === 'haupt');
    const vorbei = fristVorbei(info, jetzt);
    if (!hatHaupt) {
      return { typ: 'haupt', offen: differenz(bedarf, bestellt), ueberfaellig: vorbei, fristVorbei: vorbei, abgeschickt };
    }
    return { typ: 'nach', offen: differenz(bedarf, bestellt), ueberfaellig: false, fristVorbei: vorbei, abgeschickt };
  }

  return { REGEL, addDays, wochentag, blockStart, blockInfo, fristVorbei, restZeitMs, zuMap, differenz, blockZustand, zeitpunkt };
});
