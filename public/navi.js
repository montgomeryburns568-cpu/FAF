// Zurück-Knopf und Aktualisieren-Knopf (Kopfzeile). "Zurück" geht zur vorherigen Ansicht: Reiter, gewähltes Angebot und die Ansicht der
// Übersicht (Auftrag/Woche) werden bei jedem Wechsel gemerkt. Auch die Zurück-Taste des Browsers/Geräts (Alt+←, Wischgeste) funktioniert dadurch.
// "Aktualisieren" lädt die Seite neu (holt auch eine neue Version) und kehrt danach zur selben Ansicht zurück. Läuft nach allen anderen Skripten.
const Navi = (function () {
  const $ = id => document.getElementById(id);
  const MAX = 50;
  const stack = [];
  let letzte = null, letzteStr = '', laeuft = false;

  const aktuellerTab = () => { const p = document.querySelector('.tabpanel.active'); return p ? p.id.replace(/^tab-/, '') : 'start'; };
  function aktuell() {
    return { tab: aktuellerTab(), ev: $('eventSelect') ? $('eventSelect').value : '', start: typeof Start !== 'undefined' ? Start.zustand() : null };
  }
  function knopf() { const b = $('zurueckBtn'); if (b) b.disabled = !stack.length; }

  // Neue Ansicht merken (die bisherige kommt auf den Stapel und als Eintrag in den Browser-Verlauf)
  function merke() {
    if (laeuft) return;
    const jetzt = aktuell(), s = JSON.stringify(jetzt);
    if (s === letzteStr) return;
    if (letzte) {
      stack.push(letzte); if (stack.length > MAX) stack.shift();
      try { history.pushState({ k: stack.length }, ''); } catch (e) { /* ohne Verlauf nur über den Knopf */ }
    }
    letzte = jetzt; letzteStr = s; knopf();
  }

  let origSwitch = null;
  function wiederherstellen(z) {
    const sel = $('eventSelect');
    if (sel && z.ev !== sel.value && [...sel.options].some(o => o.value === z.ev)) { sel.value = z.ev; sel.dispatchEvent(new Event('change')); }
    if (z.start && typeof Start !== 'undefined') Start.setzeZustand(z.start);
    (origSwitch || switchTab)(z.tab);
  }
  function zurueck(schritte) {
    for (let i = 0; i < (schritte || 1) && stack.length; i++) {
      const z = stack.pop();
      laeuft = true;
      try { wiederherstellen(z); } finally { laeuft = false; }
      letzte = aktuell(); letzteStr = JSON.stringify(letzte);
    }
    knopf();
  }

  function ungespeichert() {
    if (typeof draftEvent === 'undefined' || !draftEvent || !state) return false;
    const neu = !state.events.some(e => e.id === draftEvent.id);
    const text = $('angebotText') && $('angebotText').value.trim();
    return (neu && ((draftEvent.days && draftEvent.days.length) || text));
  }
  function aktualisieren() {
    if (ungespeichert() && !confirm('Es gibt ein noch nicht gespeichertes Angebot, das beim Aktualisieren verloren geht. Trotzdem aktualisieren?')) return;
    try { sessionStorage.setItem('ks_navi', JSON.stringify(aktuell())); } catch (e) { /* ohne Speicher: Startansicht */ }
    location.reload();
  }

  // Nach dem Laden der Daten (aus boot): gemerkte Ansicht wiederherstellen, Verlauf beginnen
  function start() {
    let z = null;
    try { z = JSON.parse(sessionStorage.getItem('ks_navi') || 'null'); sessionStorage.removeItem('ks_navi'); } catch (e) { /* keine */ }
    if (z) { laeuft = true; try { wiederherstellen(z); } finally { laeuft = false; } }
    letzte = aktuell(); letzteStr = JSON.stringify(letzte);
    try { history.replaceState({ k: 0 }, ''); } catch (e) { /* egal */ }
    knopf();
  }

  function init() {
    origSwitch = switchTab;
    switchTab = function (tab) { origSwitch(tab); merke(); };   // jeder Reiterwechsel (auch ohne Reiter-Knopf, z. B. Küchensheet) wird gemerkt
    $('eventSelect').addEventListener('change', merke);
    if ($('zurueckBtn')) $('zurueckBtn').addEventListener('click', () => { if (stack.length) history.back(); });
    if ($('reloadBtn')) $('reloadBtn').addEventListener('click', aktualisieren);
    window.addEventListener('popstate', e => {
      const k = e.state && e.state.k != null ? e.state.k : 0;
      if (k < stack.length) zurueck(stack.length - k);   // zurück; vorwärts wird ignoriert
    });
  }
  init();
  return { start, merke, zurueck };
})();
