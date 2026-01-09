"use client";

import { useState } from 'react';
import { Transaction, TransactionFilters } from '@/types/transaction';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { CalendarIcon, Edit, Trash2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TransactionFormDialog } from './TransactionFormDialog';
import { toast } from '@/hooks/use-toast';
import type { DateRange } from 'react-day-picker';

interface TransactionsTableProps {
  transactions: Transaction[];
  onTransactionUpdated?: () => void;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CREDIT_DEBIT_CARD: 'Credit / Debit Card',
  CASH_IN_HAND: 'Cash in Hand',
  BANK_TRANSFER_BUSINESS: 'Bank Transfer (Business)',
  BANK_TRANSFER_PERSONAL: 'Bank Transfer (Personal)',
};

export function TransactionsTable({ transactions, onTransactionUpdated }: TransactionsTableProps) {
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [gstFilter, setGstFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const formatCategory = (transaction: Transaction) => {
    if (transaction.category === 'OTHER' && transaction.customCategory) {
      return transaction.customCategory;
    }
    return transaction.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleDelete = async () => {
    if (!deletingTransaction) return;

    try {
      const response = await fetch(`/api/financials/transactions/${deletingTransaction.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete transaction';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      toast({
        title: 'Success',
        description: 'Transaction deleted successfully',
      });

      setDeletingTransaction(null);
      onTransactionUpdated?.();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'An error occurred while deleting the transaction',
        variant: 'destructive',
      });
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        transaction.description?.toLowerCase().includes(query) ||
        transaction.clientName?.toLowerCase().includes(query) ||
        formatCategory(transaction).toLowerCase().includes(query) ||
        transaction.customCategory?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    if (typeFilter !== 'all' && transaction.type !== typeFilter) return false;

    if (categoryFilter !== 'all' && transaction.category !== categoryFilter) return false;

    if (gstFilter !== 'all') {
      if (gstFilter === 'with' && !transaction.gstApplied) return false;
      if (gstFilter === 'without' && transaction.gstApplied) return false;
    }

    if (dateRange?.from && transaction.date < dateRange.from) return false;

    if (dateRange?.to) {
      const endDateEndOfDay = new Date(dateRange.to);
      endDateEndOfDay.setHours(23, 59, 59, 999);
      if (transaction.date > endDateEndOfDay) return false;
    }

    return true;
  });

  const categories = Array.from(new Set(transactions.map((t) => t.category)));

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-end gap-4 w-full">
            <div className="space-y-2 min-w-[200px] flex-1 max-w-[250px]">
              <label className="text-sm font-medium">Type (Inflow/Outflow)</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="INFLOW">Inflow</SelectItem>
                  <SelectItem value="OUTFLOW">Outflow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 min-w-[200px] flex-1 max-w-[250px]">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 min-w-[200px] flex-1 max-w-[250px]">
              <label className="text-sm font-medium">GST</label>
              <Select value={gstFilter} onValueChange={setGstFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="with">With GST</SelectItem>
                  <SelectItem value="without">Without GST</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex-1 max-w-[300px]">
              <label className="text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                  {dateRange && (
                    <div className="p-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setDateRange(undefined)}
                      >
                        Clear date filter
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {(typeFilter !== 'all' || categoryFilter !== 'all' || gstFilter !== 'all' || dateRange) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTypeFilter('all');
                  setCategoryFilter('all');
                  setGstFilter('all');
                  setDateRange(undefined);
                }}
                className="mb-0"
              >
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border-2 overflow-x-auto shadow-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-teal-500/20 via-cyan-500/10 to-teal-500/5 border-b-2">
                <TableHead className="font-bold text-foreground">Date</TableHead>
                <TableHead className="font-bold text-foreground">Type</TableHead>
                <TableHead className="font-bold text-foreground">Category</TableHead>
                <TableHead className="text-right font-bold text-foreground">Net Amount</TableHead>
                <TableHead className="text-right font-bold text-foreground">GST</TableHead>
                <TableHead className="text-right font-bold text-foreground">Gross Total</TableHead>
                <TableHead className="font-bold text-foreground">Payment Method</TableHead>
                <TableHead className="font-bold text-foreground">Description</TableHead>
                <TableHead className="text-right font-bold text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow 
                    key={transaction.id}
                    className="cursor-pointer hover:bg-gradient-to-r hover:from-teal-500/5 hover:to-transparent transition-all duration-200 border-b group"
                  >
                    <TableCell>{format(transaction.date, 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          transaction.type === 'INFLOW'
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 border'
                            : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 border'
                        )}
                      >
                        {transaction.type}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{formatCategory(transaction)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(transaction.amountNet)}</TableCell>
                    <TableCell className="text-right">
                      {transaction.gstApplied ? (
                        <span className="font-medium">{formatCurrency(transaction.gstAmount)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold text-teal-600 dark:text-teal-400">
                      {formatCurrency(transaction.amountGross)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {PAYMENT_METHOD_LABELS[transaction.paymentMethod] || transaction.paymentMethod}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {transaction.description || '-'}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTransaction(transaction)}
                          className="h-8 w-8 hover:bg-teal-500/10 transition-all duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingTransaction(transaction)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Dialog */}
      <TransactionFormDialog
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        transaction={editingTransaction}
        onSuccess={() => {
          setEditingTransaction(null);
          onTransactionUpdated?.();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingTransaction} onOpenChange={(open) => !open && setDeletingTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingTransaction(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
