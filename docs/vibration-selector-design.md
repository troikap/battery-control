# Diseño: Selector de Vibración

## Visión General
Agregar un selector de patrones de vibración similar al selector de sonido existente, permitiendo al usuario elegir entre diferentes patrones predefinidos con persistencia en Preferences.

---

## 1. Modelo de Vibración

### Archivo: `src/app/models/vibration.model.ts`

```typescript
export interface VibrationPattern {
  id: number;
  name: string;
  description: string;
  pattern: number[];
  icon: string;
}
```

### Estructura de Datos
Cada patrón contiene:
- `id`: Identificador único numérico
- `name`: Nombre descriptivo del patrón
- `description`: Descripción breve de la intensidad
- `pattern`: Array de números [vibrar, pausa, vibrar, pausa, ...] en milisegundos
- `icon`: Nombre del icono Ionic para mostrar en la lista

---

## 2. Patrones Predefinidos

### Catálogo de 6 Patrones

| ID | Nombre | Descripción | Pattern (ms) | Icono | Uso Recomendado |
|----|--------|-------------|--------------|-------|-----------------|
| 1 | Suave | Vibración corta y discreta | [200] | `phone-portrait` | Notificaciones leves |
| 2 | Corto | Dos vibraciones rápidas | [150, 100, 150] | `vibrate` | Alertas normales |
| 3 | Moderado | Patrón medio con pausa | [300, 200, 300] | `pulse` | Alarmas estándar |
| 4 | Largo | Vibración extendida | [500, 300, 500] | `notifications` | Alertas importantes |
| 5 | Intensivo | Tres pulsos fuertes | [400, 200, 400, 200, 400] | `alert-circle` | Alarmas críticas |
| 6 | Emergencia | Patrón continuo y largo | [1000, 500, 1000, 500, 1000] | `warning` | Situaciones urgentes |

### Código de Patrones

```typescript
private vibrationPatterns: VibrationPattern[] = [
  {
    id: 1,
    name: 'Suave',
    description: 'Vibración corta y discreta',
    pattern: [200],
    icon: 'phone-portrait'
  },
  {
    id: 2,
    name: 'Corto',
    description: 'Dos vibraciones rápidas',
    pattern: [150, 100, 150],
    icon: 'vibrate'
  },
  {
    id: 3,
    name: 'Moderado',
    description: 'Patrón medio con pausa',
    pattern: [300, 200, 300],
    icon: 'pulse'
  },
  {
    id: 4,
    name: 'Largo',
    description: 'Vibración extendida',
    pattern: [500, 300, 500],
    icon: 'notifications'
  },
  {
    id: 5,
    name: 'Intensivo',
    description: 'Tres pulsos fuertes',
    pattern: [400, 200, 400, 200, 400],
    icon: 'alert-circle'
  },
  {
    id: 6,
    name: 'Emergencia',
    description: 'Patrón continuo y largo',
    pattern: [1000, 500, 1000, 500, 1000],
    icon: 'warning'
  }
];
```

---

## 3. Modificaciones en ConfigHelper

### Archivo: `src/app/helpers/config.helper.ts`

#### 3.1 Nueva Key de Persistencia

```typescript
private static readonly KEYS = {
  SOUND: 'battery_sound',
  ALARM: 'battery_alarm_activated',
  NIVEL: 'battery_nivel',
  VIBRATION: 'battery_vibration',  // NUEVA
};
```

#### 3.2 Propiedades Privadas

```typescript
// NUEVAS propiedades
private vibrationPatterns: VibrationPattern[] = [ /* ... patrones ... */ ];
private vibrationSelected: VibrationPattern = this.vibrationPatterns[2]; // Moderado por defecto
```

#### 3.3 Métodos de Persistencia

```typescript
private async saveVibration(): Promise<void> {
  try {
    await Preferences.set({
      key: ConfigHelper.KEYS.VIBRATION,
      value: JSON.stringify(this.vibrationSelected),
    });
  } catch (err) {
    console.warn('ConfigHelper: error saving vibration to Preferences', err);
  }
}
```

#### 3.4 Métodos Públicos

```typescript
// ---------------------------------------------------------------------------
// Vibration patterns
// ---------------------------------------------------------------------------

public getVibrationPatterns(): VibrationPattern[] {
  return this.vibrationPatterns;
}

public getVibration(): VibrationPattern {
  return this.vibrationSelected;
}

public setVibration(vibration: VibrationPattern): void {
  this.vibrationSelected = vibration;
  this.saveVibration();
}

public getVibrationPattern(): number[] {
  return this.vibrationSelected.pattern;
}
```

#### 3.5 Actualizar loadFromStorage()

```typescript
private async loadFromStorage(): Promise<void> {
  try {
    const [soundResult, alarmResult, nivelResult, vibrationResult] = await Promise.all([
      Preferences.get({key: ConfigHelper.KEYS.SOUND}),
      Preferences.get({key: ConfigHelper.KEYS.ALARM}),
      Preferences.get({key: ConfigHelper.KEYS.NIVEL}),
      Preferences.get({key: ConfigHelper.KEYS.VIBRATION}),  // NUEVA
    ]);

    if (soundResult.value) {
      this.soundSelected = JSON.parse(soundResult.value);
    }
    if (alarmResult.value) {
      this.isActivatedAlarm = JSON.parse(alarmResult.value);
    }
    if (nivelResult.value) {
      this.nivel = JSON.parse(nivelResult.value);
    }
    if (vibrationResult.value) {  // NUEVO
      this.vibrationSelected = JSON.parse(vibrationResult.value);
    }
  } catch (err) {
    console.warn('ConfigHelper: error loading config from Preferences, using defaults', err);
  } finally {
    this.loaded = true;
  }
}
```

---

## 4. Modal de Vibración

### 4.1 Estructura de Archivos

```
src/app/pages/modals/vibration/
├── vibration.component.ts
├── vibration.component.html
├── vibration.component.scss
└── vibration.component.spec.ts
```

### 4.2 Componente TypeScript

```typescript
import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { ConfigHelper } from 'src/app/helpers/config.helper';
import { VibrationPattern } from 'src/app/models/vibration.model';

@Component({
  selector: 'app-vibration',
  templateUrl: './vibration.component.html',
  styleUrls: ['./vibration.component.scss'],
  standalone: false,
})
export class VibrationComponent implements OnInit {
  public vibrationSelected: VibrationPattern | null = null;
  public vibrationPatterns: VibrationPattern[] = [];

  constructor(
    private configHelper: ConfigHelper,
    private modalController: ModalController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.getVibrationPatterns();
    this.getVibrationSelected();
  }

  getVibrationPatterns() {
    this.vibrationPatterns = this.configHelper.getVibrationPatterns();
  }

  getVibrationSelected() {
    this.vibrationSelected = this.configHelper.getVibration();
  }

  onClickVibration(vibration: VibrationPattern) {
    this.vibrationSelected = vibration;
    this.previewVibration();
  }

  previewVibration() {
    if (this.vibrationSelected && 'vibrate' in navigator) {
      navigator.vibrate(0); // Cancelar vibración actual
      navigator.vibrate(this.vibrationSelected.pattern);
    }
  }

  onConfirmVibration() {
    if (this.vibrationSelected) {
      this.configHelper.setVibration(this.vibrationSelected);
    }
    this.closeModal(true);
  }

  onClickCancel() {
    this.closeModal();
  }

  public closeModal(value?: boolean) {
    this.modalController.dismiss(value);
  }

  async presentAlertConfirm() {
    const alert = await this.alertController.create({
      header: '¿Confirma cambio de vibración?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Aceptar',
          handler: () => {
            this.onConfirmVibration();
          }
        }
      ]
    });
    await alert.present();
  }
}
```

### 4.3 Template HTML

```html
<ion-header>
  <ion-toolbar>
    <ion-button slot="start" fill="clear">
      <ion-icon name="vibrate"></ion-icon>
    </ion-button>
    <ion-title>Vibración</ion-title>
    <ion-buttons slot="end" (click)="previewVibration()">
      <ion-button fill="clear">
        <ion-icon name="play-circle"></ion-icon>
      </ion-button>
    </ion-buttons>
  </ion-toolbar>
</ion-header>

<ion-content>
  <ion-row *ngIf="vibrationPatterns">
    <ion-col>
      <ion-list>
        <ion-item
          *ngFor="let vibration of vibrationPatterns"
          (click)="onClickVibration(vibration)"
          [class.selected]="vibrationSelected?.id === vibration.id"
          button
        >
          <ion-icon [name]="vibration.icon" slot="start" color="primary"></ion-icon>
          <ion-label>
            <h2>{{ vibration.name }}</h2>
            <p>{{ vibration.description }}</p>
            <p class="pattern-info">
              <small>[{{ vibration.pattern.join(', ') }}]</small>
            </p>
          </ion-label>
          <ion-radio
            slot="end"
            [checked]="vibrationSelected?.id === vibration.id"
          ></ion-radio>
        </ion-item>
      </ion-list>
    </ion-col>
  </ion-row>
</ion-content>

<ion-footer>
  <ion-toolbar>
    <ion-row>
      <ion-col size="6">
        <ion-button (click)="onClickCancel()" expand="full" size="large" color="medium">
          Cancelar
        </ion-button>
      </ion-col>
      <ion-col size="6">
        <ion-button (click)="presentAlertConfirm()" expand="full" size="large" color="primary">
          Seleccionar
        </ion-button>
      </ion-col>
    </ion-row>
  </ion-toolbar>
</ion-footer>
```

### 4.4 Estilos SCSS

```scss
/* Estilos específicos para el modal de vibración */
ion-content {
  --background: #0f172a;
}

ion-header ion-toolbar {
  --background: #1a365d;
  --color: #ffffff;
}

ion-footer ion-toolbar {
  --background: #0f172a;
}

/* Lista de vibraciones */
ion-list {
  background: transparent !important;
  padding: 0 8px;
}

ion-item {
  --background: #1e293b;
  --border-color: #334155;
  --inner-box-shadow: none;
  --padding-start: 12px;
  --padding-end: 8px;
  --inner-padding-start: 0;
  --min-height: 70px;
  border-radius: 8px;
  margin-bottom: 4px;
  transition: background 0.2s ease;
}

ion-item:hover {
  --background: #2d3748;
}

ion-item.selected {
  --background: #1e3a5f;
  --border-color: var(--ion-color-primary);
}

ion-item ion-icon {
  font-size: 1.5rem;
  margin-right: 12px;
}

ion-item ion-label {
  color: #e2e8f0;
  font-size: 0.9rem;
}

ion-item ion-label h2 {
  font-weight: 600;
  margin-bottom: 2px;
}

ion-item ion-label p {
  color: #94a3b8;
  font-size: 0.8rem;
  margin: 0;
}

ion-item ion-label .pattern-info {
  color: #64748b;
  font-family: monospace;
  font-size: 0.7rem;
  margin-top: 4px;
}

/* Radio button personalizado */
ion-radio {
  --color: var(--ion-color-primary);
  --color-checked: var(--ion-color-primary);
}

/* Botones del footer */
ion-footer ion-button {
  --border-radius: 8px;
  --padding-top: 14px;
  --padding-bottom: 14px;
  font-weight: 600;
}
```

### 4.5 Test Unitario

```typescript
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
import { VibrationComponent } from './vibration.component';
import { ConfigHelper } from 'src/app/helpers/config.helper';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('VibrationComponent', () => {
  let component: VibrationComponent;
  let fixture: ComponentFixture<VibrationComponent>;
  let configHelperSpy: jasmine.SpyObj<ConfigHelper>;
  let modalControllerSpy: jasmine.SpyObj<ModalController>;

  beforeEach(waitForAsync(() => {
    configHelperSpy = jasmine.createSpyObj('ConfigHelper', [
      'getVibrationPatterns',
      'getVibration',
      'setVibration'
    ]);
    modalControllerSpy = jasmine.createSpyObj('ModalController', ['dismiss']);

    TestBed.configureTestingModule({
      declarations: [VibrationComponent],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: ConfigHelper, useValue: configHelperSpy },
        { provide: ModalController, useValue: modalControllerSpy },
        AlertController
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VibrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load vibration patterns on init', () => {
    expect(configHelperSpy.getVibrationPatterns).toHaveBeenCalled();
  });

  it('should load selected vibration on init', () => {
    expect(configHelperSpy.getVibration).toHaveBeenCalled();
  });
});
```

---

## 5. Integración con BatteryPage

### 5.1 Modificaciones en battery.page.ts

#### Importar componente y modelo

```typescript
import { VibrationComponent } from '../modals/vibration/vibration.component';
import { VibrationPattern } from 'src/app/models/vibration.model';
```

#### Nueva propiedad

```typescript
public vibration: VibrationPattern | null = null;
```

#### Método para obtener vibración

```typescript
getVibration() {
  this.vibration = this.configHelper.getVibration();
}
```

#### Actualizar getConfig()

```typescript
getConfig() {
  this.getSound();
  this.getVibration();  // NUEVA LÍNEA
  this.getIsActivatedAlarm();
}
```

#### Modificar playPlayer() - Línea 239

**ANTES:**
```typescript
window.navigator.vibrate(0) && window.navigator.vibrate([2000, 500, 1000]);
```

**DESPUÉS:**
```typescript
if ('vibrate' in navigator) {
  navigator.vibrate(0); // Cancelar vibración actual
  navigator.vibrate(this.configHelper.getVibrationPattern());
}
```

#### Método para abrir modal de vibración

```typescript
async onClickVibration() {
  const modal = await this.modalController.create({
    component: VibrationComponent,
    cssClass: 'my-custom-class'
  });
  await modal.present();
  modal.onWillDismiss().then((data) => {
    if (data.data) {
      this.getVibration();
    }
  });
}
```

### 5.2 Modificaciones en battery.page.html

#### Agregar botón flotante de vibración

```html
<!-- Botón flotante de sonido (EXISTENTE) -->
<ion-fab vertical="bottom" horizontal="end" slot="fixed" (click)="onClickSound()">
  <ion-fab-button>
    <ion-icon name="musical-notes"></ion-icon>
  </ion-fab-button>
</ion-fab>

<!-- NUEVO: Botón flotante de vibración -->
<ion-fab vertical="bottom" horizontal="start" slot="fixed">
  <ion-fab-button (click)="onClickVibration()" color="secondary">
    <ion-icon name="vibrate"></ion-icon>
  </ion-fab-button>
</ion-fab>
```

#### Alternativa: Botón combinado en el header

```html
<ion-buttons slot="end">
  <ion-button (click)="onClickVibration()" fill="clear">
    <ion-icon name="vibrate"></ion-icon>
  </ion-button>
  <ion-button (click)="activateAlarm()">
    <ion-label *ngIf="!activatedAlarm">Activar</ion-label>
    <ion-label *ngIf="activatedAlarm">Desactivar</ion-label>
    <ion-icon name="volume-high" *ngIf="!activatedAlarm"></ion-icon>
    <ion-icon name="volume-mute" *ngIf="activatedAlarm"></ion-icon>
  </ion-button>
</ion-buttons>
```

---

## 6. Actualizar ComponentesModule

### Archivo: `src/app/pages/modals/componentes.module.ts`

```typescript
import { VibrationComponent } from './vibration/vibration.component';

@NgModule({
  declarations: [
    SoundComponent,
    VibrationComponent  // NUEVO
  ],
  exports: [],
  imports: [
    // ... imports existentes
  ]
})
export class ComponentesModule { }
```

---

## 7. Resumen de Archivos a Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/app/models/vibration.model.ts` | CREAR | Interfaz VibrationPattern |
| `src/app/helpers/config.helper.ts` | MODIFICAR | Agregar key VIBRATION, propiedades y métodos |
| `src/app/pages/modals/vibration/vibration.component.ts` | CREAR | Componente del modal |
| `src/app/pages/modals/vibration/vibration.component.html` | CREAR | Template del modal |
| `src/app/pages/modals/vibration/vibration.component.scss` | CREAR | Estilos del modal |
| `src/app/pages/modals/vibration/vibration.component.spec.ts` | CREAR | Test unitario |
| `src/app/pages/modals/componentes.module.ts` | MODIFICAR | Declarar VibrationComponent |
| `src/app/pages/battery/battery.page.ts` | MODIFICAR | Importar modal, agregar métodos, cambiar vibrate |
| `src/app/pages/battery/battery.page.html` | MODIFICAR | Agregar botón flotante de vibración |

---

## 8. Flujo de Usuario

```
1. Usuario toca botón flotante de vibración (icono vibrate)
   ↓
2. Se abre modal "Vibración" con lista de 6 patrones
   ↓
3. Usuario toca un patrón → se previsualiza la vibración
   ↓
4. Usuario toca "Seleccionar" → aparece alerta de confirmación
   ↓
5. Usuario confirma → se guarda en Preferences
   ↓
6. Modal se cierra → se actualiza la vibración en BatteryPage
   ↓
7. Cuando se activa alarma → se usa el patrón seleccionado
```

---

## 9. Consideraciones Técnicas

### Compatibilidad
- La API de Vibration no está disponible en iOS (solo Android y algunos navegadores)
- Verificar siempre con `'vibrate' in navigator` antes de usar
- En iOS, la vibración simplemente no funcionará (no es un error)

### Persistencia
- Se guarda como JSON en Preferences (mismo patrón que sonido)
- Si no hay valor guardado, usar "Moderado" como defecto

### Preview
- Al tocar un patrón, se vibra inmediatamente para previsualizar
- Se cancela vibración anterior antes de iniciar nueva

### Limpieza
- En loadPlayer() ya existe `window.navigator.vibrate(0)` para cancelar
- Mantener esta lógica para detener vibración

---

## 10. Estilo Visual

### Colores del Modal
- Fondo: `#0f172a` (dark navy)
- Header: `#1a365d` (medium navy)
- Items: `#1e293b` (slate)
- Item seleccionado: `#1e3a5f` (azul más claro)
- Texto principal: `#e2e8f0` (light gray)
- Texto secundario: `#94a3b8` (medium gray)
- Texto pattern: `#64748b` (dark gray, monospace)

### Iconos Ionic Recomendados
- Suave: `phone-portrait`
- Corto: `vibrate`
- Moderado: `pulse`
- Largo: `notifications`
- Intensivo: `alert-circle`
- Emergencia: `warning`

---

## 11. Checklist de Implementación

- [ ] Crear `vibration.model.ts`
- [ ] Modificar `config.helper.ts`
- [ ] Crear carpeta `vibration/` en modals
- [ ] Crear `vibration.component.ts`
- [ ] Crear `vibration.component.html`
- [ ] Crear `vibration.component.scss`
- [ ] Crear `vibration.component.spec.ts`
- [ ] Actualizar `componentes.module.ts`
- [ ] Modificar `battery.page.ts`
- [ ] Modificar `battery.page.html`
- [ ] Ejecutar `ng lint` para verificar código
- [ ] Ejecutar `ng test` para verificar tests
- [ ] Probar en dispositivo Android
