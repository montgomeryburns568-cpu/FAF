# Lager-Übersicht für die Angebotserstellung (Generator → Office) – v1

Beim Schreiben eines Angebots soll das Büro sehen, **was in der Küche ohnehin noch da ist bzw. überproduziert wurde und verkauft werden soll** – samt Vorschlägen, welche Gerichte aus dem Katalog dazu passen. Der Entwurf (`mockup-office/`, Karte „Auf Lager – bitte bevorzugt anbieten“) zeigt, wie das aussehen kann.

## Endpunkt
`GET {KATALOG_URL}/api/integration/v1/lager` – **nur lesend**, **nur mit Token**, Bereich `lager`.

```
Authorization: Bearer <token>        (Token wie in KATALOG-EINBINDUNG.md §3, aber  scope: "lager"  – oder  "katalog lager"  für beides)
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

## Hinweise
- Die Daten werden bei jedem Aufruf frisch berechnet (`Cache-Control: no-store`); sinnvoll ist ein Abruf beim Öffnen des Angebots-Editors und danach alle paar Minuten.
- Die Gerichtsvorschläge stammen aus dem Grundkatalog. Von der Küche angelegte Varianten sowie umbenannte Komponenten sind darin noch nicht berücksichtigt (spätere Verbesserung).
- Wer zu viel Überproduktion verkauft: Die Küche bucht Überproduktion automatisch ab, sobald sie in einem bestätigten Auftrag verbraucht wird – das Büro muss nichts melden.
- Test: `node _test_extracts/lager_live_test.js` (bei laufendem Generator auf Port 3080).
