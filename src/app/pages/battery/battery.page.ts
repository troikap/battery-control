import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ConfigHelper } from 'src/app/helpers/config.helper';
import { ToastHelper } from 'src/app/helpers/toast.helper';
import { Battery } from 'src/app/models/battery.model';
import { BatteryProvider } from 'src/app/providers/battery.provider';
import { BackgroundModeService } from 'src/app/providers/background-mode.service';
import { SoundComponent } from '../modals/sound/sound.component';

@Component({
  selector: 'app-battery',
  templateUrl: './battery.page.html',
  styleUrls: ['./battery.page.scss'],
  standalone: false,
})
export class BatteryPage implements OnInit, OnDestroy, ViewWillEnter {
  public currentBatteryStatus: Battery = { level: 0, isPlugged: false };
  public myPlayer: any;
  public nivel: {lower: number, upper: number} = { lower: 20, upper: 80 };
  public isActivatedSound = false;
  public activatedAlarm = false;
  private tempChange: any;
  public sound: any = { id: 1, value: 'assets/sounds/sonido-1.mp3' };
  public batteryInitialized = false;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private batteryProvider: BatteryProvider,
    private toastHelper: ToastHelper,
    private modalController: ModalController,
    private configHelper: ConfigHelper,
    private backgroundModeService: BackgroundModeService,
    ) {}

  async ionViewWillEnter() {
    await this.configHelper.ready();
    this.nivel = this.configHelper.getNivel();
    this.getConfig();
    this.currentBatteryStatus = this.batteryProvider.getStatusBattery();
    this.batteryInitialized = this.batteryProvider.isInitialized();
    this.backgroundModeService.init();
    this.initTask();
  }

  ngOnInit() {
    this.myPlayer = document.getElementById('player');
  }

  ngOnDestroy() {
    this.cleanUp();
    // Disable background mode when leaving the page
    this.backgroundModeService.destroy();
  }

  cleanUp() {
    if (this.tempChange) {
      clearTimeout(this.tempChange);
      this.tempChange = null;
    }
  }

  initTask() {
    this.onStartBateryControl();
    this.changeDetectorRef.detectChanges();
    this.registerLocalNotification();
  }

  async registerLocalNotification() {
    try {
      await LocalNotifications.requestPermissions();
    } catch (err) {
      console.error('LocalNotifications permissions error:', err);
    }
  }

  async setNotification(msj: string) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Cuide su bateria",
            body: msj,
            id: 1,
            extra: {
              data: 'Pasa tu informacion para manejarla'
            },
          }
        ]
      });
    } catch (err) {
      console.error('Error scheduling notification:', err);
    }
  }

  async setNotificationAdvance(msj: string = 'Batería fuera de rango') {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Cuide su bateria",
            body: msj,
            id: 2,
            actionTypeId: "CHAT_MSG",
            extra: {
              data: 'Pasa tu informacion para manejarla'
            },
            attachments: [
              { id: 'face', url: 'res://public/assets/imgs/notification.jpg' as any }
            ]
          }
        ]
      });
    } catch (err) {
      console.error('Error scheduling advance notification:', err);
    }
  }

  getConfig() {
    this.getSound();
    this.getIsActivatedAlarm();
  }

  getSound() {
    this.sound = this.configHelper.getSound();
  }

  getIsActivatedAlarm() {
    this.activatedAlarm = this.configHelper.getIsActivatedAlarm();
  }

  setIsActivatedAlarm() {
    this.configHelper.setIsActivatedAlarm(this.activatedAlarm);
  }

  activateAlarm() {
    this.activatedAlarm = !this.activatedAlarm;
    this.setIsActivatedAlarm();
    if (this.activatedAlarm) {
      this.toastHelper.presentToast('Alarmas activadas', 1500, 'success');
    } else {
      this.toastHelper.presentToast('Alarmas desactivadas', 1500, 'warning');
    }
  }

  playPlayer(msj?: string) {
    if (!this.myPlayer) {
      this.toastHelper.presentToast('No se encontro el audio - playPlayer', 1500, 'danger');
      return;
    }
    if (!this.activatedAlarm) { return; }
    this.isActivatedSound = true;
    this.myPlayer.play();
    window.navigator.vibrate(0) && window.navigator.vibrate([2000,500,1000]);
    this.setNotification(msj ?? 'Batería fuera de rango');
    this.changeDetectorRef.detectChanges();
  }

  loadPlayer() {
    if (!this.myPlayer) {
      this.toastHelper.presentToast('No se encontro el audio - loadPlayer', 1500, 'danger');
      return;
    }
    this.isActivatedSound = false;
    this.myPlayer.load();
    window.navigator.vibrate(0);
    this.changeDetectorRef.detectChanges();
  }

  onChangeNivel() {
    this.tempChange = setTimeout(() => {
      this.configHelper.setNivel(this.nivel);
    }, 200);
  }

  onStartBateryControl() {
    this.batteryProvider.initBatteryListener((status: Battery) => {
      this.currentBatteryStatus = status;
      this.batteryInitialized = true;
      if (this.nivel && status.level <= this.nivel.lower && !status.isPlugged) {
        this.playPlayer('Por favor conecte su celular');
      }
      if (this.nivel && status.level >= this.nivel.upper && status.isPlugged) {
        this.playPlayer('Por favor desconecte su celular');
      }
      this.changeDetectorRef.detectChanges();
    });

    this.backgroundModeService.enable();
    this.changeDetectorRef.detectChanges();
  }

  async onClickSound() {
    const modal = await this.modalController.create({
      component: SoundComponent,
      cssClass: 'my-custom-class'
    });
    await modal.present();
    modal.onWillDismiss().then( (data) => {
      if (data.data) { this.getSound(); }
    });
  }
}
