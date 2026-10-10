@echo off
rem Startet das Label-Hilfsprogramm fuer den Brother PT-P700. Fenster offen lassen (oder minimieren), solange gedruckt werden soll.
rem Testlauf ohne Drucker: Start-Label-Helper.cmd -Trocken
cd /d "%~dp0"
title Label-Hilfsprogramm
if not exist "%~dp0ks-label-helper.ps1" (
  echo.
  echo  Die Datei ks-label-helper.ps1 liegt nicht neben dieser Startdatei.
  echo  Das passiert, wenn man die Startdatei direkt aus der ZIP-Datei oeffnet.
  echo.
  echo  Bitte zuerst die ZIP entpacken:
  echo    ZIP-Datei mit der rechten Maustaste anklicken ^> "Alle extrahieren" ^> Extrahieren
  echo  und dann Start-Label-Helper.cmd aus dem entpackten Ordner starten.
  echo.
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ks-label-helper.ps1" %*
pause
