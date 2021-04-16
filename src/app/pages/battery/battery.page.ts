import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ConfigHelper } from 'src/app/helpers/config.helper';
import { ToastHelper } from 'src/app/helpers/toast.helper';
import { Battery } from 'src/app/models/battery.model';
import { BatteryProvider } from 'src/app/providers/battery.provider';
import { SoundComponent } from '../modals/sound/sound.component';

@Component({
  selector: 'app-battery',
  templateUrl: './battery.page.html',
  styleUrls: ['./battery.page.scss'],
})
export class BatteryPage implements OnInit {
  public batteryStatusChange;
  public currentBatteryStatus: Battery;
  public myPlayer: any;
  public nivel: {lower: number, upper: number};
  public isActivatedSound;
  public activatedAlarm = false;
  private tempChange;
  public sound;// = {id: 1, value: "assets/sounds/sound-1.mp3"}

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private batteryProvider: BatteryProvider,
    private toastHelper: ToastHelper,
    private modalController: ModalController,
    private configHelper: ConfigHelper
  ) { 
    this.onStartBateryControl();
    this.nivel = this.batteryProvider.getNivel();
    this.currentBatteryStatus = this.batteryProvider.getStatusBattery();
  }
  
  ngOnInit() {
    console.log('ngOnInit BatteryPage')
    this.getSound();
    this.getConfig();
    this.myPlayer = document.getElementById('player');
    this.changeDetectorRef.detectChanges();
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

  playPlayer() {
    console.log('aaa ',this.myPlayer)
    if (!this.activatedAlarm) { return; }
    this.isActivatedSound = true;
    this.myPlayer.play();
    this.changeDetectorRef.detectChanges();
  }

  loadPlayer() {
    this.isActivatedSound = false;
    this.myPlayer.load();
    this.changeDetectorRef.detectChanges();
  }

  onChangeNivel() {
    this.tempChange = setTimeout(() => {
      this.batteryProvider.setNivel(this.nivel);
    }, 200);
  }

  onStartBateryControl() {
    this.batteryProvider.getBatteryStatusChange().subscribe((status: Battery) => {
      console.log("status ",status)
      this.currentBatteryStatus = status;
      this.batteryProvider.setStatusBattery(status);
      if (status.level <= this.nivel.lower && !status.isPlugged) {
        this.playPlayer();
        setTimeout(() => {
          this.loadPlayer();
        }, 60000);
      }
      if (status.level >= this.nivel.upper && status.isPlugged) {
        this.playPlayer();
        setTimeout(() => {
          this.loadPlayer();
        }, 60000);
      }
      this.changeDetectorRef.detectChanges();
    });
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
