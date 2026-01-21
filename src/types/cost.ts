export type CostType = 'fixed' | 'variable';

export type CostUnit = 'task' | 'hour' | 'client' | 'unit';

export type CostCategory = 
  | 'CLIENT_PAYMENT'
  | 'MARKETING'
  | 'OTHER'
  | 'TAX'
  | 'FRANCHISE_FEE'
  | 'GST'
  | 'INVESTMENT';

export interface Cost {
  id: string;
  name: string;
  type: CostType;
  category: CostCategory;
  amount: number; // fixed amount OR cost per unit
  unit?: CostUnit; // only for variable costs
  expectedVolume?: number; // target units (for variable costs)
  actualVolume?: number; // real units (for variable costs)
  month: string; // YYYY-MM format
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface FirestoreCost {
  id: string;
  name: string;
  type: CostType;
  category: CostCategory;
  amount: number;
  unit?: CostUnit;
  expected_volume?: number;
  actual_volume?: number;
  month: string;
  created_by: string;
  created_at: any; // Firestore Timestamp
  updated_at?: any; // Firestore Timestamp
  updated_by?: string;
}

export interface CostSummary {
  totalFixedCost: number;
  totalVariableCost: number;
  targetVariableCost: number;
  totalCost: number;
  totalTargetCost: number;
  revenue: number; // This will need to be fetched from transactions or provided
  profit: number;
  margin: number; // percentage
}

export interface CostFilters {
  type?: CostType;
  category?: CostCategory;
  month?: string;
}
