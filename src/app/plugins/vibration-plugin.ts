import { Capacitor } from '@capacitor/core';

export interface VibrationPluginInterface {
  /**
   * Vibrar con patrón personalizado.
   * El array contiene duraciones en ms: [vibrar, pausa, vibrar, ...].
   */
  vibrate(options: { pattern: number[] }): Promise<{ success: boolean }>;

  /**
   * Vibrar una sola vez con duración en ms.
   */
  vibrateOnce(options: { duration: number }): Promise<{ success: boolean }>;

  /**
   * Detener cualquier vibración en curso.
   */
  stopVibration(): Promise<{ success: boolean }>;
}

/**
 * Safe accessor for the native Vibration plugin.
 * Uses Capacitor.Plugins directly instead of registerPlugin()
 * to avoid crashes when the native plugin is not registered.
 */
function getVibrationPlugin(): VibrationPluginInterface | null {
  try {
    const w = window as any;
    const capacitor = w.Capacitor;

    if (!capacitor || !capacitor.Plugins) {
      return null;
    }

    const plugin = capacitor.Plugins.Vibration;
    if (plugin) {
      return plugin as VibrationPluginInterface;
    }

    return null;
  } catch (err) {
    console.error('[VibrationPlugin] Error accessing native plugin:', err);
    return null;
  }
}

/**
 * Safe wrapper that exposes the Vibration plugin API.
 * Returns null-safe methods that won't crash if the plugin is unavailable.
 */
const VibrationPlugin: VibrationPluginInterface = {
  async vibrate(options: { pattern: number[] }): Promise<{ success: boolean }> {
    const plugin = getVibrationPlugin();
    if (!plugin) {
      console.warn('[VibrationPlugin] Native plugin not available for vibrate()');
      return { success: false };
    }
    return plugin.vibrate(options);
  },

  async vibrateOnce(options: { duration: number }): Promise<{ success: boolean }> {
    const plugin = getVibrationPlugin();
    if (!plugin) {
      console.warn('[VibrationPlugin] Native plugin not available for vibrateOnce()');
      return { success: false };
    }
    return plugin.vibrateOnce(options);
  },

  async stopVibration(): Promise<{ success: boolean }> {
    const plugin = getVibrationPlugin();
    if (!plugin) {
      console.warn('[VibrationPlugin] Native plugin not available for stopVibration()');
      return { success: false };
    }
    return plugin.stopVibration();
  },
};

export default VibrationPlugin;
