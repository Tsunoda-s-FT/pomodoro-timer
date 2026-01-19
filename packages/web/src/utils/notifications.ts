import type { TimerMode } from '@pomodoro/protocol';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('このブラウザは通知をサポートしていません');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export function sendNotification(mode: TimerMode): void {
  if (Notification.permission !== 'granted') {
    return;
  }

  const messages: Record<TimerMode, { title: string; body: string }> = {
    work: {
      title: '作業時間終了！',
      body: '休憩を取りましょう',
    },
    shortBreak: {
      title: '休憩終了！',
      body: '作業を再開しましょう',
    },
    longBreak: {
      title: '長い休憩終了！',
      body: '新しいセッションを始めましょう',
    },
  };

  const { title, body } = messages[mode];

  new Notification(title, {
    body,
    icon: '/pwa-192x192.svg',
    tag: 'pomodoro-timer',
    requireInteraction: true,
  });
}

export function formatTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);  // 小数を整数に変換
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
