# Küchensheet-Generator – Einrichtung (Vercel + lokaler Datenspiegel)

Die App läuft online bei [Vercel](https://vercel.com) (kostenloser Hobby-Plan) und ist über eine
feste `*.vercel.app`-Adresse von überall erreichbar. Die Daten (Rezepte, Regeln, Angebote) liegen
in einer kleinen Cloud-Datenbank (Redis über Vercel Marketplace). Ein kleines Skript
(`sync-mirror.js`) holt sich davon regelmäßig eine Kopie auf einen lokalen Rechner – das ist der
"Offline-Spiegel": eine lesbare JSON-Kopie, unabhängig von Vercel.

## 1. Vercel-Account

1. [vercel.com/signup](https://vercel.com/signup) – mit GitHub, GitLab oder E-Mail, kein Kreditkarte nötig
2. Kein Projekt manuell anlegen – das passiert beim Deployment automatisch

## 2. Redis-Datenbank verbinden (Vercel Marketplace)

1. Im Vercel-Dashboard: **Storage** → **Create Database** → **Marketplace Database Providers** → **Upstash** (Redis) auswählen
2. Kostenlosen Plan wählen, mit dem Projekt verbinden
3. Vercel trägt daraufhin automatisch die Umgebungsvariablen (`KV_REST_API_URL`, `KV_REST_API_TOKEN` bzw. `UPSTASH_REDIS_REST_URL/TOKEN`) beim Projekt ein – hier ist nichts manuell einzutragen

## 3. Umgebungsvariablen setzen (Vercel-Projekteinstellungen → Environment Variables)

| Variable | Wert |
|---|---|
| `APP_PASSWORD` | Euer gemeinsames Passwort |
| `SESSION_SECRET` | Langer Zufallsstring (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `ANTHROPIC_API_KEY` | Euer Anthropic-Key (siehe Abschnitt 5, kann auch später ergänzt werden) |

## 4. Deployment

```bash
npm install -g vercel
vercel login
vercel link      # im Projektordner ausführen, neues Projekt anlegen
vercel deploy --prod
```

Nach dem Deployment bekommt ihr eine feste Adresse wie `https://kuechensheet-generator.vercel.app`.

## 5. Anthropic API-Key einrichten (für die KI-Rezeptvorschläge)

1. [console.anthropic.com](https://console.anthropic.com) → Account anlegen
2. Unter **Billing** ein kleines Guthaben aufladen (Vorschläge kosten Bruchteile eines Cents)
3. Unter **API Keys** → **Create Key** → Schlüssel kopieren (`sk-ant-...`)
4. In Vercel unter Environment Variables bei `ANTHROPIC_API_KEY` eintragen
5. Projekt neu deployen (`vercel deploy --prod`) oder in Vercel auf "Redeploy" klicken

Ohne Key läuft die App normal weiter, der "✨ KI-Vorschlag"-Button zeigt dann nur eine Fehlermeldung.

## 6. Lokalen Datenspiegel einrichten

1. Lokal im Projektordner eine `.env` anlegen (siehe `.env.example`):
   - `APP_PASSWORD` – dasselbe Passwort wie in Vercel
   - `MIRROR_URL` – die Vercel-Adresse, z.B. `https://kuechensheet-generator.vercel.app`
2. Testen: `npm run sync-mirror` – sollte `data/recipes.json`, `data/rules.json`, `data/events.json`
   anlegen/aktualisieren und Zeitstempel-Backups in `data/backups/` erzeugen
3. Automatisch wiederholen lassen über die **Windows-Aufgabenplanung**:
   - Aufgabenplanung öffnen → "Aufgabe erstellen"
   - Trigger: z.B. stündlich
   - Aktion: Programm `node.exe` (z.B. `C:\Program Files\nodejs\node.exe`), Argumente `sync-mirror.js`,
     Starten in: der Projektordner (`C:\Users\forks\Documents\Küchensheet-App`)

Damit liegt bei euch lokal immer eine maximal ein paar Stunden alte Kopie aller Daten – unabhängig
davon, ob Vercel oder Upstash gerade erreichbar sind.

## 7. Lokale Entwicklung/Test ohne Vercel

Ohne die `KV_REST_API_URL`/`KV_REST_API_TOKEN`-Variablen läuft die App lokal automatisch im
Datei-Modus (schreibt direkt in `data/*.json` statt in die Cloud-Datenbank) – praktisch zum Testen:

```bash
npm install
npm start
```

Läuft dann auf `http://localhost:3000`.

## Fehlersuche

- **"APP_PASSWORD und/oder SESSION_SECRET sind nicht gesetzt"**: Umgebungsvariablen in Vercel bzw. lokale `.env` prüfen.
- **Login funktioniert nicht**: Groß-/Kleinschreibung beim Passwort prüfen, Werte in Vercel und lokaler `.env` müssen übereinstimmen.
- **"Kein ANTHROPIC_API_KEY"**: Abschnitt 5 durchgehen, danach neu deployen.
- **sync-mirror.js schlägt fehl**: `MIRROR_URL` und `APP_PASSWORD` in der lokalen `.env` prüfen, sowie ob die Vercel-App erreichbar ist.
