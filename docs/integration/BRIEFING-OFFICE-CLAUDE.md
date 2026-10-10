# Briefing für den Claude der Office-App

Dieses Dokument ist zum Einfügen in eine Claude-Sitzung auf der **Office-Seite** gedacht (Repository der Office-App, Vercel-Projekt „work-app-web“).
Es stammt vom Claude der **Küchen-App** (Küchensheet-Generator) im Auftrag der Betreiber beider Anwendungen.

## Worum es geht
Das Büro soll in der Office-App Angebote mit dem **vollständigen Speisenkatalog der Küche** schreiben – so wie die Küche ihn erlebt, immer aktuell, mit denselben Funktionen und Bearbeitungsmöglichkeiten. Das Büro ist dabei ein weiterer Nutzer des Katalogs, kein Kopierer. Hinter jeder Komponente liegen Rezept, Zubereitung (To-Dos) und Mengenregeln; deshalb kann die Küche aus einem Angebot mit Katalog-Kennungen Küchensheet, To-Do-Liste, Einkaufsliste und Pläne vollautomatisch erzeugen.

**Du entscheidest, wie der Katalog in der Office-App eingebunden wird** (Seite, Position, Aufbau des Angebots-Editors, Datenmodell). Wir stellen den Katalog nur bereit und beschreiben, was die Küche zurück erwartet.

## Was die Küchen-Seite bereits geliefert hat (lauffähig, getestet)
Lies zuerst, in dieser Reihenfolge:
1. `docs/integration/README.md` – Überblick, Rollen, Grundregeln
2. `docs/integration/KATALOG-EINBINDUNG.md` – Token-Anmeldung, `iframe`, Nachrichten, Speichern/Zusammenführen, Sicherheit
3. `docs/integration/ANGEBOT-FORMAT.md` – Entwurf, was die Küche pro Angebot braucht
4. `docs/integration/mockup-office/` – lauffähiger Entwurf mit Bildern (`02-angebot-dunkel.png`, `03-angebot-hell.png`) und `serve-mock.js`

Kurz: Der Generator liefert die Katalog-Seite unter `/api/speisenkatalog/embed` aus, abgesichert durch ein von **deinem Server** erzeugtes, kurzlebiges Token (HMAC mit gemeinsamem Geheimnis). Die Seite meldet per `postMessage`, wenn das Büro ein Gericht zum Angebot hinzufügt (mit Kennungen und aktueller Komponentenliste).

## Dein Auftrag (Vorschlag in Phasen – Reihenfolge und Details bestimmst du)
**Phase 1 – Katalog sichtbar machen**
- Erzeuge serverseitig ein Token pro angemeldetem Office-Nutzer (Beispiel in `KATALOG-EINBINDUNG.md` §3) und binde den Katalog per iframe ein (Route/Seite nach deinem Ermessen; vermutlich im Bereich der Angebote).
- Prüfe `event.origin` bei allen Nachrichten. Erneuere das Token vor Ablauf (`ks-katalog:token`) bzw. bei `ks-katalog:auth-expired`.
- Rechte: Nutzer mit Bearbeitungsrecht erhalten ein normales Token, alle anderen ein `readonly`-Token.
- Die Office-App hat unseres Wissens bereits Seiten für Küchenblätter/Katalog (`/admin/kitchen-sheets/katalog`) und Angebotsbausteine (`/admin/angebote/bausteine`). Bitte klären und uns mitteilen, wie sich das zum neuen Katalog verhält (ersetzen, daneben, später ablösen) – **wir wollen nicht zwei Wahrheiten**.

**Phase 2 – Angebote mit Kennungen**
- Beim Nachricht `ks-katalog:add-dish` eine Angebotszeile mit `katalogId`, Name, `komponenten` (Kennungen) und Gang anlegen. Wunsch-Abweichungen (Beilage tauschen) gelten **nur für das Angebot**, nicht für den Katalog.
- Preise bleiben in der Office-App und hängen an `katalogId` bzw. Komponenten (Mapping nach deinem Datenmodell).
- Speichere zu jeder Zeile zusätzlich den **Text-Stand** (Name, Komponentennamen) – Kennungen werden nie wiederverwendet, aber Gerichte können aus dem Katalog ausgeblendet werden.

**Phase 3 – Übergabe an die Küche**
- Erzeuge bei Bestätigung (und bei Änderungen, Storno) das Angebot im Format aus `ANGEBOT-FORMAT.md`. Gib uns Rückmeldung, was am Format fehlt oder anders gelöst werden soll. Den Empfang (`POST /api/integration/v1/angebote`) bauen wir auf der Küchen-Seite, sobald das Format steht.

**Phase 4 – Termine (später)**
- Bestätigte, nicht stornierte Aufträge (mit Gästezahl, Datum, Kategorie) sollen automatisch in die Planung der Küche (Monats-, Wochen-, Tagesplan) gelangen, inklusive Vorlauf der Produktion; Rückmeldung von Küchenstand und tatsächlichen Gästen ans Büro.

## Grenzen (bitte einhalten)
- **Nichts am Katalog „simulieren“ oder kopieren.** Einbetten oder die dokumentierten Endpunkte nutzen; keine eigene Kopie der Gerichte pflegen.
- **Keine Geheimnisse** in Code, Commits, Issues oder Chats. Das gemeinsame Geheimnis (`OFFICE_EMBED_SECRET`) tragen die Betreiber selbst in Vercel ein.
- **Keine Kundendaten** (Telefon, E-Mail, Adresse) an die Küche übertragen; die Küche braucht Name/Kürzel, Datum, Gäste, Anlass.
- Änderungen an der Küchen-App nicht direkt vornehmen, sondern als Wunsch/Pull Request an deren Betreiber richten.
- Alles, was du an der Office-App änderst, läuft über einen Pull Request, den ein Mensch freigibt.

## Fragen, die wir von dir beantwortet haben möchten
1. Wo genau wird der Katalog in der Office-App eingebunden, und wie sieht der Angebots-Editor aus (Skizze reicht)?
2. Wie werden Angebote heute gespeichert (Tabellen/Modelle, „informalOffers“, Bausteine, PDF-Anlagen)? Wie passt `katalogId` hinein?
3. Wie funktioniert die Anmeldung (Nutzer, Rollen)? Welche Rolle darf den Katalog bearbeiten, welche nur lesen?
4. Gibt es einen Plan für eine gemeinsame Domain (z. B. `buero.…` und `kueche.…`)? Das würde Anmeldung und Links zwischen den Apps vereinfachen.
5. Welche Teile des Kalenders (Kategorien, Flags wie „hiddenFromKitchen“, Status) bestimmen, ob ein Termin die Küche betrifft?
6. Gibt es Beispieldaten (erfunden oder anonymisiert) für Angebote und Termine, an denen wir das Format testen können?

## Technische Randbedingungen der Küchen-App (Auszug)
- Node/Express auf Vercel (serverless), Daten in Redis; Frontend ohne Framework (Vanilla JS) – Katalog-Seite ist eine eigenständige HTML-Seite.
- Deutsch als Sprache der Oberfläche; Hell/Dunkel wird unterstützt (`theme` bzw. Nachricht).
- Tests: `node _test_extracts/integration_test.js`, `node _test_extracts/embed_live_test.js` (bei laufendem Generator).
