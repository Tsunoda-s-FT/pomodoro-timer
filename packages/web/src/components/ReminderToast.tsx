import { useEffect } from 'react';
import type { ReminderEvent } from '../types/timeAwareness';

interface Props {
  reminder: ReminderEvent;
  onDismiss: () => void;
}

export function ReminderToast({ reminder, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down cursor-pointer"
      onClick={onDismiss}
    >
      <div className="bg-[var(--surface-bg)] backdrop-blur-lg rounded-xl px-6 py-3 shadow-lg border border-[var(--border-default)]">
        <p className="text-[var(--text-primary)] text-lg font-medium">{reminder.message}</p>
      </div>
    </div>
  );
}
