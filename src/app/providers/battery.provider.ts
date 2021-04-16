import { Injectable } from '@angular/core';
import { BatteryStatus } from '@ionic-native/battery-status/ngx';
import { Battery } from '../models/battery.model';

@Injectable({
  providedIn: 'root'
})
export class BatteryProvider {
  private batteryStatusChange;
  private lastStatusBattery: Battery;
  private nivel: {lower: number, upper: number} = {lower: 20, upper: 80};

  constructor(
    private batteryStatus: BatteryStatus,
  ) {
    this.createBatteryStatusChange();
   }

  getBatteryStatusChange() {
    return this.batteryStatusChange;
  }

  private createBatteryStatusChange() {
    this.batteryStatusChange = this.batteryStatus.onChange();
  }

  setNivel(nivel: {lower: number, upper: number}) {
    this.nivel = nivel;
  }

  getNivel() {
    return this.nivel;
  }

  setStatusBattery( statusBattery: Battery) {
    this.lastStatusBattery = statusBattery;
  }

  getStatusBattery() {
    return this.lastStatusBattery;
  }
}
