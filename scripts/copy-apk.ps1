# copy-apk.ps1
# Copia el APK generado a la carpeta builds/ con nombre basado en version y timestamp

param(
    [string]$BuildType = "debug"
)

$ErrorActionPreference = "Stop"

# Leer version del package.json
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$version = $packageJson.version

# Generar timestamp (YYYYMMDD-HHmmss)
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# Definir rutas
$apkSource = "android\app\build\outputs\apk\$BuildType\app-$BuildType.apk"
$apkDir = "builds"

# Crear carpeta builds si no existe
if (-not (Test-Path $apkDir)) {
    New-Item -ItemType Directory -Path $apkDir -Force | Out-Null
    Write-Host "Carpeta 'builds' creada." -ForegroundColor Green
}

# Verificar que el APK existe
if (-not (Test-Path $apkSource)) {
    Write-Host "ERROR: No se encontro el APK en: $apkSource" -ForegroundColor Red
    Write-Host "Asegurate de ejecutar el build primero." -ForegroundColor Yellow
    exit 1
}

# Construir nombre del archivo
$apkName = "battery-control-v$version-$timestamp-$BuildType.apk"
$apkDestination = Join-Path $apkDir $apkName

# Copiar APK
Copy-Item -Path $apkSource -Destination $apkDestination -Force

# Mostrar resultado
$apkSize = (Get-Item $apkDestination).Length / 1MB
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  APK COPIADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Archivo: $apkName" -ForegroundColor White
Write-Host "  Tamaño:  $([math]::Round($apkSize, 2)) MB" -ForegroundColor White
Write-Host "  Ruta:    $apkDestination" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
