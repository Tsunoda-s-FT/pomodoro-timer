import { type ReactNode } from 'react';
import { useTimer } from '../hooks/useTimer';
import { useTimeAwareness } from '../hooks/useTimeAwareness';
import { ReminderToast } from './ReminderToast';
import { WarningBorder } from './WarningBorder';

interface Props {
  children: ReactNode;
}

export function TimeAwarenessBackground({ children }: Props) {
  const timer = useTimer();

  const {
    backgroundStyle,
    urgencyLevel,
    showWarningBorder,
    activeReminder,
    clearReminder,
  } = useTimeAwareness({
    timeLeft: timer.timeLeft,
    totalTime: timer.totalTime,
    isRunning: timer.isRunning,
    mode: timer.mode,
  });

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 transition-all duration-1000"
      style={{ background: backgroundStyle }}
    >
      {/* 警告ボーダー */}
      {showWarningBorder && <WarningBorder urgency={urgencyLevel} />}

      {/* リマインダートースト */}
      {activeReminder && (
        <ReminderToast reminder={activeReminder} onDismiss={clearReminder} />
      )}

      {children}
    </div>
  );
}
