# Label-Hilfsprogramm fuer den Brother PT-P700 (Kuechensheet-Generator).
# Laeuft auf dem PC, an dem der Drucker haengt. Die KSG-Seite im Browser schickt das Label als Schwarz-Weiss-Bild an
# http://127.0.0.1:9101/print ; dieses Skript baut daraus die Raster-Befehle (Brother "Raster Command Reference PT-P700")
# und gibt sie unveraendert an die Windows-Druckerwarteschlange. Keine Installation noetig, nur Windows PowerShell.
# Start: Start-Label-Helper.cmd  (Fenster offen lassen oder minimieren)
param(
  [int]$Port = 9101,
  [string]$Drucker = '',          # leer = Brother PT-Drucker automatisch suchen
  [string]$ZusaetzlicheOrigin = '',   # z.B. https://ksg.meine-domain.de
  [switch]$Trocken                # nichts drucken, nur letzter-druck.prn schreiben
)
$ErrorActionPreference = 'Stop'
$script:Ordner = Split-Path -Parent $MyInvocation.MyCommand.Path
$script:Origins = @('https://kuechensheet-generator.vercel.app')
if ($ZusaetzlicheOrigin) { $script:Origins += $ZusaetzlicheOrigin.TrimEnd('/') }

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class RawDruck {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO { [MarshalAs(UnmanagedType.LPWStr)] public string pDocName; [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile; [MarshalAs(UnmanagedType.LPWStr)] public string pDataType; }
  [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)] public static extern bool OpenPrinter(string n, out IntPtr h, IntPtr d);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)] public static extern int StartDocPrinter(IntPtr h, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFO di);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool WritePrinter(IntPtr h, byte[] b, int n, out int w);
  public static void Senden(string drucker, byte[] daten) {
    IntPtr h;
    if (!OpenPrinter(drucker, out h, IntPtr.Zero)) throw new Exception("Drucker nicht gefunden: " + drucker + " (Fehler " + Marshal.GetLastWin32Error() + ")");
    try {
      DOCINFO di = new DOCINFO(); di.pDocName = "Kuechensheet Label"; di.pDataType = "RAW";
      if (StartDocPrinter(h, 1, di) == 0) throw new Exception("StartDoc fehlgeschlagen (" + Marshal.GetLastWin32Error() + ")");
      try {
        StartPagePrinter(h);
        int w;
        if (!WritePrinter(h, daten, daten.Length, out w) || w != daten.Length) throw new Exception("Schreiben fehlgeschlagen (" + Marshal.GetLastWin32Error() + ")");
        EndPagePrinter(h);
      } finally { EndDocPrinter(h); }
    } finally { ClosePrinter(h); }
  }
}
'@

# ---------- Brother-Raster-Befehle ----------
# Pins links vom bedruckbaren Bereich und bedruckbare Pins je Bandbreite (128 Pins, Handbuch 2.3.5)
$script:Band = @{ 6 = @(48, 32); 9 = @(39, 50); 12 = @(29, 70); 18 = @(8, 112); 24 = @(0, 128) }
$script:MinRand = 14   # 2 mm Mindest-Vorschub (ESC i d)

function New-Job([byte[]]$daten, [int]$breite, [int]$hoehe, [int]$bandMm, [int]$anzahl, [int]$rand, [bool]$schneiden, [bool]$spX, [bool]$spY, [string]$variante, [int]$pads, [string]$ende) {
  if (-not $script:Band.ContainsKey($bandMm)) { throw "Bandbreite nicht unterstuetzt: $bandMm" }
  $links = $script:Band[$bandMm][0]; $druck = $script:Band[$bandMm][1]
  if ($breite -gt $druck) { throw "Bild ist $breite Pixel breit, das Band druckt nur $druck" }
  $stride = [int][math]::Ceiling($breite / 8)
  if ($daten.Length -ne $stride * $hoehe) { throw 'Bilddaten passen nicht zur angegebenen Groesse' }
  # Rasterzeilen einmal berechnen (null = leere Zeile)
  $zeilen = New-Object 'object[]' $hoehe
  for ($y = 0; $y -lt $hoehe; $y++) {
    $yy = if ($spY) { $hoehe - 1 - $y } else { $y }
    $z = New-Object 'byte[]' 16; $leer = $true
    for ($x = 0; $x -lt $breite -and $x -lt $druck; $x++) {
      $xx = if ($spX) { $breite - 1 - $x } else { $x }
      if ($daten[$yy * $stride + ($xx -shr 3)] -band (0x80 -shr ($xx -band 7))) {
        $pin = $links + $x
        $z[$pin -shr 3] = [byte]($z[$pin -shr 3] -bor (0x80 -shr ($pin -band 7)))
        $leer = $false
      }
    }
    if (-not $leer) { $zeilen[$y] = $z }
  }
  $ms = New-Object System.IO.MemoryStream
  $w = { param($b) $ms.Write([byte[]]$b, 0, ([byte[]]$b).Length) }
  # Schnitt-Verfahren (gegen leere Zusatz-Labels):
  #   standard = ein Auftrag, automatischer Schnitt nur zwischen den Labels; das letzte wird am Ende vorgeschoben und geschnitten (wie im Brother-Beispiel)
  #   einzeln  = jedes Label als eigener Auftrag, Schnitt durch den Vorschub am Ende
  #   alt      = ein Auftrag, automatischer Schnitt bei jedem Label (erste Version)
  #   serie    = ein Auftrag mit $anzahl Labels plus $pads leeren Seiten am Ende. Das Messer sitzt 24,5 mm hinter dem Druckkopf; ist die Seitenlaenge
  #              (Zeilen + 2 Raender) genau 24,5 mm / $pads, schneidet jeder Schnitt zwischen zwei Seiten: erst das Leerstueck vom Anfang, dann
  #              jedes Label einzeln. Automatischer Schnitt ab der $pads-ten Seite. Die leeren Seiten bleiben im Drucker (Leerstueck fuer den naechsten Auftrag).
  $einzeln = ($variante -eq 'einzeln')
  $serie = ($variante -eq 'serie' -and $pads -gt 0)
  $gesamt = if ($serie) { $anzahl + $pads } else { $anzahl }
  if (-not $einzeln) { & $w (New-Object 'byte[]' 100); & $w @(0x1b, 0x40) }   # 100 Leerbefehle, Initialisierung
  for ($i = 0; $i -lt $gesamt; $i++) {
    $letzte = ($i -eq $gesamt - 1)
    if ($einzeln) { & $w (New-Object 'byte[]' 100); & $w @(0x1b, 0x40) }
    $auto = if ($serie) { ($i + 1) -ge $pads } else { switch ($variante) { 'alt' { $schneiden } 'einzeln' { $false } default { $schneiden -and -not $letzte } } }
    $kette = ($serie -and $letzte -and $ende -ne 'feed')   # Kettendruck: letzte Seite nicht vorschieben/schneiden
    & $w @(0x1b, 0x69, 0x61, 0x01)      # Rastermodus
    & $w @(0x1b, 0x69, 0x7a, 0x84, 0x00, $bandMm, 0x00, ($hoehe -band 255), (($hoehe -shr 8) -band 255), 0, 0, $(if ($einzeln -or $i -eq 0) { 0 } else { 1 }), 0)   # Druckinfo
    & $w @(0x1b, 0x69, 0x4d, $(if ($auto) { 0x40 } else { 0x00 }))   # automatisch schneiden
    & $w @(0x1b, 0x69, 0x4b, $(if ($kette) { 0x00 } else { 0x08 }))   # 0x08 = kein Kettendruck (letzte Seite wird vorgeschoben und geschnitten)
    & $w @(0x1b, 0x69, 0x64, ($rand -band 255), (($rand -shr 8) -band 255))   # Rand vorn/hinten
    & $w @(0x4d, 0x02)                  # TIFF-Modus (Zeilen als Literal)
    for ($y = 0; $y -lt $hoehe; $y++) {
      if ($serie -and $i -ge $anzahl) { & $w @(0x5a) }   # leere Seite
      elseif ($null -eq $zeilen[$y]) { & $w @(0x5a) } else { & $w @(0x47, 0x11, 0x00, 0x0f); & $w $zeilen[$y] }
    }
    & $w @($(if ($einzeln -or $letzte) { 0x1a } else { 0x0c }))   # 0x0C Seite fertig, 0x1A letzte Seite + auswerfen
  }
  return , $ms.ToArray()
}

function Get-Drucker {
  if ($Drucker) { return $Drucker }
  $p = Get-Printer | Where-Object { $_.Name -match 'PT-?P700|P-?touch|^Brother PT' } | Select-Object -First 1
  if ($p) { return $p.Name } else { return '' }
}

function Invoke-Druck($p) {
  $bandMm = if ($p.bandMm) { [int]$p.bandMm } else { 12 }
  $anzahl = [math]::Max(1, [math]::Min(99, [int]$p.anzahl))
  $hoehe = [int]$p.hoehe; $breite = [int]$p.breite
  if ($hoehe -lt 1 -or $hoehe -gt 1000 -or $breite -lt 1) { throw 'Ungueltige Labelgroesse' }
  $rand = if ($null -ne $p.rand) { [math]::Max($script:MinRand, [math]::Min(255, [int]$p.rand)) } else { $script:MinRand }
  $daten = [Convert]::FromBase64String([string]$p.daten)
  $job = New-Job $daten $breite $hoehe $bandMm $anzahl $rand ($p.schneiden -ne $false) ([bool]$p.spiegelX) ([bool]$p.spiegelY) ([string]$p.schnitt) ([math]::Max(0, [math]::Min(4, [int]$p.pads))) ([string]$p.ende)
  if ($Trocken) {
    $datei = Join-Path $script:Ordner 'letzter-druck.prn'
    [System.IO.File]::WriteAllBytes($datei, $job)
    return @{ ok = $true; trocken = $true; bytes = $job.Length; labels = $anzahl }
  }
  $name = Get-Drucker
  if (-not $name) { throw 'Kein Brother PT-Drucker gefunden. Ist er angeschlossen, eingeschaltet (Schalter P-Lite auf AUS) und der Treiber installiert?' }
  [RawDruck]::Senden($name, $job)
  return @{ ok = $true; drucker = $name; bytes = $job.Length; labels = $anzahl }
}

# ---------- kleiner HTTP-Server (nur 127.0.0.1) ----------
function Test-Origin([string]$o) {
  if (-not $o) { return $false }
  if ($script:Origins -contains $o) { return $true }
  return [bool]($o -match '^http://(localhost|127\.0\.0\.1)(:\d+)?$')
}
function Send-Antwort($stream, [int]$code, $obj, [string]$origin, [bool]$preflight) {
  $text = @{ 200 = 'OK'; 204 = 'No Content'; 403 = 'Forbidden'; 404 = 'Not Found'; 500 = 'Internal Server Error' }[$code]
  $body = [byte[]]@()
  if (-not $preflight -and $null -ne $obj) { $body = [System.Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Compress -Depth 4)) }
  $h = "HTTP/1.1 $code $text`r`nContent-Type: application/json; charset=utf-8`r`nCache-Control: no-store`r`nConnection: close`r`n"
  if (Test-Origin $origin) {
    $h += "Access-Control-Allow-Origin: $origin`r`nVary: Origin`r`nAccess-Control-Allow-Private-Network: true`r`n"
    if ($preflight) { $h += "Access-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type, X-KS-Label`r`nAccess-Control-Max-Age: 600`r`n" }
  }
  $h += "Content-Length: $($body.Length)`r`n`r`n"
  $hb = [System.Text.Encoding]::ASCII.GetBytes($h)
  $stream.Write($hb, 0, $hb.Length)
  if ($body.Length) { $stream.Write($body, 0, $body.Length) }
  $stream.Flush()
}
function Read-Anfrage($stream) {
  $buf = New-Object 'byte[]' 65536
  $ms = New-Object System.IO.MemoryStream
  $kopfEnde = -1
  while ($kopfEnde -lt 0) {
    $n = $stream.Read($buf, 0, $buf.Length)
    if ($n -le 0) { return $null }
    $ms.Write($buf, 0, $n)
    if ($ms.Length -gt 4MB) { return $null }
    $t = [System.Text.Encoding]::ASCII.GetString($ms.ToArray())
    $kopfEnde = $t.IndexOf("`r`n`r`n")
  }
  $alles = $ms.ToArray()
  $kopf = [System.Text.Encoding]::ASCII.GetString($alles, 0, $kopfEnde)
  $zeilen = $kopf -split "`r`n"
  $teile = $zeilen[0] -split ' '
  $hd = @{}
  foreach ($z in $zeilen[1..($zeilen.Count - 1)]) { $i = $z.IndexOf(':'); if ($i -gt 0) { $hd[$z.Substring(0, $i).Trim().ToLower()] = $z.Substring($i + 1).Trim() } }
  $laenge = if ($hd.ContainsKey('content-length')) { [int]$hd['content-length'] } else { 0 }
  if ($laenge -gt 2MB) { return $null }
  $bodyStart = $kopfEnde + 4
  while (($alles.Length - $bodyStart) -lt $laenge) {
    $n = $stream.Read($buf, 0, $buf.Length)
    if ($n -le 0) { break }
    $ms.Write($buf, 0, $n); $alles = $ms.ToArray()
  }
  $body = if ($laenge -gt 0) { [System.Text.Encoding]::UTF8.GetString($alles, $bodyStart, [math]::Min($laenge, $alles.Length - $bodyStart)) } else { '' }
  return @{ methode = $teile[0]; pfad = $teile[1]; header = $hd; body = $body }
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Parse('127.0.0.1'), $Port)
try { $listener.Start() } catch { Write-Host "Port $Port ist schon belegt - laeuft das Hilfsprogramm bereits?" -ForegroundColor Red; exit 1 }
Write-Host "Label-Hilfsprogramm laeuft auf http://127.0.0.1:$Port$(if ($Trocken) { ' (Trockenlauf: es wird nichts gedruckt)' })"
Write-Host 'Fenster offen lassen. Beenden mit Strg+C oder Fenster schliessen.'
while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $client.ReceiveTimeout = 5000
    $stream = $client.GetStream()
    $r = Read-Anfrage $stream
    if ($null -eq $r) { continue }
    $origin = [string]$r.header['origin']
    $ok = Test-Origin $origin
    if ($r.methode -eq 'OPTIONS') { Send-Antwort $stream $(if ($ok) { 204 } else { 403 }) @{ ok = $false } $origin $true; continue }
    if (-not $ok -or $r.header['x-ks-label'] -ne '1') { Send-Antwort $stream 403 @{ ok = $false; fehler = 'Herkunft nicht erlaubt' } $origin $false; continue }
    try {
      if ($r.methode -eq 'GET' -and $r.pfad -eq '/status') {
        $name = Get-Drucker
        $alle = @(Get-Printer | ForEach-Object { $_.Name })
        Send-Antwort $stream 200 @{ ok = $true; trocken = [bool]$Trocken; drucker = $name; gefunden = ([bool]$name -or [bool]$Trocken); alleDrucker = $alle } $origin $false
      } elseif ($r.methode -eq 'POST' -and $r.pfad -eq '/print') {
        $res = Invoke-Druck ($r.body | ConvertFrom-Json)
        Write-Host ("{0:HH:mm:ss}  {1} Label(s) gedruckt" -f (Get-Date), $res.labels)
        Send-Antwort $stream 200 $res $origin $false
      } else { Send-Antwort $stream 404 @{ ok = $false; fehler = 'unbekannt' } $origin $false }
    } catch {
      Write-Host ("Fehler: " + $_.Exception.Message) -ForegroundColor Red
      Send-Antwort $stream 500 @{ ok = $false; fehler = $_.Exception.Message } $origin $false
    }
  } catch { Write-Host ("Verbindungsfehler: " + $_.Exception.Message) -ForegroundColor DarkYellow }
  finally { $client.Close() }
}
