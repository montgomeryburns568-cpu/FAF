// Lokaler Entwurf: simuliert die Office-App und bettet den Katalog des Generators ein.
//   1. Generator starten mit:  OFFICE_EMBED_SECRET=<geheimnis>  OFFICE_ORIGIN=http://localhost:3099  node server.js
//   2. Diesen Entwurf starten: OFFICE_EMBED_SECRET=<dasselbe geheimnis>  node docs/integration/mockup-office/serve-mock.js
//   3. Im Browser http://localhost:3099 öffnen.
// Das Token wird hier – wie später im Server der Office-App – mit dem gemeinsamen Geheimnis erzeugt und in die Adresse des iframes eingesetzt.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { erzeugeEmbedToken } = require('../../../embed-auth.js');

const PORT = Number(process.env.MOCK_PORT || 3099);
const GENERATOR = (process.env.GENERATOR_URL || 'http://localhost:3080').replace(/\/$/, '');
const SECRET = process.env.OFFICE_EMBED_SECRET;
if (!SECRET) { console.error('OFFICE_EMBED_SECRET fehlt.'); process.exit(1); }

http.createServer((req, res) => {
  if (req.url.split('?')[0] !== '/') { res.statusCode = 404; return res.end(); }
  const q = new URL(req.url, 'http://x').searchParams;
  const token = erzeugeEmbedToken(SECRET, { sub: 'demo-buero', name: 'Büro (Demo)', lebensdauerS: 3600, readonly: q.get('ro') === '1' });
  const url = `${GENERATOR}/api/speisenkatalog/embed?token=${encodeURIComponent(token)}&select=1&theme=${q.get('theme') === 'light' ? 'light' : 'dark'}`;
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8')
    .replace('__KATALOG_EMBED_URL__', url).replace('__GENERATOR_ORIGIN__', new URL(GENERATOR).origin);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
}).listen(PORT, () => console.log('Entwurf der Office-App auf http://localhost:' + PORT));
