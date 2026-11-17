@echo off
rem Startet den Offline-Spiegel (sync-mirror.js) fuer die Windows-Aufgabenplanung und schreibt Ausgaben ins Log.
rem Aufgabe: Programm conhost.exe, Argumente: --headless "<Projektordner>\tools\sync-mirror-task.cmd"
cd /d "%~dp0.."
"C:\Program Files\nodejs\node.exe" sync-mirror.js >> sync-mirror.log 2>&1
