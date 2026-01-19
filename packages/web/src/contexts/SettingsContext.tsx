import { createContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { AppSettings, TimerSettings, SoundSettings } from '../types/settings';
import type { TimeAwarenessSettings } from '../types/timeAwareness';
import type { AppearanceSettings } from '../types/appearance';
import { DEFAULT_TIMER_SETTINGS, DEFAULT_SOUND_SETTINGS } from '../types/settings';
import { DEFAULT_TIME_AWARENESS_SETTINGS } from '../types/timeAwareness';
import { DEFAULT_APPEARANCE_SETTINGS } from '../types/appearance';
import { loadSettings, saveSettings } from '../utils/storage';
import { usePomodoro } from './PomodoroContext';

// Nested partial helper
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface SettingsContextType {
  settings: AppSettings;
  updateTimerSettings: (timer: Partial<TimerSettings>) => void;
  updateSoundSettings: (sound: Partial<SoundSettings>) => void;
  updateTimeAwarenessSettings: (timeAwareness: DeepPartial<TimeAwarenessSettings>) => void;
  updateAppearanceSettings: (appearance: DeepPartial<AppearanceSettings>) => void;
  resetToDefaults: () => void;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { state, actions } = usePomodoro();

  const [localSettings, setLocalSettings] = useState(() => {
    const stored = loadSettings();
    return {
      timeAwareness: stored?.timeAwareness ?? DEFAULT_TIME_AWARENESS_SETTINGS,
      appearance: stored?.appearance ?? DEFAULT_APPEARANCE_SETTINGS,
    };
  });

  const settings = useMemo<AppSettings>(() => ({
    timer: state.settings.timer ?? DEFAULT_TIMER_SETTINGS,
    sound: state.settings.sound ?? DEFAULT_SOUND_SETTINGS,
    timeAwareness: localSettings.timeAwareness,
    appearance: localSettings.appearance,
  }), [state.settings.timer, state.settings.sound, localSettings.timeAwareness, localSettings.appearance]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateTimerSettings = useCallback((timer: Partial<TimerSettings>) => {
    actions.updateSettings({ timer } as Partial<AppSettings>);
  }, [actions]);

  const updateSoundSettings = useCallback((sound: Partial<SoundSettings>) => {
    actions.updateSettings({ sound } as Partial<AppSettings>);
  }, [actions]);

  const updateTimeAwarenessSettings = useCallback((timeAwareness: DeepPartial<TimeAwarenessSettings>) => {
    setLocalSettings((prev) => ({
      ...prev,
      timeAwareness: {
        ...prev.timeAwareness,
        ...timeAwareness,
        dynamicBackground: {
          ...prev.timeAwareness.dynamicBackground,
          ...(timeAwareness.dynamicBackground ?? {}),
        },
        reminders: {
          ...prev.timeAwareness.reminders,
          ...(timeAwareness.reminders ?? {}),
        },
        speechAnnouncement: {
          ...prev.timeAwareness.speechAnnouncement,
          ...(timeAwareness.speechAnnouncement ?? {}),
        },
        urgencyEffects: {
          ...prev.timeAwareness.urgencyEffects,
          ...(timeAwareness.urgencyEffects ?? {}),
        },
      },
    }));
  }, []);

  const updateAppearanceSettings = useCallback((appearance: DeepPartial<AppearanceSettings>) => {
    setLocalSettings((prev) => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        ...appearance,
        schedule: {
          ...prev.appearance.schedule,
          ...(appearance.schedule ?? {}),
        },
      },
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setLocalSettings({
      timeAwareness: DEFAULT_TIME_AWARENESS_SETTINGS,
      appearance: DEFAULT_APPEARANCE_SETTINGS,
    });
    actions.updateSettings({
      timer: DEFAULT_TIMER_SETTINGS,
      sound: DEFAULT_SOUND_SETTINGS,
    });
  }, [actions]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateTimerSettings,
        updateSoundSettings,
        updateTimeAwarenessSettings,
        updateAppearanceSettings,
        resetToDefaults,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
