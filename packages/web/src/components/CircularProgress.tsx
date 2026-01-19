import { memo, useMemo } from 'react';

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  bgColor?: string;
  children?: React.ReactNode;
}

export const CircularProgress = memo(function CircularProgress({
  progress,
  size = 280,
  strokeWidth = 8,
  color,
  bgColor = 'rgba(255, 255, 255, 0.1)',
  children,
}: CircularProgressProps) {
  // 計算値をメモ化
  const { radius, circumference, strokeDashoffset, center } = useMemo(() => {
    const r = (size - strokeWidth) / 2;
    const c = r * 2 * Math.PI;
    return {
      radius: r,
      circumference: c,
      strokeDashoffset: c - (progress / 100) * c,
      center: size / 2,
    };
  }, [size, strokeWidth, progress]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* 背景の円 */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* プログレスの円 */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="progress-ring"
        />
      </svg>
      {/* 中央のコンテンツ */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
});
