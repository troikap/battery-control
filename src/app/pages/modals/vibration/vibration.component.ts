import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { ConfigHelper } from 'src/app/helpers/config.helper';
import { VibrationPattern } from 'src/app/models/vibration.model';

@Component({
  selector: 'app-vibration',
  templateUrl: './vibration.component.html',
  styleUrls: ['./vibration.component.scss'],
  standalone: false,
})
export class VibrationComponent implements OnInit {
  public vibrationSelected!: VibrationPattern;
  public vibrations: VibrationPattern[] = [];

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private configHelper: ConfigHelper,
    private modalController: ModalController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.getVibrations();
    this.getVibrationSelected();
  }

  getVibrations() {
    this.vibrations = this.configHelper.getVibrationPatterns();
  }

  getVibrationSelected() {
    this.vibrationSelected = this.configHelper.getVibration();
  }

  onClickVibration(vibration: VibrationPattern) {
    this.vibrationSelected = vibration;
    this.previewVibration();
  }

  previewVibration() {
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
      navigator.vibrate(this.vibrationSelected.pattern);
    }
    this.changeDetectorRef.detectChanges();
  }

  stopVibration() {
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }

  onConfirmVibration() {
    this.configHelper.setVibration(this.vibrationSelected);
    this.closeModal(true);
  }

  onClickCancel() {
    this.stopVibration();
    this.closeModal();
  }

  public closeModal(value?: boolean) {
    this.modalController.dismiss(value);
  }

  async presentAlertConfirm() {
    const alert = await this.alertController.create({
      header: 'Confirma cambio de vibración?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        }, {
          text: 'Aceptar',
          handler: () => {
            this.onConfirmVibration();
          }
        }
      ]
    });
    await alert.present();
  }
}
