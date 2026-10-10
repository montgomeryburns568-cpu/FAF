# Angebot mit Katalog-Kennungen (Office → Generator) – Entwurf v1

**Status: Entwurf zur Abstimmung.** Der Empfang im Generator (`POST /api/integration/v1/angebote`) wird gebaut, sobald Office-Seite und Küche dieses Format bestätigt haben.
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
**Offener Punkt – Änderungsfrist:** Je näher der Termin, desto riskanter sind Änderungen (Einkauf und Produktion laufen). Vorschlag: Bis X Tage vor dem Termin (z. B. 7) gehen Änderungen automatisch durch; danach sieht das Büro den Hinweis „Küche bereits in Produktion – Änderung muss von der Küche bestätigt werden“, und die Küche bestätigt oder lehnt ab.

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
| `preise` | – | **werden nicht übertragen** |

## Was die Küche daraus macht
Für jedes Gericht: Komponenten erkennen **über die Kennungen** (kein Textvergleich), Mengen je Gast nach den Regeln, To-Dos aus den Rezepten, Zutaten → Einkaufsliste abzüglich Vorrat und Überproduktion, Eintrag in Monats-/Wochen-/Tagesplan, Produktionsstart nach der Vorlaufzeit der Komponenten, Archiv und Kundenkartei.

## Offene Punkte (gemeinsam klären)
1. Reicht ein Angebot je Auftrag oder gibt es Varianten/Versionen, die getrennt ankommen sollen?
2. Wo speichert die Office-App heute die Angebotspositionen (Bausteine, „informalOffers“, PDF-Anlagen)? Wie werden daraus Zeilen mit `katalogId`?
3. Änderungsfrist festlegen (siehe oben): ab wann müssen Änderungen von der Küche bestätigt werden?
4. Rückrichtung (später): Küchenstand, tatsächliche Gäste, Überproduktion/Nachtrag an den Auftrag zurückmelden.
