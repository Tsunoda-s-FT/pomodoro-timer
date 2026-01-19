import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSettings } from './useSettings';
import type { ColorScheme, ThemeSchedule } from '../types/appearance';

/** 時間帯スケジュールからテーマを解決 */
function resolveScheduledTheme(schedule: ThemeSchedule): ColorScheme {
  const hour = new Date().getHours();
  const { lightModeStart, darkModeStart } = schedule;

  // 時間帯の判定（wrap-around対応）
  if (lightModeStart < darkModeStart) {
    // 例: 7時〜19時がライト
    return hour >= lightModeStart && hour < darkModeStart ? 'light' : 'dark';
  } else {
    // 例: 19時〜7時がダーク（逆転パターン）
    return hour >= lightModeStart || hour < darkModeStart ? 'light' : 'dark';
  }
}

/** システムのカラースキーム設定を取得 */
function getSystemColorScheme(): ColorScheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export interface UseThemeReturn {
  /** 現在のカラースキーム */
  colorScheme: ColorScheme;
  /** ダークモードかどうか */
  isDark: boolean;
  /** ライトモードかどうか */
  isLight: boolean;
  /** テーマを手動で設定（設定画面用） */
  setThemeMode: (mode: 'light' | 'dark' | 'system' | 'scheduled') => void;
}

export function useTheme(): UseThemeReturn {
  const { settings, updateAppearanceSettings } = useSettings();
  const { appearance } = settings;

  // システム設定を追跡
  const [systemPreference, setSystemPreference] = useState<ColorScheme>(getSystemColorScheme);
  const [scheduleTick, setScheduleTick] = useState(0);

  // システム設定の変更を監視
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // 時間帯スケジュール用のタイマー
  useEffect(() => {
    if (appearance.themeMode !== 'scheduled') return;

    // 1分ごとにチェック
    const interval = setInterval(() => {
      setScheduleTick((prev) => prev + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, [appearance.themeMode]);

  const scheduledScheme = useMemo(() => {
    void scheduleTick;
    return resolveScheduledTheme(appearance.schedule);
  }, [appearance.schedule, scheduleTick]);

  // カラースキームを解決
  const colorScheme = useMemo((): ColorScheme => {
    switch (appearance.themeMode) {
      case 'light':
        return 'light';
      case 'dark':
        return 'dark';
      case 'system':
        return systemPreference;
      case 'scheduled':
        return scheduledScheme;
      default:
        return 'dark';
    }
  }, [appearance.themeMode, scheduledScheme, systemPreference]);

  // documentにテーマクラスを適用
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (colorScheme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  }, [colorScheme]);

  const setThemeMode = useCallback((mode: 'light' | 'dark' | 'system' | 'scheduled') => {
    updateAppearanceSettings({ themeMode: mode });
  }, [updateAppearanceSettings]);

  return {
    colorScheme,
    isDark: colorScheme === 'dark',
    isLight: colorScheme === 'light',
    setThemeMode,
  };
}
