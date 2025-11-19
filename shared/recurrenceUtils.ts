/**
 * Utility functions for handling payment recurrence calculations
 */

export type RecurrenceType = 'unica' | 'mensal' | 'trimestral' | 'anual';
export type RecurrenceStatus = 'ativa' | 'pausada' | 'concluida';

/**
 * Calculate the next recurrence date based on type and current date
 */
export function calculateNextRecurrenceDate(
  currentDate: Date,
  recurrenceType: RecurrenceType
): Date | null {
  if (recurrenceType === 'unica') {
    return null;
  }

  const nextDate = new Date(currentDate);
  
  switch (recurrenceType) {
    case 'mensal':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'trimestral':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'anual':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  
  return nextDate;
}

/**
 * Check if a recurrence should generate next installment
 */
export function shouldGenerateNextInstallment(
  recurrenceType: RecurrenceType,
  recurrenceStatus: RecurrenceStatus | null,
  recurrenceNextDate: Date | null,
  recurrenceEndDate: Date | null,
  today: Date = new Date()
): boolean {
  // Não gerar se for única ou status não for ativo
  if (recurrenceType === 'unica' || recurrenceStatus !== 'ativa') {
    return false;
  }

  // Não gerar se não houver próxima data definida
  if (!recurrenceNextDate) {
    return false;
  }

  // Verificar se a data atual é >= próxima data de recorrência
  const todayStr = today.toISOString().split('T')[0];
  const nextDateStr = new Date(recurrenceNextDate).toISOString().split('T')[0];
  
  if (todayStr < nextDateStr) {
    return false;
  }

  // Verificar se não ultrapassou a data final (se definida)
  if (recurrenceEndDate) {
    const endDateStr = new Date(recurrenceEndDate).toISOString().split('T')[0];
    if (todayStr > endDateStr) {
      return false;
    }
  }

  return true;
}

/**
 * Get human-readable description of recurrence type
 */
export function getRecurrenceLabel(type: RecurrenceType): string {
  const labels: Record<RecurrenceType, string> = {
    unica: 'Única',
    mensal: 'Mensal',
    trimestral: 'Trimestral',
    anual: 'Anual',
  };
  
  return labels[type];
}

/**
 * Get human-readable description of recurrence status
 */
export function getRecurrenceStatusLabel(status: RecurrenceStatus): string {
  const labels: Record<RecurrenceStatus, string> = {
    ativa: 'Ativa',
    pausada: 'Pausada',
    concluida: 'Concluída',
  };
  
  return labels[status];
}

/**
 * Format a date to ISO date string (YYYY-MM-DD)
 */
export function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0];
}
