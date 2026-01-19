import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useSettings } from './useSettings';
import { useTheme } from './useTheme';
import type { TimerMode } from '@pomodoro/protocol';
import type { ReminderType, ReminderEvent, UrgencyLevel } from '../types/timeAwareness';
import { speak, getReminderMessage, initSpeech } from '../utils/speech';
import { playReminderChime, playUrgentBeep } from '../utils/reminderSound';
import {
  calculateUrgency,
  generateUrgencyGradient,
  gradientToCSS,
  DEFAULT_BACKGROUND,
} from '../utils/gradients';

interface UseTimeAwarenessProps {
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  mode: TimerMode;
}

interface UseTimeAwarenessReturn {
  /** 背景スタイル（CSS gradient） */
  backgroundStyle: string;
  /** 緊急度レベル（0-1） */
  urgencyLevel: UrgencyLevel;
  /** パルスアニメーションの速度（ms） */
  pulseSpeed: number;
  /** 警告ボーダーを表示するか */
  showWarningBorder: boolean;
  /** アクティブなリマインダー（視覚的フィードバック用） */
  activeReminder: ReminderEvent | null;
  /** リマインダーをクリア */
  clearReminder: () => void;
}

export function useTimeAwareness({
  timeLeft,
  totalTime,
  isRunning,
  mode,
}: UseTimeAwarenessProps): UseTimeAwarenessReturn {
  const { settings } = useSettings();
  const { timeAwareness } = settings;
  const { colorScheme } = useTheme();

  // 発火済みリマインダーを追跡
  const firedReminders = useRef<Set<string>>(new Set());
  const [activeReminder, setActiveReminder] = useState<ReminderEvent | null>(null);
  // リマインダー表示タイムアウトを追跡（クリーンアップ用）
  const reminderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // モード変更時・総時間変更時にリマインダー追跡をリセット
  useEffect(() => {
    firedReminders.current.clear();
  }, [mode, totalTime]);

  // リマインダータイムアウトのクリーンアップ
  useEffect(() => {
    return () => {
      if (reminderTimeoutRef.current) {
        clearTimeout(reminderTimeoutRef.current);
        reminderTimeoutRef.current = null;
      }
    };
  }, []);

  // Speech API初期化
  useEffect(() => {
    if (timeAwareness.speechAnnouncement.enabled) {
      initSpeech();
    }
  }, [timeAwareness.speechAnnouncement.enabled]);

  // 緊急度計算
  const urgencyLevel = useMemo(() => {
    if (!timeAwareness.urgencyEffects.enabled || !isRunning) return 0;
    return calculateUrgency(
      timeLeft,
      totalTime,
      timeAwareness.urgencyEffects.thresholdMinutes
    );
  }, [timeLeft, totalTime, isRunning, timeAwareness.urgencyEffects]);

  // 背景グラデーション（テーマ対応）
  const backgroundStyle = useMemo(() => {
    if (!timeAwareness.dynamicBackground.enabled) {
      return DEFAULT_BACKGROUND[colorScheme];
    }

    const gradient = generateUrgencyGradient(
      mode,
      urgencyLevel,
      timeAwareness.dynamicBackground.intensity,
      colorScheme
    );
    return gradientToCSS(gradient);
  }, [mode, urgencyLevel, timeAwareness.dynamicBackground, colorScheme]);

  // パルス速度（緊急度に応じて速くなる: 2000ms -> 500ms）
  const pulseSpeed = useMemo(() => {
    if (!timeAwareness.urgencyEffects.enabled) return 2000;
    return Math.max(500, 2000 - urgencyLevel * 1500);
  }, [urgencyLevel, timeAwareness.urgencyEffects.enabled]);

  // 警告ボーダー表示
  const showWarningBorder = useMemo(() => {
    if (!timeAwareness.urgencyEffects.enabled || !isRunning) return false;
    return urgencyLevel > 0.7;
  }, [urgencyLevel, isRunning, timeAwareness.urgencyEffects.enabled]);

  // リマインダー発火処理
  const fireReminder = useCallback(
    (type: ReminderType) => {
      const message = getReminderMessage(type, timeLeft, mode);
      const event: ReminderEvent = {
        type,
        timeLeft,
        totalTime,
        message,
      };

      // 視覚的フィードバック
      if (timeAwareness.reminders.visualEnabled) {
        // 前のタイムアウトをクリア
        if (reminderTimeoutRef.current) {
          clearTimeout(reminderTimeoutRef.current);
        }
        setActiveReminder(event);
        reminderTimeoutRef.current = setTimeout(() => {
          setActiveReminder(null);
          reminderTimeoutRef.current = null;
        }, 3000);
      }

      // サウンド
      if (timeAwareness.reminders.soundEnabled) {
        if (type === 'minutes_1') {
          playUrgentBeep(settings.sound.volume);
        } else {
          playReminderChime(settings.sound.volume);
        }
      }

      // 音声アナウンス
      if (
        timeAwareness.speechAnnouncement.enabled
      ) {
        speak(message, {
          voice: timeAwareness.speechAnnouncement.voice,
          rate: timeAwareness.speechAnnouncement.rate,
          volume: timeAwareness.speechAnnouncement.volume,
        }).catch(() => {
          // 音声合成エラーは無視
        });
      }
    },
    [timeLeft, totalTime, mode, timeAwareness, settings.sound.volume]
  );

  // リマインダーチェック
  useEffect(() => {
    if (!isRunning || !timeAwareness.reminders.enabled || totalTime === 0) return;

    const progress = ((totalTime - timeLeft) / totalTime) * 100;

    const checkAndFire = (type: ReminderType, condition: boolean) => {
      const key = `${mode}-${totalTime}-${type}`;
      if (condition && !firedReminders.current.has(key)) {
        firedReminders.current.add(key);
        fireReminder(type);
      }
    };

    // 各リマインダー条件をチェック
    // 50%経過（±1%の範囲で発火）
    if (timeAwareness.reminders.at50Percent) {
      checkAndFire('percent_50', progress >= 50 && progress < 52);
    }

    // 残り5分（±2秒の範囲で発火）
    if (timeAwareness.reminders.at5Minutes) {
      checkAndFire('minutes_5', timeLeft <= 300 && timeLeft > 298);
    }

    // 残り1分（±2秒の範囲で発火）
    if (timeAwareness.reminders.at1Minute) {
      checkAndFire('minutes_1', timeLeft <= 60 && timeLeft > 58);
    }
  }, [timeLeft, totalTime, isRunning, mode, timeAwareness.reminders, fireReminder]);

  const clearReminder = useCallback(() => {
    if (reminderTimeoutRef.current) {
      clearTimeout(reminderTimeoutRef.current);
      reminderTimeoutRef.current = null;
    }
    setActiveReminder(null);
  }, []);

  return {
    backgroundStyle,
    urgencyLevel,
    pulseSpeed,
    showWarningBorder,
    activeReminder,
    clearReminder,
  };
}
