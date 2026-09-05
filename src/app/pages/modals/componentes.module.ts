import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonRow,
  IonCol,
  IonList,
  IonItem,
  IonLabel,
  IonFooter,
} from '@ionic/angular';
import { SoundComponent } from './sound/sound.component';

@NgModule({
  declarations: [
    SoundComponent
  ],
  exports: [
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonRow,
    IonCol,
    IonList,
    IonItem,
    IonLabel,
    IonFooter,
  ]
})

export class ComponentesModule { }
