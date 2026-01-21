"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DollarSign, TrendingUp } from "lucide-react";

interface FixedCostCardProps {
  name: string;
  category: string;
  amount: number;
  onClick?: () => void;
}

export function FixedCostCard({ name, category, amount, onClick }: FixedCostCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCategoryName = (category: string): string => {
    return category
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

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
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-semibold text-base text-foreground">{name}</h3>
              <Badge 
                variant="outline" 
                className="text-xs font-medium border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50"
              >
                {formatCategoryName(category)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800/50">
                <DollarSign className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              </div>
              <span className="text-xs font-medium">Fixed Monthly Cost</span>
            </div>
          </div>
          <div className="text-right space-y-1">
            <p className="text-2xl font-bold text-foreground tracking-tight">{formatCurrency(amount)}</p>
            <p className="text-xs text-muted-foreground font-medium">per month</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
