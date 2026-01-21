"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TargetVsActualCardProps, TargetVsActualStatus } from "./TargetVsActualCard.types";

const getDerivedStatus = (target: number, actual: number): TargetVsActualStatus => {
  if (target <= 0) {
    // Edge-case: no target set, treat as on-track to avoid red state by default
    return "on-track";
  }

  const ratio = actual / target;

  if (ratio >= 1) return "on-track";
  if (ratio >= 0.7) return "risk";
  return "off-track";
};

const getStatusConfig = (status: TargetVsActualStatus) => {
  switch (status) {
    case "on-track":
      return {
        label: "On Track",
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
        barClass: "bg-gradient-to-r from-emerald-500 to-emerald-400",
        iconBgClass: "bg-emerald-500/10",
        iconClass: "text-emerald-600 dark:text-emerald-400",
        varianceClass: "text-emerald-600 dark:text-emerald-400",
      };
    case "risk":
      return {
        label: "At Risk",
        badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/40",
        barClass: "bg-gradient-to-r from-amber-500 to-orange-500",
        iconBgClass: "bg-amber-500/10",
        iconClass: "text-amber-700 dark:text-amber-400",
        varianceClass: "text-amber-700 dark:text-amber-400",
      };
    case "off-track":
    default:
      return {
        label: "Off Track",
        badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/40",
        barClass: "bg-gradient-to-r from-red-500 to-rose-500",
        iconBgClass: "bg-red-500/10",
        iconClass: "text-red-600 dark:text-red-400",
        varianceClass: "text-red-600 dark:text-red-400",
      };
  }
};

// Circular progress component
const CircularProgress = ({
  percentage,
  statusConfig,
  size = 80,
  gradientId,
}: {
  percentage: number;
  statusConfig: ReturnType<typeof getStatusConfig>;
  size?: number;
  gradientId: string;
}) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
  const strokeWidth = 6;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {statusConfig.barClass.includes("emerald") && (
              <>
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#34d399" />
              </>
            )}
            {statusConfig.barClass.includes("amber") && (
              <>
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#f97316" />
              </>
            )}
            {statusConfig.barClass.includes("red") && (
              <>
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f43f5e" />
              </>
            )}
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
};

export function TargetVsActualCard({
  title,
  target,
  actual,
  unit,
  icon: Icon,
  status: statusOverride,
}: TargetVsActualCardProps) {
  const safeTarget = Number.isFinite(target) ? target : 0;
  const safeActual = Number.isFinite(actual) ? actual : 0;

  // Generate unique gradient ID for this card instance
  const gradientId = useMemo(() => `gradient-${Math.random().toString(36).substr(2, 9)}`, []);

  const percentage = useMemo(() => {
    if (safeTarget <= 0) {
      // If no target, show 0–100% based on whether there's any actual performance
      return safeActual > 0 ? 100 : 0;
    }

    const value = (safeActual / safeTarget) * 100;
    // Cap between 0–200% so over-performance still shows but doesn't break layout
    return Math.max(0, Math.min(value, 200));
  }, [safeTarget, safeActual]);

  const status: TargetVsActualStatus = statusOverride ?? getDerivedStatus(safeTarget, safeActual);
  const statusConfig = getStatusConfig(status);

  const formattedUnit = unit ? ` ${unit}` : "";
  const displayPercentage = Math.round(percentage);

  // Calculate variance
  const variance = safeActual - safeTarget;
  const variancePercentage = safeTarget > 0 ? ((variance / safeTarget) * 100).toFixed(1) : "0";
  const isPositive = variance >= 0;
  const TrendIcon = variance > 0 ? TrendingUp : variance < 0 ? TrendingDown : Minus;

  const tooltipText =
    safeTarget > 0
      ? `${safeActual}${formattedUnit} of ${safeTarget}${formattedUnit} (${displayPercentage}%)`
      : `${safeActual}${formattedUnit}`;

  // Format numbers with commas
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return num.toLocaleString();
    }
    return num.toString();
  };

  return (
    <Card className="border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] min-h-[320px] flex flex-col rounded-3xl overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 pt-5 px-5">
        <div className="flex items-start gap-3 flex-1">
          {Icon && (
            <div
              className={cn(
                "p-2.5 rounded-lg shrink-0",
                statusConfig.iconBgClass
              )}
            >
              <Icon className={cn("w-5 h-5", statusConfig.iconClass)} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold leading-tight">{title}</CardTitle>
          </div>
        </div>
        <Badge
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold border shrink-0",
            statusConfig.badgeClass
          )}
        >
          {statusConfig.label}
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col px-5 pb-5 pt-0 space-y-5">
        {/* Main performance indicator with circular progress */}
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Performance
                </span>
                <span className="text-sm font-semibold text-foreground">{displayPercentage}%</span>
              </div>
              <div
                className="relative h-3 w-full overflow-hidden rounded-full bg-muted/50"
                title={tooltipText}
              >
                <div
                  className={cn(
                    "h-full origin-left rounded-full transition-all duration-700 ease-out shadow-sm",
                    statusConfig.barClass
                  )}
                  style={{
                    width: `${Math.min(displayPercentage, 100)}%`,
                  }}
                />
                {displayPercentage > 100 && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-2 bg-emerald-300/60 dark:bg-emerald-500/50" />
                )}
              </div>
            </div>

            {/* Variance indicator */}
            <div className="flex items-center gap-2 pt-1">
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
                  isPositive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                )}
              >
                <TrendIcon className="w-3.5 h-3.5" />
                <span>
                  {isPositive ? "+" : ""}
                  {formatNumber(Math.abs(variance))}
                  {formattedUnit} ({isPositive ? "+" : ""}
                  {variancePercentage}%)
                </span>
              </div>
            </div>
          </div>

          {/* Circular progress indicator */}
          <div className="shrink-0">
            <CircularProgress
              percentage={displayPercentage}
              statusConfig={statusConfig}
              size={90}
              gradientId={gradientId}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/50" />

        {/* Target vs Actual comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
              Target
            </p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-bold text-foreground">
                {formatNumber(safeTarget)}
              </p>
              {formattedUnit && (
                <span className="text-sm text-muted-foreground font-medium">{formattedUnit}</span>
              )}
            </div>
          </div>
          <div className="space-y-2 text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
              Actual
            </p>
            <div className="flex items-baseline gap-1.5 justify-end">
              <p className="text-2xl font-bold text-foreground">
                {formatNumber(safeActual)}
              </p>
              {formattedUnit && (
                <span className="text-sm text-muted-foreground font-medium">{formattedUnit}</span>
              )}
            </div>
          </div>
        </div>

        {/* Additional context bar */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground/70">Completion</span>
            <span className="font-medium text-foreground">
              {safeTarget > 0
                ? `${((safeActual / safeTarget) * 100).toFixed(1)}% of target`
                : "No target set"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TargetVsActualCard;

