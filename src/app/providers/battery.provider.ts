import { Injectable, NgZone } from '@angular/core';
import { Battery } from '../models/battery.model';

@Injectable({
  providedIn: 'root'
})
export class BatteryProvider {
  private lastStatusBattery: Battery = { level: 0, isPlugged: false };
  private initialized = false;

  constructor(private zone: NgZone) {}

  isInitialized(): boolean {
    return this.initialized;
  }

  async initBatteryListener(callback: (status: Battery) => void): Promise<void> {
    try {
      const nav = navigator as any;
      if (nav.getBattery) {
        const battery = await nav.getBattery();

        const updateBattery = () => {
          this.zone.run(() => {
            const status: Battery = {
              level: Math.round(battery.level * 100),
              isPlugged: battery.charging,
            };
            this.lastStatusBattery = status;
            this.initialized = true;
            callback(status);
          });
        };

        battery.addEventListener('chargingchange', updateBattery);
        battery.addEventListener('levelchange', updateBattery);

        updateBattery();
      } else {
        console.warn('Web Battery API is not supported in this browser');
        this.initialized = true;
      }
    } catch (err) {
      console.error('Error initializing battery listener:', err);
      this.initialized = true;
    }
  }

  getStatusBattery(): Battery {
    return this.lastStatusBattery;
  }
}
