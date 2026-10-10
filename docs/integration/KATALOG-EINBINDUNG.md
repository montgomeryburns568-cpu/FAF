# Speisenkatalog einbinden – technische Beschreibung (v1)

Der Generator stellt den Speisenkatalog **genau so bereit, wie die Küche ihn bedient**: dieselbe Seite, dieselben Funktionen
(Suchen, Filtern, Details, Tags, Komponenten tauschen/hinzufügen, Varianten, Rückgängig, To-Dos, Sicherung), derselbe Stand.
Die Office-App entscheidet selbst, wo und wie sie ihn zeigt.

## 1. Überblick
```
 Browser des Büro-Mitarbeiters
   ├─ Office-App (work-app-web)  ── Server: erzeugt Token (Geheimnis nur serverseitig)
   │     └─ <iframe src="{KATALOG}/api/speisenkatalog/embed?token=…&select=1&theme=dark">
   │              │  postMessage (nur zwischen den beiden Herkünften)
   │              ▼
   └─ Katalog-Seite (Origin des Generators)  ──►  {KATALOG}/api/speisenkatalog/state   (Bearer-Token)
```

## 2. Einrichtung (Umgebungsvariablen in Vercel – nie im Code)
| Variable | Wo | Inhalt |
|---|---|---|
| `OFFICE_EMBED_SECRET` | **beide** Projekte | gemeinsames Geheimnis, mindestens 32 zufällige Zeichen (z. B. `openssl rand -hex 32`) |
| `OFFICE_ORIGIN` | Generator | genaue Herkunft der Office-App, z. B. `https://work-app-web.vercel.app` (mehrere mit Komma). Nur diese dürfen einbetten und Browser-Aufrufe (CORS) machen |
| `KATALOG_URL` | Office | Adresse des Generators (Name frei wählbar) |

Ist `OFFICE_EMBED_SECRET` im Generator nicht gesetzt, ist die Einbettung **gesperrt** (401).

## 3. Token
Format: `<payload>.<signatur>`
- `payload` = Base64url(JSON) mit `sub` (ID des Büro-Nutzers), `name` (Anzeigename, erscheint im Katalog bei „Änderung von …“), `scope` (`"katalog"`), `exp` (Unix-Sekunden), optional `ro: true` (nur lesen)
- `signatur` = HMAC-SHA256 über `payload` mit `OFFICE_EMBED_SECRET`, als Hex

`scope` darf mehrere Bereiche enthalten, durch Leerzeichen getrennt (z. B. `"katalog lager"`); jede Schnittstelle prüft ihren eigenen Bereich. Bereiche: `katalog` (diese Datei), `lager` (siehe `LAGER-SCHNITTSTELLE.md`).

Ein Token ist höchstens **12 Stunden** gültig (längere Angaben werden abgelehnt), empfohlen: **1–4 Stunden**, serverseitig pro angemeldetem Büro-Nutzer erzeugt – **nie im Browser-Code erzeugen, das Geheimnis darf den Server nicht verlassen.**

```ts
// Office-Server (Node / Next.js Route Handler o. ä.)
import { createHmac } from 'node:crypto';

export function katalogToken(user: { id: string; name: string }, opts: { readonly?: boolean; ttlSeconds?: number } = {}) {
  const secret = process.env.OFFICE_EMBED_SECRET!;
  const exp = Math.floor(Date.now() / 1000) + Math.min(opts.ttlSeconds ?? 3600, 12 * 3600);
  const payload = Buffer.from(JSON.stringify({ sub: user.id, name: user.name, scope: 'katalog', exp, ...(opts.readonly ? { ro: true } : {}) })).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}
```
Die Referenz-Implementierung (Erzeugen und Prüfen) liegt im Generator in `embed-auth.js`, Tests in `_test_extracts/integration_test.js`.

## 4. Einbetten (empfohlen)
```html
<iframe src="{KATALOG_URL}/api/speisenkatalog/embed?token={TOKEN}&select=1&theme=dark" title="Speisenkatalog"></iframe>
```
Parameter: `token` (Pflicht) · `select=1` blendet bei jedem Gericht „+ Zum Angebot“ ein · `theme=dark|light` (optional; später per Nachricht änderbar).
Der Generator setzt `Content-Security-Policy: frame-ancestors 'self' <OFFICE_ORIGIN>` – andere Seiten können nicht einbetten.
Alle Funktionen des Katalogs sind enthalten; mit Lese-Token (`ro`) sind Änderungen gesperrt („Nur Lesezugriff“).

## 5. Nachrichten (`postMessage`)
Beide Seiten prüfen `event.origin` – der Katalog sendet nur an die einbettende Herkunft, die Office-App sollte nur Nachrichten der `KATALOG_URL`-Herkunft annehmen.

**Katalog → Office**
| `type` | Daten | Bedeutung |
|---|---|---|
| `ks-katalog:ready` | `version`, `readonly`, `select` | Katalog geladen und mit dem Server verbunden |
| `ks-katalog:changed` | `version` | die Küche (oder jemand anderes) hat den Katalog geändert, die Anzeige wurde aktualisiert |
| `ks-katalog:add-dish` | `dish` (s. unten), `version` | Büro hat „+ Zum Angebot“ gedrückt |
| `ks-katalog:auth-expired` | – | Token abgelaufen → neues Token erzeugen und per `ks-katalog:token` senden (oder iframe neu laden) |

`dish`:
```json
{
  "id": "g1", "name": "Gegrillte Hähnchenbrust Orangen-Mandelsoße mit Rosmarinkartoffeln und Kräuterbutter",
  "kueche": "Deutsch", "gang": "Hauptgang", "sammlung": "Hähnchen", "variante": false, "basisId": null,
  "tags": ["Klassisch", "Helal", "gluten frei"], "allergene": ["Schalenfrüchte", "Milch/Laktose"],
  "komponenten": [
    { "id": "k45", "name": "Gegrillte Hähnchenbrust", "text": "Gegrillte Hähnchenbrust", "rolle": "H", "gruppe": "Hähnchen" },
    { "id": "k12", "name": "Orangen-Mandelsoße", "text": "Orangen-Mandelsoße", "rolle": "S", "gruppe": "Soßen" }
  ]
}
```
`komponenten` ist die **aktuelle Zusammensetzung** (inkl. Tausch oder Ergänzung durch die Küche). `rolle`: `H` Haupt · `S` Soße · `B` Beilage · `G` Gemüse · `E` Extra.

**Office → Katalog**
| `type` | Daten | Wirkung |
|---|---|---|
| `ks-katalog:theme` | `theme: "dark"\|"light"` | Hell/Dunkel umschalten |
| `ks-katalog:select-dish` | `id` | Gericht wie per Klick auswählen (löst `add-dish` aus) – z. B. für eine eigene Suche in der Office-App |
| `ks-katalog:token` | `token` | neues Token übergeben (vor Ablauf, ohne Neuladen) |

## 6. Server-zu-Server / eigene Oberfläche
Mit `Authorization: Bearer <TOKEN>` (gleiches Token) sind diese Endpunkte erreichbar – **alle anderen Endpunkte des Generators (Rezepte, Angebote, Vorrat …) lehnen das Token ab (401)**:

| Methode & Pfad | Zweck |
|---|---|
| `GET /api/speisenkatalog/state` | aktueller Änderungsstand der Küche (siehe §7) inkl. `version`, `updated`, `von` |
| `PUT /api/speisenkatalog/state` | Änderungen speichern, Zusammenführen siehe §7 (mit Lese-Token: 403) |
| `GET /api/speisenkatalog/komponenten` | Komponentenliste (id, name, rolle, gruppe, Garmethode, To-Do-Text, Zutaten, Rezept) + Schreibweisen + Stand |
| `GET /api/speisenkatalog/page` | die Katalog-Seite als HTML |

Browser-Aufrufe von der Office-Herkunft sind per CORS erlaubt (`OFFICE_ORIGIN`), Server-Aufrufe brauchen kein CORS.
Der **Grundkatalog** (846 Gerichte, 1163 Komponenten) liegt als Datei im Generator-Repository (`speisenkatalog/speisendatenbank.json`) und ändert sich nur durch neue Versionen; **alles, was die Küche am Katalog ändert**, steht im Änderungsstand (§7).

## 7. Änderungsstand und gleichzeitiges Arbeiten
Der Stand besteht aus sieben Schlüsseln:
`speisen_names` (Komponenten umbenennen) · `speisen_mods` (Zusammensetzung eines Gerichts) · `speisen_custom` (eigene Varianten) · `speisen_removed` (entfernte Gerichte, Liste) ·
`speisen_tagmods` (Tags) · `speisen_todos` (To-Do-Texte) · `speisen_groups` (Rolle/Gruppe einer Komponente).

**Speichern** (`PUT`): Body `{ "daten": <mein Stand>, "basis": <Stand, auf dem ich aufgebaut habe> }`. Der Server übernimmt **nur die Änderungen gegenüber `basis`, je Eintrag**, und führt sie mit dem aktuellen Serverstand zusammen. Haben zwei Personen denselben Eintrag geändert, gilt die zuletzt gespeicherte. Die Antwort enthält den zusammengeführten Stand (`daten`), `version` (zählt hoch) und `updated`.
Ohne `basis` wird der Stand komplett ersetzt – **nur für die allererste Befüllung verwenden**.

Die Katalog-Seite prüft alle 30 Sekunden (und beim Zurückkehren in den Tab), ob sich `version` geändert hat, und übernimmt Änderungen anderer automatisch (Hinweis „Katalog aktualisiert“). Danach ist „Rückgängig“ zurückgesetzt, damit fremde Änderungen nicht versehentlich rückgängig gemacht werden.

## 8. Kennungen
- Gerichte: `g<Zahl>` (Grundkatalog) oder `v<…>` (von der Küche angelegte Varianten, `basisId` verweist auf das Original)
- Komponenten: `k<Zahl>`
- Kennungen werden **nie wiederverwendet**. Ein „entferntes“ Gericht bleibt bestehen und ist nur ausgeblendet – alte Angebote bleiben gültig.
- Aus Gründen der Nachvollziehbarkeit speichert die Office-App zu jeder Angebotszeile **zusätzlich den Text** (`name`, Komponentennamen) zum Zeitpunkt des Angebots.

## 9. Sicherheit (Checkliste)
- [ ] `OFFICE_EMBED_SECRET` nur als Vercel-Umgebungsvariable (beide Projekte), nie im Repository oder Chat
- [ ] Token nur serverseitig erzeugen, kurze Laufzeit (1–4 h), pro angemeldetem Büro-Nutzer
- [ ] `OFFICE_ORIGIN` exakt eintragen (kein `*`)
- [ ] Nachrichten beidseitig mit `event.origin` prüfen
- [ ] Nutzer ohne Bearbeitungsrecht erhalten Tokens mit `readonly`
- [ ] Der Katalog enthält **keine Kundendaten**; Angebote/Termine laufen über getrennte Schnittstellen mit eigenem Scope

## 10. Lokal ausprobieren
```
# Generator
OFFICE_EMBED_SECRET=lokales-test-geheimnis OFFICE_ORIGIN=http://localhost:3099 PORT=3080 node server.js
# simulierte Office-App
OFFICE_EMBED_SECRET=lokales-test-geheimnis GENERATOR_URL=http://localhost:3080 node docs/integration/mockup-office/serve-mock.js
# im Browser:  http://localhost:3099        (mit Vorführung: http://localhost:3099/?demo=1)
```
Automatische Prüfungen: `node _test_extracts/integration_test.js` (Token, Zusammenführen) und, bei laufendem Generator auf Port 3080, `node _test_extracts/embed_live_test.js`.

## 11. Änderungsprotokoll
- **v1** (Okt 2026): Erste Fassung. Einbetten per Token, Nachrichten (`ready`, `changed`, `add-dish`, `auth-expired`, `theme`, `select-dish`, `token`), Zusammenführen von Änderungen, Nur-Lese-Token.
