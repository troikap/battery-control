import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AudioManagement } from '@ionic-native/audio-management/ngx';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';
import { BatteryStatus } from '@ionic-native/battery-status/ngx';
import { Vibration } from '@ionic-native/vibration/ngx';
import { ModalController } from '@ionic/angular';
import { ConfigHelper } from 'src/app/helpers/config.helper';
import { ToastHelper } from 'src/app/helpers/toast.helper';
import { Battery } from 'src/app/models/battery.model';
import { BatteryProvider } from 'src/app/providers/battery.provider';
import { SoundComponent } from '../modals/sound/sound.component';
import { Plugins } from '@capacitor/core';
const { LocalNotifications } = Plugins;

@Component({
  selector: 'app-battery',
  templateUrl: './battery.page.html',
  styleUrls: ['./battery.page.scss'],
})
export class BatteryPage implements OnInit {
  public batteryStatusChange;
  public currentBatteryStatus: Battery;
  public myPlayer: any;
  public myPlayerTest: any;
  public nivel: {lower: number, upper: number};
  public isActivatedSound;
  public activatedAlarm;
  private tempChange;
  public sound;// = {id: 1, value: "assets/sounds/sound-1.mp3"}
  public levelSound = 0;
  public maxLevelSound = 15;
  public promLevelSound = 0;
  private intervalPlayerTest;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private batteryProvider: BatteryProvider,
    private toastHelper: ToastHelper,
    private modalController: ModalController,
    private configHelper: ConfigHelper,
    private batteryStatus: BatteryStatus,
    private backgroundMode: BackgroundMode,
    private audioManagement: AudioManagement,
    private vibration: Vibration
    ) { 
    console.log(' Constructor BatteryPage')
    this.getConfig();
    this.nivel = this.configHelper.getNivel();
    this.currentBatteryStatus = this.batteryProvider.getStatusBattery();
  }
  
  ngOnInit() {
    console.log('ngOnInit BatteryPage')
    this.myPlayer = document.getElementById('player');
    this.myPlayerTest = document.getElementById('sound-test');
  }

  initTask() {
    this.onStartBateryControl();
    this.changeDetectorRef.detectChanges();
    this.setConfigLevelSound();
    this.registerLocalNotification();
    this.initIntervalPlayerTest();
  }

  initIntervalPlayerTest() {
    this.intervalPlayerTest = setInterval( async () => {
      try {
        if (!this.myPlayerTest) {
          console.log('NO SE ENCONTRO EL AUDIO')
          this.toastHelper.presentToast('No se encontro el audio - myPlayerTest', 1500, 'danger');
          return;
        }
        await this.myPlayerTest.play();
        setTimeout( async () => {
          await this.myPlayerTest.load();
        }, 3000);
        window.navigator.vibrate(0) && window.navigator.vibrate([2000,500,1000]);
        // this.vibration && this.vibration.vibrate([2000,1000,2000]);
      } catch (err) {
        console.log('Problemas al resolver initIntervalPlayerTest ', err);
      }
    }, 5000);
  }

  stopSoundTest() {
    clearInterval(this.intervalPlayerTest);
    this.intervalPlayerTest = null;
    this.toastHelper.presentToast('Intervalo myPlayerTest parado', 1500, 'success');
  }

  async registerLocalNotification() {
    await LocalNotifications.requestPermission();
    LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'CHAT_MSG',
          actions: [
            {
              id: 'view',
              title: 'Open Chat'
            },
            {
              id: 'remove',
              title: 'Dismiss',
              destructive: true
            },
            {
              id: 'view',
              title: 'Open Chat'
            },
          ]
        }
      ]
    })
  }

  async setNotification(msj: string) {
    console.log('sonido ', this.sound.value )
    const notifs = await LocalNotifications.schedule({
      notifications: [
        {
          title: "Cuide su bateria",
          body: msj,
          id: 1,
          // actionTypeId: "",
          extra: {
            data: 'Pasa tu informacion para manejarla'
          },
        }
      ]
    });
  }

  async setNotificationAdvance(msj: string) {
    console.log('sonido ', this.sound.value )
    const notifs = await LocalNotifications.schedule({
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
            { id: 'face', url: 'res://public/assets/imgs/notification.jpg'}
          ]
        }
      ]
    });
  }

  async setConfigLevelSound() {
    try {
      const maxVolumen = await this.audioManagement.getMaxVolume(AudioManagement.VolumeType.MUSIC);
      const volumen = await this.audioManagement.getVolume(AudioManagement.VolumeType.MUSIC )
      if (maxVolumen) { this.maxLevelSound = maxVolumen.maxVolume }
      if (volumen) { this.levelSound = volumen.volume }
      this.promLevelSound = Math.trunc((this.levelSound * 100) / this.maxLevelSound);
    } catch (err) {
      console.log('CATCH - setConfigLevelSound ', err);
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
    // this.vibration && this.vibration.vibrate([2000,1000,2000,2000,1000,2000,2000,1000,2000,2000,1000,2000]);
    this.setNotification(msj);
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
    // this.vibration && this.vibration.vibrate(0);
    this.changeDetectorRef.detectChanges();
  }

  onChangeNivel() {
    this.tempChange = setTimeout(() => {
      this.configHelper.setNivel(this.nivel);
    }, 200);
  }

  onStartBateryControl() {
    this.batteryStatus.onChange().subscribe((status: Battery) => {
      this.backgroundMode.wakeUp();
      this.currentBatteryStatus = status;
      this.batteryProvider.setStatusBattery(status);
      if (this.nivel && status.level <= this.nivel.lower && !status.isPlugged) {
        this.playPlayer('Por favor conecte su celular');
      }
      if (this.nivel && status.level >= this.nivel.upper && status.isPlugged) {
        this.playPlayer('Por favor desconecte su celular');
      }
      this.changeDetectorRef.detectChanges();
    });
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

  async onClickGetVolumen() {
    console.log('Get volumen ')
    try {
      const value: AudioManagement.AudioModeReturn = await this.audioManagement.getAudioMode()
      console.log('getAudioMode Device audio mode is ' + value.label + ' (' + value.audioMode + ') ');
    } catch (err) {
      console.log('CATCH - onClickGetVolumen ', err);
    }
    try {
      const value = await this.audioManagement.getVolume(AudioManagement.VolumeType.MUSIC )
      console.log('getVolume MUSIC  Device audio mode is ' + value.volume);
    } catch (err) {
      console.log('CATCH - getVolume MUSIC  ', err);
    }
  }

  async setConfigAudio() {
    this.promLevelSound = Math.trunc((this.levelSound * 100) / this.maxLevelSound);
    try {
      await this.audioManagement.setVolume( AudioManagement.VolumeType.MUSIC, this.levelSound);
    } catch (err) {
      console.log('CATCH - setConfigAudio ', err);
    }
  }
}
