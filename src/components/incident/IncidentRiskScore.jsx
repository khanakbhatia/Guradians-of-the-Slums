import { motion } from "framer-motion";
import { Gauge } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { Muted } from "@/components/ui/typography";

const LEVEL_META = {
  low: { color: "hsl(var(--success))", variant: "success" },
  moderate: { color: "hsl(var(--warning))", variant: "warning" },
  high: { color: "hsl(var(--destructive))", variant: "destructive" },
};

function RiskGauge({ score, color, size = 112, strokeWidth = 9 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (score / 100) * circumference }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl font-semibold text-foreground">{score}</span>
        <span className="text-2xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function IncidentRiskScore({ riskScore }) {
  const meta = LEVEL_META[riskScore.level] ?? LEVEL_META.low;

  return (
    <Card variant="highlight" className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Risk score</CardTitle>
          <CardDescription>Model-generated severity estimate</CardDescription>
        </div>
        <Gauge className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex items-center gap-5">
        <RiskGauge score={riskScore.score} color={meta.color} />
        <div className="min-w-0 flex-1">
          <StatusChip variant={meta.variant} className="mb-3">
            {riskScore.level} risk
          </StatusChip>
          <div className="space-y-1.5">
            {riskScore.factors.map((f) => (
              <div key={f.label} className="flex items-center justify-between gap-3 text-xs">
                <Muted className="truncate">{f.label}</Muted>
                <span className="shrink-0 font-medium text-foreground">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default IncidentRiskScore;
