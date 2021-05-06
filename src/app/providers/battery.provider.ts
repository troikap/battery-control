import { Injectable } from '@angular/core';
import { BatteryStatus } from '@ionic-native/battery-status/ngx';
import { Battery } from '../models/battery.model';

@Injectable({
  providedIn: 'root'
})
export class BatteryProvider {
  private batteryStatusChange;
  private lastStatusBattery: Battery;

  constructor(
    private batteryStatus: BatteryStatus,
  ) {
    this.createBatteryStatusChange();
  }

  getBatteryStatus() {
    return this.batteryStatus;
  }

  getBatteryStatusChange() {
    return this.batteryStatusChange;
  }

  private createBatteryStatusChange() {
    this.batteryStatusChange = this.batteryStatus.onChange();
  }

  setStatusBattery( statusBattery: Battery) {
    this.lastStatusBattery = statusBattery;
  }

  getStatusBattery() {
    return this.lastStatusBattery;
  }
}
