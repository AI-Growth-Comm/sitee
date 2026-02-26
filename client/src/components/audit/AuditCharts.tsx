import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
} from "recharts";
import type { DimensionScore } from "../../../../shared/auditTypes";

function getBarColor(score: number): string {
  if (score >= 70) return "#4ade80";
  if (score >= 45) return "#fbbf24";
  return "#f87171";
}

interface AuditChartsProps {
  dimensions: DimensionScore[];
}

export function RadarChartView({ dimensions }: AuditChartsProps) {
  const data = dimensions.map((d) => ({
    subject: d.name.replace("Local/Niche SEO", "Local SEO").replace("Competitor Gap", "Comp. Gap"),
    score: d.score,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data}>
        <PolarGrid stroke="oklch(0.3 0.015 240)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: "oklch(0.6 0.01 240)", fontSize: 11 }}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "oklch(0.16 0.012 240)",
            border: "1px solid oklch(0.25 0.015 240)",
            borderRadius: "8px",
            color: "oklch(0.95 0.005 240)",
          }}
          formatter={(value: number) => [`${value}/100`, "Score"]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function BarChartView({ dimensions }: AuditChartsProps) {
  const data = dimensions.map((d) => ({
    name: d.name.replace("Local/Niche SEO", "Local SEO").replace("Competitor Gap", "Comp. Gap").replace("Topical Authority", "Topical Auth."),
    score: d.score,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" domain={[0, 100]} tick={{ fill: "oklch(0.6 0.01 240)", fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fill: "oklch(0.7 0.01 240)", fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "oklch(0.16 0.012 240)",
            border: "1px solid oklch(0.25 0.015 240)",
            borderRadius: "8px",
            color: "oklch(0.95 0.005 240)",
          }}
          formatter={(value: number) => [`${value}/100`, "Score"]}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
