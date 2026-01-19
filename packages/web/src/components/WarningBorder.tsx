interface Props {
  urgency: number; // 0-1
}

export function WarningBorder({ urgency }: Props) {
  // 緊急度に応じて不透明度とアニメーション速度を変化
  const opacity = Math.min(0.8, urgency * 0.8);
  const animationDuration = Math.max(0.5, 2 - urgency * 1.5);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40"
      style={{
        // CSS変数を使用してテーマ対応の警告色を適用
        boxShadow: `inset 0 0 60px color-mix(in srgb, var(--warning-color) ${opacity * 100}%, transparent)`,
        animation: `pulse-border ${animationDuration}s ease-in-out infinite`,
      }}
    />
  );
}
