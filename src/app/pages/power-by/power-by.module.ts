import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PowerByPageRoutingModule } from './power-by-routing.module';

import { PowerByPage } from './power-by.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PowerByPageRoutingModule
  ],
  declarations: [PowerByPage]
})
export class PowerByPageModule {}
