import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { VibrationPattern, VIBRATION_PATTERNS, DEFAULT_VIBRATION_PATTERN_ID } from '../models/vibration.model';
import { SoundOption, ImportedSound } from '../models/sound.model';
import { SoundImportService } from '../services/sound-import.service';

@Injectable({
  providedIn: 'root'
})
export class ConfigHelper {
  private static readonly KEYS = {
    SOUND: 'battery_sound',
    ALARM: 'battery_alarm_activated',
    NIVEL: 'battery_nivel',
    VIBRATION: 'battery_vibration',
  };

  private sounds = [
    {id: 1, value: 'assets/sounds/sonido-1.mp3'},
    {id: 2, value: 'assets/sounds/sonido-2.mp3'},
    {id: 3, value: 'assets/sounds/sonido-3.mp3'},
    {id: 4, value: 'assets/sounds/sonido-4.mp3'},
    {id: 5, value: 'assets/sounds/sonido-5.mp3'},
    {id: 6, value: 'assets/sounds/sonido-6.mp3'},
    {id: 7, value: 'assets/sounds/sonido-7.mp3'},
    {id: 8, value: 'assets/sounds/sonido-8.mp3'},
    {id: 9, value: 'assets/sounds/sonido-9.mp3'},
    {id: 10, value: 'assets/sounds/sonido-10.mp3'},
    {id: 11, value: 'assets/sounds/sonido-11.mp3'},
  ];

  private soundSelected = {id: 1, value: 'assets/sounds/sonido-1.mp3'};
  private isActivatedAlarm = true;
  private nivel: {lower: number, upper: number} = {lower: 20, upper: 80};
  private vibrationSelected: VibrationPattern = VIBRATION_PATTERNS.find(v => v.id === DEFAULT_VIBRATION_PATTERN_ID)!;

  private loaded = false;

  constructor(private soundImportService: SoundImportService) {
    this.loadFromStorage();
  }

  /**
   * Returns a promise that resolves when the initial load from
   * Preferences is complete. Useful for callers that need to
   * guarantee the persisted values are available before reading.
   */
  async ready(): Promise<void> {
    if (this.loaded) {
      return;
    }
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (this.loaded) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  }

  // ---------------------------------------------------------------------------
  // Persistence helpers
  // ---------------------------------------------------------------------------

  private async loadFromStorage(): Promise<void> {
    try {
      const [soundResult, alarmResult, nivelResult, vibrationResult] = await Promise.all([
        Preferences.get({key: ConfigHelper.KEYS.SOUND}),
        Preferences.get({key: ConfigHelper.KEYS.ALARM}),
        Preferences.get({key: ConfigHelper.KEYS.NIVEL}),
        Preferences.get({key: ConfigHelper.KEYS.VIBRATION}),
      ]);

      if (soundResult.value) {
        this.soundSelected = JSON.parse(soundResult.value);
      }
      if (alarmResult.value) {
        this.isActivatedAlarm = JSON.parse(alarmResult.value);
      }
      if (nivelResult.value) {
        this.nivel = JSON.parse(nivelResult.value);
      }
      if (vibrationResult.value) {
        this.vibrationSelected = JSON.parse(vibrationResult.value);
      }
    } catch (err) {
      console.warn('ConfigHelper: error loading config from Preferences, using defaults', err);
    } finally {
      this.loaded = true;
    }
  }

  private async saveSound(): Promise<void> {
    try {
      await Preferences.set({
        key: ConfigHelper.KEYS.SOUND,
        value: JSON.stringify(this.soundSelected),
      });
    } catch (err) {
      console.warn('ConfigHelper: error saving sound to Preferences', err);
    }
  }

  private async saveAlarm(): Promise<void> {
    try {
      await Preferences.set({
        key: ConfigHelper.KEYS.ALARM,
        value: JSON.stringify(this.isActivatedAlarm),
      });
    } catch (err) {
      console.warn('ConfigHelper: error saving alarm to Preferences', err);
    }
  }

  private async saveNivel(): Promise<void> {
    try {
      await Preferences.set({
        key: ConfigHelper.KEYS.NIVEL,
        value: JSON.stringify(this.nivel),
      });
    } catch (err) {
      console.warn('ConfigHelper: error saving nivel to Preferences', err);
    }
  }

  private async saveVibration(): Promise<void> {
    try {
      await Preferences.set({
        key: ConfigHelper.KEYS.VIBRATION,
        value: JSON.stringify(this.vibrationSelected),
      });
    } catch (err) {
      console.warn('ConfigHelper: error saving vibration to Preferences', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Sounds
  // ---------------------------------------------------------------------------

  /**
   * Return only the preset (bundled) sounds.
   */
  public getSounds() {
    return this.sounds;
  }

  /**
   * Return all available sounds: preset + user-imported.
   *
   * Preset sounds are converted to `SoundOption` with `isPreset: true`.
   * Imported sounds come from `SoundImportService` and are mapped to
   * `SoundOption` with `isPreset: false` and `metadata` populated.
   *
   * The combined list is compatible with the legacy `{id, value}` format
   * because every entry includes both fields.
   */
  public async getAllSounds(): Promise<SoundOption[]> {
    const presetSounds: SoundOption[] = this.sounds.map((s) => ({
      id: s.id,
      value: s.value,
      displayName: `Sonido ${s.id}`,
      isPreset: true,
    }));

    await this.soundImportService.ready();

    const importedSounds: SoundOption[] = this.soundImportService
      .getImportedSounds()
      .map((imp: ImportedSound) => ({
        id: imp.id,
        value: imp.localPath,
        displayName: imp.displayName,
        isPreset: false,
        metadata: {
          fileName: imp.fileName,
          mimeType: imp.mimeType,
          size: imp.size,
          importedAt: new Date(imp.importedAt),
          originalPath: imp.originalPath,
        },
      }));

    return [...presetSounds, ...importedSounds];
  }

  /**
   * Return the currently selected sound (legacy format).
   */
  public getSound() {
    return this.soundSelected;
  }

  /**
   * Set the active sound. Accepts both legacy `{id, value}` objects
   * and full `SoundOption` objects — only `id` and `value` are used.
   */
  public setSound(sound: {id: number | string, value: string}) {
    this.soundSelected = {id: Number(sound.id), value: sound.value};
    this.saveSound();
  }

  // ---------------------------------------------------------------------------
  // Alarm activation
  // ---------------------------------------------------------------------------

  public getIsActivatedAlarm() {
    return this.isActivatedAlarm;
  }

  public setIsActivatedAlarm(value: boolean) {
    this.isActivatedAlarm = value;
    this.saveAlarm();
  }

  // ---------------------------------------------------------------------------
  // Nivel (lower / upper thresholds)
  // ---------------------------------------------------------------------------

  public setNivel(nivel: {lower: number, upper: number}) {
    this.nivel = nivel;
    this.saveNivel();
  }

  public getNivel() {
    return this.nivel;
  }

  // ---------------------------------------------------------------------------
  // Vibration
  // ---------------------------------------------------------------------------

  public getVibrationPatterns() {
    return VIBRATION_PATTERNS;
  }

  public getVibration() {
    return this.vibrationSelected;
  }

  public setVibration(vibration: VibrationPattern) {
    this.vibrationSelected = vibration;
    this.saveVibration();
  }

  public getVibrationPattern(): number[] {
    return this.vibrationSelected.pattern;
  }
}
