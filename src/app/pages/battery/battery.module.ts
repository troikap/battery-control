import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BatteryPageRoutingModule } from './battery-routing.module';

import { BatteryPage } from './battery.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BatteryPageRoutingModule
  ],
  declarations: [BatteryPage]
})
export class BatteryPageModule {}
