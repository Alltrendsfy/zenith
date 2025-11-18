import type { CostAllocation, InsertCostAllocation } from "./schema";

export interface AllocationInput {
  costCenterId: string;
  percentage: number;
}

export interface AllocationWithAmount extends AllocationInput {
  amount: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates that allocation percentages sum to exactly 100%
 * Allows a small tolerance of ±0.01 for floating point errors
 */
export function validatePercentageSum(
  allocations: AllocationInput[]
): ValidationResult {
  if (allocations.length === 0) {
    return {
      isValid: false,
      errors: ["Pelo menos um centro de custo é obrigatório"],
    };
  }

  const sum = allocations.reduce((acc, a) => acc + Number(a.percentage), 0);
  const tolerance = 0.01;
  const isValid = Math.abs(sum - 100) <= tolerance;

  if (!isValid) {
    return {
      isValid: false,
      errors: [
        `A soma dos percentuais deve ser 100%. Atual: ${sum.toFixed(2)}%`,
      ],
    };
  }

  return { isValid: true, errors: [] };
}

/**
 * Validates individual allocation percentages
 */
export function validateAllocations(
  allocations: AllocationInput[]
): ValidationResult {
  const errors: string[] = [];

  allocations.forEach((allocation, index) => {
    if (
      allocation.percentage <= 0 ||
      allocation.percentage > 100
    ) {
      errors.push(
        `Alocação ${index + 1}: O percentual deve estar entre 0.01 e 100`
      );
    }

    if (!allocation.costCenterId) {
      errors.push(`Alocação ${index + 1}: Centro de custo é obrigatório`);
    }
  });

  // Check for duplicates
  const costCenterIds = allocations.map((a) => a.costCenterId);
  const uniqueIds = new Set(costCenterIds);
  if (uniqueIds.size !== costCenterIds.length) {
    errors.push("Centros de custo duplicados não são permitidos");
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return validatePercentageSum(allocations);
}

/**
 * Calculates the amount for each allocation based on total amount and percentages
 */
export function calculateAmounts(
  allocations: AllocationInput[],
  totalAmount: number
): AllocationWithAmount[] {
  if (allocations.length === 0) {
    return [];
  }

  // Calculate amounts based on percentages
  const results = allocations.map((allocation) => ({
    ...allocation,
    amount: (totalAmount * Number(allocation.percentage)) / 100,
  }));

  // Adjust for rounding errors - ensure sum equals total
  const calculatedSum = results.reduce((sum, r) => sum + r.amount, 0);
  const difference = totalAmount - calculatedSum;

  if (Math.abs(difference) > 0.01) {
    // Add/subtract the difference to the largest allocation
    const largest = results.reduce((max, current) =>
      current.amount > max.amount ? current : max
    );
    largest.amount += difference;
  }

  return results;
}

/**
 * Creates equal distribution of percentages across N cost centers
 */
export function createEqualDistribution(
  costCenterIds: string[]
): AllocationInput[] {
  if (costCenterIds.length === 0) {
    return [];
  }

  const percentage = 100 / costCenterIds.length;

  // Handle rounding - make sure sum is exactly 100
  const allocations = costCenterIds.map((id) => ({
    costCenterId: id,
    percentage: Number(percentage.toFixed(2)),
  }));

  // Adjust the last one to ensure exact 100%
  const sum = allocations.reduce((acc, a) => acc + a.percentage, 0);
  const difference = 100 - sum;
  if (Math.abs(difference) > 0.001) {
    allocations[allocations.length - 1].percentage += difference;
    allocations[allocations.length - 1].percentage = Number(
      allocations[allocations.length - 1].percentage.toFixed(2)
    );
  }

  return allocations;
}

/**
 * Converts legacy single cost center ID to 100% allocation
 */
export function convertLegacyToAllocation(
  costCenterId: string
): AllocationInput {
  return {
    costCenterId,
    percentage: 100,
  };
}

/**
 * Recalculates amounts when transaction total changes
 */
export function recalculateAllocations(
  existingAllocations: CostAllocation[],
  newTotalAmount: number
): AllocationWithAmount[] {
  const inputs: AllocationInput[] = existingAllocations.map((a) => ({
    costCenterId: a.costCenterId,
    percentage: Number(a.percentage),
  }));

  return calculateAmounts(inputs, newTotalAmount);
}
