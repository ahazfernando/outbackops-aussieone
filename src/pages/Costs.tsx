"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, DollarSign, Calculator, MoreVertical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Cost, CostType, CostCategory } from '@/types/cost';
import { 
  getAllCosts, 
  calculateCostSummary, 
  subscribeToCosts, 
  getCurrentMonth,
  deleteCost 
} from '@/lib/costs';
import { getAllTransactions, calculateFinancialSummary } from '@/lib/financials';
import { CostSummary } from '@/components/finance/CostSummary';
import { TargetVsActualCost } from '@/components/finance/TargetVsActualCost';
import { FixedCostCard } from '@/components/finance/FixedCostCard';
import { VariableCostCard } from '@/components/finance/VariableCostCard';
import { CostFormDialog } from '@/components/finance/CostFormDialog';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const COST_CATEGORIES: CostCategory[] = [
  'CLIENT_PAYMENT',
  'MARKETING',
  'OTHER',
  'TAX',
  'FRANCHISE_FEE',
  'GST',
  'INVESTMENT',
];

const formatCategoryName = (category: CostCategory): string => {
  return category
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

export default function Costs() {
  const { user } = useAuth();
  const [costs, setCosts] = useState<Cost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCost, setSelectedCost] = useState<Cost | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [costToDelete, setCostToDelete] = useState<Cost | null>(null);
  const [selectedType, setSelectedType] = useState<CostType>('fixed');
  const [revenue, setRevenue] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const isAdmin = user?.role === 'admin';

  // Load costs and revenue
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load costs
      const fetchedCosts = await getAllCosts({ month: selectedMonth });
      setCosts(fetchedCosts);

      // Load revenue from transactions
      const transactions = await getAllTransactions();
      const summary = calculateFinancialSummary(transactions);
      setRevenue(summary.totalIncome);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load cost data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    loadData();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToCosts((updatedCosts) => {
      setCosts(updatedCosts);
      
      // Reload revenue periodically (or subscribe to transactions too)
      getAllTransactions().then(transactions => {
        const summary = calculateFinancialSummary(transactions);
        setRevenue(summary.totalIncome);
      });
    }, { month: selectedMonth });

    return () => {
      unsubscribe();
    };
  }, [user, selectedMonth]);

  const handleCostUpdated = () => {
    loadData();
  };

  const handleEditCost = (cost: Cost) => {
    setSelectedCost(cost);
    setShowAddDialog(true);
  };

  const handleDeleteCost = async () => {
    if (!costToDelete) return;

    try {
      await deleteCost(costToDelete.id);
      toast({
        title: 'Success',
        description: 'Cost deleted successfully',
      });
      handleCostUpdated();
      setDeleteDialogOpen(false);
      setCostToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete cost',
        variant: 'destructive',
      });
    }
  };

  // Calculate summary
  const summary = useMemo(() => {
    const currentMonthCosts = costs.filter(c => c.month === selectedMonth);
    return calculateCostSummary(currentMonthCosts, revenue);
  }, [costs, selectedMonth, revenue]);

  // Filter costs by type and category
  const filteredCosts = useMemo(() => {
    return costs.filter(cost => {
      if (cost.type !== selectedType) return false;
      if (categoryFilter !== 'all' && cost.category !== categoryFilter) return false;
      return true;
    });
  }, [costs, selectedType, categoryFilter]);

  const fixedCosts = useMemo(() => {
    return costs.filter(c => c.type === 'fixed' && (categoryFilter === 'all' || c.category === categoryFilter));
  }, [costs, categoryFilter]);

  const variableCosts = useMemo(() => {
    return costs.filter(c => c.type === 'variable' && (categoryFilter === 'all' || c.category === categoryFilter));
  }, [costs, categoryFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading cost data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-background border border-blue-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Cost Management
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Track fixed and variable costs, analyze profitability
            </p>
          </div>
          {isAdmin && (
            <Button 
              onClick={() => {
                setSelectedCost(null);
                setShowAddDialog(true);
              }} 
              className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 border-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 font-semibold"
              size="lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Cost
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="border-2 shadow-lg rounded-3xl">
        <CardHeader className="bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 border-b">
          <CardTitle className="text-lg font-semibold">Filters & Controls</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Adjust date range and category filters</p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold">Month Period</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold">Category Filter</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {COST_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {formatCategoryName(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <CostSummary summary={summary} />

      {/* Target vs Actual Cost */}
      <TargetVsActualCost
        targetCost={summary.totalTargetCost}
        actualCost={summary.totalCost}
        title="Total Cost: Target vs Actual"
      />

      {/* Cost Type Tabs */}
      <Card className="border-2 shadow-xl rounded-3xl">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 via-blue-400/5 to-muted/30 border-b-2 rounded-t-3xl">
          <div className="space-y-3">
            <div>
              <CardTitle className="text-xl font-bold">Cost Management</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track your fixed and variable costs
              </p>
            </div>
            <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as CostType)}>
              <TabsList className="grid w-full max-w-md grid-cols-2 h-11">
                <TabsTrigger value="fixed" className="font-semibold">
                  Fixed Costs ({fixedCosts.length})
                </TabsTrigger>
                <TabsTrigger value="variable" className="font-semibold">
                  Variable Costs ({variableCosts.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as CostType)}>
            <TabsContent value="fixed" className="space-y-4 mt-0">
              {fixedCosts.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                    <DollarSign className="h-10 w-10 opacity-40" />
                  </div>
                  <p className="text-base font-medium mb-1">No fixed costs found</p>
                  <p className="text-sm mb-6">Start by adding your first fixed cost for this month</p>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="shadow-sm hover:shadow-md transition-shadow"
                      onClick={() => {
                        setSelectedType('fixed');
                        setSelectedCost(null);
                        setShowAddDialog(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Fixed Cost
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {fixedCosts.map((cost) => (
                    <div key={cost.id} className="relative group">
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditCost(cost)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setCostToDelete(cost);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <FixedCostCard
                        name={cost.name}
                        category={cost.category}
                        amount={cost.amount}
                        onClick={isAdmin ? () => handleEditCost(cost) : undefined}
                      />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="variable" className="space-y-4 mt-0">
              {variableCosts.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                    <Calculator className="h-10 w-10 opacity-40" />
                  </div>
                  <p className="text-base font-medium mb-1">No variable costs found</p>
                  <p className="text-sm mb-6">Start by adding your first variable cost for this month</p>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="shadow-sm hover:shadow-md transition-shadow"
                      onClick={() => {
                        setSelectedType('variable');
                        setSelectedCost(null);
                        setShowAddDialog(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Variable Cost
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {variableCosts.map((cost) => (
                    <div key={cost.id} className="relative group">
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditCost(cost)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setCostToDelete(cost);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <VariableCostCard
                        name={cost.name}
                        category={cost.category}
                        costPerUnit={cost.amount}
                        unit={cost.unit || 'unit'}
                        expectedVolume={cost.expectedVolume}
                        actualVolume={cost.actualVolume}
                        onClick={isAdmin ? () => handleEditCost(cost) : undefined}
                      />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add/Edit Cost Dialog */}
      <CostFormDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            setSelectedCost(null);
          }
        }}
        cost={selectedCost}
        defaultType={selectedType}
        onSuccess={handleCostUpdated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the cost "{costToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCost} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
