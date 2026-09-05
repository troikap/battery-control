/**
 * Sound-related data models for preset and imported audio files.
 *
 * Preset sounds are bundled in `src/assets/sounds/` and identified by a
 * numeric id. Imported sounds come from the device filesystem via
 * `@capgo/capacitor-file-picker` and carry additional metadata.
 */

export interface SoundOption {
  id: string | number;
  value: string;
  displayName: string;
  isPreset: boolean;
  metadata?: {
    fileName?: string;
    mimeType?: string;
    size?: number;
    importedAt?: Date;
    originalPath?: string;
  };
}

export interface ImportedSound {
  id: string;
  fileName: string;
  originalPath: string;
  localPath: string;
  mimeType: string;
  size: number;
  importedAt: string;
  displayName: string;
}

/** Maximum number of sounds a user can have imported at any time. */
export const MAX_IMPORTED_SOUNDS = 20;

/** MIME types accepted for audio import. */
export const ALLOWED_MIME_TYPES: readonly string[] = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'audio/x-wav',
  'audio/mp4',
];

/** Maximum file size in bytes (5 MB). */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Preferences key used to persist the imported sounds list. */
export const IMPORTED_SOUNDS_STORAGE_KEY = 'battery_imported_sounds';
