export interface VibrationPattern {
  id: number;
  name: string;
  description: string;
  pattern: number[];
  icon: string;
}

export const VIBRATION_PATTERNS: VibrationPattern[] = [
  {
    id: 1,
    name: 'Suave',
    description: 'Vibración corta y discreta',
    pattern: [200],
    icon: 'radio-button-on'
  },
  {
    id: 2,
    name: 'Corto',
    description: 'Dos vibraciones rápidas',
    pattern: [150, 100, 150],
    icon: 'pulse'
  },
  {
    id: 3,
    name: 'Moderado',
    description: 'Patrón medio (DEFAULT)',
    pattern: [300, 200, 300],
    icon: 'flash'
  },
  {
    id: 4,
    name: 'Largo',
    description: 'Vibración extendida',
    pattern: [500, 300, 500],
    icon: 'time'
  },
  {
    id: 5,
    name: 'Intensivo',
    description: 'Tres pulsos fuertes',
    pattern: [400, 200, 400, 200, 400],
    icon: 'warning'
  },
  {
    id: 6,
    name: 'Emergencia',
    description: 'Patrón continuo',
    pattern: [1000, 500, 1000, 500, 1000],
    icon: 'alert-circle'
  }
];

export const DEFAULT_VIBRATION_PATTERN_ID = 3;
