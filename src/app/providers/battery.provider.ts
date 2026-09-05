import { Injectable, NgZone } from '@angular/core';
import { Battery } from '../models/battery.model';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class BatteryProvider {
  private lastStatusBattery: Battery = { level: 0, isPlugged: false };
  private initialized = false;
  private callback: ((status: Battery) => void) | null = null;
  private pollingTimer: any = null;
  private cleanupFns: Array<() => void> = [];

  private static readonly POLL_INTERVAL_MS = 30000;

  constructor(private zone: NgZone) {}

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Start monitoring battery status.
   *
   * - Foreground: uses the Web Battery API for real-time events.
   * - Native background: relies on cordova-plugin-batterystatus which fires
   *   window-level `batterystatus` events even when the app is backgrounded.
   * - Safety net: a 30-second polling interval ensures status is always current.
   */
  async initBatteryListener(callback: (status: Battery) => void): Promise<void> {
    this.callback = callback;

    // Web Battery API — works in foreground on all platforms (browser, native webview)
    await this.initWebBatteryListener();

    // cordova-plugin-batterystatus — native events that fire in background too
    if (Capacitor.isNativePlatform()) {
      this.initNativeBatteryListener();
    }

    // Polling fallback — guarantees fresh status even if events are missed
    this.startPolling();
  }

  // -------------------------------------------------------------------------
  // Web Battery API (foreground only)
  // -------------------------------------------------------------------------

  private async initWebBatteryListener(): Promise<void> {
    try {
      const nav = navigator as any;
      if (!nav.getBattery) {
        console.warn('[BatteryProvider] Web Battery API not supported');
        this.initialized = true;
        return;
      }

      const battery = await nav.getBattery();

      const updateBattery = () => {
        this.zone.run(() => {
          const status: Battery = {
            level: Math.round(battery.level * 100),
            isPlugged: battery.charging,
          };
          this.lastStatusBattery = status;
          this.initialized = true;
          this.emit(status);
        });
      };

      battery.addEventListener('chargingchange', updateBattery);
      battery.addEventListener('levelchange', updateBattery);

      this.cleanupFns.push(() => {
        battery.removeEventListener('chargingchange', updateBattery);
        battery.removeEventListener('levelchange', updateBattery);
      });

      updateBattery();
    } catch (err) {
      console.error('[BatteryProvider] Error initializing Web Battery API:', err);
      this.initialized = true;
    }
  }

  // -------------------------------------------------------------------------
  // Native Battery Plugin — cordova-plugin-batterystatus
  // -------------------------------------------------------------------------

  /**
   * Register for native battery status events.
   *
   * cordova-plugin-batterystatus fires window-level events:
   *   - `batterystatus`  : { level: number, isPlugged: boolean }
   *   - `batterylow`     : { level: number, isPlugged: boolean }
   *   - `batterycritical`: { level: number, isPlugged: boolean }
   *
   * These events continue to fire even when the app is backgrounded on Android.
   */
  private initNativeBatteryListener(): void {
    const batteryStatusHandler = (status: any) => {
      this.zone.run(() => {
        const batteryStatus: Battery = {
          level: status.level,
          isPlugged: status.isPlugged,
        };
        this.lastStatusBattery = batteryStatus;
        this.initialized = true;
        this.emit(batteryStatus);
      });
    };

    window.addEventListener('batterystatus', batteryStatusHandler, false);
    this.cleanupFns.push(() => {
      window.removeEventListener('batterystatus', batteryStatusHandler, false);
    });

    console.log('[BatteryProvider] Native battery listener registered');
  }

  // -------------------------------------------------------------------------
  // Polling fallback (every 30 s)
  // -------------------------------------------------------------------------

  private startPolling(): void {
    this.stopPolling();
    this.pollingTimer = setInterval(() => {
      this.pollBatteryStatus();
    }, BatteryProvider.POLL_INTERVAL_MS);
  }

  private async pollBatteryStatus(): Promise<void> {
    try {
      const nav = navigator as any;
      if (nav.getBattery) {
        const battery = await nav.getBattery();
        this.zone.run(() => {
          const status: Battery = {
            level: Math.round(battery.level * 100),
            isPlugged: battery.charging,
          };
          this.lastStatusBattery = status;
          this.emit(status);
        });
      }
    } catch (err) {
      console.warn('[BatteryProvider] Polling check failed:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Force an immediate battery status check and notify the callback.
   * Should be called when the app resumes from background.
   */
  forceRefresh(): void {
    this.pollBatteryStatus();
  }

  /**
   * Get the last known battery status (synchronous).
   */
  getStatusBattery(): Battery {
    return this.lastStatusBattery;
  }

  /**
   * Clean up all native listeners, polling timer, and callback reference.
   */
  destroy(): void {
    this.stopPolling();
    for (const fn of this.cleanupFns) {
      fn();
    }
    this.cleanupFns = [];
    this.callback = null;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private emit(status: Battery): void {
    if (this.callback) {
      this.callback(status);
    }
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }
}
