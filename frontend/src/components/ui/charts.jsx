import * as React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

import { cn } from "@/lib/utils";

/**
 * Chart primitives. Palette pulls from the --chart-1..5 tokens so charts
 * stay in the same color family as chips/alerts. Grid lines are hairline
 * and low-opacity; axes use the mono/eyebrow type treatment used for all
 * "instrument readout" text in the system.
 */
export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const axisStyle = {
  fontSize: 11,
  fontFamily: "IBM Plex Mono, monospace",
  fill: "hsl(var(--muted-foreground))",
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-border-strong bg-popover px-3 py-2 shadow-panel">
      {label !== undefined && (
        <p className="mb-1 font-mono text-2xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      )}
      <div className="space-y-0.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-mono tabular-nums text-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartShell({ height = 280, className, children }) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/** Trend line — incident counts, response times over time. */
export function TrendLineChart({ data, lines, height, className }) {
  return (
    <ChartShell height={height} className={className}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border-strong))" }} />
        {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />}
        {lines.map((line, i) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label ?? line.key}
            stroke={line.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3.5 }}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
          />
        ))}
      </LineChart>
    </ChartShell>
  );
}

/** Filled area — cumulative volume, capacity-over-time. */
export function TrendAreaChart({ data, areaKey, color, height, className }) {
  const stroke = color ?? CHART_COLORS[0];
  return (
    <ChartShell height={height} className={className}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border-strong))" }} />
        <Area
          type="monotone"
          dataKey={areaKey}
          stroke={stroke}
          strokeWidth={2}
          fill="url(#areaFill)"
          isAnimationActive
          animationDuration={750}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ChartShell>
  );
}

/** Grouped/stacked bars — comparisons across zones/categories. */
export function ComparisonBarChart({ data, bars, height, className, stacked = false }) {
  return (
    <ChartShell height={height} className={className}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--accent))" }} />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />}
        {bars.map((bar, i) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.label ?? bar.key}
            fill={bar.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            radius={[3, 3, 0, 0]}
            stackId={stacked ? "stack" : undefined}
            maxBarSize={28}
            isAnimationActive
            animationDuration={600}
            animationEasing="ease-out"
            animationBegin={i * 80}
          />
        ))}
      </BarChart>
    </ChartShell>
  );
}

/** Donut — proportional breakdown (severity mix, category share). */
export function DonutChart({ data, height = 220, className, innerRadius = 58, outerRadius = 84 }) {
  return (
    <ChartShell height={height} className={className}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          strokeWidth={0}
          isAnimationActive
          animationDuration={700}
          animationEasing="ease-out"
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={entry.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ChartShell>
  );
}
