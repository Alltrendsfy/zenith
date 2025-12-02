/**
 * System-wide constants for the Zenith ERP application
 * Centralizes magic values for better maintainability
 */

// ============================================================================
// USER ROLES
// ============================================================================

export const USER_ROLES = {
    ADMIN: 'admin',
    GERENTE: 'gerente',
    FINANCEIRO: 'financeiro',
    OPERACIONAL: 'operacional',
    VISUALIZADOR: 'visualizador',
} as const;

export const ALL_ROLES = Object.values(USER_ROLES);

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// ============================================================================
// FINANCIAL CONSTANTS
// ============================================================================

/**
 * Tolerance for floating point comparisons in financial calculations
 * Used to handle rounding errors (e.g., 0.1 + 0.2 = 0.30000000000000004)
 */
export const FINANCIAL_TOLERANCE = 0.01; // R$ 0.01

/**
 * Percentage sum tolerance for allocation validation
 * Allows small floating point errors when validating that percentages sum to 100%
 */
export const PERCENTAGE_TOLERANCE = 0.01; // 0.01%

// ============================================================================
// TRANSACTION STATUS
// ============================================================================

export const TRANSACTION_STATUS = {
    PENDENTE: 'pendente',
    PAGO: 'pago',
    CANCELADO: 'cancelado',
    VENCIDO: 'vencido',
} as const;

export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS];

// ============================================================================
// PAGINATION
// ============================================================================

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

// ============================================================================
// SESSION
// ============================================================================

/**
 * Session time-to-live: 7 days in milliseconds
 */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ============================================================================
// ERROR MESSAGES (Portuguese)
// ============================================================================

export const ERROR_MESSAGES = {
    // Authentication & Authorization
    UNAUTHORIZED: 'Não autorizado',
    FORBIDDEN: 'Acesso negado',
    INVALID_CREDENTIALS: 'Credenciais inválidas',
    SESSION_EXPIRED: 'Sessão expirada',

    // Resource Access
    NOT_FOUND: 'Recurso não encontrado',
    USER_NOT_FOUND: 'Usuário não encontrado',
    COMPANY_NOT_FOUND: 'Empresa não encontrada',

    // Validation
    VALIDATION_ERROR: 'Dados inválidos',
    REQUIRED_FIELD: 'Campo obrigatório',
    INVALID_FORMAT: 'Formato inválido',

    // Operations
    CREATION_FAILED: 'Falha ao criar recurso',
    UPDATE_FAILED: 'Falha ao atualizar recurso',
    DELETE_FAILED: 'Falha ao deletar recurso',

    // System
    INTERNAL_ERROR: 'Erro interno do servidor',
    DATABASE_ERROR: 'Erro de banco de dados',

    // Rate Limiting
    TOO_MANY_REQUESTS: 'Muitas requisições. Tente novamente mais tarde.',
} as const;

// ============================================================================
// SUCCESS MESSAGES (Portuguese)
// ============================================================================

export const SUCCESS_MESSAGES = {
    CREATED: 'Criado com sucesso',
    UPDATED: 'Atualizado com sucesso',
    DELETED: 'Deletado com sucesso',
    OPERATION_SUCCESS: 'Operação realizada com sucesso',
} as const;
