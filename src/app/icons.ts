import { addIcons } from 'ionicons';
import {
  batteryCharging,
  batteryHalfOutline,
  batteryHalfSharp,
  volumeMute,
  volumeHigh,
  musicalNotes,
  stopCircle,
  bookmarkOutline,
  bookmarkSharp,
} from 'ionicons/icons';

/**
 * Registra todos los iconos usados en la aplicación.
 * Ionicons 7+ requiere registro explícito con addIcons() en lugar de
 * cargar SVGs vía HTTP (que causa "Failed to construct URL: Invalid base URL").
 */
export function registerIcons(): void {
  addIcons({
    'battery-charging': batteryCharging,
    'battery-half-outline': batteryHalfOutline,
    'battery-half-sharp': batteryHalfSharp,
    'volume-mute': volumeMute,
    'volume-high': volumeHigh,
    'musical-notes': musicalNotes,
    'stop-circle': stopCircle,
    'bookmark-outline': bookmarkOutline,
    'bookmark-sharp': bookmarkSharp,
  });
}
