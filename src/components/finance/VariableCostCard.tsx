"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { CostUnit } from "@/types/cost";

interface VariableCostCardProps {
  name: string;
  category: string;
  costPerUnit: number;
  unit: CostUnit;
  expectedVolume?: number;
  actualVolume?: number;
  onClick?: () => void;
}

const getUnitLabel = (unit: CostUnit): string => {
  switch (unit) {
    case 'task': return 'per task';
    case 'hour': return 'per hour';
    case 'client': return 'per client';
    case 'unit': return 'per unit';
    default: return 'per unit';
  }
};

const formatCategoryName = (category: string): string => {
  return category
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

export function VariableCostCard({
  name,
  category,
  costPerUnit,
  unit,
  expectedVolume = 0,
  actualVolume = 0,
  onClick,
}: VariableCostCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const targetCost = costPerUnit * expectedVolume;
  const actualCost = costPerUnit * actualVolume;
  const variance = actualCost - targetCost;
  const variancePercentage = targetCost > 0 ? ((variance / targetCost) * 100).toFixed(1) : "0";
  const TrendIcon = variance > 0 ? TrendingUp : variance < 0 ? TrendingDown : Minus;
  const isOverBudget = variance > 0;

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 rounded-3xl group",
        "bg-gradient-to-br from-background to-muted/20",
        "border-slate-200/50 dark:border-slate-800/50",
        onClick && "cursor-pointer hover:scale-[1.01]"
      )}
      onClick={onClick}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className="relative p-5">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-semibold text-base text-foreground">{name}</h3>
                <Badge 
                  variant="outline" 
                  className="text-xs font-medium border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50"
                >
                  {formatCategoryName(category)}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800/50">
                  <Target className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  {formatCurrency(costPerUnit)} {getUnitLabel(unit)}
                </p>
              </div>
            </div>
          </div>

          {/* Volume and Cost Info */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/50">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground/80 font-medium uppercase tracking-wide">Expected</p>
              <p className="text-lg font-bold text-foreground">{expectedVolume.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground font-medium">{formatCurrency(targetCost)}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground/80 font-medium uppercase tracking-wide">Actual</p>
              <p className="text-lg font-bold text-foreground">{actualVolume.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground font-medium">{formatCurrency(actualCost)}</p>
            </div>
          </div>

          {/* Variance */}
          {targetCost > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all",
                  isOverBudget
                    ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                    : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
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
        </div>
      </CardContent>
    </Card>
  );
}
