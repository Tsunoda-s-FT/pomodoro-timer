import { useContext } from 'react';
import { SettingsContext } from '../contexts/SettingsContext';

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export function useTimerConfig() {
  const { settings } = useSettings();
  return {
    work: settings.timer.workMinutes * 60,
    shortBreak: settings.timer.shortBreakMinutes * 60,
    longBreak: settings.timer.longBreakMinutes * 60,
    sessionsBeforeLongBreak: settings.timer.sessionsBeforeLongBreak,
  };
}
