# Angebot mit Katalog-Kennungen (Office → Generator) – v1

**Status: Empfang im Generator umgesetzt und getestet** (`POST /api/integration/v1/angebote`, Abschnitt „Schnittstelle“ unten). Das Format ist weiter offen für Wünsche der Office-Seite – bitte als Pull Request/Nachricht melden.
Die Office-App speichert ein Angebot ohnehin in ihrem eigenen Modell – dieses Dokument beschreibt nur, **was der Küche übergeben wird**.

## Ziele
- Die Küche muss **nichts mehr aus Texten oder PDFs erraten**: jede Zeile verweist auf ein Katalog-Gericht und seine Komponenten.
- Änderungen im Büro (Datum, Gäste, Gerichte, Storno) wandern **idempotent** nach: derselbe `officeEventId` aktualisiert denselben Auftrag.
- Preise, Kundenkontakt und Abrechnung bleiben im Büro.

## Auslöser: erst das bestätigte Angebot erreicht die Küche
Ein Angebot wird vom Kunden meist noch angepasst. Deshalb bekommt die Küche **nichts, solange das Angebot nicht bestätigt ist**:

| Zustand in der Office-App | Küche |
|---|---|
| Entwurf (Büro arbeitet, auch gespeichert) | sieht nichts |
| Mit dem Kunden abgestimmt / versendet | sieht nichts |
| **Bestätigt** (Knopf „Angebot bestätigen“) | bekommt das Angebot (`status: CONFIRMED`, `version: 1`) → Küchensheet, To-Do, Einkaufsliste und Plan entstehen automatisch |
| Änderung nach der Bestätigung | neue `version` mit `aenderung` → die Küche sieht eine **Änderungsmitteilung** (was hat sich geändert) und passt Mengen/Einkauf an |
| Storniert | `status: CANCELLED` → Planung und Vorratsbuchung werden freigegeben |

Der Knopf „Angebot bestätigen“ sollte nur aktiv sein, wenn das Angebot vollständig ist: mindestens ein Gericht, **alle Preise eingetragen**, Datum, Gästezahl. Beim Bestätigen zeigt die Office-App kurz an, was passiert (Küche wird informiert, spätere Änderungen laufen als Änderungsmitteilung).
Die Übergabe geschieht **durch das Bestätigen** (nicht durch Speichern) und sollte wiederholbar sein: Dieselbe `version` erneut gesendet ändert nichts.

**Änderung nach der Bestätigung** (zusätzliche Felder):
```json
"version": 2,
"aenderung": { "am": "2027-03-20T08:00:00Z", "grund": "Kunde erhöht Gästezahl", "felder": ["gaesteGesamt", "tage[0].positionen"] }
```
**Änderungsfrist = Bestellrhythmus der Küche (festgelegt).** Es gibt keine feste Tageszahl. Die Küche bestellt wöchentlich: Bestellfrist **Dienstag 11:30 Uhr**, Lieferung Mittwoch 12:00 Uhr, für alle Aufträge von **Freitag bis Donnerstag** der Folgewoche. Maßgeblich ist der Zeitraum (Fr–Do), in den der **betroffene Veranstaltungstag** fällt:
- **Vor der Bestellfrist** dieses Zeitraums (und solange die Hauptbestellung nicht abgeschickt ist): Die Änderung wird **sofort automatisch übernommen**. Beispiel: Montag geändert, Veranstaltung im nächsten Fr–Do-Zeitraum → geht durch, es kann ja noch bestellt werden.
- **Nach der Bestellfrist** (oder sobald die Hauptbestellung abgeschickt ist): Die Änderung wird **nicht umgesetzt, sondern der Küche zur Bestätigung vorgelegt** (Antwort `wartet_auf_kueche`). Beispiel: Dienstag 15 Uhr geändert, Veranstaltung im Zeitraum des kommenden Fr–Do → Bestellung ist schon raus, die Küche entscheidet.
- Die Küche **übernimmt** (Küchensheet, To-Do, Einkauf werden angepasst; schon Bestelltes wird als Nachbestellung sichtbar) oder **lehnt ab** (mit Grund). Das Büro fragt den Stand ab (`GET …/angebote/{officeEventId}`).
- Änderungen, die **nur Kunde, Notiz oder Anlass** betreffen (keine Gäste, Gerichte, Tage, Regelsatz), gehen immer sofort durch.
- Ein **neues** bestätigtes Angebot wird immer angenommen. Liegt sein Termin bereits nach einer abgeschickten Bestellung, meldet die Antwort `nachFrist: true` – die Küche bestellt dann nach.
- **Storno** folgt derselben Regel: vor der Frist sofort, danach mit Bestätigung der Küche.
- Die Zeiten gelten in **Europe/Berlin**.

## Format
```json
{
  "format": "kuechen-angebot/1",
  "officeEventId": "00000000-0000-4000-8000-000000000001",
  "officeOfferId": "AN-2027-0042",
  "status": "CONFIRMED",
  "version": 1,
  "stand": "2027-03-02T09:15:00Z",
  "katalogVersion": 4,

  "kunde": { "name": "Beispiel GmbH", "kuerzel": "BEIS" },
  "anlass": "Firmenevent",
  "modus": "mittag",
  "gaesteGesamt": 40,
  "vegetarischAnteil": null,
  "notiz": "Anlieferung 17:00 Uhr, Abholung 23:00 Uhr",

  "tage": [
    {
      "datum": "2027-05-28",
      "gaeste": 40,
      "positionen": [
        {
          "katalogId": "g236",
          "gang": "Vorspeise",
          "name": "Antipastiplatte mit gegrilltem Gemüse, …",
          "komponenten": ["k101", "k102", "k103", "k104", "k105"],
          "personen": null,
          "wunsch": "ohne Oliven"
        },
        {
          "katalogId": "g1",
          "gang": "Hauptgang",
          "name": "Gegrillte Hähnchenbrust Orangen-Mandelsoße mit Rosmarinkartoffeln und Kräuterbutter",
          "komponenten": ["k45", "k12", "k88", "k301"],
          "personen": 27
        }
      ]
    }
  ]
}
```

## Felder
| Feld | Pflicht | Bedeutung |
|---|---|---|
| `format` | ja | Version dieses Formats |
| `officeEventId` | ja | stabile ID des Auftrags in der Office-App (für Aktualisierung/Storno) |
| `officeOfferId` | nein | Angebotsnummer, nur zur Anzeige |
| `status` | ja | `CONFIRMED` oder `CANCELLED`. Nur bestätigte Angebote werden übergeben; bei `CANCELLED` werden Planung und Vorratsbuchung wieder freigegeben |
| `version` | ja | zählt bei jeder Änderung nach der Bestätigung hoch (1, 2, …); gleiche Version = nichts zu tun |
| `stand` | ja | Zeitpunkt der letzten Änderung im Büro |
| `katalogVersion` | nein | Version des Katalogs beim Erstellen (für Rückfragen) |
| `kunde.name` / `kuerzel` | ja / nein | Name wie im Küchenblatt; **keine Telefonnummern, E-Mails oder Adressen** |
| `modus` | nein | `mittag` (Mittag/Business) oder `abend` (Abend/Privat) – bestimmt den Regelsatz der Kalkulation (z. B. 160 g bzw. 200 g Hauptteil) |
| `gaesteGesamt`, `tage[].gaeste` | ja | Gästezahl |
| `vegetarischAnteil` | nein | Prozent vegetarisch bei Hauptgängen; leer = Kundenprofil bzw. Standard (1/3) |
| `tage[].datum` | ja | `JJJJ-MM-TT` |
| `positionen[].katalogId` | ja | Kennung des Gerichts (`g…` oder `v…`) |
| `positionen[].komponenten` | ja | **tatsächliche** Zusammensetzung (Kennungen `k…`), z. B. nach Tausch einer Beilage. Der Katalog bleibt dabei unverändert – die Abweichung gilt nur für dieses Angebot |
| `positionen[].name` | ja | Text-Kopie zum Zeitpunkt des Angebots (bleibt lesbar, auch wenn das Gericht später aus dem Katalog verschwindet) |
| `positionen[].gang` | nein | Gang/Kategorie (Vorspeise, Hauptgang, Dessert, Fingerfood …) |
| `positionen[].personen` | nein | feste Personenzahl für diese Zeile; leer = die Küche verteilt automatisch (z. B. Hauptgänge 2/3 Fleisch · 1/3 vegetarisch) |
| `positionen[].wunsch` | nein | Freitext-Hinweis zur Zeile (Allergie, Wunsch) |
| `pdf` | nein | **Angebots-PDF, so wie der Kunde es liest**: `{ "dateiname": "Angebot Beispiel.pdf", "base64": "…" }` (höchstens 9 MB, Gesamtanfrage unter ca. 4 MB wegen der Vercel-Grenze). Die Küche zeigt es im Angebotsreiter als Vorschau – Preise sind dort ohne Preis-Passwort geschwärzt. Mit jeder neuen Version kann ein neues PDF mitgeschickt werden (ersetzt das alte, sobald die Version übernommen ist) |
| `aenderung` | bei Version ≥ 2 | `{ "am": "…", "grund": "Kunde erhöht Gästezahl" }` – erscheint in der Küche beim Vorlegen der Änderung |
| `preise`, Telefon, E-Mail, Adresse | – | **werden nicht übertragen** – unbekannte Felder werden verworfen, nicht gespeichert |

## Schnittstelle
Anmeldung mit dem **Verbindungsschlüssel** der Küche (`Authorization: Bearer ksk_…`, siehe `KATALOG-EINBINDUNG.md` §0). Nur Server-zu-Server, nie aus dem Browser. (Ältere Variante: Token mit Bereich `angebote`.)

| Aufruf | Zweck |
|---|---|
| `POST /api/integration/v1/angebote` | Angebot (Version) senden – neu, geändert oder storniert (`status: CANCELLED` braucht nur `format`, `officeEventId`, `status`, `version`, optional `grund`) |
| `GET /api/integration/v1/angebote/{officeEventId}` | Stand in der Küche: `version`, `storniert`, `offen` (wartende Änderung), `abgelehnt` (mit Grund) |

**Antwort von POST** (HTTP 200, außer bei Fehlern):
| `status` | Bedeutung |
|---|---|
| `angelegt` | neuer Auftrag in der Küche (`nachFrist: true`, wenn für einen Tag die Bestellung schon abgeschickt ist) |
| `uebernommen` | Änderung wurde sofort übernommen (`aenderungen`: Liste in Klartext) |
| `wartet_auf_kueche` | Änderung/Storno nach der Bestellfrist – die Küche muss bestätigen (`gruende`) |
| `unveraendert` | diese Version ist schon eingegangen (gefahrlos wiederholbar) |
| `storniert` / `unbekannt` | Storno ausgeführt / zu diesem Auftrag gab es nichts |

Fehler: **400** mit `fehler` (Liste, was am Angebot nicht stimmt) · **401** Token fehlt/ungültig/falscher Bereich · **403** Lese-Token · **409** ältere Version als die vorhandene (`aktuelleVersion`) · **413** PDF zu groß.
Die Küche speichert zu jedem Auftrag die **zuletzt angenommene Fassung** und vergleicht neue Versionen damit. `officeEventId` ist der Schlüssel; Kennungen werden nie wiederverwendet.

Prüfen lässt sich alles ohne Büro-App mit `node tools/angebot-integration-test.js` (erfundene Daten, temporärer Datenordner).

## Was die Küche daraus macht
Für jedes Gericht: Komponenten erkennen **über die Kennungen** (kein Textvergleich), Mengen je Gast nach den Regeln, To-Dos aus den Rezepten, Zutaten → Einkaufsliste abzüglich Vorrat und Überproduktion, Eintrag in Monats-/Wochen-/Tagesplan, Produktionsstart nach der Vorlaufzeit der Komponenten, Archiv und Kundenkartei.

## Offene Punkte (gemeinsam klären)
1. Reicht ein Angebot je Auftrag oder gibt es Varianten/Versionen, die getrennt ankommen sollen?
2. Wo speichert die Office-App heute die Angebotspositionen (Bausteine, „informalOffers“, PDF-Anlagen)? Wie werden daraus Zeilen mit `katalogId`?
3. ~~Änderungsfrist~~ – festgelegt: Bestellrhythmus (siehe oben).
4. Rückrichtung (später): Küchenstand, tatsächliche Gäste, Überproduktion/Nachtrag an den Auftrag zurückmelden.
