import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SoundComponent } from './sound/sound.component';

@NgModule({
  declarations: [
    SoundComponent
  ],
  exports: [
  ],
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ]
})

export class ComponentesModule { }
