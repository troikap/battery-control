import { Injectable } from '@angular/core';
import { Capacitor, CapacitorGlobal, registerPlugin } from '@capacitor/core';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import {
  PermissionStep,
  PermissionStepType,
  PermissionCheckResult,
} from '../models/permission-step.model';

/**
 * Type definitions for native plugins that may or may not be installed.
 * We use registerPlugin with lazy loading to avoid crashes when plugins are absent.
 */

// Foreground Service plugin types
interface ForegroundServicePlugin {
  startForegroundService(options: {
    id: number;
    title: string;
    body: string;
    smallIcon: string;
    notificationChannelId: string;
    silent: boolean;
    serviceType: number;
  }): Promise<void>;
  updateForegroundService(options: {
    id: number;
    title: string;
    body: string;
    smallIcon: string;
  }): Promise<void>;
  stopForegroundService(): Promise<void>;
  createNotificationChannel(options: {
    id: string;
    name: string;
    description: string;
    importance: number;
  }): Promise<void>;
}

// Battery Optimization plugin types
interface BatteryOptimizationPlugin {
  isBatteryOptimizationEnabled(): Promise<{ enabled: boolean }>;
  openBatteryOptimizationSettings(): Promise<void>;
  requestIgnoreBatteryOptimization(): Promise<void>;
}

// DontKillMyApp plugin types
interface DontKillMyAppPlugin {
  isAutoStartAvailable(): Promise<{ available: boolean }>;
  requestAutoStart(): Promise<{ requested: boolean }>;
  isBatterySaverPermissionAvailable(): Promise<{ available: boolean }>;
  requestKeepAppActive(): Promise<{ requested: boolean }>;
  requestRunInBackground(): Promise<{ requested: boolean }>;
}

/**
 * BatteryAlarmService - Handles reliable battery alarm delivery on Android.
 *
 * Architecture:
 * 1. Foreground Service → Keeps app alive with persistent notification
 * 2. LocalNotifications with allowWhileIdle → Fires alarms during Doze mode
 * 3. Battery Optimization Exemption → Prevents OS from killing the app
 * 4. OEM-specific permissions → Handles Samsung, Xiaomi, Huawei quirks
 * 5. Boot Completed receiver → Restarts monitoring after device reboot
 *
 * This service replaces the unreliable cordova-plugin-background-mode approach
 * with a multi-layered strategy that survives Doze, App Standby, and OEM battery killers.
 */
@Injectable({ providedIn: 'root' })
export class BatteryAlarmService {
  private static readonly NOTIFICATION_CHANNEL_ID = 'battery_alerts';
  private static readonly NOTIFICATION_CHANNEL_NAME = 'Battery Alerts';
  private static readonly FOREGROUND_SERVICE_ID = 1;
  private static readonly LOW_BATTERY_NOTIFICATION_ID = 1001;
  private static readonly HIGH_BATTERY_NOTIFICATION_ID = 1002;
  private static readonly BOOT_COMPLETED_KEY = 'boot_completed';
  private static readonly LAST_CHECK_KEY = 'last_battery_check';
  private static readonly PERMANENTLY_SKIPPED_KEY = 'permanently_skipped_permissions';

  private foregroundService: ForegroundServicePlugin | null = null;
  private batteryOptimization: BatteryOptimizationPlugin | null = null;
  private dontKillMyApp: DontKillMyAppPlugin | null = null;
  private initialized = false;
  private foregroundServiceActive = false;
  private skippedSteps = new Set<PermissionStepType>();
  private permanentlySkippedSteps = new Set<PermissionStepType>();

  constructor() {
    this.loadPlugins();
    this.loadPermanentlySkippedSteps();
  }

  // -------------------------------------------------------------------------
  // Plugin loading
  // -------------------------------------------------------------------------

  private loadPlugins(): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      this.foregroundService = registerPlugin<ForegroundServicePlugin>(
        'ForegroundService'
      );
    } catch (e) {
      console.warn('[BatteryAlarmService] ForegroundService plugin not available');
    }

    try {
      this.batteryOptimization = registerPlugin<BatteryOptimizationPlugin>(
        'BatteryOptimization'
      );
    } catch (e) {
      console.warn('[BatteryAlarmService] BatteryOptimization plugin not available');
    }

    try {
      this.dontKillMyApp = registerPlugin<DontKillMyAppPlugin>(
        'DontKillMyApp'
      );
    } catch (e) {
      console.warn('[BatteryAlarmService] DontKillMyApp plugin not available');
    }
  }

  /**
   * Load permanently skipped permission steps from persistent storage.
   * These steps won't be shown again even after app restart.
   */
  private async loadPermanentlySkippedSteps(): Promise<void> {
    try {
      const result = await Preferences.get({ 
        key: BatteryAlarmService.PERMANENTLY_SKIPPED_KEY 
      });
      if (result.value) {
        const skippedArray: PermissionStepType[] = JSON.parse(result.value);
        skippedArray.forEach(step => this.permanentlySkippedSteps.add(step));
        console.log('[BatteryAlarmService] Loaded permanently skipped steps:', skippedArray);
      }
    } catch (err) {
      console.warn('[BatteryAlarmService] Error loading permanently skipped steps:', err);
    }
  }

  /**
   * Save a permission step as permanently skipped.
   * This step won't be shown again even after app restart.
   */
  async permanentlySkipStep(type: PermissionStepType): Promise<void> {
    console.log(`[BatteryAlarmService] Permanently skipping step: ${type}`);
    this.permanentlySkippedSteps.add(type);
    this.skippedSteps.add(type);
    
    try {
      await Preferences.set({
        key: BatteryAlarmService.PERMANENTLY_SKIPPED_KEY,
        value: JSON.stringify(Array.from(this.permanentlySkippedSteps)),
      });
    } catch (err) {
      console.warn('[BatteryAlarmService] Error saving permanently skipped step:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  /**
   * @deprecated Use checkPermissionSteps() → executePermissionStep() →
   *             initializeCore() flow instead. This method redirects to
   *             settings without user explanation.
   */
  async initialize(): Promise<void> {
    console.warn(
      '[BatteryAlarmService] initialize() is deprecated. ' +
      'Use the checkPermissionSteps() orchestration flow.'
    );

    if (this.initialized) {
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      console.log('[BatteryAlarmService] Running in browser, skipping native init');
      this.initialized = true;
      return;
    }

    console.log('[BatteryAlarmService] Initializing battery alarm system...');

    try {
      await this.requestNotificationPermissions();
      await this.requestExactAlarmPermission();
      await this.requestBatteryOptimizationExemption();
      await this.requestOEMBackgroundPermission();
      await this.initializeCore();
    } catch (err) {
      console.error('[BatteryAlarmService] Error during initialization:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Permission flow (new orchestration API)
  // -------------------------------------------------------------------------

  /**
   * Check which permission steps require user interaction.
   * Pure read — does NOT open any settings or request any permissions.
   *
   * Should be called ONCE per session, before the orchestration loop.
   */
  async checkPermissionSteps(): Promise<PermissionCheckResult> {
    const steps: PermissionStep[] = [];
    const granted: PermissionStepType[] = [];
    const notApplicable: PermissionStepType[] = [];

    if (!Capacitor.isNativePlatform()) {
      notApplicable.push(
        PermissionStepType.NOTIFICATION_PERMISSION,
        PermissionStepType.EXACT_ALARM,
        PermissionStepType.BATTERY_OPTIMIZATION,
        PermissionStepType.OEM_BACKGROUND,
      );
      return { steps, granted, notApplicable };
    }

    // Step 1: Notification permission (Android 13+)
    if (await this.needsNotificationPermission()) {
      if (!this.skippedSteps.has(PermissionStepType.NOTIFICATION_PERMISSION) &&
          !this.permanentlySkippedSteps.has(PermissionStepType.NOTIFICATION_PERMISSION)) {
        steps.push({
          type: PermissionStepType.NOTIFICATION_PERMISSION,
          title: 'Permiso de Notificaciones',
          message:
            'Battery Control necesita enviar notificaciones para alertarle ' +
            'cuando el nivel de batería esté fuera del rango configurado.',
          settingsScreenDescription:
            'Se mostrará un diálogo del sistema. Toque "Permitir" para ' +
            'otorgar el permiso de notificaciones.',
        });
      } else {
        granted.push(PermissionStepType.NOTIFICATION_PERMISSION);
      }
    } else {
      granted.push(PermissionStepType.NOTIFICATION_PERMISSION);
    }

    // Step 2: Exact alarm (Android 12+)
    if (await this.needsExactAlarmPermission()) {
      if (!this.skippedSteps.has(PermissionStepType.EXACT_ALARM) &&
          !this.permanentlySkippedSteps.has(PermissionStepType.EXACT_ALARM)) {
        steps.push({
          type: PermissionStepType.EXACT_ALARM,
          title: 'Alarmas Exactas',
          message:
            'Para que las alertas suenen exactamente cuando la batería ' +
            'alcance el nivel configurado, necesita activar las alarmas exactas.',
          settingsScreenDescription:
            'Se abrirá la información de la app. Siga estos pasos:\n' +
            '1. Toque "Notificaciones"\n' +
            '2. Toque "Alarmas exactas" o "Alarms & reminders"\n' +
            '3. Active el interruptor\n' +
            '4. Regrese a la app',
        });
      } else {
        granted.push(PermissionStepType.EXACT_ALARM);
      }
    } else {
      granted.push(PermissionStepType.EXACT_ALARM);
    }

    // Step 3: Battery optimization exemption
    if (await this.needsBatteryOptimizationExemption()) {
      if (!this.skippedSteps.has(PermissionStepType.BATTERY_OPTIMIZATION) &&
          !this.permanentlySkippedSteps.has(PermissionStepType.BATTERY_OPTIMIZATION)) {
        steps.push({
          type: PermissionStepType.BATTERY_OPTIMIZATION,
          title: 'Optimización de Batería',
          message:
            'Para que Battery Control pueda monitorear la batería en segundo ' +
            'plano, necesita ser eximido de la optimización de batería.',
          settingsScreenDescription:
            'Se mostrará un diálogo del sistema preguntando si desea permitir ' +
            'que Battery Control se ejecute en segundo plano sin restricciones.\n' +
            'Toque "Permitir" o "Allow" para eximir la app de la optimización ' +
            'de batería.',
        });
      } else {
        granted.push(PermissionStepType.BATTERY_OPTIMIZATION);
      }
    } else {
      granted.push(PermissionStepType.BATTERY_OPTIMIZATION);
    }

    // Step 4: OEM-specific permissions
    const oemStep = await this.checkOEMPermissionStep();
    if (oemStep) {
      if (!this.skippedSteps.has(PermissionStepType.OEM_BACKGROUND) &&
          !this.permanentlySkippedSteps.has(PermissionStepType.OEM_BACKGROUND)) {
        steps.push(oemStep);
      } else {
        granted.push(PermissionStepType.OEM_BACKGROUND);
      }
    } else {
      notApplicable.push(PermissionStepType.OEM_BACKGROUND);
    }

    return { steps, granted, notApplicable };
  }

  /**
   * Execute a single permission step. Called by the page AFTER the user
   * taps "Continuar" in the explanatory alert.
   */
  async executePermissionStep(step: PermissionStep): Promise<void> {
    console.log(`[BatteryAlarmService] Executing step: ${step.type}`);

    switch (step.type) {
      case PermissionStepType.NOTIFICATION_PERMISSION:
        await this.requestNotificationPermissions();
        break;
      case PermissionStepType.EXACT_ALARM:
        await this.requestExactAlarmPermission();
        break;
      case PermissionStepType.BATTERY_OPTIMIZATION:
        await this.requestBatteryOptimizationExemption();
        break;
      case PermissionStepType.OEM_BACKGROUND:
        await this.requestOEMBackgroundPermission();
        break;
    }
  }

  /**
   * Record a step as skipped for this session.
   * The user will not be prompted again until the app restarts.
   */
  skipStep(type: PermissionStepType): void {
    console.log(`[BatteryAlarmService] Step skipped by user: ${type}`);
    this.skippedSteps.add(type);
  }

  /**
   * Non-interactive initialization: notification channel, foreground service,
   * boot completed handler. Must be called AFTER all permission steps have
   * been executed or skipped.
   */
  async initializeCore(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      this.initialized = true;
      return;
    }

    try {
      await this.createNotificationChannel();
      await this.startForegroundService();
      await this.handleBootCompleted();
      this.initialized = true;
      console.log('[BatteryAlarmService] Core initialization complete');
    } catch (err) {
      console.error('[BatteryAlarmService] Error during core initialization:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Permission check helpers (pure read, no side effects)
  // -------------------------------------------------------------------------

  private async needsNotificationPermission(): Promise<boolean> {
    try {
      const perm = await LocalNotifications.checkPermissions();
      return perm.display !== 'granted';
    } catch {
      return false;
    }
  }

  private async needsExactAlarmPermission(): Promise<boolean> {
    try {
      const settings = await LocalNotifications.checkExactNotificationSetting();
      return settings.exact_alarm !== 'granted';
    } catch {
      return false;
    }
  }

  private async needsBatteryOptimizationExemption(): Promise<boolean> {
    if (!this.batteryOptimization) {
      return false;
    }
    try {
      const { enabled } = await this.batteryOptimization.isBatteryOptimizationEnabled();
      return enabled;
    } catch {
      return false;
    }
  }

  private async checkOEMPermissionStep(): Promise<PermissionStep | null> {
    if (!this.dontKillMyApp) {
      return null;
    }

    const manufacturer = this.getManufacturer();

    switch (manufacturer) {
      case 'xiaomi':
      case 'redmi': {
        const available = await this.dontKillMyApp.isAutoStartAvailable();
        if (!available.available) { return null; }
        return {
          type: PermissionStepType.OEM_BACKGROUND,
          title: 'Inicio Automático (Xiaomi/Redmi)',
          message:
            'Su dispositivo requiere activar el inicio automático para que ' +
            'Battery Control pueda ejecutarse en segundo plano.',
          settingsScreenDescription:
            'Se abrirá la configuración. Siga estos pasos:\n' +
            '1. Encuentre "Battery Control" en la lista\n' +
            '2. Active el interruptor junto a la app\n' +
            '3. Regrese a la app\n\n' +
            'Si no se abre la configuración, vaya manualmente a:\n' +
            'Ajustes → Aplicaciones → Aplicaciones → Battery Control → Inicio automático',
          manufacturer,
        };
      }

      case 'samsung':
        return {
          type: PermissionStepType.OEM_BACKGROUND,
          title: 'Suspensión de Apps (Samsung)',
          message:
            'Samsung puede poner las apps en suspensión después de un tiempo. ' +
            'Necesita permitir que Battery Control permanezca activo.',
          settingsScreenDescription:
            'Se abrirá la configuración de batería. Siga estos pasos:\n' +
            '1. Toque "Battery Control" en la lista\n' +
            '2. Seleccione "No optimizar" o "Don\'t allow to sleep"\n' +
            '3. Regrese a la app\n\n' +
            'Si no se abre la configuración, vaya manualmente a:\n' +
            'Ajustes → Batería y rendimiento → Ahorro de batería → Battery Control → Sin restricciones',
          manufacturer,
        };

      case 'huawei':
      case 'honor':
        return {
          type: PermissionStepType.OEM_BACKGROUND,
          title: 'Gestión de Lanzamiento (Huawei/Honor)',
          message:
            'Su dispositivo requiere configurar la gestión de lanzamiento ' +
            'para que Battery Control se ejecute en segundo plano.',
          settingsScreenDescription:
            'Se abrirá la configuración. Siga estos pasos:\n' +
            '1. Encuentre "Battery Control" en la lista\n' +
            '2. Toque en ella\n' +
            '3. Seleccione "Gestionar manualmente"\n' +
            '4. Active "Ejecutar en segundo plano"\n' +
            '5. Regrese a la app\n\n' +
            'Si no se abre la configuración, vaya manualmente a:\n' +
            'Ajustes → Batería → Detalles del consumo de energía → ' +
            'Battery Control → Gestión de inicio → Gestionar manualmente',
          manufacturer,
        };

      case 'oppo':
      case 'oneplus':
      case 'realme': {
        const available = await this.dontKillMyApp.isBatterySaverPermissionAvailable();
        if (!available.available) { return null; }
        return {
          type: PermissionStepType.OEM_BACKGROUND,
          title: 'Ahorro de Batería (Oppo/OnePlus)',
          message:
            'Su dispositivo requiere permitir que Battery Control se ejecute ' +
            'en segundo plano sin restricciones de ahorro de batería.',
          settingsScreenDescription:
            'Se abrirá la configuración. Siga estos pasos:\n' +
            '1. Encuentre "Battery Control" en la lista\n' +
            '2. Toque en ella\n' +
            '3. Seleccione "No restringir" o "Allow background activity"\n' +
            '4. Regrese a la app\n\n' +
            'Si no se abre la configuración, vaya manualmente a:\n' +
            'Ajustes → Batería → Battery Control → Sin restricciones',
          manufacturer,
        };
      }

      case 'vivo': {
        const available = await this.dontKillMyApp.isBatterySaverPermissionAvailable();
        if (!available.available) { return null; }
        return {
          type: PermissionStepType.OEM_BACKGROUND,
          title: 'Restricciones de Segundo Plano (Vivo)',
          message:
            'Su dispositivo tiene restricciones de ejecución en segundo plano. ' +
            'Necesita permitir que Battery Control se ejecute sin restricciones.',
          settingsScreenDescription:
            'Se abrirá la configuración. Siga estos pasos:\n' +
            '1. Encuentre "Battery Control" en la lista\n' +
            '2. Toque en ella\n' +
            '3. Active "Ejecutar en segundo plano" o "Allow background activity"\n' +
            '4. Regrese a la app\n\n' +
            'Si no se abre la configuración, vaya manualmente a:\n' +
            'Ajustes → Batería → Battery Control → Ejecutar en segundo plano',
          manufacturer,
        };
      }

      default:
        // Generic fallback for unknown manufacturers
        return {
          type: PermissionStepType.OEM_BACKGROUND,
          title: 'Permisos de Segundo Plano',
          message:
            'Algunos dispositivos restringen las aplicaciones en segundo plano. ' +
            'Si Battery Control no funciona correctamente, verifique los permisos ' +
            'de ejecución en segundo plano en la configuración de su dispositivo.',
          settingsScreenDescription:
            'Vaya manualmente a la configuración de su dispositivo:\n' +
            '1. Ajustes → Aplicaciones → Battery Control\n' +
            '2. Busque "Batería" o "Optimización de batería"\n' +
            '3. Seleccione "Sin restricciones" o permita ejecución en segundo plano\n' +
            '4. Regrese a la app',
          manufacturer,
        };
    }
  }

  // -------------------------------------------------------------------------
  // Permission handling (request methods with side effects)
  // -------------------------------------------------------------------------

  private async requestNotificationPermissions(): Promise<void> {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        console.log('[BatteryAlarmService] Requesting notification permissions');
        await LocalNotifications.requestPermissions();
      }
    } catch (err) {
      console.error('[BatteryAlarmService] Error requesting notification permissions:', err);
    }
  }

  private async requestExactAlarmPermission(): Promise<void> {
    try {
      // On Android 12+, check if exact alarms are allowed
      const settings = await LocalNotifications.checkExactNotificationSetting();
      if (settings.exact_alarm !== 'granted') {
        console.warn('[BatteryAlarmService] Exact notifications not enabled, opening settings');
        await LocalNotifications.changeExactNotificationSetting();
      }
    } catch (err) {
      // checkExactNotificationSetting may not be available on older Capacitor versions
      console.log('[BatteryAlarmService] Exact alarm permission check not available (older Capacitor?)');
    }
  }

  private async requestBatteryOptimizationExemption(): Promise<void> {
    if (!this.batteryOptimization) {
      return;
    }

    try {
      const { enabled } = await this.batteryOptimization.isBatteryOptimizationEnabled();
      if (enabled) {
        console.log('[BatteryAlarmService] Battery optimization is active, requesting exemption');
        // This opens a system dialog asking the user to allow the app to run in background
        // Google Play allows this for apps whose core function depends on background processing
        await this.batteryOptimization.requestIgnoreBatteryOptimization();
      } else {
        console.log('[BatteryAlarmService] Battery optimization already disabled');
      }
    } catch (err) {
      console.error('[BatteryAlarmService] Error handling battery optimization:', err);
    }
  }

  private async requestOEMBackgroundPermission(): Promise<void> {
    if (!this.dontKillMyApp) {
      return;
    }

    const manufacturer = this.getManufacturer();
    console.log(`[BatteryAlarmService] Device manufacturer: ${manufacturer}`);

    try {
      switch (manufacturer) {
        case 'xiaomi':
        case 'redmi': {
          // Xiaomi requires explicit autostart permission
          try {
            const autoStartAvailable = await this.dontKillMyApp.isAutoStartAvailable();
            if (autoStartAvailable.available) {
              console.log('[BatteryAlarmService] Requesting Xiaomi autostart permission');
              await this.dontKillMyApp.requestAutoStart();
            }
          } catch (e) {
            console.warn('[BatteryAlarmService] Xiaomi autostart request failed:', e);
          }
          break;
        }

        case 'samsung': {
          // Samsung puts apps to sleep after 3 days of inactivity
          try {
            console.log('[BatteryAlarmService] Samsung detected, requesting keep active');
            await this.dontKillMyApp.requestKeepAppActive();
          } catch (e) {
            console.warn('[BatteryAlarmService] Samsung keep active request failed:', e);
          }
          break;
        }

        case 'huawei':
        case 'honor': {
          // Huawei requires "App launch management" → Auto-manage
          // This may fail if the app doesn't have the required system permission
          try {
            console.log('[BatteryAlarmService] Huawei detected, requesting run in background');
            await this.dontKillMyApp.requestRunInBackground();
          } catch (e) {
            console.warn('[BatteryAlarmService] Huawei runInBackground request failed (expected on some devices):', e);
            // Huawei intent will fail silently — user must configure manually
          }
          break;
        }

        case 'oppo':
        case 'oneplus':
        case 'realme': {
          // Oppo/OnePlus use ColorOS/OxygenOS battery saver
          try {
            const batterySaverAvailable = await this.dontKillMyApp.isBatterySaverPermissionAvailable();
            if (batterySaverAvailable.available) {
              console.log('[BatteryAlarmService] Requesting Oppo/OnePlus battery saver permission');
              await this.dontKillMyApp.requestKeepAppActive();
            }
          } catch (e) {
            console.warn('[BatteryAlarmService] Oppo/OnePlus battery saver request failed:', e);
          }
          break;
        }

        case 'vivo': {
          // Vivo has its own background power limits
          try {
            const vivoBatterySaver = await this.dontKillMyApp.isBatterySaverPermissionAvailable();
            if (vivoBatterySaver.available) {
              console.log('[BatteryAlarmService] Requesting Vivo battery saver permission');
              await this.dontKillMyApp.requestKeepAppActive();
            }
          } catch (e) {
            console.warn('[BatteryAlarmService] Vivo battery saver request failed:', e);
          }
          break;
        }

        default:
          console.log(`[BatteryAlarmService] No OEM-specific permissions needed for: ${manufacturer}`);
      }
    } catch (err) {
      console.error(`[BatteryAlarmService] Error handling OEM permissions for ${manufacturer}:`, err);
    }
  }

  // -------------------------------------------------------------------------
  // Foreground Service management
  // -------------------------------------------------------------------------

  private async createNotificationChannel(): Promise<void> {
    if (!this.foregroundService) {
      return;
    }

    try {
      await this.foregroundService.createNotificationChannel({
        id: BatteryAlarmService.NOTIFICATION_CHANNEL_ID,
        name: BatteryAlarmService.NOTIFICATION_CHANNEL_NAME,
        description: 'Notificaciones de alertas de batería',
        importance: 4, // HIGH
      });
    } catch (err) {
      console.error('[BatteryAlarmService] Error creating notification channel:', err);
    }
  }

  /**
   * Start the foreground service with a persistent notification.
   * This keeps the app alive in the background and prevents the OS from killing it.
   */
  async startForegroundService(): Promise<void> {
    if (!this.foregroundService || this.foregroundServiceActive) {
      return;
    }

    try {
      await this.foregroundService.startForegroundService({
        id: BatteryAlarmService.FOREGROUND_SERVICE_ID,
        title: 'Battery Control activo',
        body: 'Monitoreando nivel de batería',
        smallIcon: 'ic_launcher_round',
        notificationChannelId: BatteryAlarmService.NOTIFICATION_CHANNEL_ID,
        silent: false,
        serviceType: 1, // FOREGROUND_SERVICE_TYPE_DATA_SYNC (available since Android 10, value=1)
      });

      this.foregroundServiceActive = true;
      console.log('[BatteryAlarmService] Foreground service started');
    } catch (err) {
      console.error('[BatteryAlarmService] Error starting foreground service with DATA_SYNC:', err);

      // Fallback: try with no service type (uses default)
      try {
        console.log('[BatteryAlarmService] Retrying foreground service without service type...');
        await this.foregroundService.startForegroundService({
          id: BatteryAlarmService.FOREGROUND_SERVICE_ID,
          title: 'Battery Control activo',
          body: 'Monitoreando nivel de batería',
          smallIcon: 'ic_launcher_round',
          notificationChannelId: BatteryAlarmService.NOTIFICATION_CHANNEL_ID,
          silent: false,
          serviceType: 0, // No specific type
        });

        this.foregroundServiceActive = true;
        console.log('[BatteryAlarmService] Foreground service started (fallback)');
      } catch (fallbackErr) {
        console.error('[BatteryAlarmService] Fallback also failed:', fallbackErr);
        // App will continue without foreground service
      }
    }
  }

  /**
   * Update the foreground service notification text.
   */
  async updateForegroundNotification(title: string, body: string): Promise<void> {
    if (!this.foregroundService || !this.foregroundServiceActive) {
      return;
    }

    try {
      await this.foregroundService.updateForegroundService({
        id: BatteryAlarmService.FOREGROUND_SERVICE_ID,
        title,
        body,
        smallIcon: 'ic_launcher_round',
      });
    } catch (err) {
      console.error('[BatteryAlarmService] Error updating foreground notification:', err);
    }
  }

  /**
   * Stop the foreground service.
   */
  async stopForegroundService(): Promise<void> {
    if (!this.foregroundService || !this.foregroundServiceActive) {
      return;
    }

    try {
      await this.foregroundService.stopForegroundService();
      this.foregroundServiceActive = false;
      console.log('[BatteryAlarmService] Foreground service stopped');
    } catch (err) {
      console.error('[BatteryAlarmService] Error stopping foreground service:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Alarm scheduling
  // -------------------------------------------------------------------------

  /**
   * Schedule a battery alarm notification that fires even during Doze mode.
   *
   * @param message - The alert message to display
   * @param type - 'low' for low battery, 'high' for high battery
   * @param delayMs - Delay in milliseconds before the notification fires (default: immediate)
   */
  async scheduleBatteryAlarm(
    message: string,
    type: 'low' | 'high',
    delayMs: number = 0
  ): Promise<void> {
    const notificationId = type === 'low'
      ? BatteryAlarmService.LOW_BATTERY_NOTIFICATION_ID
      : BatteryAlarmService.HIGH_BATTERY_NOTIFICATION_ID;

    const title = type === 'low'
      ? '🔋 Batería Baja'
      : '🔋 Batería Alta';

    try {
      const scheduleAt = new Date(Date.now() + delayMs);

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title,
            body: message,
            isExactNotification: true,       // CRITICAL: exact timing
            isExactMandatory: true,          // Reject if exact alarm permission not granted
            schedule: {
              at: scheduleAt,
              allowWhileIdle: true,           // CRITICAL: fires during Doze mode
            },
            channelId: BatteryAlarmService.NOTIFICATION_CHANNEL_ID,
            extra: {
              data: {
                type,
                timestamp: Date.now(),
              },
            },
          },
        ],
      });

      console.log(`[BatteryAlarmService] ${type} battery alarm scheduled for ${scheduleAt.toISOString()}`);
    } catch (err) {
      console.error(`[BatteryAlarmService] Error scheduling ${type} battery alarm:`, err);

      // Fallback: try without isExactMandatory
      try {
        const scheduleAt = new Date(Date.now() + delayMs);
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notificationId,
              title,
              body: message,
              schedule: {
                at: scheduleAt,
                allowWhileIdle: true,
              },
              channelId: BatteryAlarmService.NOTIFICATION_CHANNEL_ID,
            },
          ],
        });
        console.log(`[BatteryAlarmService] ${type} battery alarm scheduled (fallback, inexact)`);
      } catch (fallbackErr) {
        console.error(`[BatteryAlarmService] Fallback scheduling also failed:`, fallbackErr);
      }
    }
  }

  /**
   * Cancel a scheduled battery alarm.
   */
  async cancelBatteryAlarm(type: 'low' | 'high'): Promise<void> {
    const notificationId = type === 'low'
      ? BatteryAlarmService.LOW_BATTERY_NOTIFICATION_ID
      : BatteryAlarmService.HIGH_BATTERY_NOTIFICATION_ID;

    try {
      await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
      console.log(`[BatteryAlarmService] ${type} battery alarm cancelled`);
    } catch (err) {
      console.error(`[BatteryAlarmService] Error cancelling ${type} battery alarm:`, err);
    }
  }

  /**
   * Cancel all scheduled battery alarms.
   */
  async cancelAllAlarms(): Promise<void> {
    try {
      await LocalNotifications.cancel({
        notifications: [
          { id: BatteryAlarmService.LOW_BATTERY_NOTIFICATION_ID },
          { id: BatteryAlarmService.HIGH_BATTERY_NOTIFICATION_ID },
        ],
      });
      console.log('[BatteryAlarmService] All battery alarms cancelled');
    } catch (err) {
      console.error('[BatteryAlarmService] Error cancelling all alarms:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Boot completed handling
  // -------------------------------------------------------------------------

  private async handleBootCompleted(): Promise<void> {
    try {
      const result = await Preferences.get({ key: BatteryAlarmService.BOOT_COMPLETED_KEY });
      if (result.value === 'true') {
        console.log('[BatteryAlarmService] Boot completed detected, restoring alarms');
        await Preferences.remove({ key: BatteryAlarmService.BOOT_COMPLETED_KEY });

        // The BootReceiver already started the foreground service and scheduled alarms
        // Just update the notification to show we're back
        await this.updateForegroundNotification(
          'Battery Control restaurado',
          'Monitoreando nivel de batería (post-reboot)'
        );
      }
    } catch (err) {
      console.error('[BatteryAlarmService] Error handling boot completed:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Public queries
  // -------------------------------------------------------------------------

  /**
   * Check if battery optimization is currently enabled (restricting background work).
   */
  async isBatteryOptimizationEnabled(): Promise<boolean> {
    if (!this.batteryOptimization) {
      return false;
    }

    try {
      const { enabled } = await this.batteryOptimization.isBatteryOptimizationEnabled();
      return enabled;
    } catch {
      return false;
    }
  }

  /**
   * Get the device manufacturer for OEM-specific logic.
   */
  private getManufacturer(): string {
    const ua = navigator.userAgent.toLowerCase();
    const match = ua.match(/(xiaomi|redmi|samsung|huawei|honor|oppo|oneplus|realme|vivo|asus|lenovo|meizu)/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Get the last battery check timestamp.
   */
  async getLastCheckTimestamp(): Promise<number> {
    try {
      const result = await Preferences.get({ key: BatteryAlarmService.LAST_CHECK_KEY });
      return result.value ? parseInt(result.value, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Whether the foreground service is currently active.
   */
  isForegroundServiceActive(): boolean {
    return this.foregroundServiceActive;
  }

  /**
   * Whether the service has been initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  /**
   * Clean up resources. Called when the app is being destroyed.
   */
  async destroy(): Promise<void> {
    // Note: We do NOT stop the foreground service on destroy
    // because we want it to keep running in the background.
    // The service will be stopped when the user explicitly disables alarms.
    console.log('[BatteryAlarmService] Destroy called (foreground service kept alive)');
  }
}
