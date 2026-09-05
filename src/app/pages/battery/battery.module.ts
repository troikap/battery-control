import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonLabel,
  IonContent,
  IonList,
  IonItem,
  IonRange,
  IonSpinner,
  IonRow,
  IonCol,
  IonFab,
  IonFabButton,
} from '@ionic/angular';

import { BatteryPageRoutingModule } from './battery-routing.module';
import { ComponentesModule } from '../modals/componentes.module';

import { BatteryPage } from './battery.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    BatteryPageRoutingModule,
    ComponentesModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonLabel,
    IonContent,
    IonList,
    IonItem,
    IonRange,
    IonSpinner,
    IonRow,
    IonCol,
    IonFab,
    IonFabButton,
  ],
  declarations: [BatteryPage]
})
export class BatteryPageModule {}
