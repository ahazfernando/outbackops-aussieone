"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TargetVsActualCostProps {
  targetCost: number;
  actualCost: number;
  title?: string;
}

const getStatus = (target: number, actual: number) => {
  if (target <= 0) return { label: "No Target", severity: "neutral" };
  
  const percentage = (actual / target) * 100;
  const variance = actual - target;
  
  if (percentage <= 100) {
    return { 
      label: "Under Budget", 
      severity: "good" as const,
      percentage,
      variance 
    };
  } else if (percentage <= 110) {
    return { 
      label: "Slightly Over", 
      severity: "warning" as const,
      percentage,
      variance 
    };
  } else {
    return { 
      label: "Over Budget", 
      severity: "danger" as const,
      percentage,
      variance 
    };
  }
};

const getStatusConfig = (severity: "good" | "warning" | "danger" | "neutral") => {
  switch (severity) {
    case "good":
      return {
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
        barClass: "bg-gradient-to-r from-emerald-500 to-emerald-400",
        iconClass: "text-emerald-600 dark:text-emerald-400",
        varianceClass: "text-emerald-600 dark:text-emerald-400",
      };
    case "warning":
      return {
        badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/40",
        barClass: "bg-gradient-to-r from-amber-500 to-orange-500",
        iconClass: "text-amber-700 dark:text-amber-400",
        varianceClass: "text-amber-700 dark:text-amber-400",
      };
    case "danger":
      return {
        badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/40",
        barClass: "bg-gradient-to-r from-red-500 to-rose-500",
        iconClass: "text-red-600 dark:text-red-400",
        varianceClass: "text-red-600 dark:text-red-400",
      };
    default:
      return {
        badgeClass: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/40",
        barClass: "bg-gradient-to-r from-gray-400 to-gray-500",
        iconClass: "text-gray-600 dark:text-gray-400",
        varianceClass: "text-gray-600 dark:text-gray-400",
      };
  }
};

export function TargetVsActualCost({ 
  targetCost, 
  actualCost, 
  title = "Target vs Actual Cost" 
}: TargetVsActualCostProps) {
  const status = getStatus(targetCost, actualCost);
  const statusConfig = getStatusConfig(status.severity);
  const safeTarget = Math.max(targetCost, 0);
  const safeActual = Math.max(actualCost, 0);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const percentage = safeTarget > 0 
    ? Math.min((safeActual / safeTarget) * 100, 150) 
    : 0;

  const variance = safeActual - safeTarget;
  const variancePercentage = safeTarget > 0 
    ? ((variance / safeTarget) * 100).toFixed(1) 
    : "0";

  const TrendIcon = variance > 0 ? TrendingUp : variance < 0 ? TrendingDown : DollarSign;

  return (
    <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-3xl group border-slate-200/50 dark:border-slate-800/50">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-5">
        <div className="flex items-start gap-4 flex-1">
          <div className={cn(
            "p-3 rounded-xl shrink-0 shadow-md transition-all duration-300 group-hover:shadow-lg",
            'bg-gradient-to-br from-slate-600 to-slate-700'
          )}>
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <CardTitle className="text-lg font-semibold leading-tight text-foreground">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Compare budgeted vs actual spending
            </p>
          </div>
        </div>
        <Badge
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-semibold border-2 shrink-0 shadow-sm",
            statusConfig.badgeClass
          )}
        >
          {status.label}
        </Badge>
      </CardHeader>
      <CardContent className="relative space-y-6">
        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Budget Utilization
            </span>
            <span className="text-base font-bold text-foreground">
              {safeTarget > 0 ? percentage.toFixed(1) : '0'}%
            </span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative h-5 w-full overflow-hidden rounded-full bg-muted/60 cursor-help shadow-inner">
                  <div
                    className={cn(
                      "h-full origin-left rounded-full transition-all duration-700 ease-out shadow-md",
                      statusConfig.barClass
                    )}
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                    }}
                  />
                  {percentage > 100 && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-3 bg-red-400/70 dark:bg-red-600/70 rounded-r-full" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">Target: {formatCurrency(safeTarget)}</p>
                <p className="font-semibold">Actual: {formatCurrency(safeActual)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Variance Indicator */}
        {safeTarget > 0 && (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium",
                variance >= 0 
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              )}
            >
              <TrendIcon className="w-4 h-4" />
              <span>
                {variance >= 0 ? '+' : ''}
                {formatCurrency(Math.abs(variance))} ({variance >= 0 ? '+' : ''}{variancePercentage}%)
              </span>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border/50" />

        {/* Target vs Actual Values */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2 p-4 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
              Target Cost
            </p>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {formatCurrency(safeTarget)}
            </p>
          </div>
          <div className="space-y-2 text-right p-4 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
              Actual Cost
            </p>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {formatCurrency(safeActual)}
            </p>
          </div>
        </div>

        {/* Additional context */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground/70">Status</span>
            <span className={cn("font-medium", statusConfig.varianceClass)}>
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
