---
description: Build completo para Android con Capacitor
---

Ejecuta el build de producción y sincroniza con Capacitor:

```bash
ng build --configuration production
npx cap sync android
```

## Flujo Completo

### 1. Limpiar builds anteriores (opcional)
```bash
rm -rf www/
rm -rf android/app/src/main/assets/public/
```

### 2. Build de producción
```bash
ng build --configuration production
```
- Genera www/ con optimizaciones
- AOT habilitado
- Tree shaking y minificación
- Source maps deshabilitados

### 3. Sincronizar con Capacitor
```bash
npx cap sync android
```
- Copia www/ a android/app/src/main/assets/public/
- Sincroniza plugins nativos
- Actualiza dependencias de Android

### 4. Abrir en Android Studio (opcional)
```bash
npx cap open android
```

## Verificación
- Verificar que www/ existe después del build
- Verificar que android/app/src/main/assets/public/ tiene contenido
- Probar en device/emulator

## Errores Comunes
- "www/ not found": Ejecutar ng build primero
- "Plugins not synced": Ejecutar npx cap sync android
- "Android build failed": Verificar Android Studio instalado
