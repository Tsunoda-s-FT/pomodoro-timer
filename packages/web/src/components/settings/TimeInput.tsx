interface TimeInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  unit?: string;
}

export function TimeInput({ label, value, onChange, min, max, unit = '分' }: TimeInputProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <label style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const num = parseInt(e.target.value, 10);
            if (!isNaN(num) && num >= min && num <= max) {
              onChange(num);
            }
          }}
          min={min}
          max={max}
          className="w-16 px-3 py-2 border rounded-lg text-center focus:outline-none"
          style={{
            backgroundColor: 'var(--input-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--text-primary)',
          }}
        />
        <span className="text-sm w-8" style={{ color: 'var(--text-muted)' }}>{unit}</span>
      </div>
    </div>
  );
}
