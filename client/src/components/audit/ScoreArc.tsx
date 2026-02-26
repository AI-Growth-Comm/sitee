interface ScoreArcProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 70) return "#4ade80"; // green
  if (score >= 45) return "#fbbf24"; // amber
  return "#f87171"; // red
}

function getScoreLabel(score: number): string {
  if (score >= 70) return "Strong";
  if (score >= 45) return "Needs Work";
  return "Critical";
}

export function ScoreArc({ score, size = 140, strokeWidth = 10, showLabel = true }: ScoreArcProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Use 75% of the circle for the arc (270 degrees)
  const arcLength = circumference * 0.75;
  const offset = circumference * 0.75 * (1 - score / 100);
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(135deg)" }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(0.25 0.015 240)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength - offset} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease-in-out" }}
        />
        {/* Score text (counter-rotated) */}
        <text
          x={size / 2}
          y={size / 2 + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={size * 0.22}
          fontWeight="700"
          fontFamily="Inter, sans-serif"
          style={{ transform: `rotate(-135deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
        >
          {score}
        </text>
      </svg>
      {showLabel && (
        <span
          className="text-sm font-semibold"
          style={{ color }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

// Mini score ring for top nav
export function MiniScoreRing({ score, size = 32 }: { score: number; size?: number }) {
  const color = getScoreColor(score);
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="oklch(0.25 0.015 240)" strokeWidth={3} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute text-xs font-bold tabular-nums"
        style={{ color, fontSize: size * 0.28 }}
      >
        {score}
      </span>
    </div>
  );
}
