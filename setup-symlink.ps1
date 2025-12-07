# Script zum Erstellen eines Junction Points vom dist Ordner zum FoundryVTT Module Verzeichnis

$foundryModulesPath = "C:\Users\Mikey\AppData\Local\FoundryVTT\Data\modules"
$moduleName = "loot-slot-machine"
$distPath = Join-Path $PSScriptRoot "dist"
$symlinkPath = Join-Path $foundryModulesPath $moduleName

Write-Host "=== FoundryVTT Module Symlink Setup ===" -ForegroundColor Cyan
Write-Host "Foundry Modules Path: $foundryModulesPath"
Write-Host "Dist Path: $distPath"
Write-Host "Symlink Path: $symlinkPath"
Write-Host ""

# Prüfe ob dist Ordner existiert
if (-not (Test-Path $distPath)) {
  Write-Host "FEHLER: Dist Ordner existiert nicht: $distPath" -ForegroundColor Red
  Write-Host "Bitte führe zuerst 'pnpm build' aus." -ForegroundColor Yellow
  exit 1
}

# Erstelle Foundry Modules Verzeichnis falls es nicht existiert
if (-not (Test-Path $foundryModulesPath)) {
  Write-Host "Erstelle Foundry Modules Verzeichnis..." -ForegroundColor Yellow
  New-Item -ItemType Directory -Path $foundryModulesPath -Force | Out-Null
}

# Entferne existierenden Pfad falls vorhanden
if (Test-Path $symlinkPath) {
  Write-Host "Entferne existierenden Pfad..." -ForegroundColor Yellow
  Remove-Item $symlinkPath -Force -Recurse
}

# Erstelle Junction Point
Write-Host "Erstelle Junction Point..." -ForegroundColor Yellow
try {
  cmd /c mklink /J "$symlinkPath" "$distPath" | Out-Null
  Write-Host "Junction Point erfolgreich erstellt!" -ForegroundColor Green
  Write-Host "Symlink: $symlinkPath -> $distPath" -ForegroundColor Green
}
catch {
  Write-Host "FEHLER beim Erstellen des Junction Points: $_" -ForegroundColor Red
  exit 1
}

