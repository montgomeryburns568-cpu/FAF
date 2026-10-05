// Archiv, Kundenkartei, Nachtrag und Überproduktions-Lager – reine Logik ohne Oberfläche.
// Läuft im Browser (als Skript vor kartei.js) und im Server/Node-Test (require).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KarteiLogik = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const norm = s => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();

  // ---------- Datum ----------
  const pad = n => String(n).padStart(2, '0');
  // "23.07.27", "23.07.2027", "27.-28.04.2026" -> '2027-07-23' (ohne Jahr: null)
  function parseDatumDE(s) {
    const m = String(s || '').match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
    if (!m) return null;
    let y = parseInt(m[3], 10); if (m[3].length === 2) y += 2000;
    const mo = parseInt(m[2], 10), d = parseInt(m[1], 10);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${pad(mo)}-${pad(d)}`;
  }
  function isoToDE(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; }
  function addDays(iso, n) {
    const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  function diffDays(a, b) { return Math.round((new Date(a + 'T12:00:00Z') - new Date(b + 'T12:00:00Z')) / 86400000); }
  function heuteIso(now) { const d = now || new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

  // ---------- Kunden ----------
  function kundenKey(name) {
    const t = norm(name).replace(/\b(frau|herr|dr|prof|fa|firma|familie|fam|hochzeit|kw \d+)\b/g, ' ').split(' ').filter(Boolean);
    return t.sort().join(' ');
  }
  function editDistance(a, b) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 3) return 9;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  // Schreibfehler ("Phillip fortman" / "Philipp Fortmann") gelten als derselbe Kunde
  function gleicherKunde(ka, kb) {
    if (!ka || !kb) return false;
    if (ka === kb) return true;
    const l = Math.min(ka.length, kb.length);
    return l >= 8 && editDistance(ka, kb) <= (l >= 12 ? 3 : 2);
  }
  // Gruppiert Archiv-Einträge zu Kunden; Profile (manuell gepflegt) hängen über Name/Aliase daran.
  function kundenGruppieren(archiv, profile) {
    profile = profile || [];
    const gruppen = [];
    const profilKeys = profile.map(p => [p, [p.name].concat(p.aliase || []).map(kundenKey).filter(Boolean)]);
    const sorted = (archiv || []).slice().sort((a, b) => (a.eventDateIso || '').localeCompare(b.eventDateIso || ''));
    for (const e of sorted) {
      const k = kundenKey(e.customerName || 'Unbekannt');
      let g = gruppen.find(x => x.keys.some(kk => gleicherKunde(kk, k)));
      if (!g) {
        const pr = profilKeys.find(([, ks]) => ks.some(kk => gleicherKunde(kk, k)));
        g = { key: pr ? kundenKey(pr[0].name) : k, name: pr ? pr[0].name : (e.customerName || 'Unbekannt'), keys: [], eintraege: [], profil: pr ? pr[0] : null };
        gruppen.push(g);
      }
      if (!g.keys.includes(k)) g.keys.push(k);
      g.eintraege.push(e);
    }
    // Profile ohne Archiv-Einträge (z.B. frisch angelegt) trotzdem zeigen
    for (const [p, ks] of profilKeys) {
      if (!gruppen.some(g => g.profil === p)) gruppen.push({ key: kundenKey(p.name), name: p.name, keys: ks, eintraege: [], profil: p });
    }
    return gruppen;
  }

  // ---------- Archiv aus gespeicherten Veranstaltungen ----------
  function eventDatum(event) {
    for (const d of event.days || []) { const iso = parseDatumDE(d.date); if (iso) return { text: d.date, iso }; }
    const n = parseDatumDE(event.notiz); return n ? { text: isoToDE(n), iso: n } : { text: ((event.days || [])[0] || {}).date || '', iso: null };
  }
  function eventPersonen(event) {
    if (event.personen) return event.personen;
    return (event.days || []).reduce((m, d) => Math.max(m, d.personen || 0), 0) || null;
  }
  // Jede im Generator gespeicherte Veranstaltung bekommt einen Archiv-Eintrag (id 'ev-<Event-ID>').
  // Nachtrag, Preis und Kundenzuordnung bleiben beim erneuten Speichern erhalten; Löschen des Events lässt den Eintrag stehen.
  function archivAusEvents(events, archiv) {
    const out = archiv.slice();
    let geaendert = false;
    for (const ev of events || []) {
      const id = 'ev-' + ev.id;
      const dat = eventDatum(ev);
      const dishes = [], seen = new Set();
      for (const day of ev.days || []) for (const d of day.dishes || []) {
        const k = norm(d.name); if (!k || seen.has(k)) continue; seen.add(k);
        dishes.push({ name: d.name, category: d.category || null, price: null, personen: d.personen || null });
      }
      const idx = out.findIndex(e => e.id === id || (e.eventId && e.eventId === ev.id));
      const neu = { customerName: ev.name || 'Unbenannt', eventDate: dat.text, eventDateIso: dat.iso, personen: eventPersonen(ev), eventId: ev.id, notiz: ev.notiz || '' };
      if (idx === -1) {
        out.push({ id, source: 'generator', uploadedAt: new Date().toISOString(), totalPrice: null, ...neu, dishes });
        geaendert = true;
      } else {
        const alt = out[idx];
        const upd = { ...alt };
        if (!alt.manuell) Object.assign(upd, neu);
        // Preise der Gerichte erhalten, falls schon eingetragen
        upd.dishes = dishes.map(d => { const o = (alt.dishes || []).find(x => norm(x.name) === norm(d.name)); return o && o.price != null ? { ...d, price: o.price } : d; });
        if (JSON.stringify(upd) !== JSON.stringify(alt)) { out[idx] = upd; geaendert = true; }
      }
    }
    return { archiv: out, geaendert };
  }
  // Fehlende ISO-Daten nachtragen (ältere PDF-Einträge)
  function archivDatenErgaenzen(archiv) {
    let geaendert = false;
    const out = archiv.map(e => {
      if (e.eventDateIso !== undefined) return e;
      geaendert = true; return { ...e, eventDateIso: parseDatumDE(e.eventDate) };
    });
    return { archiv: out, geaendert };
  }

  // ---------- Haltbarkeit der Überproduktion ----------
  const LAGER_KLASSEN = {
    frisch: { label: 'Frisch (Fisch, Fleisch, Salat, Milchprodukte)', tage: 2 },
    gekocht: { label: 'Gekocht / zubereitet / Soßen', tage: 3 },
    backwaren: { label: 'Brot & Backwaren', tage: 3 },
    obstgemuese: { label: 'Obst & empfindliches Gemüse', tage: 7 },
    wurzel: { label: 'Kartoffeln, Zwiebeln, Wurzelgemüse, Käse, Eier', tage: 14 },
    tk: { label: 'Tiefkühlware', tage: 90 },
    trocken: { label: 'Trockenware / Konserven (Reis, Nudeln, Mehl …)', tage: 180 },
  };
  const KLASSEN_REGELN = [
    ['tk', /\btk\b|tiefk|gefroren|\btk-/],
    ['gekocht', /gekocht|gegart|gebraten|geschmort|soss|suppe|puree|stampf|dressing|gratin|auflauf|lasagne|curry|eintopf|geschnetzel|zubereitet|ragout|bolognese|gulasch|braten\b|fond|bruhe|dip\b|salat dressing|kartoffelsalat|nudelsalat/],
    ['backwaren', /brot|baguette|ciabatta|brotchen|semmel|toast|focaccia|croissant|kuchen|torte|geback|wrap|tortilla fladen|fladen/],
    ['frisch', /fisch|lachs|garnel|meeresfr|thunfisch|forelle|hack|fleisch|hahnchen|pute|rind|schwein|kalb|lamm|ente\b|wurst|schinken|aufschnitt|salami|salat|rucola|feldsalat|kraut(?!kopf)|basilikum|petersilie|dill|schnittlauch|minze|koriander|beere|erdbeer|himbeer|sahne|milch|joghurt|quark|schmand|frischkase|mozzarella|burrata|pilz|champignon|spinat|tofu|sprossen|avocado|creme|mousse|pudding|dessert/],
    ['obstgemuese', /apfel|birne|zitron|limette|orange|obst|banane|traube|tomate|paprika|zucchini|gurke|aubergine|brokkoli|blumenkohl|melone|ananas|mango|kiwi|pfirsich|pflaume|kirsche|mais|erbsen|bohnen|spargel|fenchel|radieschen|kohlrabi|gemuse/],
    ['wurzel', /kartoffel|zwiebel|karott|mohre|sellerie|kohl|rote bete|rubel|kurbis|lauch|knoblauch|ingwer|\beier\b|\bei\b|kase|butter|parmesan|pastinake|knolle|kraut/],
    ['trocken', /reis|nudel|pasta|spaghetti|penne|mehl|zucker|linsen|couscous|bulgur|haferflocken|konserve|dose|\bol\b|olivenol|essig|gewurz|salz|nuss|kichererbsen|cornflakes|musli|kakao|polenta|griess|spatzle trocken|schupfnudel trocken|stärke|starke|trocken|getrocknet|honig|senf|ketchup|mayonnaise|marmelade|sirup/],
  ];
  function lagerklasseRaten(name) {
    const n = norm(name);
    for (const [k, re] of KLASSEN_REGELN) if (re.test(n)) return k;
    return 'gekocht';
  }

  // ---------- Nachtrag ----------
  function neuerNachtrag() {
    return { erfasstAm: new Date().toISOString(), gaesteTatsaechlich: null, bewertung: null, brot: '', fleischVeg: '', ueberproduktion: [], unterproduktion: [], besonderheiten: '', feedback: '', kundenTags: [] };
  }
  function neuesLagerItem(name) {
    return { id: 'ue-' + Math.random().toString(36).slice(2, 9), name: name || '', menge: null, einheit: 'kg', klasse: lagerklasseRaten(name), notiz: '', status: 'offen' };
  }

  // Bestand: offene Überproduktion aller Nachträge mit Haltbarkeits-Ampel
  function lagerBestand(archiv, heute, alleStatus) {
    const rows = [];
    for (const e of archiv || []) {
      const n = e.nachtrag; if (!n || !n.ueberproduktion) continue;
      const basis = e.eventDateIso || (n.erfasstAm ? n.erfasstAm.slice(0, 10) : null);
      for (const it of n.ueberproduktion) {
        if (!it.name) continue;
        if (!alleStatus && it.status && it.status !== 'offen') continue;
        const kl = LAGER_KLASSEN[it.klasse] || LAGER_KLASSEN.gekocht;
        const bis = it.haltbarBis || (basis ? addDays(basis, kl.tage) : null);
        const rest = bis ? diffDays(bis, heute) : null;
        const ampel = rest == null ? 'ok' : rest < 0 ? 'abgelaufen' : rest <= 2 ? 'bald' : 'ok';
        rows.push({ eintragId: e.id, itemId: it.id, kunde: e.customerName, datum: e.eventDate || '', name: it.name, menge: it.menge, einheit: it.einheit, klasse: it.klasse, klasseLabel: kl.label, notiz: it.notiz || '', status: it.status || 'offen', haltbarBis: bis, tageRest: rest, ampel });
      }
    }
    return rows.sort((a, b) => (a.tageRest == null ? 9999 : a.tageRest) - (b.tageRest == null ? 9999 : b.tageRest));
  }

  // ---------- Verwertungsideen ----------
  const IDEEN = [
    [/kartoffel/, ['Kartoffelsuppe', 'Backkartoffeln', 'Kartoffelstampf', 'Kartoffelsalat', 'Bratkartoffeln', 'Rosmarinkartoffeln', 'Kartoffelgratin', 'Kartoffelpuffer', 'Wedges']],
    [/reis/, ['Reispfanne', 'Reissalat', 'Gebratener Reis', 'Milchreis', 'Reis-Gemüse-Bowl', 'Gefüllte Paprika', 'Arancini']],
    [/nudel|pasta|spaghetti|penne|tagliatelle|fusilli/, ['Nudelsalat', 'Nudelauflauf', 'Pasta-Pfanne', 'Nudelsuppe', 'Pasta al Forno']],
    [/hack|bolognese/, ['Lasagne', 'Bolognese', 'Hackbraten', 'Frikadellen / Buletten', 'Gefüllte Paprika', 'Chili con Carne']],
    [/hahnchen|huhn|pute|gefl/, ['Geschnetzeltes', 'Hähnchen-Curry', 'Hähnchensalat', 'Wraps mit Hähnchen', 'Hühnersuppe', 'Pfanne mit Hähnchen']],
    [/rind|braten|gulasch/, ['Gulasch', 'Rindfleischsuppe', 'Wraps mit Rindfleisch', 'Ragout', 'Pasta mit Rindfleischsugo']],
    [/schwein|nacken|kassler/, ['Pulled Pork Burger', 'Gulasch', 'Schweinegeschnetzeltes', 'Krustenbraten-Sandwich']],
    [/lachs|fisch|forelle/, ['Fischfrikadellen', 'Lachs-Pasta', 'Fisch-Wraps', 'Fischsuppe', 'Lachs-Rillette (Aufstrich)']],
    [/tomate/, ['Tomatensuppe', 'Tomatensauce', 'Bruschetta', 'Ratatouille', 'Tomatensalat', 'Pasta Pomodoro']],
    [/karott|mohre/, ['Karottensuppe', 'Karottensalat', 'Ofengemüse', 'Karotten-Ingwer-Suppe', 'Gemüsepfanne']],
    [/zwiebel/, ['Zwiebelsuppe', 'Zwiebelkuchen', 'Röstzwiebeln', 'Zwiebelconfit']],
    [/apfel|birne/, ['Apfelkompott', 'Bratapfel', 'Apfelstrudel', 'Apfelkuchen', 'Crumble', 'Apfel-Chutney']],
    [/gemuse|zucchini|paprika|aubergine/, ['Ratatouille', 'Gemüsesuppe', 'Gemüselasagne', 'Ofengemüse', 'Gemüsepfanne', 'Gemüsequiche']],
    [/brokkoli|blumenkohl/, ['Brokkolicremesuppe', 'Blumenkohl-Gratin', 'Brokkoli-Quiche', 'Ofen-Blumenkohl', 'Currypfanne']],
    [/spinat/, ['Spinatlasagne', 'Spinat-Quiche', 'Rahmspinat', 'Maultaschen-Füllung', 'Spinatsuppe']],
    [/pilz|champignon/, ['Pilzrahmsauce', 'Pilzpfanne', 'Pilzrisotto', 'Pilzsuppe', 'Pilz-Quiche']],
    [/kurbis/, ['Kürbissuppe', 'Ofenkürbis', 'Kürbis-Risotto', 'Kürbiscurry']],
    [/linsen|kichererbsen|bohnen/, ['Linsencurry', 'Eintopf', 'Hummus', 'Falafel', 'Bohnen-Chili']],
    [/brot|baguette|ciabatta|brotchen|toast/, ['Brotsalat (Panzanella)', 'Semmelknödel', 'Croutons', 'Bruschetta', 'Brotchips', 'Brotauflauf / Strata']],
    [/sahne|schmand|milch|joghurt|quark/, ['Panna Cotta', 'Rahmsauce', 'Quarkspeise', 'Tzatziki', 'Kaiserschmarrn', 'Cremesuppe']],
    [/\bei\b|eier/, ['Eiersalat', 'Quiche', 'Rührei', 'Frittata', 'Spätzle']],
    [/kase|mozzarella|parmesan|feta/, ['Überbacken (Gratin)', 'Käsespätzle', 'Käsesauce', 'Quiche', 'Caprese']],
    [/beere|obst|banane|ananas|mango|melone/, ['Obstsalat', 'Smoothie', 'Fruchtkompott', 'Joghurt-Obst-Schicht', 'Crumble', 'Fruchtspieße']],
    [/salat|rucola|kraut/, ['Salatbuffet', 'Wraps', 'Salat-Bowl', 'Krautsalat']],
    [/kohl/, ['Kohlrouladen', 'Krautsalat', 'Eintopf', 'Kohlsuppe']],
    [/tk|tiefk/, ['Gemüsepfanne', 'Gemüsesuppe', 'Reispfanne', 'Gemüse-Beilage']],
  ];
  function stamm(name) {
    const w = norm(name).split(' ').filter(x => x.length >= 4).sort((a, b) => b.length - a.length)[0] || norm(name);
    return w.replace(/(en|er|e|n|s)$/, '');
  }
  // komponenten = Komponenten des Speisenkatalogs [{name, rolle, gruppe}]
  function ideenFuer(name, komponenten) {
    const n = norm(name);
    const kuratiert = [];
    for (const [re, liste] of IDEEN) if (re.test(n)) for (const x of liste) if (!kuratiert.includes(x)) kuratiert.push(x);
    const st = stamm(name);
    const bereits = new Set(kuratiert.map(norm));
    const katalog = [];
    if (st.length >= 4 && komponenten) {
      for (const c of komponenten) {
        if (c.rolle === 'E') continue;
        const cn = norm(c.name);
        if (!cn.includes(st) || bereits.has(cn)) continue;
        bereits.add(cn); katalog.push(c.name);
        if (katalog.length >= 10) break;
      }
    }
    return { kuratiert: kuratiert.slice(0, 10), katalog };
  }
  // Passt ein Lagerposten zu einem Gericht-/Zutatennamen? Wortstamm-Vergleich in beide Richtungen
  // ("Basmati Reis" ~ "Basmatireis", "Rosmarinkartoffeln" ~ "Kartoffeln"), ohne Füllwörter.
  const FUELLWORTE = new Set(['frisch', 'frische', 'frischer', 'gemischt', 'gemischte', 'bunte', 'bunter', 'gross', 'kleine', 'gekocht', 'gegart', 'ganze', 'ganz', 'mit', 'und', 'oder', 'vom', 'der', 'die', 'das']);
  const woerter = s => norm(s).split(' ').filter(w => w.length >= 4 && !FUELLWORTE.has(w)).map(w => w.replace(/(en|er|e|n|s)$/, ''));
  function passt(a, b) {
    const na = norm(a), nb = norm(b);
    return woerter(a).some(w => w.length >= 4 && nb.includes(w)) || woerter(b).some(w => w.length >= 4 && na.includes(w));
  }
  // Welche offenen Lagerposten passen zu den Gerichten im aktuellen Angebot?
  function lagerTreffer(bestand, gerichte) {
    const out = [];
    for (const b of bestand) {
      if (b.ampel === 'abgelaufen') continue;
      const hit = (gerichte || []).filter(g => passt(g, b.name));
      if (hit.length) out.push({ lager: b, gerichte: hit });
    }
    return out;
  }

  // ---------- Statistik ----------
  const KAT_LABEL = { vorspeise: 'Vorspeise', fingerfood: 'Fingerfood', flying: 'Flying', hauptgang: 'Hauptgang', pfanne: 'Pfanne', dessert: 'Dessert', brot: 'Brot', 'beilage-saettigung': 'Beilage', 'beilage-gemuese': 'Gemüse', sosse: 'Soße', sonstiges: 'Sonstiges' };
  function mittel(zahlen) { const z = zahlen.filter(x => x != null && !isNaN(x)); return z.length ? z.reduce((s, x) => s + x, 0) / z.length : null; }
  // artFn(dish) -> 'fleisch' | 'veg' (hauptgangArt aus dem Parser)
  function kundenStatistik(eintraege, artFn) {
    const e = eintraege || [];
    const iso = e.map(x => x.eventDateIso).filter(Boolean).sort();
    let intervall = null;
    if (iso.length >= 2) intervall = mittel(iso.slice(1).map((d, i) => diffDays(d, iso[i])));
    const gericht = new Map();
    let fleisch = 0, veg = 0;
    const kat = {};
    e.forEach(x => (x.dishes || []).forEach(d => {
      const k = norm(d.name); if (!k) return;
      const g = gericht.get(k) || { name: d.name, anzahl: 0 }; g.anzahl++; gericht.set(k, g);
      kat[d.category || 'sonstiges'] = (kat[d.category || 'sonstiges'] || 0) + 1;
      if (artFn && (d.category === 'hauptgang' || d.category === 'pfanne')) { if (artFn(d) === 'fleisch') fleisch++; else veg++; }
    }));
    const nach = e.map(x => x.nachtrag).filter(Boolean);
    const zaehl = (feld) => { const o = {}; nach.forEach(n => { if (n[feld]) o[n[feld]] = (o[n[feld]] || 0) + 1; }); return o; };
    const ueber = {};
    nach.forEach(n => (n.ueberproduktion || []).forEach(u => { const k = norm(u.name); if (k) ueber[k] = { name: u.name, anzahl: ((ueber[k] || {}).anzahl || 0) + 1 }; }));
    const gaesteAbw = [];
    e.forEach(x => { if (x.nachtrag && x.nachtrag.gaesteTatsaechlich && x.personen) gaesteAbw.push(x.nachtrag.gaesteTatsaechlich / x.personen); });
    return {
      anzahl: e.length, erster: iso[0] || null, letzter: iso[iso.length - 1] || null, intervallTage: intervall,
      personenSumme: e.reduce((s, x) => s + (x.personen || 0), 0), personenSchnitt: mittel(e.map(x => x.personen)),
      preisSchnitt: mittel(e.map(x => x.totalPrice)), preisProPerson: mittel(e.filter(x => x.totalPrice && x.personen).map(x => x.totalPrice / x.personen)),
      topGerichte: Array.from(gericht.values()).sort((a, b) => b.anzahl - a.anzahl).slice(0, 8),
      kategorien: kat, fleisch, veg,
      nachtraege: nach.length, brot: zaehl('brot'), fleischVeg: zaehl('fleischVeg'),
      ueberproduktion: Object.values(ueber).sort((a, b) => b.anzahl - a.anzahl),
      unterproduktion: nach.flatMap(n => (n.unterproduktion || []).map(u => u.name)).filter(Boolean),
      besonderheiten: e.filter(x => x.nachtrag && x.nachtrag.besonderheiten).map(x => ({ datum: x.eventDate, text: x.nachtrag.besonderheiten })),
      gaesteFaktor: mittel(gaesteAbw),
    };
  }
  function brotFaktorWert(stufe) { return { weniger: 0.8, normal: 1, mehr: 1.25, vielmehr: 1.5 }[stufe] || 1; }

  return {
    norm, parseDatumDE, isoToDE, addDays, diffDays, heuteIso, kundenKey, gleicherKunde, kundenGruppieren,
    archivAusEvents, archivDatenErgaenzen, LAGER_KLASSEN, lagerklasseRaten, neuerNachtrag, neuesLagerItem,
    lagerBestand, ideenFuer, lagerTreffer, passt, kundenStatistik, brotFaktorWert, KAT_LABEL, mittel, eventDatum,
  };
});
