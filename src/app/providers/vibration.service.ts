import { Injectable, NgZone } from '@angular/core';
import { Capacitor } from '@capacitor/core';

/**
 * Servicio centralizado de vibración para la app.
 *
 * En plataforma nativa (Android) usa el plugin Capacitor VibrationPlugin
 * que accede directamente al Vibrator del sistema.
 *
 * En navegador (ionic serve) usa navigator.vibrate() como fallback.
 *
 * IMPORTANTE: Este servicio está diseñado para NUNCA causar un crash de la app.
 * Todas las llamadas nativas están protegidas con try-catch en múltiples capas.
 */
@Injectable({ providedIn: 'root' })
export class VibrationService {
  private isNative: boolean;
  private bridgeReady = false;
  private static readonly TAG = '[VibrationService]';
  private static readonly PLUGIN_TIMEOUT_MS = 3000;

  constructor(private zone: NgZone) {
    this.isNative = Capacitor.isNativePlatform();
    console.log(`${VibrationService.TAG} Initialized. isNative: ${this.isNative}`);

    // Check bridge readiness after a short delay (let Capacitor initialize)
    if (this.isNative) {
      setTimeout(() => this.checkBridgeReady(), 500);
    }
  }

  /**
   * Check if the Capacitor bridge and Vibration plugin are available.
   * This is done lazily to avoid crashes during app initialization.
   */
  private checkBridgeReady(): void {
    try {
      const w = window as any;
      const capacitor = w.Capacitor;

      if (!capacitor) {
        console.warn(`${VibrationService.TAG} Capacitor not available on window`);
        return;
      }

      // Check if the Vibration plugin is registered
      if (capacitor.Plugins?.Vibration) {
        this.bridgeReady = true;
        console.log(`${VibrationService.TAG} Bridge ready, Vibration plugin found`);
      } else {
        console.warn(`${VibrationService.TAG} Vibration plugin NOT found in Capacitor.Plugins`);
        // Try to find it in different locations
        if (capacitor.Plugins) {
          console.log(`${VibrationService.TAG} Available plugins: ${Object.keys(capacitor.Plugins).join(', ')}`);
        }
      }
    } catch (err) {
      console.error(`${VibrationService.TAG} Error checking bridge:`, err);
    }
  }

  /**
   * Execute a native plugin call with timeout protection.
   * Returns null if the call fails or times out.
   */
  private async executeWithTimeout<T>(
    pluginCall: () => Promise<T>,
    fallback: T | null = null
  ): Promise<T | null> {
    if (!this.isNative || !this.bridgeReady) {
      return fallback;
    }

    try {
      const result = await Promise.race([
        pluginCall(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Plugin call timeout')), VibrationService.PLUGIN_TIMEOUT_MS)
        ),
      ]);
      return result;
    } catch (err) {
      console.warn(`${VibrationService.TAG} Plugin call failed:`, err);
      return fallback;
    }
  }

  /**
   * Vibrar con un patrón personalizado (array de milisegundos).
   * Ejemplo: [300, 200, 300] = vibrar 300ms, pausa 200ms, vibrar 300ms.
   */
  async vibrate(pattern: number[]): Promise<void> {
    if (!pattern || pattern.length === 0) {
      console.log(`${VibrationService.TAG} Empty pattern, skipping`);
      return;
    }

    console.log(`${VibrationService.TAG} vibrate pattern: ${JSON.stringify(pattern)}`);

    // Validate pattern values
    const validPattern = pattern.map(v => Math.max(0, Math.min(v, 10000))); // Cap at 10 seconds each
    if (validPattern.some(v => v <= 0)) {
      console.warn(`${VibrationService.TAG} Pattern has zero/negative values, skipping`);
      return;
    }

    if (this.isNative) {
      // First stop any existing vibration (fire-and-forget, no await)
      this.stopVibrationSync();

      // Then start new vibration
      await this.executeWithTimeout(async () => {
        const VibrationPlugin = this.getNativePlugin();
        if (VibrationPlugin) {
          await VibrationPlugin.vibrate({ pattern: validPattern });
          console.log(`${VibrationService.TAG} Native vibration started`);
        }
      });
    } else {
      // Browser fallback
      this.vibrateBrowser(validPattern);
    }
  }

  /**
   * Vibrar una sola vez con duración en milisegundos.
   */
  async vibrateOnce(duration: number = 300): Promise<void> {
    console.log(`${VibrationService.TAG} vibrateOnce duration: ${duration}`);

    if (this.isNative) {
      await this.executeWithTimeout(async () => {
        const VibrationPlugin = this.getNativePlugin();
        if (VibrationPlugin) {
          await VibrationPlugin.vibrateOnce({ duration });
          console.log(`${VibrationService.TAG} Native vibrateOnce started`);
        }
      });
    } else {
      this.vibrateBrowserOnce(duration);
    }
  }

  /**
   * Detener cualquier vibración en curso.
   */
  async stopVibration(): Promise<void> {
    if (this.isNative) {
      await this.executeWithTimeout(async () => {
        const VibrationPlugin = this.getNativePlugin();
        if (VibrationPlugin) {
          await VibrationPlugin.stopVibration();
          console.log(`${VibrationService.TAG} Native vibration stopped`);
        }
      });
    } else {
      this.stopVibrationBrowser();
    }
  }

  /**
   * Stop vibration synchronously (fire-and-forget, no await).
   * Used internally to avoid blocking the vibration start.
   */
  private stopVibrationSync(): void {
    if (this.isNative) {
      this.executeWithTimeout(async () => {
        const VibrationPlugin = this.getNativePlugin();
        if (VibrationPlugin) {
          await VibrationPlugin.stopVibration();
        }
      });
    } else {
      this.stopVibrationBrowser();
    }
  }

  /**
   * Get the native Vibration plugin from Capacitor.Plugins.
   * Returns null if not available.
   */
  private getNativePlugin(): any {
    try {
      const w = window as any;
      const plugin = w.Capacitor?.Plugins?.Vibration;
      if (plugin) {
        return plugin;
      }

      // Fallback: try the Capacitor registerPlugin approach
      console.warn(`${VibrationService.TAG} Plugin not in Capacitor.Plugins, trying import fallback`);
      return null;
    } catch (err) {
      console.error(`${VibrationService.TAG} Error getting native plugin:`, err);
      return null;
    }
  }

  /**
   * Browser fallback for vibration with pattern.
   */
  private vibrateBrowser(pattern: number[]): void {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
        navigator.vibrate(pattern);
        console.log(`${VibrationService.TAG} Browser vibration started`);
      } else {
        console.warn(`${VibrationService.TAG} navigator.vibrate not available`);
      }
    } catch (err) {
      console.error(`${VibrationService.TAG} Browser vibration failed:`, err);
    }
  }

  /**
   * Browser fallback for single vibration.
   */
  private vibrateBrowserOnce(duration: number): void {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(duration);
        console.log(`${VibrationService.TAG} Browser vibrateOnce started`);
      } else {
        console.warn(`${VibrationService.TAG} navigator.vibrate not available`);
      }
    } catch (err) {
      console.error(`${VibrationService.TAG} Browser vibrateOnce failed:`, err);
    }
  }

  /**
   * Browser fallback for stopping vibration.
   */
  private stopVibrationBrowser(): void {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
        console.log(`${VibrationService.TAG} Browser vibration stopped`);
      }
    } catch (err) {
      console.error(`${VibrationService.TAG} Browser stopVibration failed:`, err);
    }
  }
}
