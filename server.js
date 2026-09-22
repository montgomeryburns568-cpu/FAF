// Lokaler Dev-Einstiegspunkt. Auf Vercel wird stattdessen api/[...all].js verwendet,
// das dieselbe App (server-app.js) importiert - kein eigener Server dort noetig.
const path = require('path');
const express = require('express');
const app = require('./server-app');

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Küchensheet-Generator läuft auf http://localhost:${PORT}`);
});
