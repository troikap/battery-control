---
name: ionic-testing
description: Testing de componentes Angular/Ionic con Karma y Jasmine. Usar cuando se necesite escribir, ejecutar o analizar tests unitarios.
---

# Ionic Testing Skill

## Comandos de Testing

### Ejecutar Todos los Tests
```bash
ng test
```
- Abre navegador y ejecuta tests
- Watch mode por defecto

### Ejecutar sin Watch Mode
```bash
ng test --watch=false
```
- Ejecuta una vez y termina
- Útil para CI/CD

### Ejecutar en Headless Browser
```bash
ng test --browsers=ChromeHeadless
```
- Sin interfaz gráfica
- Útil para servidores CI

### Ejecutar con Coverage
```bash
ng test --code-coverage
```
- Genera reporte de cobertura en coverage/
- Muestra porcentaje de cobertura

### Ejecutar Tests Específicos
```bash
ng test --include='**/*.spec.ts'
```
- Filtra tests por patrón

## Estructura de Tests

### Test Básico de Componente
```typescript
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { MiComponente } from './mi.componente';

describe('MiComponente', () => {
  let component: MiComponente;
  let fixture: ComponentFixture<MiComponente>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [MiComponente],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],  // Para componentes Ionic
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(MiComponente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

### Test de Servicio
```typescript
import { TestBed } from '@angular/core/testing';
import { MiServicio } from './mi.servicio';

describe('MiServicio', () => {
  let servicio: MiServicio;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MiServicio]
    });
    servicio = TestBed.inject(MiServicio);
  });

  it('should be created', () => {
    expect(servicio).toBeTruthy();
  });
});
```

## Mock de Plugins Nativos

### BatteryStatus Mock
```typescript
import { of } from 'rxjs';

const mockBatteryStatus = {
  onChange: () => of({ level: 50, isPlugged: false })
};

// En TestBed
providers: [
  { provide: BatteryStatus, useValue: mockBatteryStatus }
]
```

### LocalNotifications Mock
```typescript
const mockLocalNotifications = {
  requestPermission: () => Promise.resolve(),
  schedule: () => Promise.resolve(),
  registerActionTypes: () => Promise.resolve()
};
```

### BackgroundMode Mock
```typescript
const mockBackgroundMode = {
  enable: () => {},
  disable: () => {},
  wakeUp: () => {}
};
```

## Convenciones del Proyecto

### CUSTOM_ELEMENTS_SCHEMA
- Siempre incluir para componentes Ionic
- Evita errores de elementos desconocidos

### waitForAsync
- Usar para tests con operaciones asíncronas
- Reemplaza async/await en beforeEach

### Detect Changes
- Llamar `fixture.detectChanges()` después de crear componente
- Actualizar bindings del template

## Análisis de Cobertura

### Ver Reporte
```bash
open coverage/index.html
```

### Configurar Mínimo
En `karma.conf.js`:
```javascript
coverageReporter: {
  type: 'html',
  dir: 'coverage/',
  reporters: [
    { type: 'html', subdir: 'html' },
    { type: 'text-summary' }
  ]
}
```

## Errores Comunes

### "No provider for BatteryStatus"
- Agregar mock en providers
- Verificar que el mock está definido

### "Unknown element ion-button"
- Agregar `CUSTOM_ELEMENTS_SCHEMA`
- Verificar imports de Ionic

### "Zone has not been loaded"
- Importar `zone.js/dist/zone-testing` en test.ts
- Verificar polyfills.ts

## Testing de Componentes Específicos

### BatteryPage
- Mockear BatteryStatus, BackgroundMode, AudioManagement, Vibration
- Mockear ModalController para SoundComponent
- Mockear LocalNotifications

### SoundComponent
- Mockear ConfigHelper
- Mockear ModalController
