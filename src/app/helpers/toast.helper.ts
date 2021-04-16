import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class ToastHelper {
  constructor(private toastController: ToastController) {}

  public async presentToast(
    message: string,
    duration: number,
    color: string,
    position?: any
  ) {
    const toast = await this.toastController.create({
      message,
      duration,
      color,
      position
    });
    await toast.present();
  }
}
