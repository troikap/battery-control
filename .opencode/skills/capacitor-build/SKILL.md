---
name: capacitor-build
description: Build y deploy de aplicación Ionic para Android usando Capacitor. Usar cuando se necesite compilar, sincronizar o abrir el proyecto en Android Studio.
---

# Capacitor Build Skill

## Comandos Principales

### Build de Producción
```bash
ng build --configuration production
```
- Genera www/ con optimizaciones
- Reemplaza environment.ts por environment.prod.ts
- Habilita AOT, tree shaking, minificación

### Sincronizar con Capacitor
```bash
npx cap sync android
```
- Copia www/ a android/app/src/main/assets/public
- Sincroniza plugins nativos
- Actualiza dependencias de Android

### Abrir en Android Studio
```bash
npx cap open android
```
- Abre el proyecto en Android Studio
- Permite debug y deploy a device/emulator

## Flujo Completo de Build
```bash
# 1. Limpiar builds anteriores
rm -rf www/
rm -rf android/app/src/main/assets/public/

# 2. Build de producción
ng build --configuration production

# 3. Sincronizar con Capacitor
npx cap sync android

# 4. Verificar que www/ existe
ls -la www/
```

## Estructura de Archivos
```
battery-control/
├── www/                    # Build output (generado por ng build)
├── android/
│   └── app/
│       └── src/
│           └── main/
│               └── assets/
│                   └── public/  # Copia de www/
├── capacitor.config.json   # Configuración Capacitor
└── angular.json           # Configuración Angular build
```

## Configuración Importante

### capacitor.config.json
```json
{
  "appId": "io.ionic.starter",
  "appName": "battery-control",
  "webDir": "www",
  "plugins": {
    "SplashScreen": { "launchShowDuration": 0 },
    "LocalNotifications": {
      "smallIcon": "ic_launcher_round",
      "iconColor": "#a9c1ae"
    }
  }
}
```

### angular.json (build output)
```json
{
  "architect": {
    "build": {
      "options": {
        "outputPath": "www"
      }
    }
  }
}
```

## Errores Comunes

### Error: "www/ not found"
- Ejecutar `ng build` primero
- Verificar que `angular.json` tiene `"outputPath": "www"`

### Error: "Plugins not synced"
- Ejecutar `npx cap sync android`
- Verificar que los plugins están en `capacitor.config.json`

### Error: "Android build failed"
- Verificar que Android Studio está instalado
- Ejecutar `npx cap open android` y sincronizar desde Android Studio

## Notas Importantes
- Los plugins nativos solo funcionan en device/emulator
- El build de producción deshabilita source maps
- El tamaño máximo del bundle es 5MB (configurado en angular.json)
- Los plugins Cordova (@ionic-native) requieren sincronización con Capacitor
