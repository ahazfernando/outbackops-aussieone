"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Loader2, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Cost, CostType, CostCategory, CostUnit } from '@/types/cost';
import { createCost, updateCost, getCurrentMonth } from '@/lib/costs';

interface CostFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cost?: Cost | null;
  onSuccess?: () => void;
  defaultType?: CostType;
}

const COST_CATEGORIES: CostCategory[] = [
  'CLIENT_PAYMENT',
  'MARKETING',
  'OTHER',
  'TAX',
  'FRANCHISE_FEE',
  'GST',
  'INVESTMENT',
];

const COST_UNITS: { value: CostUnit; label: string }[] = [
  { value: 'task', label: 'Per Task' },
  { value: 'hour', label: 'Per Hour' },
  { value: 'client', label: 'Per Client' },
  { value: 'unit', label: 'Per Unit' },
];

const formatCategoryName = (category: CostCategory): string => {
  return category
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

export function CostFormDialog({
  open,
  onOpenChange,
  cost,
  onSuccess,
  defaultType = 'fixed',
}: CostFormDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<CostType>(cost?.type || defaultType);
  const [month, setMonth] = useState<string>(cost?.month || getCurrentMonth());

  const [formData, setFormData] = useState({
    name: cost?.name || '',
    category: (cost?.category || 'CLIENT_PAYMENT') as CostCategory,
    amount: cost?.amount || 0,
    unit: (cost?.unit || 'task') as CostUnit,
    expectedVolume: cost?.expectedVolume || 0,
    actualVolume: cost?.actualVolume || 0,
  });

  // Reset form when dialog opens/closes or cost changes
  useEffect(() => {
    if (open) {
      if (cost) {
        setType(cost.type);
        setMonth(cost.month);
        setFormData({
          name: cost.name,
          category: cost.category || 'CLIENT_PAYMENT',
          amount: cost.amount,
          unit: cost.unit || 'task',
          expectedVolume: cost.expectedVolume || 0,
          actualVolume: cost.actualVolume || 0,
        });
      } else {
        setType(defaultType);
        setMonth(getCurrentMonth());
        setFormData({
          name: '',
          category: 'CLIENT_PAYMENT',
          amount: 0,
          unit: 'task',
          expectedVolume: 0,
          actualVolume: 0,
        });
      }
    }
  }, [open, cost, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a cost',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a cost name',
        variant: 'destructive',
      });
      return;
    }

    if (formData.amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Amount must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    if (type === 'variable') {
      if (formData.expectedVolume < 0 || formData.actualVolume < 0) {
        toast({
          title: 'Validation Error',
          description: 'Volume values must be 0 or greater',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      setLoading(true);

      if (cost) {
        // Update existing cost
        await updateCost(cost.id, {
          name: formData.name,
          type: type,
          category: formData.category,
          amount: formData.amount,
          unit: type === 'variable' ? formData.unit : undefined,
          expectedVolume: type === 'variable' ? formData.expectedVolume : undefined,
          actualVolume: type === 'variable' ? formData.actualVolume : undefined,
          month: month,
          updatedBy: user.id,
        });

        toast({
          title: 'Success',
          description: 'Cost updated successfully',
        });
      } else {
        // Create new cost
        await createCost({
          name: formData.name,
          type: type,
          category: formData.category,
          amount: formData.amount,
          unit: type === 'variable' ? formData.unit : undefined,
          expectedVolume: type === 'variable' ? formData.expectedVolume : undefined,
          actualVolume: type === 'variable' ? formData.actualVolume : undefined,
          month: month,
          createdBy: user.id,
        });

        toast({
          title: 'Success',
          description: 'Cost created successfully',
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving cost:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save cost',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {cost ? 'Edit Cost' : 'Add New Cost'}
          </DialogTitle>
          <DialogDescription>
            {cost ? 'Update cost details' : 'Define a new fixed or variable cost'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cost Type Selector */}
          <div className="space-y-2">
            <Label>Cost Type</Label>
            <Tabs value={type} onValueChange={(v) => setType(v as CostType)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fixed">Fixed Cost</TabsTrigger>
                <TabsTrigger value="variable">Variable Cost (VPC)</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground">
              {type === 'fixed'
                ? 'Fixed costs do not change with volume (e.g., rent, salaries)'
                : 'Variable costs change with output/volume (e.g., cost per task, per hour)'}
            </p>
          </div>

          {/* Basic Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Cost Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Office Rent, Per Task Cost"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value as CostCategory })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COST_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {formatCategoryName(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Month */}
          <div className="space-y-2">
            <Label htmlFor="month">Month (YYYY-MM)</Label>
            <Input
              id="month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              {type === 'fixed' ? 'Fixed Amount' : 'Cost per Unit'} (AUD){' '}
              <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                }
                className="pl-9"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Variable Cost Specific Fields */}
          {type === 'variable' && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="unit">Unit Type</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) =>
                    setFormData({ ...formData, unit: value as CostUnit })
                  }
                >
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COST_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expectedVolume">Expected Volume (Target)</Label>
                  <Input
                    id="expectedVolume"
                    type="number"
                    step="1"
                    min="0"
                    value={formData.expectedVolume}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expectedVolume: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actualVolume">Actual Volume</Label>
                  <Input
                    id="actualVolume"
                    type="number"
                    step="1"
                    min="0"
                    value={formData.actualVolume}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        actualVolume: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {cost ? 'Update Cost' : 'Create Cost'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
