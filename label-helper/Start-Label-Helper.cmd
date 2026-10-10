@echo off
rem Startet das Label-Hilfsprogramm fuer den Brother PT-P700. Fenster offen lassen (oder minimieren), solange gedruckt werden soll.
rem Testlauf ohne Drucker: Start-Label-Helper.cmd -Trocken
cd /d "%~dp0"
title Label-Hilfsprogramm
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ks-label-helper.ps1" %*
pause
