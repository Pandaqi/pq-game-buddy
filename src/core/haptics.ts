/** Vibration with a mute switch and a silent no-op when unsupported. */

export type HapticPattern = 'none' | 'short' | 'long';

let enabled = true;

export interface HapticsApi {
  setEnabled(value: boolean): void;
  supported(): boolean;
  buzz(pattern: HapticPattern): void;
}

function vibrate(sequence: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(sequence);
  } catch {
    /* vibration is a bonus */
  }
}

export const haptics: HapticsApi = {
  setEnabled(value) {
    enabled = value;
  },
  supported() {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  },
  buzz(pattern) {
    if (!enabled || pattern === 'none') return;
    vibrate(pattern === 'long' ? [90, 60, 90] : 35);
  },
};
