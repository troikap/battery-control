# AGENTS.md

## Project Overview
Ionic Angular mobile app for battery level monitoring and alerts. Uses Capacitor for native Android integration.

## Tech Stack
- Angular 22.1, Ionic 9.0, Capacitor 8.5
- TypeScript 6.0, SCSS
- Native plugins: Device, LocalNotifications, Preferences, StatusBar, BackgroundMode (Cordova)

## Commands
```bash
ionic serve          # Dev server (port 8100)
ng build             # Build to www/
ng build --configuration production  # Production build
ng test              # Unit tests (Karma + Jasmine)
ng lint              # Lint (TSLint + Codelyzer)
ng e2e               # E2E tests (Protractor) - NOTE: e2e folder does not exist
```

## Project Structure
- `src/app/pages/battery/` - Main battery monitoring page
- `src/app/pages/power-by/` - Secondary page (minimal implementation)
- `src/app/providers/battery.provider.ts` - Battery status service (singleton)
- `src/app/helpers/config.helper.ts` - Configuration management (sound, alarm levels)
- `src/app/models/battery.model.ts` - Battery event model
- `src/app/pages/modals/` - Shared modal components (SoundComponent)

## Key Conventions
- Component suffix: `Page` for pages, `Component` for modals/components
- Selector prefix: `app-` with kebab-case
- Single quotes, semicolons, 140 char max line length
- Tests use `CUSTOM_ELEMENTS_SCHEMA` to handle Ionic components

## Testing Notes
- Unit tests exist but `app.component.spec.ts` has stale expectations (checks for 12 menu items that don't exist)
- No e2e test folder exists despite `ng e2e` being configured
- Tests require browser environment (Karma)

## Android Build
- Capacitor config: `capacitor.config.json`
- Android project: `android/` directory
- Build output: `www/browser/` directory (synced to Android assets via `npx cap sync android`)

## Common Issues
- Native plugins only work on device/emulator, not in browser
- `LocalNotifications` plugin requires user permission
- Background mode wake-up calls in battery status handler

## OpenCode Structure
This project has OpenCode agents, skills, and commands configured:

### Agents (`.opencode/agents/`)
- `architect.md` - Arquitecto de software
- `frontend-dev.md` - Desarrollador Angular/Ionic
- `backend-dev.md` - Desarrollador de servicios
- `ui-designer.md` - Diseñador de interfaces
- `qa-engineer.md` - Ingeniero de calidad
- `tech-lead.md` - Líder técnico
- `orchestrator.md` - Orquestador de tareas

### Skills (`.opencode/skills/`)
- `capacitor-build/` - Build y deploy Android
- `ionic-testing/` - Testing de componentes Ionic
- `battery-features/` - Funcionalidades de batería

### Commands (`.opencode/commands/`)
- `build-android.md` - Build completo para Android
- `run-tests.md` - Ejecutar tests unitarios
- `lint-fix.md` - Lint con auto-fix
- `serve-dev.md` - Iniciar servidor de desarrollo

### Configuration
- `opencode.json` - Configuración principal de OpenCode
- `AGENTS.md` - Este archivo (referenciado en opencode.json)
