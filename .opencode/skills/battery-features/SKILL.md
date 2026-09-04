---
name: battery-features
description: Desarrollo de funcionalidades de batería y monitoreo. Usar cuando se necesite implementar o modificar funcionalidades relacionadas con el estado de batería, alertas o notificaciones.
---

# Battery Features Skill

## Arquitectura del Sistema

### Flujo de Datos
```
BatteryStatus (plugin nativo)
    ↓
BatteryProvider (servicio)
    ↓
BatteryPage (componente)
    ↓
UI (template)
```

### Componentes Principales

#### BatteryProvider (`src/app/providers/battery.provider.ts`)
- Servicio singleton (`providedIn: 'root'`)
- Envuelve BatteryStatus plugin
- Mantiene estado de batería
- Expone observable de cambios

#### BatteryPage (`src/app/pages/battery/battery.page.ts`)
- Página principal de la app
- Muestra nivel de batería
- Controla alarmas y notificaciones
- Gestiona sonidos y vibración

#### ConfigHelper (`src/app/helpers/config.helper.ts`)
- Gestiona configuración de sonidos
- Almacena niveles de alarma
- Controla estado de alarmas

### Modelos

#### Battery (`src/app/models/battery.model.ts`)
```typescript
export class Battery {
  level: number;      // 0-100
  isPlugged: boolean; // true si está cargando
  // ... otros campos de evento
}
```

## Funcionalidades Existentes

### 1. Monitoreo de Batería
- Suscripción a cambios de nivel
- Visualización de estado (conectado/desconectado)
- Indicador visual con spinner

### 2. Sistema de Alarmas
- Nivel bajo (default: 20%) → "Por favor conecte su celular"
- Nivel alto (default: 80%) → "Por favor desconecte su celular"
- Toggle para activar/desactivar alarmas

### 3. Notificaciones
- LocalNotifications de Capacitor
- Notificación básica y avanzada
- Permisos de usuario requeridos

### 4. Sonidos
- 11 sonidos disponibles en assets/sounds/
- Selección de sonido activo
- Control de volumen del dispositivo

### 5. Vibración
- Vibración al activar alarma
- Patrón: [2000, 500, 1000] ms

### 6. Background Mode
- Wake-up al cambiar nivel de batería
- Mantiene app activa en segundo plano

## Convenciones de Desarrollo

### Nuevo Componente
```typescript
// 1. Crear archivo .ts
@Component({
  selector: 'app-mi-componente',
  templateUrl: './mi-componente.page.html',
  styleUrls: ['./mi-componente.page.scss'],
})
export class MiComponentePage implements OnInit {
  constructor(
    private batteryProvider: BatteryProvider,
    private configHelper: ConfigHelper
  ) {}

  ngOnInit() {}
}

// 2. Crear archivo .html
<ion-header>
  <ion-toolbar>
    <ion-title>Mi Componente</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content>
  <!-- Contenido -->
</ion-content>

// 3. Crear archivo .scss
// Estilos específicos del componente
```

### Nuevo Servicio
```typescript
@Injectable({ providedIn: 'root' })
export class MiServicio {
  constructor(
    private batteryProvider: BatteryProvider
  ) {}

  miMetodo() {
    const status = this.batteryProvider.getStatusBattery();
    // Lógica
  }
}
```

### Integración con Plugins Nativos
```typescript
import { Plugins } from '@capacitor/core';
const { MiPlugin } = Plugins;

async miMetodo() {
  try {
    await MiPlugin.accion();
  } catch (err) {
    console.log('Error:', err);
    // Manejar error
  }
}
```

## Flujo de Desarrollo

### 1. Nueva Funcionalidad
1. Crear modelo si es necesario
2. Crear servicio/provider
3. Crear componente/página
4. Integrar con plugins nativos
5. Escribir tests
6. Actualizar documentación

### 2. Modificar Funcionalidad
1. Identificar componente afectado
2. Revisar dependencias
3. Implementar cambios
4. Ejecutar tests existentes
5. Agregar tests nuevos si es necesario

### 3. Bug Fix
1. Reproducir el bug
2. Identificar causa raíz
3. Implementar fix
4. Agregar test que cubra el caso
5. Verificar que no regresa

## Plugins Nativos Disponibles

### BatteryStatus
```typescript
import { BatteryStatus } from '@ionic-native/battery-status/ngx';

// Observar cambios
this.batteryStatus.onChange().subscribe((status: Battery) => {
  console.log(status.level, status.isPlugged);
});
```

### BackgroundMode
```typescript
import { BackgroundMode } from '@ionic-native/background-mode/ngx';

// Activar modo segundo plano
this.backgroundMode.enable();

// Despertar app
this.backgroundMode.wakeUp();
```

### AudioManagement
```typescript
import { AudioManagement } from '@ionic-native/audio-management/ngx';

// Obtener volumen
const vol = await this.audioManagement.getVolume(AudioManagement.VolumeType.MUSIC);

// Establecer volumen
await this.audioManagement.setVolume(AudioManagement.VolumeType.MUSIC, nivel);
```

### Vibration
```typescript
import { Vibration } from '@ionic-native/vibration/ngx';

// Vibrar
this.vibration.vibrate([2000, 500, 1000]);
```

### LocalNotifications
```typescript
import { Plugins } from '@capacitor/core';
const { LocalNotifications } = Plugins;

// Solicitar permiso
await LocalNotifications.requestPermission();

// Programar notificación
await LocalNotifications.schedule({
  notifications: [{
    title: "Alerta",
    body: "Mensaje",
    id: 1
  }]
});
```

## Errores Comunes

### "Plugin not available"
- Solo funciona en device/emulator
- Verificar que el plugin está instalado en Capacitor

### "Permission denied"
- Solicitar permiso antes de usar
- LocalNotifications requiere `requestPermission()`

### "Background mode not working"
- Verificar que está habilitado en config
- Algunos dispositivos requieren configuración adicional
