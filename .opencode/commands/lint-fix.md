---
description: Ejecutar lint con auto-fix
---

Ejecuta linter con corrección automática:

```bash
ng lint --fix
```

## Comandos

### Lint sin fix
```bash
ng lint
```

### Lint con fix
```bash
ng lint --fix
```

### Lint específico
```bash
ng lint --type-check
```

## Configuración
- TSLint con Codelyzer
- Reglas en tslint.json
- Max line length: 140 chars
- Comillas simples
- Punto y coma requerido

## Errores Comunes
- "Lint error": Revisar tslint.json
- "Codelyzer error": Verificar reglas de Angular
