"use client";

import { CostSummary as CostSummaryType } from '@/types/cost';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Target, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface CostSummaryProps {
  summary: CostSummaryType;
}

export function CostSummary({ summary }: CostSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getMarginStatus = (margin: number) => {
    if (margin >= 20) return { 
      label: 'Healthy', 
      color: 'text-emerald-600 dark:text-emerald-400', 
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-200 dark:border-emerald-900',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    };
    if (margin >= 10) return { 
      label: 'Good', 
      color: 'text-blue-600 dark:text-blue-400', 
      bg: 'bg-blue-500/10',
      border: 'border-blue-200 dark:border-blue-900',
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    };
    if (margin >= 0) return { 
      label: 'Risk', 
      color: 'text-amber-600 dark:text-amber-400', 
      bg: 'bg-amber-500/10',
      border: 'border-amber-200 dark:border-amber-900',
      iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
    };
    return { 
      label: 'Loss', 
      color: 'text-red-600 dark:text-red-400', 
      bg: 'bg-red-500/10',
      border: 'border-red-200 dark:border-red-900',
      iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
    };
  };

  const marginStatus = getMarginStatus(summary.margin);

  // Standard color scheme - using a neutral blue/purple theme
  const standardColor = {
    text: 'text-slate-700 dark:text-slate-300',
    bg: 'bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-950 dark:to-slate-900/30',
    iconBg: 'bg-gradient-to-br from-slate-600 to-slate-700',
    border: 'border-slate-200/50 dark:border-slate-800/50',
    gradient: 'from-slate-500/10 via-slate-400/5 to-transparent',
  };

  const cards = [
    {
      title: 'Total Fixed Cost',
      value: summary.totalFixedCost,
      icon: DollarSign,
      color: standardColor.text,
      bgColor: standardColor.bg,
      iconBg: standardColor.iconBg,
      border: standardColor.border,
      description: 'Static monthly costs',
      gradient: standardColor.gradient,
    },
    {
      title: 'Total Variable Cost',
      value: summary.totalVariableCost,
      icon: TrendingUp,
      color: standardColor.text,
      bgColor: standardColor.bg,
      iconBg: standardColor.iconBg,
      border: standardColor.border,
      description: 'Costs based on volume',
      gradient: standardColor.gradient,
    },
    {
      title: 'Target Variable Cost',
      value: summary.targetVariableCost,
      icon: Target,
      color: standardColor.text,
      bgColor: standardColor.bg,
      iconBg: standardColor.iconBg,
      border: standardColor.border,
      description: 'Expected variable costs',
      gradient: standardColor.gradient,
    },
    {
      title: 'Total Cost',
      value: summary.totalCost,
      icon: AlertTriangle,
      color: standardColor.text,
      bgColor: standardColor.bg,
      iconBg: standardColor.iconBg,
      border: standardColor.border,
      description: 'Fixed + Variable',
      gradient: standardColor.gradient,
    },
    {
      title: 'Profit / Loss',
      value: summary.profit,
      icon: summary.profit >= 0 ? TrendingUp : TrendingDown,
      color: standardColor.text,
      bgColor: standardColor.bg,
      iconBg: standardColor.iconBg,
      border: standardColor.border,
      description: 'Revenue - Total Cost',
      gradient: standardColor.gradient,
    },
    {
      title: 'Margin',
      value: summary.margin,
      icon: Target,
      color: standardColor.text,
      bgColor: standardColor.bg,
      iconBg: standardColor.iconBg,
      border: standardColor.border,
      description: 'Profit margin %',
      isPercentage: true,
      status: marginStatus.label,
      gradient: standardColor.gradient,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className={cn(
              "relative overflow-hidden border-2 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-3xl group",
              card.border
            )}
          >
            {/* Gradient Background */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
              card.gradient
            )} />
            
            <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="flex-1 space-y-1.5">
                <CardTitle className="text-sm font-semibold text-foreground/90">{card.title}</CardTitle>
                <p className="text-xs text-muted-foreground/80">{card.description}</p>
              </div>
              <div className={cn(
                'relative rounded-xl p-3 shadow-md group-hover:shadow-lg transition-all duration-300',
                card.iconBg
              )}>
                <Icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative space-y-3 pt-0">
              <div className={cn('text-3xl font-bold tracking-tight', card.color)}>
                {card.isPercentage ? formatPercentage(card.value) : formatCurrency(card.value)}
              </div>
              {card.status && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs font-semibold px-2.5 py-1',
                      marginStatus.color,
                      marginStatus.bg,
                      marginStatus.border,
                      'border-2'
                    )}
                  >
                    {card.status}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
