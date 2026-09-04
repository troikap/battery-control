---
description: Ejecutar tests unitarios del proyecto
---

Ejecuta todos los tests unitarios del proyecto:

```bash
ng test --watch=false --browsers=ChromeHeadless
```

## Comandos Disponibles

### Todos los tests (watch mode)
```bash
ng test
```

### Todos los tests (sin watch)
```bash
ng test --watch=false
```

### Headless browser (CI/CD)
```bash
ng test --browsers=ChromeHeadless
```

### Con coverage
```bash
ng test --code-coverage
```

### Tests específicos
```bash
ng test --include='**/*.spec.ts'
```

## Requisitos
- Chrome instalado
- Node.js y npm instalados
- Dependencias instaladas (npm install)

## Reportes
- Coverage en coverage/index.html
- Reporte en consola

## Errores Comunes
- "Chrome not found": Instalar Chrome
- "Zone not loaded": Verificar test.ts y polyfills.ts
- "Unknown element": Agregar CUSTOM_ELEMENTS_SCHEMA
