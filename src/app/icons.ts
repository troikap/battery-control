import { addIcons } from 'ionicons';
import {
  batteryCharging,
  batteryHalfOutline,
  batteryHalfSharp,
  volumeMute,
  volumeHigh,
  volumeHighOutline,
  musicalNotes,
  musicalNoteOutline,
  stopCircle,
  bookmarkOutline,
  bookmarkSharp,
  phonePortrait,
  addCircle,
  radioButtonOn,
  pulse,
  flash,
  time,
  warning,
  alertCircle,
  folderOutline,
  folderOpenOutline,
  trash,
} from 'ionicons/icons';

/**
 * Registra todos los iconos usados en la aplicación.
 * Ionicons 7+ requiere registro explícito con addIcons() en lugar de
 * cargar SVGs vía HTTP (que causa "Failed to construct URL: Invalid base URL").
 */
export function registerIcons(): void {
  addIcons({
    // Batería
    'battery-charging': batteryCharging,
    'battery-half-outline': batteryHalfOutline,
    'battery-half-sharp': batteryHalfSharp,
    // Audio / Sonido
    'volume-mute': volumeMute,
    'volume-high': volumeHigh,
    'volume-high-outline': volumeHighOutline,
    'musical-notes': musicalNotes,
    'musical-note-outline': musicalNoteOutline,
    'stop-circle': stopCircle,
    // Navegación / Bookmarks
    'bookmark-outline': bookmarkOutline,
    'bookmark-sharp': bookmarkSharp,
    // Vibración - FAB y modal header
    'phone-portrait': phonePortrait,
    // Importar sonido
    'add-circle': addCircle,
    // Patrones de vibración
    'radio-button-on': radioButtonOn,
    'pulse': pulse,
    'flash': flash,
    'time': time,
    'warning': warning,
    'alert-circle': alertCircle,
    // Sonidos importados
    'folder-outline': folderOutline,
    'folder-open-outline': folderOpenOutline,
    'trash': trash,
  });
}
