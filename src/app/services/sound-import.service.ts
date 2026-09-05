import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import {
  ImportedSound,
  MAX_IMPORTED_SOUNDS,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  IMPORTED_SOUNDS_STORAGE_KEY,
} from '../models/sound.model';

/**
 * Service responsible for picking audio files from the device,
 * validating them, persisting the metadata, and providing access
 * to the list of imported sounds.
 *
 * Uses `@capgo/capacitor-file-picker` for native file selection.
 */
@Injectable({ providedIn: 'root' })
export class SoundImportService {
  private importedSounds: ImportedSound[] = [];
  private loaded = false;

  constructor() {
    this.loadFromStorage();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Wait until the initial load from Preferences has completed.
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

  /**
   * Open the native file picker and let the user choose an audio file.
   *
   * Returns the newly created `ImportedSound` record, or `null` if the
   * user cancelled or the file was rejected.
   */
  async pickAudioFile(): Promise<ImportedSound | null> {
    if (!this.canImportMore()) {
      console.warn('[SoundImportService] Maximum imported sounds reached');
      return null;
    }

    try {
      // Dynamic import — the plugin only exists on device/emulator.
      const { CapgoFilePicker } = await import('@capgo/capacitor-file-picker');

      const result = await CapgoFilePicker.pickFiles({
        types: ['audio/*'],
        limit: 1,
      });

      if (!result.files || result.files.length === 0) {
        return null;
      }

      const file = result.files[0];

      // --- Validation --------------------------------------------------------
      if (!this.isAllowedMimeType(file.mimeType)) {
        console.warn(`[SoundImportService] Rejected MIME type: ${file.mimeType}`);
        return null;
      }

      if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
        console.warn(`[SoundImportService] File too large: ${file.size} bytes`);
        return null;
      }

      const filePath = file.path || file.name;

      // --- Create record -----------------------------------------------------
      const imported: ImportedSound = {
        id: this.generateId(),
        fileName: file.name,
        originalPath: filePath,
        localPath: filePath,
        mimeType: file.mimeType || 'audio/mpeg',
        size: file.size || 0,
        importedAt: new Date().toISOString(),
        displayName: this.buildDisplayName(file.name),
      };

      this.importedSounds.push(imported);
      await this.saveToStorage();

      console.log(`[SoundImportService] Imported sound: ${imported.displayName}`);
      return imported;
    } catch (err: any) {
      // User cancelled the picker — not an error.
      if (err?.message?.includes('cancel') || err?.message?.includes('User')) {
        return null;
      }
      console.error('[SoundImportService] Error picking audio file:', err);
      return null;
    }
  }

  /**
   * Return the full list of imported sounds.
   */
  getImportedSounds(): ImportedSound[] {
    return [...this.importedSounds];
  }

  /**
   * Remove an imported sound by its id.
   *
   * Returns `true` if the sound was found and removed, `false` otherwise.
   */
  async removeImportedSound(id: string): Promise<boolean> {
    const index = this.importedSounds.findIndex((s) => s.id === id);
    if (index === -1) {
      return false;
    }

    this.importedSounds.splice(index, 1);
    await this.saveToStorage();
    console.log(`[SoundImportService] Removed imported sound: ${id}`);
    return true;
  }

  /**
   * Whether the user can import more sounds (under the limit).
   */
  canImportMore(): boolean {
    return this.importedSounds.length < MAX_IMPORTED_SOUNDS;
  }

  /**
   * How many sounds have been imported so far.
   */
  getImportedCount(): number {
    return this.importedSounds.length;
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private async loadFromStorage(): Promise<void> {
    try {
      const result = await Preferences.get({ key: IMPORTED_SOUNDS_STORAGE_KEY });
      if (result.value) {
        this.importedSounds = JSON.parse(result.value) as ImportedSound[];
      }
    } catch (err) {
      console.warn('[SoundImportService] Error loading imported sounds:', err);
      this.importedSounds = [];
    } finally {
      this.loaded = true;
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      await Preferences.set({
        key: IMPORTED_SOUNDS_STORAGE_KEY,
        value: JSON.stringify(this.importedSounds),
      });
    } catch (err) {
      console.warn('[SoundImportService] Error saving imported sounds:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Check whether the given MIME type is in the allowed list.
   */
  private isAllowedMimeType(mimeType: string): boolean {
    return ALLOWED_MIME_TYPES.includes(mimeType);
  }

  /**
   * Generate a unique id for an imported sound using a timestamp + random suffix.
   */
  private generateId(): string {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 8);
    return `imported_${ts}_${rand}`;
  }

  /**
   * Build a human-readable display name from a file name by stripping
   * the extension and replacing dashes/underscores with spaces.
   */
  private buildDisplayName(fileName: string): string {
    const withoutExtension = fileName.replace(/\.[^/.]+$/, '');
    return withoutExtension.replace(/[-_]/g, ' ');
  }
}
