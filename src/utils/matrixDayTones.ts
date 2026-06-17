/** Paleta por columna de día — pantalla + exportación (colores sólidos para html2canvas). */
export const MATRIX_DAY_TONES = [
  {
    id: 0,
    label: 'ember',
    headerBg: '#1a1714',
    cellBg: '#100e0c',
    cellBgEven: '#14110f',
    headerBorder: '#f97316',
    accent: '#f97316',
    rx: '#fb923c',
    chipBorder: '#f97316',
    chipBg: '#1c1510',
  },
  {
    id: 1,
    label: 'cyan',
    headerBg: '#111a1c',
    cellBg: '#0c1011',
    cellBgEven: '#101516',
    headerBorder: '#22d3ee',
    accent: '#22d3ee',
    rx: '#67e8f9',
    chipBorder: '#22d3ee',
    chipBg: '#0f1719',
  },
  {
    id: 2,
    label: 'violet',
    headerBg: '#16141f',
    cellBg: '#0e0c12',
    cellBgEven: '#12101a',
    headerBorder: '#a78bfa',
    accent: '#a78bfa',
    rx: '#c4b5fd',
    chipBorder: '#a78bfa',
    chipBg: '#15121c',
  },
  {
    id: 3,
    label: 'mint',
    headerBg: '#111a16',
    cellBg: '#0c110f',
    cellBgEven: '#101613',
    headerBorder: '#34d399',
    accent: '#34d399',
    rx: '#6ee7b7',
    chipBorder: '#34d399',
    chipBg: '#0f1613',
  },
] as const;

export function dayToneIndex(dayNumber: number): number {
  return ((dayNumber - 1) % MATRIX_DAY_TONES.length + MATRIX_DAY_TONES.length) % MATRIX_DAY_TONES.length;
}

export function weekToneIndex(weekNumber: number): number {
  return ((weekNumber - 1) % MATRIX_DAY_TONES.length + MATRIX_DAY_TONES.length) % MATRIX_DAY_TONES.length;
}
