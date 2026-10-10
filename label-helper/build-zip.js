// Packt das Label-Hilfsprogramm als ZIP für den Download in der KSG: node label-helper/build-zip.js
// (kleiner ZIP-Schreiber ohne Abhängigkeiten, Dateien unkomprimiert abgelegt)
'use strict';
const fs = require('fs');
const path = require('path');

const DATEIEN = ['ks-label-helper.ps1', 'Start-Label-Helper.cmd', 'LIES-MICH.txt'];
const ZIEL = path.join(__dirname, '..', 'public', 'downloads', 'ks-label-helper.zip');

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = buf => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

const zeit = new Date(2026, 0, 1);
const dosZeit = ((zeit.getHours() << 11) | (zeit.getMinutes() << 5) | (zeit.getSeconds() >> 1)) & 0xffff;
const dosDatum = (((zeit.getFullYear() - 1980) << 9) | ((zeit.getMonth() + 1) << 5) | zeit.getDate()) & 0xffff;

const lokal = [], zentral = [];
let offset = 0;
for (const name of DATEIEN) {
  let daten = fs.readFileSync(path.join(__dirname, name));
  if (/\.(cmd|txt)$/i.test(name)) daten = Buffer.from(daten.toString('utf8').replace(/\r?\n/g, '\r\n'), 'utf8');   // Windows-Zeilenenden
  const n = Buffer.from(name, 'utf8'), crc = crc32(daten);
  const kopf = Buffer.alloc(30);
  kopf.writeUInt32LE(0x04034b50, 0); kopf.writeUInt16LE(20, 4); kopf.writeUInt16LE(0x0800, 6); kopf.writeUInt16LE(0, 8);
  kopf.writeUInt16LE(dosZeit, 10); kopf.writeUInt16LE(dosDatum, 12); kopf.writeUInt32LE(crc, 14);
  kopf.writeUInt32LE(daten.length, 18); kopf.writeUInt32LE(daten.length, 22); kopf.writeUInt16LE(n.length, 26); kopf.writeUInt16LE(0, 28);
  lokal.push(kopf, n, daten);
  const z = Buffer.alloc(46);
  z.writeUInt32LE(0x02014b50, 0); z.writeUInt16LE(20, 4); z.writeUInt16LE(20, 6); z.writeUInt16LE(0x0800, 8); z.writeUInt16LE(0, 10);
  z.writeUInt16LE(dosZeit, 12); z.writeUInt16LE(dosDatum, 14); z.writeUInt32LE(crc, 16); z.writeUInt32LE(daten.length, 20); z.writeUInt32LE(daten.length, 24);
  z.writeUInt16LE(n.length, 28); z.writeUInt32LE(offset, 42);
  zentral.push(z, n);
  offset += kopf.length + n.length + daten.length;
}
const zentralBuf = Buffer.concat(zentral);
const ende = Buffer.alloc(22);
ende.writeUInt32LE(0x06054b50, 0); ende.writeUInt16LE(DATEIEN.length, 8); ende.writeUInt16LE(DATEIEN.length, 10);
ende.writeUInt32LE(zentralBuf.length, 12); ende.writeUInt32LE(offset, 16);
fs.mkdirSync(path.dirname(ZIEL), { recursive: true });
fs.writeFileSync(ZIEL, Buffer.concat([...lokal, zentralBuf, ende]));
console.log('geschrieben:', ZIEL);
