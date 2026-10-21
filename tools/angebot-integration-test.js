// Prüft die Angebots-Schnittstelle (Office -> Generator) mit erfundenen Daten: Logik, Bestellrhythmus-Regel und die HTTP-Schnittstelle.
// Aufruf: node tools/angebot-integration-test.js        (nutzt einen temporären Datenordner und einen vorgetäuschten Blob-Speicher)
const fs = require('fs'), os = require('os'), path = require('path'), Module = require('module');
const root = path.join(__dirname, '..');
const IA = require(path.join(root, 'integration-angebot.js'));
let ok = 0, bad = 0;
const check = (name, cond, extra) => { if (cond) ok++; else { bad++; console.log('✗', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

// ---------- 1) Bestellrhythmus ----------
// Veranstaltung Sa 07.11.2026 -> Zeitraum Fr 06.11. – Do 12.11., Bestellfrist Di 03.11. 11:30 (Berlin, MEZ = UTC+1)
const utc = (iso) => new Date(iso);
check('Mo 02.11. 10:00 -> offen', !IA.pruefeFrist(['2026-11-07'], utc('2026-11-02T09:00:00Z'), []).gesperrt);
check('Di 03.11. 10:00 -> noch offen', !IA.pruefeFrist(['2026-11-07'], utc('2026-11-03T09:00:00Z'), []).gesperrt);
check('Di 03.11. 11:29 -> noch offen', !IA.pruefeFrist(['2026-11-07'], utc('2026-11-03T10:29:00Z'), []).gesperrt);
check('Di 03.11. 11:30 -> gesperrt', IA.pruefeFrist(['2026-11-07'], utc('2026-11-03T10:30:00Z'), []).gesperrt);
check('Di 03.11. 15:00 -> gesperrt', IA.pruefeFrist(['2026-11-07'], utc('2026-11-03T14:00:00Z'), []).gesperrt);
check('Hauptbestellung schon abgeschickt (Di 09:00) -> gesperrt', IA.pruefeFrist(['2026-11-07'], utc('2026-11-03T08:00:00Z'), [{ block: '2026-11-06', typ: 'haupt', abgeschicktAm: '2026-11-03T07:00:00Z' }]).gesperrt);
check('Veranstaltung einen Zeitraum später -> offen', !IA.pruefeFrist(['2026-11-14'], utc('2026-11-03T14:00:00Z'), []).gesperrt);
check('Zeitraum-Grenze: Do 12.11. gehört zu Fr 06.11.', IA.fristFuerTag('2026-11-12', utc('2026-11-03T14:00:00Z'), []).block === '2026-11-06');
check('Zeitraum-Grenze: Fr 13.11. gehört zum nächsten', IA.fristFuerTag('2026-11-13', utc('2026-11-03T14:00:00Z'), []).block === '2026-11-13');
check('Sommerzeit: Di 06.10.2026 11:29 Berlin (09:29Z) offen', !IA.pruefeFrist(['2026-10-10'], utc('2026-10-06T09:29:00Z'), []).gesperrt);
check('Sommerzeit: Di 06.10.2026 11:30 Berlin (09:30Z) gesperrt', IA.pruefeFrist(['2026-10-10'], utc('2026-10-06T09:30:00Z'), []).gesperrt);

// ---------- 2) Prüfen, Umwandeln, Vergleichen ----------
const basis = () => ({
  format: 'kuechen-angebot/1', officeEventId: 'test-event-0001', officeOfferId: 'AN-TEST-1', status: 'CONFIRMED', version: 1, stand: '2026-10-20T09:00:00Z',
  kunde: { name: 'Beispiel GmbH', kuerzel: 'BEIS', telefon: '069 123', email: 'geheim@example.org' }, anlass: 'Firmenevent', modus: 'mittag', gaesteGesamt: 40, vegetarischAnteil: null, notiz: 'Anlieferung 17:00',
  preise: { gesamt: 999 },
  tage: [{ datum: '2027-05-28', gaeste: 40, positionen: [
    { katalogId: 'g236', gang: 'Vorspeise', name: 'Antipastiplatte', komponenten: ['k101'] },
    { katalogId: 'g1', gang: 'Hauptgang', name: 'Gegrillte Hähnchenbrust Orangen-Mandelsoße', komponenten: ['k1', 'k2'], wunsch: 'ohne Nüsse' },
    { katalogId: 'g2', gang: 'Hauptgang', name: 'Gemüselasagne vegetarisch', komponenten: [] },
  ] }],
});
check('gültiges Angebot', IA.pruefeAngebot(basis()).length === 0, IA.pruefeAngebot(basis()));
check('falsches Format wird abgelehnt', IA.pruefeAngebot({ ...basis(), format: 'x' }).length > 0);
check('ungültiges Datum wird abgelehnt', IA.pruefeAngebot({ ...basis(), tage: [{ datum: '2027-02-30', gaeste: 5, positionen: [{ katalogId: 'g1', name: 'x', komponenten: [] }] }] }).length > 0);
check('Storno braucht nur Kopfdaten', IA.pruefeAngebot({ format: 'kuechen-angebot/1', officeEventId: 'test-event-0001', status: 'CANCELLED', version: 2 }).length === 0);
const a1 = IA.bereinige(basis());
check('Kontaktdaten und Preise werden verworfen', !JSON.stringify(a1).includes('geheim@') && !JSON.stringify(a1).includes('069') && !JSON.stringify(a1).includes('999'));
const ev1 = IA.angebotZuEvent(a1, null);
check('Auftrag: Name, Tage, Datum', ev1.name === 'Beispiel GmbH' && ev1.days.length === 1 && ev1.days[0].date === '28.05.2027');
check('Auftrag: Kategorien', ev1.days[0].dishes.map(d => d.category).join() === 'vorspeise,hauptgang,hauptgang');
const haupt = ev1.days[0].dishes.filter(d => d.category === 'hauptgang');
check('Hauptgänge: Fleisch 2/3, vegetarisch 1/3', haupt[0].personen === 27 && haupt[1].personen === 13, haupt.map(d => d.personen));
check('Vorspeise bekommt alle Gäste', ev1.days[0].dishes[0].personen === 40);
check('Komponenten-Kennungen am Gericht', ev1.days[0].dishes[1].komponentenIds.join() === 'k1,k2' && ev1.days[0].dishes[1].katalogId === 'g1');
check('Wunsch steht in der Notiz', /ohne Nüsse/.test(ev1.notiz) && /Firmenevent/.test(ev1.notiz));
const b2 = basis(); b2.version = 2; b2.notiz = 'Anlieferung 18:00';
check('nur Notiz geändert -> unkritisch', !IA.vergleiche(a1, IA.bereinige(b2)).kritisch);
const b3 = basis(); b3.version = 2; b3.gaesteGesamt = 55; b3.tage[0].gaeste = 55;
const d3 = IA.vergleiche(a1, IA.bereinige(b3));
check('Gäste geändert -> kritisch, Tag betroffen', d3.kritisch && d3.tage.join() === '2027-05-28' && d3.zeilen.length >= 2, d3);
const b4 = basis(); b4.version = 2; b4.tage[0].positionen.pop();
check('Gericht entfernt -> kritisch', IA.vergleiche(a1, IA.bereinige(b4)).kritisch);
check('gleiche Version -> keine Änderung', IA.vergleiche(a1, IA.bereinige(basis())).zeilen.length === 0);

// ---------- 3) HTTP-Schnittstelle ----------
(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ksg-integration-'));
  Object.assign(process.env, { DATA_DIR: dataDir, APP_PASSWORD: 'testpw', SESSION_SECRET: 'testsecret', OFFICE_EMBED_SECRET: 'test-geheimnis-test-geheimnis-123456', OFFICE_ORIGIN: 'http://localhost:3099' });
  delete process.env.REDIS_URL; delete process.env.VERCEL;
  const gespeichert = [];
  const orig = Module._load;
  Module._load = function (req, ...r) {
    if (req === '@vercel/blob') return { put: async (name) => { gespeichert.push(name); return { pathname: name }; }, get: async () => null, del: async (p) => { const i = gespeichert.indexOf(p); if (i >= 0) gespeichert.splice(i, 1); } };
    return orig.call(this, req, ...r);
  };
  const app = require(path.join(root, 'server-app.js'));
  const { erzeugeEmbedToken } = require(path.join(root, 'embed-auth.js'));
  const server = app.listen(0); const base = 'http://127.0.0.1:' + server.address().port;
  const token = erzeugeEmbedToken(process.env.OFFICE_EMBED_SECRET, { sub: 'u1', name: 'Büro', scope: 'angebote' });
  const nurLesen = erzeugeEmbedToken(process.env.OFFICE_EMBED_SECRET, { sub: 'u1', name: 'Büro', scope: 'angebote', readonly: true });
  const katalogToken = erzeugeEmbedToken(process.env.OFFICE_EMBED_SECRET, { sub: 'u1', name: 'Büro', scope: 'katalog' });
  const post = async (body, t = token) => { const r = await fetch(base + '/api/integration/v1/angebote', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json() }; };
  const login = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'testpw' }) });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const get = async p => (await fetch(base + p, { headers: { cookie } })).json();
  const heute = new Date().toISOString().slice(0, 10);
  const plus = n => { const d = new Date(heute + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const pdf = { dateiname: 'Angebot Test.pdf', base64: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF').toString('base64') };

  try {
    check('ohne Token: 401', (await fetch(base + '/api/integration/v1/angebote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status === 401);
    check('Katalog-Token reicht nicht: 401', (await post(basis(), katalogToken)).s === 401);
    check('Lese-Token: 403', (await post(basis(), nurLesen)).s === 403);
    const bad1 = await post({ ...basis(), tage: [] }); check('ungültiges Angebot: 400 mit Fehlerliste', bad1.s === 400 && bad1.j.fehler.length > 0, bad1);

    // neues Angebot weit in der Zukunft, mit PDF
    const zukunft = plus(60);
    const a = basis(); a.tage[0].datum = zukunft; a.pdf = pdf;
    const r1 = await post(a); check('Angebot angelegt', r1.s === 200 && r1.j.status === 'angelegt', r1);
    const evs = await get('/api/events'); const ev = evs.find(e => e.officeEventId === 'test-event-0001');
    check('Auftrag gespeichert mit Version, PDF und ohne Kontaktdaten', ev && ev.angebotVersion === 1 && ev.pdfPathname && !JSON.stringify(ev).includes('geheim@'), ev && Object.keys(ev));
    check('Archiv-Eintrag entstanden', (await get('/api/archiv')).some(x => x.eventId === (ev || {}).id));
    check('gleiche Version nochmal: unverändert', (await post(a)).j.status === 'unveraendert');
    const alt = basis(); alt.version = 1; alt.officeEventId = 'test-event-0001'; alt.tage[0].datum = zukunft;

    // unkritische Änderung geht immer durch
    const n2 = basis(); n2.version = 2; n2.tage[0].datum = zukunft; n2.notiz = 'Anlieferung 18:00';
    const r2 = await post(n2); check('Notiz-Änderung wird übernommen', r2.j.status === 'uebernommen', r2);
    // kritische Änderung vor der Bestellfrist: automatisch
    const n3 = basis(); n3.version = 3; n3.tage[0].datum = zukunft; n3.gaesteGesamt = 55; n3.tage[0].gaeste = 55;
    const r3 = await post(n3); check('Gäste-Änderung vor der Frist wird übernommen', r3.j.status === 'uebernommen' && r3.j.aenderungen.length >= 1, r3);
    const ev3 = (await get('/api/events')).find(e => e.officeEventId === 'test-event-0001');
    check('Gästezahl im Auftrag aktualisiert', ev3.days[0].personen === 55 && ev3.angebotVersion === 3 && ev3.pdfPathname === ev.pdfPathname);
    check('ältere Version: 409', (await post(n2)).s === 409);

    // Änderung nach der Bestellfrist: Zeitraum, der gerade läuft (Frist ist vorbei) -> Küche muss bestätigen
    const nah = plus(1);
    const c = basis(); c.officeEventId = 'test-event-0002'; c.tage[0].datum = nah; const rc = await post(c);
    check('Angebot für nahen Termin: angelegt mit Hinweis Nachbestellung', rc.j.status === 'angelegt' && rc.j.nachFrist === true, rc);
    const c2 = basis(); c2.officeEventId = 'test-event-0002'; c2.version = 2; c2.tage[0].datum = nah; c2.gaesteGesamt = 70; c2.tage[0].gaeste = 70; c2.pdf = pdf;
    const rc2 = await post(c2); check('Änderung nach der Frist: wartet auf Küche', rc2.j.status === 'wartet_auf_kueche' && rc2.j.gruende.length > 0, rc2);
    const evc = (await get('/api/events')).find(e => e.officeEventId === 'test-event-0002');
    check('Auftrag bleibt unverändert, Änderung liegt bereit', evc.days[0].personen === 40 && evc.offeneAenderung && evc.offeneAenderung.version === 2 && evc.offeneAenderung.zeilen.length >= 1, evc.offeneAenderung);
    check('gleiche offene Version nochmal: idempotent', (await post(c2)).j.status === 'wartet_auf_kueche');
    // Stand fürs Büro
    const st = await (await fetch(base + '/api/integration/v1/angebote/test-event-0002', { headers: { authorization: 'Bearer ' + token } })).json();
    check('Status fürs Büro: offene Änderung', st.version === 1 && st.offen && st.offen.version === 2, st);
    // Der Browser kann offene Änderungen nicht durch einen veralteten Stand überschreiben
    await fetch(base + '/api/events/' + evc.id, { method: 'PUT', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ ...evc, offeneAenderung: undefined, notiz: 'vom Browser' }) });
    check('PUT aus dem Browser lässt offene Änderung stehen', (await get('/api/events')).find(e => e.id === evc.id).offeneAenderung.version === 2);
    // Küche lehnt ab
    const ab = await (await fetch(base + '/api/events/' + evc.id + '/aenderung', { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ entscheidung: 'ablehnen', grund: 'Bestellung schon raus' }) })).json();
    check('Ablehnen: Änderung weg, Stand bleibt', !ab.offeneAenderung && ab.days[0].personen === 40 && ab.abgelehnteAenderung.version === 2);
    const st2 = await (await fetch(base + '/api/integration/v1/angebote/test-event-0002', { headers: { authorization: 'Bearer ' + token } })).json();
    check('Status fürs Büro: abgelehnt mit Grund', st2.abgelehnt && st2.abgelehnt.grund === 'Bestellung schon raus' && !st2.offen, st2);
    // Büro schickt Version 3 -> Küche übernimmt
    const c3 = JSON.parse(JSON.stringify(c2)); c3.version = 3; c3.pdf = pdf;
    check('neue Version nach Ablehnung wartet wieder', (await post(c3)).j.status === 'wartet_auf_kueche');
    const ue = await (await fetch(base + '/api/events/' + evc.id + '/aenderung', { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ entscheidung: 'uebernehmen' }) })).json();
    check('Übernehmen: neuer Stand, PDF am Auftrag', ue.days[0].personen === 70 && ue.angebotVersion === 3 && !ue.offeneAenderung && ue.pdfPathname, ue);
    // Storno nach der Frist wartet, vor der Frist geht durch
    const sto = await post({ format: 'kuechen-angebot/1', officeEventId: 'test-event-0002', status: 'CANCELLED', version: 4 });
    check('Storno nach der Frist: wartet auf Küche', sto.j.status === 'wartet_auf_kueche', sto);
    const sto2 = await post({ format: 'kuechen-angebot/1', officeEventId: 'test-event-0001', status: 'CANCELLED', version: 4 });
    check('Storno vor der Frist: sofort storniert', sto2.j.status === 'storniert', sto2);
    check('Storno unbekannter Auftrag: kein Fehler', (await post({ format: 'kuechen-angebot/1', officeEventId: 'test-event-9999', status: 'CANCELLED', version: 1 })).j.status === 'unbekannt');

    // ---------- Nicht im Speisenkatalog: nichts erfinden, sondern melden ----------
    const u = basis(); u.officeEventId = 'test-event-unbekannt'; u.tage[0].datum = plus(80);
    u.tage[0].positionen = [
      { katalogId: 'g99999', gang: 'Hauptgang', name: 'Fantasiegericht', komponenten: ['k99999'] },
      { katalogId: 'g1', gang: 'Hauptgang', name: 'Gegrillte Hähnchenbrust …', komponenten: ['k1', 'k99998'] },
      { katalogId: 'g2', gang: 'Hauptgang', name: 'Gemüselasagne', komponenten: [] },
    ];
    const ru = await post(u);
    check('unbekanntes Gericht: Antwort enthält Warnungen', ru.s === 200 && ru.j.status === 'angelegt' && Array.isArray(ru.j.warnungen) && ru.j.warnungen.length === 2, ru.j);
    check('Warnung nennt Gericht und Komponente', ru.j.warnungen.some(w => w.katalogId === 'g99999' && /nicht zu finden/.test(w.hinweis)) && ru.j.warnungen.some(w => w.katalogId === 'g1' && /k99998/.test(w.hinweis)), ru.j.warnungen);
    const evu = (await get('/api/events')).find(e => e.officeEventId === 'test-event-unbekannt');
    const du = evu.days[0].dishes;
    check('unbekanntes Gericht: keine Komponenten erfunden, Hinweis am Gericht', du[0].komponentenIds.length === 0 && /nicht zu finden/.test(du[0].katalogHinweis), du[0]);
    check('bekanntes Gericht mit falscher Kennung: nur gültige Komponenten, Hinweis', du[1].komponentenIds.join() === 'k1' && /k99998/.test(du[1].katalogHinweis), du[1]);
    check('bekanntes Gericht ohne Komponenten: Zusammensetzung aus dem Katalog, kein Hinweis', du[2].komponentenIds.length > 0 && !du[2].katalogHinweis, du[2]);

    // ---------- Verbindungsschlüssel (dauerhaft, statt Geheimnis + selbst gebauter Token) ----------
    const sj = async (m, p, body, h = {}) => { const r = await fetch(base + p, { method: m, headers: { 'content-type': 'application/json', ...h }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, j: await r.json().catch(() => ({})), h: r.headers }; };
    check('Schlüssel erzeugen verlangt Anmeldung', (await sj('POST', '/api/buero-verbindung/schluessel')).s === 401);
    const sk = await sj('POST', '/api/buero-verbindung/schluessel', null, { cookie });
    const key = sk.j.schluessel; check('Schlüssel wird einmal angezeigt', sk.s === 200 && /^ksk_/.test(key));
    const stt = await sj('GET', '/api/buero-verbindung', null, { cookie });
    check('Status zeigt nur die Endung, nicht den Schlüssel', stt.j.vorhanden && stt.j.endung === key.slice(-4) && !JSON.stringify(stt.j).includes(key));
    const mitKey = (k, m, p, body) => sj(m, p, body, { authorization: 'Bearer ' + k });
    const ak = basis(); ak.officeEventId = 'test-event-key-1'; ak.tage[0].datum = plus(70);
    check('Angebot mit Schlüssel senden', (await mitKey(key, 'POST', '/api/integration/v1/angebote', ak)).j.status === 'angelegt');
    check('falscher Schlüssel: 401', (await mitKey('ksk_falsch', 'POST', '/api/integration/v1/angebote', ak)).s === 401);
    check('Lager mit Schlüssel lesbar', (await mitKey(key, 'GET', '/api/integration/v1/lager')).s === 200);
    check('Katalog mit Schlüssel lesbar', (await mitKey(key, 'GET', '/api/speisenkatalog/state')).s === 200);
    check('Rezepte bleiben gesperrt (auch mit Schlüssel)', (await mitKey(key, 'GET', '/api/recipes')).s === 401);
    const tk = await mitKey(key, 'POST', '/api/integration/v1/token', { name: 'Anna Büro' });
    check('Schlüssel liefert kurzlebiges Token für die Katalog-Seite', tk.s === 200 && tk.j.token && /embed\?token=/.test(tk.j.embedUrl), tk.j);
    check('Token öffnet den Katalog', (await mitKey(tk.j.token, 'GET', '/api/speisenkatalog/state')).s === 200);
    check('Token reicht nicht für Angebote', (await mitKey(tk.j.token, 'POST', '/api/integration/v1/angebote', ak)).s === 401);
    check('Katalog-Seite lässt sich mit dem Token einbetten', (await fetch(base + '/api/speisenkatalog/embed?token=' + tk.j.token)).status === 200);
    check('Adresse speichern', (await sj('PUT', '/api/buero-verbindung', { origins: 'buero.example.org' }, { cookie })).j.origins[0] === 'https://buero.example.org');
    const em = await fetch(base + '/api/speisenkatalog/embed?token=' + tk.j.token);
    check('Adresse landet in der Einbettungs-Regel', /frame-ancestors[^;]*https:\/\/buero\.example\.org/.test(em.headers.get('content-security-policy') || ''), em.headers.get('content-security-policy'));
    const cors = await fetch(base + '/api/integration/v1/lager', { headers: { origin: 'https://buero.example.org', authorization: 'Bearer ' + key } });
    check('Aufrufe von der eingetragenen Adresse sind erlaubt (CORS)', cors.headers.get('access-control-allow-origin') === 'https://buero.example.org');
    check('ungültige Adresse wird abgelehnt', (await sj('PUT', '/api/buero-verbindung', { origins: 'ht!tp://' }, { cookie })).s === 400);
    const neu = (await sj('POST', '/api/buero-verbindung/schluessel', null, { cookie })).j.schluessel;
    check('neuer Schlüssel macht den alten ungültig', (await mitKey(key, 'GET', '/api/integration/v1/lager')).s === 401 && (await mitKey(neu, 'GET', '/api/integration/v1/lager')).s === 200);
  } catch (e) { bad++; console.log('✗ Ausnahme:', e.stack || e.message); }
  server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log(bad ? `\n${bad} Prüfung(en) fehlgeschlagen, ${ok} bestanden.` : `Alle ${ok} Prüfungen bestanden.`);
  process.exit(bad ? 1 : 0);
})();
