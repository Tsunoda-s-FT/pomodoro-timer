import type { AppSettings } from '../types/settings';

const STORAGE_KEY = 'pomodoro-settings';

export function loadSettings(): AppSettings | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage が使用できない場合は無視
  }
}
