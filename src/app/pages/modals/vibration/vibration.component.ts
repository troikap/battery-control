import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { ConfigHelper } from 'src/app/helpers/config.helper';
import { VibrationService } from 'src/app/providers/vibration.service';
import { VibrationPattern } from 'src/app/models/vibration.model';

@Component({
  selector: 'app-vibration',
  templateUrl: './vibration.component.html',
  styleUrls: ['./vibration.component.scss'],
  standalone: false,
})
export class VibrationComponent implements OnInit, OnDestroy {
  public vibrationSelected!: VibrationPattern;
  public vibrations: VibrationPattern[] = [];
  private isVibrating = false;
  private vibrationTimeout: any = null;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private configHelper: ConfigHelper,
    private modalController: ModalController,
    private alertController: AlertController,
    private vibrationService: VibrationService
  ) {}

  ngOnInit() {
    this.getVibrations();
    this.getVibrationSelected();
  }

  ngOnDestroy() {
    // Limpiar timeout al destruir el componente
    if (this.vibrationTimeout) {
      clearTimeout(this.vibrationTimeout);
    }
  }

  getVibrations() {
    this.vibrations = this.configHelper.getVibrationPatterns();
  }

  getVibrationSelected() {
    this.vibrationSelected = this.configHelper.getVibration();
  }

  onClickVibration(vibration: VibrationPattern) {
    // Evitar procesar clics si ya hay una vibración en curso
    if (this.isVibrating) {
      return;
    }

    this.vibrationSelected = vibration;
    this.previewVibration();
  }

  async previewVibration() {
    // Marcar que estamos vibrando
    this.isVibrating = true;
    this.changeDetectorRef.detectChanges();

    try {
      await this.vibrationService.vibrate(this.vibrationSelected.pattern);
    } catch (err) {
      console.warn('[VibrationComponent] Error during vibration preview:', err);
    } finally {
      // Calcular duración total del patrón
      const totalDuration = this.vibrationSelected.pattern.reduce((sum, val) => sum + val, 0);
      
      // Esperar a que termine la vibración antes de permitir otro clic
      this.vibrationTimeout = setTimeout(() => {
        this.isVibrating = false;
        this.changeDetectorRef.detectChanges();
      }, totalDuration);
    }
  }

  stopVibration() {
    this.vibrationService.stopVibration();
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
