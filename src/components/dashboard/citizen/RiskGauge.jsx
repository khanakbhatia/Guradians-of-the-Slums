import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const LEVEL_COLOR = {
  low: "hsl(var(--success))",
  moderate: "hsl(var(--warning))",
  high: "hsl(var(--destructive))",
};

/** Radial progress ring used for at-a-glance risk scoring. */
function RiskGauge({ score = 0, level = "low", size = 128, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = LEVEL_COLOR[level] ?? LEVEL_COLOR.low;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
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
        <span className="font-mono text-2xl font-semibold text-foreground">{score}</span>
        <span className={cn("font-mono text-2xs uppercase tracking-wide")} style={{ color }}>
          {level}
        </span>
      </div>
    </div>
  );
}

export default RiskGauge;
