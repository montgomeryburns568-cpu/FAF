// Kontrollpunkte ("Speicherstände") wie in einem Spiel: Jedes Mal, wenn ein Datenbereich gespeichert wird und sich dabei
// wirklich etwas geändert hat, wird sofort eine Kopie mit Zeitstempel abgelegt. Der lokale Offline-Spiegel (sync-mirror.js)
// holt sich diese Kontrollpunkte ab – so geht kein Zwischenstand verloren, auch wenn der Spiegel-Rechner gerade aus ist.
//
// - Nur echte Änderungen zählen (Vergleich per Hash); unverändertes Speichern erzeugt keinen Kontrollpunkt.
// - Schnell aufeinanderfolgende Speicherungen desselben Bereichs (z.B. beim Tippen) werden zu einem Kontrollpunkt
//   zusammengefasst: Folgt eine Änderung innerhalb von 2 Minuten auf die letzte, wird der letzte Kontrollpunkt aktualisiert
//   (höchstens 10 Minuten lang). Der neueste Stand ist also immer gespeichert.
// - Je Bereich werden die letzten MAX_JE_BEREICH Kontrollpunkte behalten (gzip-komprimiert).
// - "stand" ist ein Zähler, der bei jedem neuen oder aktualisierten Kontrollpunkt steigt. Der Spiegel fragt nur diesen
//   Zähler ab (1 kleiner Aufruf) und lädt nur dann etwas herunter, wenn er sich geändert hat.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const BEREICHE = ['recipes', 'rules', 'events', 'archiv', 'artikelzuordnung', 'speisenkatalog', 'kunden', 'vorrat', 'bestellungen', 'kuecheninfo'];
const MAX_JE_BEREICH = 50;
const ZUSAMMENFASSEN_MS = 2 * 60 * 1000;
const ZUSAMMENFASSEN_MAX_MS = 10 * 60 * 1000;

const hashVon = json => crypto.createHash('sha1').update(json).digest('hex');
const istBereich = name => BEREICHE.includes(name);
function zusammenfassen(kopf, jetztMs) {
  return !!kopf && jetztMs - Date.parse(kopf.zeit) < ZUSAMMENFASSEN_MS && jetztMs - Date.parse(kopf.beginn) < ZUSAMMENFASSEN_MAX_MS;
}

// ---------- Redis (Cloud-Modus) ----------
// Schlüssel: verlauf:stand (Zähler), verlauf:hash:<b> (Hash des letzten Stands), verlauf:liste:<b> (Metadaten, neueste zuerst),
// verlauf:daten:<b>:<slot> (gzip+base64 des Stands)
function redisVerlauf(getKV) {
  return {
    async kontrollpunkt(name, json) {
      if (!istBereich(name)) return;
      const c = await getKV();
      const hash = hashVon(json);
      if ((await c.get(`verlauf:hash:${name}`)) === hash) return;
      const liste = `verlauf:liste:${name}`;
      const jetzt = new Date();
      const kopfRaw = await c.lIndex(liste, 0);
      const kopf = kopfRaw ? JSON.parse(kopfRaw) : null;
      const id = await c.incr('verlauf:stand');
      const gz = zlib.gzipSync(json).toString('base64');
      if (zusammenfassen(kopf, jetzt.getTime())) {
        await c.set(`verlauf:daten:${name}:${kopf.slot}`, gz);
        await c.lSet(liste, 0, JSON.stringify({ id, slot: kopf.slot, beginn: kopf.beginn, zeit: jetzt.toISOString(), bytes: json.length }));
      } else {
        await c.set(`verlauf:daten:${name}:${id}`, gz);
        await c.lPush(liste, JSON.stringify({ id, slot: id, beginn: jetzt.toISOString(), zeit: jetzt.toISOString(), bytes: json.length }));
        const zuViel = await c.lRange(liste, MAX_JE_BEREICH, -1);
        if (zuViel.length) {
          await c.del(zuViel.map(e => `verlauf:daten:${name}:${JSON.parse(e).slot}`));
          await c.lTrim(liste, 0, MAX_JE_BEREICH - 1);
        }
      }
      await c.set(`verlauf:hash:${name}`, hash);
    },
    async stand() {
      const c = await getKV();
      return Number((await c.get('verlauf:stand')) || 0);
    },
    async uebersicht() {
      const c = await getKV();
      const bereiche = {};
      for (const b of BEREICHE) bereiche[b] = (await c.lRange(`verlauf:liste:${b}`, 0, -1)).map(e => JSON.parse(e));
      let speicher = null;
      try {
        const info = await c.info('memory');
        const wert = k => { const m = new RegExp(`^${k}:(\\S+)`, 'm').exec(info); return m ? m[1] : null; };
        speicher = { belegt: wert('used_memory_human'), maximal: wert('maxmemory_human') };
      } catch (e) { /* manche Anbieter erlauben INFO nicht */ }
      return { stand: await this.stand(), bereiche, speicher };
    },
    async daten(name, slot) {
      if (!istBereich(name)) return null;
      const gz = await (await getKV()).get(`verlauf:daten:${name}:${slot}`);
      return gz == null ? null : zlib.gunzipSync(Buffer.from(gz, 'base64')).toString('utf-8');
    },
  };
}

// ---------- lokale Dateien (Datei-Modus für Entwicklung/Test) ----------
function dateiVerlauf(dataDir) {
  const dir = path.join(dataDir, 'verlauf');
  const indexDatei = path.join(dir, 'index.json');
  const lies = () => { try { return JSON.parse(fs.readFileSync(indexDatei, 'utf-8')); } catch (e) { return { stand: 0, bereiche: {} }; } };
  const schreib = idx => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(indexDatei, JSON.stringify(idx), 'utf-8'); };
  const datei = (name, slot) => path.join(dir, `${name}_${slot}.json.gz`);
  return {
    kontrollpunkt(name, json) {
      if (!istBereich(name)) return;
      const idx = lies();
      const b = idx.bereiche[name] || (idx.bereiche[name] = { hash: '', liste: [] });
      const hash = hashVon(json);
      if (b.hash === hash) return;
      const jetzt = new Date();
      const id = ++idx.stand;
      fs.mkdirSync(dir, { recursive: true });
      const kopf = b.liste[0];
      if (zusammenfassen(kopf, jetzt.getTime())) {
        fs.writeFileSync(datei(name, kopf.slot), zlib.gzipSync(json));
        b.liste[0] = { id, slot: kopf.slot, beginn: kopf.beginn, zeit: jetzt.toISOString(), bytes: json.length };
      } else {
        fs.writeFileSync(datei(name, id), zlib.gzipSync(json));
        b.liste.unshift({ id, slot: id, beginn: jetzt.toISOString(), zeit: jetzt.toISOString(), bytes: json.length });
        for (const e of b.liste.splice(MAX_JE_BEREICH)) { try { fs.unlinkSync(datei(name, e.slot)); } catch (err) { /* schon weg */ } }
      }
      b.hash = hash;
      schreib(idx);
    },
    async stand() { return lies().stand; },
    async uebersicht() {
      const idx = lies();
      const bereiche = {};
      for (const b of BEREICHE) bereiche[b] = (idx.bereiche[b] && idx.bereiche[b].liste) || [];
      return { stand: idx.stand, bereiche, speicher: null };
    },
    async daten(name, slot) {
      if (!istBereich(name)) return null;
      try { return zlib.gunzipSync(fs.readFileSync(datei(name, slot))).toString('utf-8'); } catch (e) { return null; }
    },
  };
}

module.exports = { BEREICHE, istBereich, redisVerlauf, dateiVerlauf };
