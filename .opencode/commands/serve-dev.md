---
description: Iniciar servidor de desarrollo
---

Inicia el servidor de desarrollo de Ionic:

```bash
ionic serve
```

## Comandos

### Servidor básico
```bash
ionic serve
```

### Con IP específica
```bash
ionic serve --host 192.168.1.100
```

### Con puerto específico
```bash
ionic serve --port 8101
```

### Sin open browser
```bash
ionic serve --no-open
```

## Características
- Puerto por defecto: 8100
- Hot reload habilitado
- Live reload habilitado
- SSL deshabilitado por defecto

## URLs
- Local: http://localhost:8100
- Red: http://[tu-ip]:8100

## Errores Comunes
- "Port already in use": Cambiar puerto con --port
- "Module not found": Verificar imports
