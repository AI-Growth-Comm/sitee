import { cn } from "@/lib/utils";

type Priority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";
type Intent = "Informational" | "Commercial" | "Navigational" | "Transactional";

const priorityStyles: Record<Priority, string> = {
  URGENT: "bg-red-500/15 text-red-400 border-red-500/30",
  HIGH: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  MEDIUM: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  LOW: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const intentStyles: Record<Intent, string> = {
  Informational: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Commercial: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Navigational: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  Transactional: "bg-green-500/15 text-green-400 border-green-500/30",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border", priorityStyles[priority])}>
      {priority}
    </span>
  );
}

export function IntentBadge({ intent }: { intent: Intent }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border", intentStyles[intent])}>
      {intent}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  const styles: Record<string, string> = {
    Technical: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    "On-Page": "bg-purple-500/15 text-purple-400 border-purple-500/30",
    Content: "bg-green-500/15 text-green-400 border-green-500/30",
    "Internal Links": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    Schema: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    Metadata: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border", styles[category] ?? "bg-slate-500/15 text-slate-400 border-slate-500/30")}>
      {category}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    Pillar: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    Cluster: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    "How-To": "bg-green-500/15 text-green-400 border-green-500/30",
    Guide: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    Report: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border", styles[type] ?? "bg-slate-500/15 text-slate-400 border-slate-500/30")}>
      {type}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const style =
    score >= 70
      ? "bg-green-500/15 text-green-400 border-green-500/30"
      : score >= 45
      ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
      : "bg-red-500/15 text-red-400 border-red-500/30";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border tabular-nums", style)}>
      {score}
    </span>
  );
}
