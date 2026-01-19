import { useSettings } from '../../hooks/useSettings';
import { TimeInput } from './TimeInput';
import { VolumeSlider } from './VolumeSlider';
import { playSound } from '../../utils/sound';
import { playReminderChime } from '../../utils/reminderSound';
import type { SoundType } from '../../types/settings';
import type { ThemeMode } from '../../types/appearance';

const SOUND_OPTIONS: { value: SoundType; label: string }[] = [
  { value: 'bell', label: 'ベル' },
  { value: 'chime', label: 'チャイム' },
  { value: 'digital', label: 'デジタル' },
];

const INTENSITY_OPTIONS = [
  { value: 'subtle', label: '控えめ' },
  { value: 'medium', label: '標準' },
  { value: 'strong', label: '強め' },
] as const;

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'dark', label: 'ダーク' },
  { value: 'light', label: 'ライト' },
  { value: 'system', label: 'システム設定に従う' },
  { value: 'scheduled', label: '時間帯で自動切替' },
];


// 共通スタイル（CSS変数使用）
const styles = {
  sectionTitle: {
    color: 'var(--text-tertiary)',
  } as React.CSSProperties,
  sectionContainer: {
    backgroundColor: 'var(--surface-bg)',
  } as React.CSSProperties,
  label: {
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  labelMuted: {
    color: 'var(--text-tertiary)',
  } as React.CSSProperties,
  select: {
    backgroundColor: 'var(--input-bg)',
    borderColor: 'var(--input-border)',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  input: {
    backgroundColor: 'var(--input-bg)',
    borderColor: 'var(--input-border)',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  button: {
    backgroundColor: 'var(--button-bg)',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  border: {
    borderColor: 'var(--border-subtle)',
  } as React.CSSProperties,
};

export function SettingsForm() {
  const { settings, updateTimerSettings, updateSoundSettings, updateTimeAwarenessSettings, updateAppearanceSettings, resetToDefaults } = useSettings();

  const handleTestSound = () => {
    playSound(settings.sound.soundType, settings.sound.volume);
  };

  return (
    <div className="space-y-6">
      <section>
        <h3
          className="text-sm font-medium uppercase tracking-wide mb-2"
          style={styles.sectionTitle}
        >
          タイマー設定
        </h3>
        <div className="rounded-xl p-4 space-y-1" style={styles.sectionContainer}>
          <TimeInput
            label="作業時間"
            value={settings.timer.workMinutes}
            onChange={(v) => updateTimerSettings({ workMinutes: v })}
            min={1}
            max={60}
          />
          <TimeInput
            label="小休憩"
            value={settings.timer.shortBreakMinutes}
            onChange={(v) => updateTimerSettings({ shortBreakMinutes: v })}
            min={1}
            max={30}
          />
          <TimeInput
            label="長い休憩"
            value={settings.timer.longBreakMinutes}
            onChange={(v) => updateTimerSettings({ longBreakMinutes: v })}
            min={1}
            max={60}
          />
          <TimeInput
            label="長休憩までのセッション"
            value={settings.timer.sessionsBeforeLongBreak}
            onChange={(v) => updateTimerSettings({ sessionsBeforeLongBreak: v })}
            min={1}
            max={10}
            unit="回"
          />
          <label className="flex items-center justify-between py-2">
            <span style={styles.label}>次のフェーズを自動開始</span>
            <input
              type="checkbox"
              checked={settings.timer.autoStart}
              onChange={(e) => updateTimerSettings({ autoStart: e.target.checked })}
              className="w-5 h-5 rounded accent-tomato-500"
            />
          </label>
        </div>
      </section>

      <section>
        <h3
          className="text-sm font-medium uppercase tracking-wide mb-2"
          style={styles.sectionTitle}
        >
          サウンド設定
        </h3>
        <div className="rounded-xl p-4 space-y-3" style={styles.sectionContainer}>
          <VolumeSlider
            enabled={settings.sound.enabled}
            volume={settings.sound.volume}
            onEnabledChange={(enabled) => updateSoundSettings({ enabled })}
            onVolumeChange={(volume) => updateSoundSettings({ volume })}
          />

          <div className="flex items-center justify-between py-2">
            <span style={styles.label}>通知音</span>
            <div className="flex items-center gap-2">
              <select
                value={settings.sound.soundType}
                onChange={(e) => updateSoundSettings({ soundType: e.target.value as SoundType })}
                disabled={!settings.sound.enabled}
                className="border rounded-lg px-3 py-2 focus:outline-none disabled:opacity-40"
                style={styles.select}
              >
                {SOUND_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ backgroundColor: 'var(--option-bg)' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleTestSound}
                disabled={!settings.sound.enabled}
                className="px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-40"
                style={styles.button}
              >
                テスト
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 外観設定 */}
      <section>
        <h3
          className="text-sm font-medium uppercase tracking-wide mb-2"
          style={styles.sectionTitle}
        >
          外観設定
        </h3>
        <div className="rounded-xl p-4 space-y-4" style={styles.sectionContainer}>
          {/* テーマモード */}
          <div className="flex items-center justify-between">
            <span style={styles.label}>テーマ</span>
            <select
              value={settings.appearance.themeMode}
              onChange={(e) => updateAppearanceSettings({ themeMode: e.target.value as ThemeMode })}
              className="border rounded-lg px-3 py-2 focus:outline-none"
              style={styles.select}
            >
              {THEME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ backgroundColor: 'var(--option-bg)' }}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 時間帯スケジュール（scheduledモード時のみ表示） */}
          {settings.appearance.themeMode === 'scheduled' && (
            <div className="pl-4 space-y-2 border-l-2" style={styles.border}>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={styles.labelMuted}>ライトモード開始</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={settings.appearance.schedule.lightModeStart}
                    onChange={(e) =>
                      updateAppearanceSettings({
                        schedule: { lightModeStart: parseInt(e.target.value) || 7 },
                      })
                    }
                    className="w-14 border rounded-lg px-2 py-1 text-sm text-center focus:outline-none"
                    style={styles.input}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>時</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={styles.labelMuted}>ダークモード開始</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={settings.appearance.schedule.darkModeStart}
                    onChange={(e) =>
                      updateAppearanceSettings({
                        schedule: { darkModeStart: parseInt(e.target.value) || 19 },
                      })
                    }
                    className="w-14 border rounded-lg px-2 py-1 text-sm text-center focus:outline-none"
                    style={styles.input}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>時</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* 時間認識設定 */}
      <section>
        <h3
          className="text-sm font-medium uppercase tracking-wide mb-2"
          style={styles.sectionTitle}
        >
          時間認識（ADHD対応）
        </h3>
        <div className="rounded-xl p-4 space-y-4" style={styles.sectionContainer}>
          {/* 動的背景 */}
          <div className="space-y-2">
            <label className="flex items-center justify-between">
              <span style={styles.label}>背景色を時間で変化</span>
              <input
                type="checkbox"
                checked={settings.timeAwareness.dynamicBackground.enabled}
                onChange={(e) =>
                  updateTimeAwarenessSettings({
                    dynamicBackground: { enabled: e.target.checked },
                  })
                }
                className="w-5 h-5 rounded accent-tomato-500"
              />
            </label>
            {settings.timeAwareness.dynamicBackground.enabled && (
              <div className="flex items-center justify-between pl-4">
                <span className="text-sm" style={styles.labelMuted}>変化の強さ</span>
                <select
                  value={settings.timeAwareness.dynamicBackground.intensity}
                  onChange={(e) =>
                    updateTimeAwarenessSettings({
                      dynamicBackground: { intensity: e.target.value as 'subtle' | 'medium' | 'strong' },
                    })
                  }
                  className="border rounded-lg px-3 py-1 text-sm focus:outline-none"
                  style={styles.select}
                >
                  {INTENSITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} style={{ backgroundColor: 'var(--option-bg)' }}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 中間リマインダー */}
          <div className="border-t pt-3 space-y-2" style={styles.border}>
            <label className="flex items-center justify-between">
              <span style={styles.label}>中間リマインダー</span>
              <input
                type="checkbox"
                checked={settings.timeAwareness.reminders.enabled}
                onChange={(e) =>
                  updateTimeAwarenessSettings({
                    reminders: { enabled: e.target.checked },
                  })
                }
                className="w-5 h-5 rounded accent-tomato-500"
              />
            </label>
            {settings.timeAwareness.reminders.enabled && (
              <div className="pl-4 space-y-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.timeAwareness.reminders.at50Percent}
                    onChange={(e) =>
                      updateTimeAwarenessSettings({
                        reminders: { at50Percent: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span style={styles.labelMuted}>50%経過時</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.timeAwareness.reminders.at5Minutes}
                    onChange={(e) =>
                      updateTimeAwarenessSettings({
                        reminders: { at5Minutes: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span style={styles.labelMuted}>残り5分</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.timeAwareness.reminders.at1Minute}
                    onChange={(e) =>
                      updateTimeAwarenessSettings({
                        reminders: { at1Minute: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span style={styles.labelMuted}>残り1分</span>
                </label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.timeAwareness.reminders.soundEnabled}
                      onChange={(e) =>
                        updateTimeAwarenessSettings({
                          reminders: { soundEnabled: e.target.checked },
                        })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span style={styles.labelMuted}>音</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.timeAwareness.reminders.visualEnabled}
                      onChange={(e) =>
                        updateTimeAwarenessSettings({
                          reminders: { visualEnabled: e.target.checked },
                        })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span style={styles.labelMuted}>通知</span>
                  </label>
                  <button
                    onClick={() => playReminderChime(settings.sound.volume)}
                    className="ml-auto text-sm"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    テスト
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 音声アナウンス */}
          <div className="border-t pt-3" style={styles.border}>
            <label className="flex items-center justify-between">
              <span style={styles.label}>音声読み上げ</span>
              <input
                type="checkbox"
                checked={settings.timeAwareness.speechAnnouncement.enabled}
                onChange={(e) =>
                  updateTimeAwarenessSettings({
                    speechAnnouncement: { enabled: e.target.checked },
                  })
                }
                className="w-5 h-5 rounded accent-tomato-500"
              />
            </label>
          </div>

          {/* 緊急度エフェクト */}
          <div className="border-t pt-3 space-y-2" style={styles.border}>
            <label className="flex items-center justify-between">
              <span style={styles.label}>緊急度エフェクト</span>
              <input
                type="checkbox"
                checked={settings.timeAwareness.urgencyEffects.enabled}
                onChange={(e) =>
                  updateTimeAwarenessSettings({
                    urgencyEffects: { enabled: e.target.checked },
                  })
                }
                className="w-5 h-5 rounded accent-tomato-500"
              />
            </label>
            {settings.timeAwareness.urgencyEffects.enabled && (
              <div className="pl-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={styles.labelMuted}>開始タイミング</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={settings.timeAwareness.urgencyEffects.thresholdMinutes}
                      onChange={(e) =>
                        updateTimeAwarenessSettings({
                          urgencyEffects: { thresholdMinutes: parseInt(e.target.value) || 5 },
                        })
                      }
                      className="w-14 border rounded-lg px-2 py-1 text-sm text-center focus:outline-none"
                      style={styles.input}
                    />
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>分前</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <button
        onClick={resetToDefaults}
        className="w-full py-3 rounded-xl transition-colors"
        style={{
          backgroundColor: 'var(--surface-bg)',
          color: 'var(--text-secondary)'
        }}
      >
        デフォルトに戻す
      </button>
    </div>
  );
}
