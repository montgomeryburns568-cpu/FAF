# Lager-Übersicht für die Angebotserstellung (Generator → Office) – v1

Beim Schreiben eines Angebots soll das Büro sehen, **was in der Küche ohnehin noch da ist bzw. überproduziert wurde und verkauft werden soll** – samt Vorschlägen, welche Gerichte aus dem Katalog dazu passen. Der Entwurf (`mockup-office/`, Karte „Auf Lager – bitte bevorzugt anbieten“) zeigt, wie das aussehen kann.

## Endpunkt
`GET {KATALOG_URL}/api/integration/v1/lager` – **nur lesend**, **nur mit Token**, Bereich `lager`.

```
Authorization: Bearer <Verbindungsschlüssel>        (der dauerhafte Schlüssel aus KATALOG-EINBINDUNG.md §0; ältere Variante: Token mit Bereich "lager")
```
Der Aufruf kommt vom **Server der Office-App** (kein Geheimnis im Browser). Ein Token mit Bereich `katalog` reicht nicht, das Cookie des Generators ebenfalls nicht. Browser-Aufrufe sind für die in `OFFICE_ORIGIN` eingetragene Herkunft per CORS möglich.

## Antwort
```json
{
  "format": "kuechen-lager/1",
  "stand": "2026-10-10T10:41:38.891Z",
  "ueberproduktion": [
    {
      "id": "ue-d2", "name": "Kartoffeln", "menge": 25, "einheit": "kg",
      "klasse": "wurzel", "klasseLabel": "Kartoffeln, Zwiebeln, Wurzelgemüse, Käse, Eier",
      "haltbarBis": "2026-10-21", "tageRest": 11, "ampel": "ok", "notiz": "", "herkunftDatum": "07.10.2026",
      "vorschlaege": {
        "ideen": ["Kartoffelsuppe", "Backkartoffeln", "Kartoffelstampf", "Kartoffelsalat"],
        "gerichte": [ { "id": "g1", "name": "Gegrillte Hähnchenbrust Orangen-Mandelsoße mit Rosmarinkartoffeln und Kräuterbutter", "gang": "Hauptgang" } ]
      }
    }
  ],
  "vorrat": [ { "name": "Speiseöl", "bestand": 300, "einheit": "ml", "status": "niedrig" } ]
}
```
| Feld | Bedeutung |
|---|---|
| `ueberproduktion[]` | offene, **nicht abgelaufene** Posten aus den Nachträgen der Küche, bereits mit Haltbarkeit nach Lagerart |
| `ampel` | `ok` oder `bald` (≤ 2 Tage); abgelaufene Posten werden nicht geliefert |
| `vorschlaege.gerichte[]` | Katalog-Gerichte (Kennung `g…`), die eine passende Komponente enthalten – können direkt ins Angebot übernommen werden (siehe unten) |
| `vorschlaege.ideen[]` | freie Ideen (Text) |
| `vorrat[]` | Basisartikel (Salz, Öl …) mit `status` `ok` / `niedrig` / `leer` – nur als Hinweis, für den Verkauf meist unwichtig |

**Datenschutz:** Die Antwort enthält **keine Kundennamen und keine Veranstaltungsdetails**, nur Artikel, Mengen, Haltbarkeit und das Datum der Herkunft.

## Vorschlag direkt ins Angebot übernehmen
Die Office-App kann ein vorgeschlagenes Gericht über die Katalog-Schnittstelle auswählen: `iframe.contentWindow.postMessage({ type: 'ks-katalog:select-dish', id: 'g1' }, KATALOG_ORIGIN)`.
Der Katalog antwortet mit `ks-katalog:add-dish` (inkl. aktueller Komponenten) – genau wie nach einem Klick auf „+ Zum Angebot“.

## Synergie-Empfehlung („schon in der Produktion“)
Neben der Überproduktion zeigt die Küche dem Büro, **welche Gerichte in bestätigten, anstehenden Aufträgen ohnehin produziert werden**. Bietet das Büro in einem neuen Angebot dasselbe Gericht an, spart die Küche Aufwand und Einkauf (gleiche Soße, gleiches Fleisch, gleiche Vorbereitung). Beispiel: Hat ein Kunde am Mi 27.11. „Gegrillte Hähnchenbrust in Orangen-Mandelsoße“ bestellt, ist dieses Gericht die beste Wahl für einen weiteren Kunden am selben Tag.

`GET {KUECHE_URL}/api/integration/v1/synergien?datum=2026-11-27` – gleicher Schlüssel wie oben. `datum` (JJJJ-MM-TT) ist der **Wunschtermin des neuen Angebots** und optional; ohne Datum kommt die allgemeine Liste. Die Kurzfassung (bis 8 Gerichte) steckt auch im `/lager`-Aufruf im Feld `synergien` (ebenfalls mit `?datum=`).

```json
{
  "format": "kuechen-synergien/1", "stand": "2026-11-20T09:00:00Z", "datum": "2026-11-27",
  "gerichte": [
    {
      "katalogId": "g1", "name": "Gegrillte Hähnchenbrust Orangen-Mandelsoße mit Rosmarinkartoffeln und Kräuterbutter", "gang": "Hauptgang",
      "passung": "gleicher Tag", "anzahlAuftraege": 2, "gaesteGesamt": 70,
      "tage": [ { "datum": "2026-11-27", "tag": "Fr 27.11.", "gaeste": 70 } ],
      "begruendung": "Wird am selben Tag in 2 bestätigten Aufträgen (Fr 27.11.) ohnehin für 70 Gäste produziert – gleich mitproduzieren spart Aufwand und Einkauf.",
      "komponenten": [ { "id": "k1", "name": "Gegrillte Hähnchenbrust", "rolle": "H" }, { "id": "k2", "name": "Orangen-Mandelsoße", "rolle": "S" } ],
      "verwandteGerichte": [ { "katalogId": "g404", "name": "Putenbrust in Orangen-Mandelsoße", "gang": "Hauptgang", "gemeinsameKomponenten": 1 } ]
    }
  ],
  "komponenten": [ { "id": "k2", "name": "Orangen-Mandelsoße", "rolle": "S", "rolleText": "Soße", "anzahlAuftraege": 2, "passung": "gleicher Tag", "tage": [ { "datum": "2026-11-27", "tag": "Fr 27.11.", "gaeste": 70 } ] } ]
}
```
| Feld | Bedeutung |
|---|---|
| `gerichte[]` | Katalog-Gerichte (Kennung `g…`, direkt per `ks-katalog:select-dish` ins Angebot übernehmbar), sortiert nach **Passung** (1. gleicher Tag, 2. gleiche Bestellwoche Fr–Do, 3. anderer Zeitraum), dann nach Zahl der Aufträge |
| `passung` | `gleicher Tag` · `gleiche Bestellwoche` · `anderer Zeitraum` (ohne `datum`: `ohne Wunschtermin`) |
| `anzahlAuftraege`, `gaesteGesamt`, `tage[]` | wie oft und für wie viele Gäste das Gericht an welchen anstehenden Tagen ohnehin produziert wird |
| `begruendung` | fertiger Satz für die Anzeige im Büro |
| `komponenten[]` (am Gericht) | woraus das Gericht besteht (ohne Extras) |
| `verwandteGerichte[]` | weitere Katalog-Gerichte mit derselben Hauptkomponente (z. B. dieselbe Hähnchenbrust), falls das Büro variieren möchte |
| `komponenten[]` (oberste Ebene) | einzelne Komponenten (Soße, Fleisch, Beilage …), die ohnehin produziert werden – mit Wunschtermin nur die vom selben Tag bzw. aus derselben Bestellwoche |

Berücksichtigt werden nur **bestätigte, anstehende, nicht stornierte und nicht archivierte** Aufträge (Tage ab heute). Gerichte, die nicht im Speisenkatalog zu finden sind, tauchen nicht auf (das Büro könnte sie nicht gezielt wieder anbieten). **Datenschutz:** keine Kundennamen, nur Gericht, Termin und Gästezahl.
Empfohlene Anzeige im Angebots-Editor: Karte „Schon in der Produktion – bitte bevorzugt anbieten“ mit Begründung, Termin und Knopf „+ Zum Angebot“; Gerichte vom selben Tag hervorheben. Abruf beim Öffnen des Editors, bei Änderung des Termins und danach alle paar Minuten.

## Hinweise
- Die Daten werden bei jedem Aufruf frisch berechnet (`Cache-Control: no-store`); sinnvoll ist ein Abruf beim Öffnen des Angebots-Editors und danach alle paar Minuten.
- Die Gerichtsvorschläge stammen aus dem Grundkatalog. Von der Küche angelegte Varianten sowie umbenannte Komponenten sind darin noch nicht berücksichtigt (spätere Verbesserung).
- Wer zu viel Überproduktion verkauft: Die Küche bucht Überproduktion automatisch ab, sobald sie in einem bestätigten Auftrag verbraucht wird – das Büro muss nichts melden.
- Test: `node _test_extracts/lager_live_test.js` (bei laufendem Generator auf Port 3080).
