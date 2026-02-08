interface Props {
  percent: number;
  height?: number;
}

export default function ProgressBar({ percent, height = 18 }: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  const hue = (clamped / 100) * 120; // 0=red, 120=green
  return (
    <div
      className="progress-bar-track"
      style={{ height }}
    >
      <div
        className="progress-bar-fill"
        style={{
          width: `${clamped}%`,
          backgroundColor: `hsl(${hue}, 70%, 45%)`,
        }}
      />
      <span className="progress-bar-label">{clamped}%</span>
    </div>
  );
}
