import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import {
  ImportedSound,
  MAX_IMPORTED_SOUNDS,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  IMPORTED_SOUNDS_STORAGE_KEY,
} from '../models/sound.model';

/**
 * Interface for the native ContentCopy plugin.
 */
interface ContentCopyPlugin {
  checkPermissions(): Promise<{ granted: boolean }>;
  copyToCache(options: { uri: string; subdirectory?: string }): Promise<{
    path: string;
    absolutePath: string;
    fileName: string;
    size: number;
  }>;
}

/**
 * Get the native ContentCopy plugin instance.
 */
function getContentCopyPlugin(): ContentCopyPlugin | null {
  try {
    const w = window as any;
    const capacitor = w.Capacitor;
    if (capacitor?.Plugins?.ContentCopy) {
      return capacitor.Plugins.ContentCopy as ContentCopyPlugin;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Service responsible for picking audio files from the device,
 * copying them to the app's cache directory (so the WebView can play them),
 * validating them, persisting the metadata, and providing access
 * to the list of imported sounds.
 *
 * Uses `@capgo/capacitor-file-picker` for native file selection
 * and a native `ContentCopy` plugin to copy files from content:// URIs.
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
   * The file is copied to the app's cache directory so the WebView can play it.
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
      // On Android 13+ (API 33) the app needs READ_MEDIA_AUDIO to read from
      // content:// URIs returned by the file picker.  Ask for the permission
      // up-front so the user sees the dialog BEFORE selecting a file, not
      // after (which would force them to re-select).
      const nativePlugin = getContentCopyPlugin();
      if (nativePlugin) {
        try {
          const perm = await nativePlugin.checkPermissions();
          if (!perm.granted) {
            console.warn('[SoundImportService] Storage permission denied');
            return null;
          }
        } catch (err) {
          // On web or if the plugin method is missing, continue without check
          console.warn('[SoundImportService] Permission check skipped:', err);
        }
      }

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

      const sourceUri = file.path || file.name;

      // --- Copy file to app cache directory ----------------------------------
      console.log(`[SoundImportService] Copying file from: ${sourceUri}`);
      const copyResult = await this.copyFileToCache(sourceUri, file.name);

      if (!copyResult) {
        console.error('[SoundImportService] Failed to copy file to cache');
        return null;
      }

      console.log(`[SoundImportService] File copied to: ${copyResult.path}`);

      // --- Create record -----------------------------------------------------
      const imported: ImportedSound = {
        id: this.generateId(),
        fileName: file.name,
        originalPath: sourceUri,
        localPath: copyResult.path,
        absolutePath: copyResult.absolutePath,
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
   * Get the playable path for a sound. Returns a URL that the WebView can load,
   * or null if the file is missing.
   *
   * On native platforms, uses Capacitor.convertFileSrc() to convert the
   * absolute file path to a WebView-accessible URL.
   */
  async getPlayablePath(sound: ImportedSound): Promise<string | null> {
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      return sound.localPath;
    }

    // On native, use convertFileSrc with the absolute path
    if (sound.absolutePath) {
      return Capacitor.convertFileSrc(sound.absolutePath);
    }

    // Fallback for older records without absolutePath
    if (sound.localPath.startsWith('file://')) {
      return sound.localPath;
    }
    return sound.localPath;
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

    const sound = this.importedSounds[index];

    // Note: The cached file will be cleaned up by the OS when the cache is cleared.
    // We don't need to explicitly delete it since it's in the cache directory.

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
  // File copy logic
  // ---------------------------------------------------------------------------

  /**
   * Copy a file from a content:// URI (or file:// URI) to the app's cache
   * directory using the native ContentCopy plugin.
   *
   * Returns an object with the relative and absolute paths, or null on failure.
   */
  private async copyFileToCache(sourceUri: string, fileName: string): Promise<{path: string; absolutePath: string} | null> {
    try {
      // Try native plugin first (works with content:// URIs)
      const nativePlugin = getContentCopyPlugin();
      if (nativePlugin) {
        console.log(`[SoundImportService] Using native ContentCopy plugin`);
        const result = await nativePlugin.copyToCache({
          uri: sourceUri,
          subdirectory: 'imported_sounds',
        });
        console.log(`[SoundImportService] Native copy success: ${result.path} (${result.size} bytes)`);
        return { path: result.path, absolutePath: result.absolutePath };
      }

      console.warn('[SoundImportService] Native ContentCopy plugin not available');
      return null;
    } catch (err) {
      console.error('[SoundImportService] Error copying file:', err);
      return null;
    }
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
