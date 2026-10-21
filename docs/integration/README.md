# Zusammenarbeit Küchen-App (Generator) ↔ Office-App

Stand: Oktober 2026 · Schnittstellen-Version **v1** · Sprache der Anwendungen: Deutsch

## Idee in drei Sätzen
1. Das **Büro pflegt weiter alles in der Office-App** (Kalender, Kunden, Angebote, Preise, Personal).
2. Die **Küche pflegt den Speisenkatalog** – er enthält zu jeder Komponente Rezept, Zubereitung (To-Dos) und Mengenregeln.
3. Das Büro arbeitet in der Office-App **mit genau diesem Katalog** (so wie die Küche ihn erlebt, mit denselben Funktionen und Bearbeitungsmöglichkeiten, immer aktuell) und schreibt Angebote **mit den Kennungen der Gerichte und Komponenten**. Daraus erzeugt der Generator automatisch Küchensheet, To-Do-Liste, Einkaufsliste, Tages-/Wochenplan.

Das Büro ist dabei ein **weiterer Nutzer des Katalogs** – nicht eine Kopie davon.

## Wer entscheidet was
| Thema | Entscheidung liegt bei |
|---|---|
| Wie der Katalog **in der Office-App eingebunden** wird (Seite, Position, Aussehen, Angebots-Editor) | **Office-Seite** (Claude + Entwickler der Office-App) |
| Wie der Katalog **bereitgestellt** wird (Schnittstelle, Anmeldung, Datenformat, Zusammenführen von Änderungen) | **Generator-Seite** (dieses Repository) – bereits umgesetzt, siehe unten |
| Preise, Kunden, Termine, Personal, Abrechnung | Office-App |
| Rezepte, Mengen, To-Dos, Vorrat, Einkauf, Produktionsplanung | Generator |

## Dateien in diesem Ordner
| Datei | Inhalt |
|---|---|
| [`KATALOG-EINBINDUNG.md`](KATALOG-EINBINDUNG.md) | **Technische Beschreibung** der bereits laufenden Katalog-Schnittstelle: Anmeldung per Token, Einbettung, Nachrichten, Speichern/Zusammenführen, Sicherheit |
| [`ANGEBOT-FORMAT.md`](ANGEBOT-FORMAT.md) | **Format eines Angebots** mit Katalog-Kennungen (Office → Generator), Auslöser „Bestätigt“, Änderungen nach der Bestätigung – Entwurf zur gemeinsamen Abstimmung |
| [`LAGER-SCHNITTSTELLE.md`](LAGER-SCHNITTSTELLE.md) | **Lager-/Überproduktions-Übersicht** (Generator → Office) für die Angebotserstellung, mit Verkaufsvorschlägen aus dem Katalog – bereits umgesetzt |
| [`BRIEFING-OFFICE-CLAUDE.md`](BRIEFING-OFFICE-CLAUDE.md) | Auftrag und Fragen an den **Claude der Office-Seite** (zum Einfügen in dessen Sitzung) |
| [`mockup-office/`](mockup-office/) | **Lauffähiger Entwurf**, wie der Katalog in der Office-App aussehen könnte, plus Bilder |

## Was schon fertig ist (Generator-Seite)
- **Eine dauerhafte Verbindung per Schlüssel**: Die Küche erzeugt unter *Regeln → Büro-Verbindung* einen Verbindungsschlüssel und trägt die Adresse der Office-App ein – mehr Einrichtung gibt es nicht (siehe `KATALOG-EINBINDUNG.md` §0).
- Katalog per **iframe** einbettbar; die Office-App holt dafür mit dem Schlüssel ein kurzes Token (gilt nur für den Katalog).
- Katalog-Schnittstellen auch **server-zu-server** nutzbar.
- **Gleichzeitiges Arbeiten** von Küche und Büro: Änderungen werden je Eintrag zusammengeführt, nichts wird überschrieben; Änderungen anderer erscheinen automatisch.
- **Nachrichten-Schnittstelle** zwischen Katalog-Seite und Office-App (Gericht hinzufügen, Hell/Dunkel, Token erneuern).
- Nur-Lese-Tokens für Nutzer ohne Bearbeitungsrecht.
- **Lager-Übersicht** (Überproduktion + Basisvorrat, ohne Kundendaten) als lesende Schnittstelle mit eigenem Token-Bereich.
- **Synergie-Empfehlung** (`GET /api/integration/v1/synergien?datum=…`): Gerichte und Komponenten, die in bestätigten anstehenden Aufträgen ohnehin produziert werden – das Büro soll sie für neue Angebote bevorzugt anbieten (spart Aufwand und Einkauf); Vorrang für den Wunschtermin (gleicher Tag, gleiche Bestellwoche).
- **Empfang bestätigter Angebote** (`POST /api/integration/v1/angebote`, Token-Bereich `angebote`): legt Auftrag samt Küchensheet/To-Do/Einkauf an, nimmt Änderungen nach dem **Bestellrhythmus** an oder legt sie der Küche zur Bestätigung vor, Storno, Angebots-**PDF** für die Vorschau (Preise geschwärzt), Statusabfrage fürs Büro. Getestet mit `node tools/angebot-integration-test.js`.

## Was als Nächstes gemeinsam entsteht
1. Office-Seite: Katalog einbinden, Angebote mit Kennungen speichern (siehe Briefing).
2. ~~Generator-Seite: Empfang der Angebote~~ – umgesetzt (siehe oben). Offen: Büro-Seite sendet Angebote in diesem Format.
3. Später: Termine aus dem Office-Kalender (bestätigt, nicht storniert) automatisch in die Planung übernehmen, Rückmeldung von Küchenstand und tatsächlichen Gästen ins Büro.

## Ablauf aus Sicht des Büros
1. Angebot im Entwurf zusammenstellen: Gerichte aus dem eingebetteten Katalog, Preise (Vorschläge aus der Preisliste des Büros, fehlende werden markiert und nachgetragen).
2. Sieht, was in der Küche **auf Lager bzw. überproduziert** ist, und kann passende Gerichte mit einem Klick übernehmen.
3. Mit dem Kunden abstimmen, anpassen.
4. **„Angebot bestätigen“** – erst jetzt erfährt die Küche davon und plant alles (Küchensheet, To-Do, Einkauf, Pläne). Spätere Änderungen laufen als Änderungsmitteilung.

Die Erklärung „Was passiert nach der Bestätigung?“ ist in der Office-App nur ein aufklappbarer Hinweis.

## Grundregeln
- **Keine Geheimnisse** (Schlüssel, Token, Passwörter) in Code, Dokumenten, Issues oder Chats – nur als Umgebungsvariablen in Vercel.
- **Preise** bleiben im Büro und werden nicht übertragen; Angebots-PDFs sind in der Küchen-App ohne Preis-Passwort geschwärzt.
- **Keine Kundendaten** in dieser Dokumentation oder in Tests (nur erfundene Beispiele). Telefon, E-Mail und Adressen braucht die Küche nicht und werden nicht übertragen.
- Änderungen an der jeweils anderen Anwendung laufen über **Pull Requests**, die ein Mensch freigibt.
- Der Katalog wird **nicht kopiert**. Die Office-App speichert nur Kennungen und eine Text-Kopie je Angebotszeile.
