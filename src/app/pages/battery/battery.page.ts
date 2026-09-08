import { ChangeDetectorRef, Component, NgZone, OnInit, OnDestroy } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { ModalController, AlertController } from '@ionic/angular';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ConfigHelper } from 'src/app/helpers/config.helper';
import { ToastHelper } from 'src/app/helpers/toast.helper';
import { Battery } from 'src/app/models/battery.model';
import { BatteryProvider } from 'src/app/providers/battery.provider';
import { BackgroundModeService } from 'src/app/providers/background-mode.service';
import { BatteryAlarmService } from 'src/app/providers/battery-alarm.service';
import { VibrationService } from 'src/app/providers/vibration.service';
import { SoundComponent } from '../modals/sound/sound.component';
import { VibrationComponent } from '../modals/vibration/vibration.component';
import { VibrationPattern, VIBRATION_PATTERNS, DEFAULT_VIBRATION_PATTERN_ID } from 'src/app/models/vibration.model';
import {
  PermissionStep,
  PermissionStepType,
} from 'src/app/models/permission-step.model';

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
  private backgroundModeServiceSkipShown = false;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private zone: NgZone,
    private batteryProvider: BatteryProvider,
    private toastHelper: ToastHelper,
    private modalController: ModalController,
    private alertController: AlertController,
    private configHelper: ConfigHelper,
    private backgroundModeService: BackgroundModeService,
    private batteryAlarmService: BatteryAlarmService,
    private vibrationService: VibrationService,
    ) {}

  async ionViewWillEnter() {
    await this.configHelper.ready();
    this.nivel = this.configHelper.getNivel();
    this.getConfig();
    this.currentBatteryStatus = this.batteryProvider.getStatusBattery();
    this.batteryInitialized = this.batteryProvider.isInitialized();

    // Permission flow with explanatory alerts before system redirects
    await this.runPermissionFlow();

    // Enable background mode as fallback for older devices
    this.backgroundModeService.init();
    this.backgroundModeService.enable();

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
    // Note: BatteryAlarmService.destroy() is NOT called here because we want
    // the foreground service to keep running even when the page is destroyed.
    // The service persists independently of the Angular component lifecycle.
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
  // Permission flow orchestration
  // -------------------------------------------------------------------------

  /**
   * Check which permission steps are needed, show an explanatory alert
   * for each one, and execute or skip based on user decision.
   *
   * This method replaces the direct `batteryAlarmService.initialize()` call.
   * The service is kept decoupled from any UI component.
   */
  private async runPermissionFlow(): Promise<void> {
    // Phase 1: Check what's needed (pure read, no side effects)
    const result = await this.batteryAlarmService.checkPermissionSteps();

    // Phase 2: Show alert for each step, execute or skip
    for (const step of result.steps) {
      const userDecision = await this.showPermissionAlert(step);

      if (userDecision === 'continue') {
        await this.batteryAlarmService.executePermissionStep(step);
      } else if (userDecision === 'skipAlways') {
        // Permanently skip this step - won't show again even after app restart
        await this.batteryAlarmService.permanentlySkipStep(step.type);
      } else {
        // Skip for this session only
        this.batteryAlarmService.skipStep(step.type);
      }
    }

    // Phase 2b: Background mode battery optimization (separate service)
    if (!this.backgroundModeServiceSkipShown) {
      const bgOptNeeded = await this.batteryAlarmService.isBatteryOptimizationEnabled();
      if (bgOptNeeded) {
        const bgDecision = await this.showBackgroundModeAlert();
        if (bgDecision === 'continue') {
          this.backgroundModeService.disableBatteryOptimizations();
        } else {
          this.backgroundModeServiceSkipShown = true;
        }
      }
    }

    // Phase 3: Non-interactive initialization (channel, foreground service, boot)
    await this.batteryAlarmService.initializeCore();
  }

  /**
   * Show an explanatory alert before a system settings redirect.
   * Returns 'continue' if the user wants to proceed, 'skip' for this session,
   * or 'skipAlways' to never show this step again.
   */
  private async showPermissionAlert(step: PermissionStep): Promise<'continue' | 'skip' | 'skipAlways'> {
    // Use plain text with \n line breaks (Ionic AlertController renders message as text, not HTML)
    const fullMessage = step.message + '\n\nQUÉ HACER:\n' +
      step.settingsScreenDescription;

    return new Promise<'continue' | 'skip' | 'skipAlways'>((resolve) => {
      const alert = this.alertController.create({
        header: step.title,
        message: fullMessage,
        cssClass: 'permission-alert',
        buttons: [
          {
            text: 'No mostrar de nuevo',
            role: 'cancel',
            cssClass: 'alert-button-cancel',
            handler: () => {
              resolve('skipAlways');
            },
          },
          {
            text: 'Omitir esta vez',
            cssClass: 'alert-button-skip',
            handler: () => {
              resolve('skip');
            },
          },
          {
            text: 'Continuar',
            cssClass: 'alert-button-confirm',
            handler: () => {
              resolve('continue');
            },
          },
        ],
      });

      alert.then(a => a.present());
    });
  }

  /**
   * Show explanatory alert for BackgroundMode battery optimization.
   * This is separate from BatteryAlarmService because it uses a
   * different plugin (cordova-plugin-background-mode).
   */
  private async showBackgroundModeAlert(): Promise<'continue' | 'skip'> {
    const alert = await this.alertController.create({
      header: 'Optimización de Batería (Respaldo)',
      message:
        'Battery Control utiliza un sistema de monitoreo en segundo plano ' +
        'como respaldo para dispositivos más antiguos. Para que funcione ' +
        'correctamente, también necesita ser eximido de la optimización ' +
        'de batería.\n\nQUÉ HACER:\n' +
        'Se mostrará un diálogo del sistema. Toque "Permitir" para ' +
        'eximir la app de la restricción de segundo plano.',
      cssClass: 'permission-alert',
      buttons: [
        {
          text: 'Omitir',
          role: 'cancel',
          cssClass: 'alert-button-cancel',
        },
        {
          text: 'Permitir',
          cssClass: 'alert-button-confirm',
        },
      ],
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'cancel' ? 'skip' : 'continue';
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
      // Use BatteryAlarmService for reliable delivery during Doze mode
      await this.batteryAlarmService.scheduleBatteryAlarm(msj, 'low');
    } catch (err) {
      console.error('Error scheduling notification:', err);
      // Fallback to basic LocalNotifications
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
      } catch (fallbackErr) {
        console.error('Fallback notification also failed:', fallbackErr);
      }
    }
  }

  async setNotificationAdvance(msj: string = 'Batería fuera de rango') {
    try {
      // Use BatteryAlarmService for reliable delivery during Doze mode
      await this.batteryAlarmService.scheduleBatteryAlarm(msj, 'high');
    } catch (err) {
      console.error('Error scheduling advance notification:', err);
      // Fallback to basic LocalNotifications
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
      } catch (fallbackErr) {
        console.error('Fallback advance notification also failed:', fallbackErr);
      }
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
   *
   * Uses BatteryAlarmService for Doze-resistant notification delivery.
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

    // Vibración configurable (nativo via Capacitor plugin)
    this.vibrationService.vibrate(this.configHelper.getVibrationPattern());

    // Use BatteryAlarmService for reliable notification delivery even during Doze
    const message = msj ?? 'Batería fuera de rango';
    this.batteryAlarmService.scheduleBatteryAlarm(message, 'low')
      .catch(err => console.error('Error scheduling alarm via BatteryAlarmService:', err));

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
    this.vibrationService.stopVibration();
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
