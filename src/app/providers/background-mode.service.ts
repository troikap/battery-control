import { Injectable, NgZone } from '@angular/core';
import { Capacitor } from '@capacitor/core';

export interface BackgroundModeDefaults {
  title: string;
  text: string;
  bigText: boolean;
  resume: boolean;
  silent: boolean;
  hidden: boolean;
  color: string | undefined;
  icon: string;
}

/**
 * Wrapper around cordova-plugin-background-mode for Capacitor.
 * Only works on native platforms (Android/iOS) — gracefully no-ops in browser.
 */
@Injectable({ providedIn: 'root' })
export class BackgroundModeService {
  private plugin: any = null;
  private _isEnabled = false;
  private _isInitialized = false;
  private listeners: Array<{ event: string; callback: Function; scope: any }> = [];

  constructor(private zone: NgZone) {}

  /**
   * Lazy-resolve the Cordova plugin reference.
   * Returns null when running in the browser / dev server.
   */
  private getPlugin(): any {
    if (this.plugin !== null) {
      return this.plugin;
    }

    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    // cordova-plugin-background-mode registers itself on `cordova.plugins.BackgroundMode`
    const w = window as any;
    if (w.cordova?.plugins?.BackgroundMode) {
      this.plugin = w.cordova.plugins.BackgroundMode;
      return this.plugin;
    }

    console.warn('[BackgroundModeService] Plugin not found on native platform.');
    return null;
  }

  /**
   * Initialise the background mode with custom notification settings.
   * Safe to call multiple times — only the first call has effect.
   */
  init(options?: Partial<BackgroundModeDefaults>): void {
    if (this._isInitialized) {
      return;
    }

    const plugin = this.getPlugin();
    if (!plugin) {
      // Running in browser — nothing to initialise.
      return;
    }

    try {
      // Set sensible defaults for a battery monitoring app
      plugin.setDefaults({
        title: 'Battery Control activo',
        text: 'Monitoreando nivel de batería en segundo plano.',
        bigText: false,
        resume: true,
        silent: false,
        hidden: true,
        color: '536A58',   // matches capacitor.config.json android background
        icon: 'icon',
        ...options,
      });
      this._isInitialized = true;
      // Initialised with defaults.
    } catch (err) {
      console.error('[BackgroundModeService] Error during init:', err);
    }
  }

  /**
   * Activate background mode so the app stays alive when minimised.
   */
  enable(): void {
    if (this._isEnabled) {
      return;
    }

    const plugin = this.getPlugin();
    if (!plugin) {
      // enable() skipped — running in browser.
      return;
    }

    try {
      plugin.enable();
      this._isEnabled = true;
      // Background mode enabled.
    } catch (err) {
      console.error('[BackgroundModeService] Error enabling:', err);
    }
  }

  /**
   * Deactivate background mode.
   */
  disable(): void {
    if (!this._isEnabled) {
      return;
    }

    const plugin = this.getPlugin();
    if (!plugin) {
      // disable() skipped — running in browser.
      return;
    }

    try {
      plugin.disable();
      this._isEnabled = false;
      // Background mode disabled.
    } catch (err) {
      console.error('[BackgroundModeService] Error disabling:', err);
    }
  }

  /**
   * Convenience toggle.
   */
  setEnabled(enable: boolean): void {
    if (enable) {
      this.enable();
    } else {
      this.disable();
    }
  }

  /**
   * Whether background mode has been enabled via enable().
   */
  isEnabled(): boolean {
    return this._isEnabled;
  }

  /**
   * Whether the plugin considers itself active (platform-dependent).
   */
  isActive(): boolean {
    const plugin = this.getPlugin();
    if (!plugin) {
      return false;
    }
    try {
      return plugin.isActive();
    } catch {
      return false;
    }
  }

  /**
   * Update the foreground notification while background mode is active.
   */
  configure(options: Partial<BackgroundModeDefaults>): void {
    const plugin = this.getPlugin();
    if (!plugin) {
      return;
    }
    try {
      plugin.configure(options);
    } catch (err) {
      console.error('[BackgroundModeService] Error configuring:', err);
    }
  }

  /**
   * Disable Android battery optimisations for this app.
   */
  disableBatteryOptimizations(): void {
    const plugin = this.getPlugin();
    if (!plugin) {
      return;
    }
    try {
      plugin.disableBatteryOptimizations();
    } catch (err) {
      console.error('[BackgroundModeService] Error disabling battery optimizations:', err);
    }
  }

  /**
   * Subscribe to plugin events: 'enable', 'disable', 'activate', 'deactivate'.
   */
  on(event: string, callback: Function, scope?: any): void {
    const plugin = this.getPlugin();
    if (!plugin) {
      return;
    }
    try {
      plugin.on(event, callback, scope || window);
      this.listeners.push({ event, callback, scope });
    } catch (err) {
      console.error(`[BackgroundModeService] Error subscribing to '${event}':`, err);
    }
  }

  /**
   * Unsubscribe from a previously registered event callback.
   */
  un(event: string, callback: Function): void {
    const plugin = this.getPlugin();
    if (!plugin) {
      return;
    }
    try {
      plugin.un(event, callback);
      this.listeners = this.listeners.filter(
        (l) => !(l.event === event && l.callback === callback)
      );
    } catch (err) {
      console.error(`[BackgroundModeService] Error unsubscribing from '${event}':`, err);
    }
  }

  /**
   * Clean up all event listeners and disable background mode.
   * Call this when the owning component is destroyed.
   */
  destroy(): void {
    for (const listener of this.listeners) {
      this.un(listener.event, listener.callback);
    }
    this.listeners = [];
    this.disable();
  }
}
