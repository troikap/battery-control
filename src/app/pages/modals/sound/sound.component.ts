import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { ConfigHelper } from 'src/app/helpers/config.helper';
import { SoundImportService } from 'src/app/services/sound-import.service';
import { SoundOption } from 'src/app/models/sound.model';

@Component({
  selector: 'app-sound',
  templateUrl: './sound.component.html',
  styleUrls: ['./sound.component.scss'],
  standalone: false,
})
export class SoundComponent implements OnInit {
  public soundSelected: any;
  public presetSounds: SoundOption[] = [];
  public importedSounds: SoundOption[] = [];
  public myPlayer: any;
  public canImportMore = true;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private configHelper: ConfigHelper,
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private soundImportService: SoundImportService
  ) {}

  ngOnInit() {
    this.myPlayer = document.getElementById('player-modal');
    this.loadAllSounds();
  }

  async loadAllSounds() {
    const allSounds = await this.configHelper.getAllSounds();
    this.presetSounds = allSounds.filter((s) => s.isPreset);
    this.importedSounds = allSounds.filter((s) => !s.isPreset);
    this.canImportMore = this.soundImportService.canImportMore();
    this.getSoundSelected();
    this.changeDetectorRef.detectChanges();
  }

  getSoundSelected() {
    this.soundSelected = this.configHelper.getSound();
  }

  isSelected(sound: SoundOption): boolean {
    return this.soundSelected && this.soundSelected.id === sound.id;
  }

  onClickSound(sound: SoundOption) {
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

  // ---------------------------------------------------------------------------
  // Import functionality
  // ---------------------------------------------------------------------------

  async importSound() {
    if (!this.canImportMore) {
      this.showToast('No se pueden importar mas sonidos. Elimine uno existente primero.');
      return;
    }

    const imported = await this.soundImportService.pickAudioFile();
    if (imported) {
      this.showToast(`Sonido "${imported.displayName}" importado correctamente`);
      await this.loadAllSounds();
    }
  }

  async confirmRemoveImported(sound: SoundOption) {
    const alert = await this.alertController.create({
      header: 'Eliminar sonido',
      message: `Desea eliminar "${sound.displayName}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.removeImportedSound(sound);
          },
        },
      ],
    });
    await alert.present();
  }

  async removeImportedSound(sound: SoundOption) {
    const removed = await this.soundImportService.removeImportedSound(sound.id as string);
    if (removed) {
      this.showToast(`Sonido "${sound.displayName}" eliminado`);
      // If the removed sound was selected, reset to first preset
      if (this.soundSelected && this.soundSelected.id === sound.id) {
        this.soundSelected = this.presetSounds[0] || null;
      }
      await this.loadAllSounds();
    }
  }

  formatSize(bytes: number): string {
    if (!bytes || bytes === 0) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(1);
    return `${size} ${units[i]}`;
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
}
