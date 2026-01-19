// Web Speech API ラッパー

let speechSynthesis: SpeechSynthesis | null = null;

/**
 * Speech APIを初期化
 */
export function initSpeech(): boolean {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    speechSynthesis = window.speechSynthesis;
    return true;
  }
  return false;
}

/**
 * 利用可能な音声リストを取得
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!speechSynthesis) return [];
  return speechSynthesis.getVoices().filter(
    (voice) => voice.lang.startsWith('ja') || voice.lang.startsWith('en')
  );
}

/**
 * テキストを読み上げる
 */
export function speak(
  text: string,
  options: {
    voice?: string;
    rate?: number;
    volume?: number;
  } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!speechSynthesis) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // 既存の発話をキャンセル
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 1.0;
    utterance.volume = options.volume ?? 0.8;
    utterance.lang = 'ja-JP';

    if (options.voice) {
      const voice = speechSynthesis.getVoices().find((v) => v.name === options.voice);
      if (voice) utterance.voice = voice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    speechSynthesis.speak(utterance);
  });
}

/**
 * リマインダー用のメッセージを生成
 */
export function getReminderMessage(
  type: string,
  timeLeftSeconds: number,
  mode: 'work' | 'shortBreak' | 'longBreak'
): string {
  const modeLabel = mode === 'work' ? '作業' : '休憩';
  const minutes = Math.ceil(timeLeftSeconds / 60);

  switch (type) {
    case 'percent_50':
      return `${modeLabel}時間の半分が経過しました`;
    case 'minutes_5':
      return '残り5分です';
    case 'minutes_1':
      return '残り1分です';
    default:
      return `残り${minutes}分です`;
  }
}
