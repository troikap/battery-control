import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { ConfigHelper } from 'src/app/helpers/config.helper';

@Component({
  selector: 'app-sound',
  templateUrl: './sound.component.html',
  styleUrls: ['./sound.component.scss'],
})
export class SoundComponent implements OnInit {
  public soundSelected;
  public sounds: {id: number, value: string}[] = [];
  public myPlayer: any;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private configHelper: ConfigHelper,
    private modalController: ModalController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.myPlayer = document.getElementById('player-modal');
    this.getSounds();
    this.getSoundSelected();
  }

  getSounds() {
    this.sounds = this.configHelper.getSounds();
  }

  getSoundSelected() {
    this.soundSelected = this.configHelper.getSound();
  }

  onClickSound(sound) {
    this.soundSelected = sound;
    this.playPlayer();
  }

  onConfirmSound() {
    this.configHelper.setSound(this.soundSelected);
    this.closeModal(true);
  }

  playPlayer() {
    this.loadPlayer();
    this.myPlayer.play();
    this.changeDetectorRef.detectChanges();
  }

  loadPlayer() {
    this.myPlayer.load();
    this.changeDetectorRef.detectChanges();
  }

  onClickCancel() {
    this.closeModal();
  }

  public closeModal(value?: boolean) {
    this.modalController.dismiss(value);
  }

  async presentAlertConfirm() {
    const alert = await this.alertController.create({
      header: 'Confirma cambio de sonido?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        }, {
          text: 'Aceptar',
          handler: () => {
            this.onConfirmSound();
          }
        }
      ]
    });
    await alert.present();
  }
}
