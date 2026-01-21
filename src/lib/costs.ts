import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  Timestamp, 
  deleteDoc,
  onSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Cost, 
  FirestoreCost, 
  CostType,
  CostFilters,
  CostSummary
} from '@/types/cost';

/**
 * Convert Firestore cost to app Cost
 */
export function convertFirestoreCost(docData: any, docId: string): Cost {
  return {
    id: docId,
    name: docData.name,
    type: docData.type as CostType,
    category: docData.category,
    amount: docData.amount || 0,
    unit: docData.unit,
    expectedVolume: docData.expected_volume,
    actualVolume: docData.actual_volume,
    month: docData.month,
    createdBy: docData.created_by,
    createdAt: docData.created_at?.toDate() || new Date(),
    updatedAt: docData.updated_at?.toDate(),
    updatedBy: docData.updated_by,
  };
}

/**
 * Convert app Cost to Firestore cost
 */
export function convertToFirestoreCost(cost: Omit<Cost, 'id'>): Omit<FirestoreCost, 'id'> {
  return {
    name: cost.name,
    type: cost.type,
    category: cost.category,
    amount: cost.amount,
    ...(cost.unit && { unit: cost.unit }),
    ...(cost.expectedVolume !== undefined && { expected_volume: cost.expectedVolume }),
    ...(cost.actualVolume !== undefined && { actual_volume: cost.actualVolume }),
    month: cost.month,
    created_by: cost.createdBy,
    created_at: Timestamp.fromDate(cost.createdAt),
    ...(cost.updatedAt && { updated_at: Timestamp.fromDate(cost.updatedAt) }),
    ...(cost.updatedBy && { updated_by: cost.updatedBy }),
  };
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get all costs
 */
export async function getAllCosts(filters?: CostFilters): Promise<Cost[]> {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    const costsRef = collection(db, 'costs');
    const whereConstraints: QueryConstraint[] = [];
    const orderConstraints: QueryConstraint[] = [];

    // Add all where clauses first
    if (filters?.month) {
      whereConstraints.push(where('month', '==', filters.month));
    }

    if (filters?.type) {
      whereConstraints.push(where('type', '==', filters.type));
    }

    if (filters?.category) {
      whereConstraints.push(where('category', '==', filters.category));
    }

    // Add orderBy clauses - when filtering by month, we'll sort client-side to avoid index requirement
    if (!filters?.month) {
      orderConstraints.push(orderBy('month', 'desc'));
      orderConstraints.push(orderBy('created_at', 'desc'));
    }

    const constraints = [...whereConstraints, ...orderConstraints];

    const q = query(costsRef, ...constraints);
    const querySnapshot = await getDocs(q);

    let costs = querySnapshot.docs.map((doc) =>
      convertFirestoreCost(doc.data(), doc.id)
    );

    // Sort client-side when filtering by month (avoids Firestore index requirement)
    if (filters?.month) {
      costs.sort((a, b) => {
        const dateA = a.createdAt.getTime();
        const dateB = b.createdAt.getTime();
        return dateB - dateA; // Descending order (newest first)
      });
    }

    return costs;
  } catch (error) {
    console.error('Error fetching costs:', error);
    throw error;
  }
}

/**
 * Get cost by ID
 */
export async function getCostById(costId: string): Promise<Cost | null> {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    const costDoc = await getDoc(doc(db, 'costs', costId));
    if (!costDoc.exists()) {
      return null;
    }
    return convertFirestoreCost(costDoc.data(), costDoc.id);
  } catch (error) {
    console.error('Error fetching cost:', error);
    throw error;
  }
}

/**
 * Create a new cost
 */
export async function createCost(
  costData: {
    name: string;
    type: CostType;
    category: string;
    amount: number;
    unit?: string;
    expectedVolume?: number;
    actualVolume?: number;
    month: string;
    createdBy: string;
  }
): Promise<string> {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    const firestoreCost: Omit<FirestoreCost, 'id'> = {
      name: costData.name,
      type: costData.type,
      category: costData.category as any,
      amount: costData.amount,
      ...(costData.unit && { unit: costData.unit as any }),
      ...(costData.expectedVolume !== undefined && { expected_volume: costData.expectedVolume }),
      ...(costData.actualVolume !== undefined && { actual_volume: costData.actualVolume }),
      month: costData.month,
      created_by: costData.createdBy,
      created_at: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'costs'), firestoreCost);
    return docRef.id;
  } catch (error) {
    console.error('Error creating cost:', error);
    throw error;
  }
}

/**
 * Update a cost
 */
export async function updateCost(
  costId: string,
  updates: {
    name?: string;
    type?: CostType;
    category?: string;
    amount?: number;
    unit?: string;
    expectedVolume?: number;
    actualVolume?: number;
    month?: string;
    updatedBy: string;
  }
): Promise<void> {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    const costRef = doc(db, 'costs', costId);
    const existingDoc = await getDoc(costRef);

    if (!existingDoc.exists()) {
      throw new Error('Cost not found');
    }

    const updateData: any = {
      updated_at: Timestamp.now(),
      updated_by: updates.updatedBy,
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.unit !== undefined) {
      updateData.unit = updates.unit || null;
    }
    if (updates.expectedVolume !== undefined) {
      updateData.expected_volume = updates.expectedVolume || null;
    }
    if (updates.actualVolume !== undefined) {
      updateData.actual_volume = updates.actualVolume || null;
    }
    if (updates.month !== undefined) updateData.month = updates.month;

    await updateDoc(costRef, updateData);
  } catch (error) {
    console.error('Error updating cost:', error);
    throw error;
  }
}

/**
 * Delete a cost
 */
export async function deleteCost(costId: string): Promise<void> {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    await deleteDoc(doc(db, 'costs', costId));
  } catch (error) {
    console.error('Error deleting cost:', error);
    throw error;
  }
}

/**
 * Calculate cost summary from costs and revenue
 */
export function calculateCostSummary(costs: Cost[], revenue: number = 0): CostSummary {
  let totalFixedCost = 0;
  let totalVariableCost = 0;
  let targetVariableCost = 0;

  costs.forEach((cost) => {
    if (cost.type === 'fixed') {
      totalFixedCost += cost.amount;
    } else {
      // Variable cost
      const actualVolume = cost.actualVolume || 0;
      const expectedVolume = cost.expectedVolume || 0;
      totalVariableCost += cost.amount * actualVolume;
      targetVariableCost += cost.amount * expectedVolume;
    }
  });

  const totalCost = totalFixedCost + totalVariableCost;
  const totalTargetCost = totalFixedCost + targetVariableCost;
  const profit = revenue - totalCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    totalFixedCost,
    totalVariableCost,
    targetVariableCost,
    totalCost,
    totalTargetCost,
    revenue,
    profit,
    margin,
  };
}

/**
 * Subscribe to costs with real-time updates
 */
export function subscribeToCosts(
  callback: (costs: Cost[]) => void,
  filters?: CostFilters
): () => void {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  const costsRef = collection(db, 'costs');
  const whereConstraints: QueryConstraint[] = [];
  const orderConstraints: QueryConstraint[] = [];

  // Add all where clauses first
  if (filters?.month) {
    whereConstraints.push(where('month', '==', filters.month));
  }

  if (filters?.type) {
    whereConstraints.push(where('type', '==', filters.type));
  }

  if (filters?.category) {
    whereConstraints.push(where('category', '==', filters.category));
  }

  // Add orderBy clauses - when filtering by month, we'll sort client-side to avoid index requirement
  if (!filters?.month) {
    orderConstraints.push(orderBy('month', 'desc'));
    orderConstraints.push(orderBy('created_at', 'desc'));
  }

  const constraints = [...whereConstraints, ...orderConstraints];

  const q = query(costsRef, ...constraints);

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      let costs = snapshot.docs.map((doc) =>
        convertFirestoreCost(doc.data(), doc.id)
      );

      // Sort client-side when filtering by month (avoids Firestore index requirement)
      if (filters?.month) {
        costs.sort((a, b) => {
          const dateA = a.createdAt.getTime();
          const dateB = b.createdAt.getTime();
          return dateB - dateA; // Descending order (newest first)
        });
      }

      callback(costs);
    },
    (error) => {
      console.error('Error in costs subscription:', error);
    }
  );

  return unsubscribe;
}
