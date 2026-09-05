import { ChangeDetectorRef, Component, NgZone, OnInit, OnDestroy } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ConfigHelper } from 'src/app/helpers/config.helper';
import { ToastHelper } from 'src/app/helpers/toast.helper';
import { Battery } from 'src/app/models/battery.model';
import { BatteryProvider } from 'src/app/providers/battery.provider';
import { BackgroundModeService } from 'src/app/providers/background-mode.service';
import { SoundComponent } from '../modals/sound/sound.component';
import { VibrationComponent } from '../modals/vibration/vibration.component';
import { VibrationPattern, VIBRATION_PATTERNS, DEFAULT_VIBRATION_PATTERN_ID } from 'src/app/models/vibration.model';

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
  public vibration: VibrationPattern = VIBRATION_PATTERNS.find(v => v.id === DEFAULT_VIBRATION_PATTERN_ID)!;
  public batteryInitialized = false;

  // Stored callback references for proper cleanup
  private onActivateHandler: Function | null = null;
  private onDeactivateHandler: Function | null = null;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private zone: NgZone,
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

    // Enable background mode before starting battery monitoring
    this.backgroundModeService.init();
    this.backgroundModeService.enable();
    this.backgroundModeService.disableBatteryOptimizations();

    // Listen for app foreground/background transitions
    this.registerBackgroundModeEvents();

    this.initTask();
  }

  ngOnInit() {
    this.myPlayer = document.getElementById('player');
  }

  ngOnDestroy() {
    this.cleanUp();
    this.unregisterBackgroundModeEvents();
    this.batteryProvider.destroy();
    this.backgroundModeService.disable();
  }

  cleanUp() {
    if (this.tempChange) {
      clearTimeout(this.tempChange);
      this.tempChange = null;
    }
  }

  // -------------------------------------------------------------------------
  // Background mode lifecycle
  // -------------------------------------------------------------------------

  /**
   * Subscribe to cordova-plugin-background-mode events to detect when the app
   * transitions between foreground and background. On resume the battery status
   * is force-refreshed so the UI always shows current data.
   */
  private registerBackgroundModeEvents(): void {
    this.onActivateHandler = () => {
      console.log('[BatteryPage] App entered background');
    };
    this.backgroundModeService.on('activate', this.onActivateHandler);

    this.onDeactivateHandler = () => {
      console.log('[BatteryPage] App resumed from background');
      this.zone.run(() => {
        this.batteryProvider.forceRefresh();
        this.changeDetectorRef.detectChanges();
      });
    };
    this.backgroundModeService.on('deactivate', this.onDeactivateHandler);
  }

  private unregisterBackgroundModeEvents(): void {
    if (this.onActivateHandler) {
      this.backgroundModeService.un('activate', this.onActivateHandler);
      this.onActivateHandler = null;
    }
    if (this.onDeactivateHandler) {
      this.backgroundModeService.un('deactivate', this.onDeactivateHandler);
      this.onDeactivateHandler = null;
    }
  }

  // -------------------------------------------------------------------------
  // Initialisation
  // -------------------------------------------------------------------------

  initTask() {
    this.registerLocalNotification();
    this.onStartBateryControl();
    this.changeDetectorRef.detectChanges();
  }

  async registerLocalNotification() {
    try {
      await LocalNotifications.requestPermissions();
    } catch (err) {
      console.error('LocalNotifications permissions error:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Local notifications
  // -------------------------------------------------------------------------

  async setNotification(msj: string) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Cuide su bateria',
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
            title: 'Cuide su bateria',
            body: msj,
            id: 2,
            actionTypeId: 'CHAT_MSG',
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

  // -------------------------------------------------------------------------
  // Config helpers
  // -------------------------------------------------------------------------

  getConfig() {
    this.getSound();
    this.getVibration();
    this.getIsActivatedAlarm();
  }

  getSound() {
    this.sound = this.configHelper.getSound();
  }

  getVibration() {
    this.vibration = this.configHelper.getVibration();
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

  // -------------------------------------------------------------------------
  // Audio playback (foreground) + notification (works in background)
  // -------------------------------------------------------------------------

  /**
   * Play the alarm sound and fire a local notification.
   *
   * HTML5 audio playback is only possible in the foreground; if it fails
   * (e.g. the app is backgrounded) the LocalNotification will still be
   * delivered with the configured notification sound from capacitor.config.json.
   */
  playPlayer(msj?: string) {
    if (!this.activatedAlarm) { return; }

    this.isActivatedSound = true;

    // Attempt HTML5 audio — will fail silently in background
    try {
      if (this.myPlayer) {
        const playPromise = this.myPlayer.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            // Audio play blocked (app in background / no user interaction)
          });
        }
      }
    } catch (e) {
      // Audio element not available in this context
    }

    // Vibración configurable
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
      navigator.vibrate(this.configHelper.getVibrationPattern());
    }

    // LocalNotification fires even when the app is backgrounded
    this.setNotification(msj ?? 'Batería fuera de rango');
    this.changeDetectorRef.detectChanges();
  }

  loadPlayer() {
    if (!this.myPlayer) {
      this.toastHelper.presentToast('No se encontro el audio - loadPlayer', 1500, 'danger');
      return;
    }
    this.isActivatedSound = false;
    try {
      this.myPlayer.load();
    } catch (e) {
      // Ignore errors when backgrounded
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
    this.changeDetectorRef.detectChanges();
  }

  // -------------------------------------------------------------------------
  // Battery monitoring
  // -------------------------------------------------------------------------

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

    this.changeDetectorRef.detectChanges();
  }

  // -------------------------------------------------------------------------
  // Sound picker modal
  // -------------------------------------------------------------------------

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

  async onClickVibration() {
    const modal = await this.modalController.create({
      component: VibrationComponent,
      cssClass: 'my-custom-class'
    });
    await modal.present();
    modal.onWillDismiss().then((data) => {
      if (data.data) { this.getVibration(); }
    });
  }
}
