import { Volume2, VolumeX } from 'lucide-react';

interface VolumeSliderProps {
  enabled: boolean;
  volume: number;
  onEnabledChange: (enabled: boolean) => void;
  onVolumeChange: (volume: number) => void;
}

export function VolumeSlider({ enabled, volume, onEnabledChange, onVolumeChange }: VolumeSliderProps) {
  return (
    <div className="flex items-center gap-4 py-3">
      <button
        onClick={() => onEnabledChange(!enabled)}
        className="p-2 rounded-full transition-colors"
        style={{
          backgroundColor: enabled ? 'var(--button-bg)' : 'var(--surface-bg)',
          color: enabled ? 'var(--text-primary)' : 'var(--text-muted)',
        }}
        aria-label={enabled ? 'サウンドをオフ' : 'サウンドをオン'}
      >
        {enabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.1}
        value={volume}
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        disabled={!enabled}
        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'var(--surface-bg)' }}
      />
      <span className="text-sm w-12 text-right" style={{ color: 'var(--text-muted)' }}>
        {Math.round(volume * 100)}%
      </span>
    </div>
  );
}
