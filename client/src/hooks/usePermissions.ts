import { useAuth } from "./useAuth";

type UserRole = 'admin' | 'gerente' | 'financeiro' | 'visualizador';

const ROLE_PERMISSIONS = {
  admin: {
    canView: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: true,
    canBackup: true,
  },
  gerente: {
    canView: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: false,
    canBackup: false,
  },
  financeiro: {
    canView: true,
    canCreate: true,
    canUpdate: true,
    canDelete: false,
    canManageUsers: false,
    canBackup: false,
  },
  visualizador: {
    canView: true,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canManageUsers: false,
    canBackup: false,
  },
} as const;

export function usePermissions() {
  const { user } = useAuth();
  const role = (user?.role as UserRole) || 'visualizador';

  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.visualizador;

  return {
    role,
    ...permissions,
    isAdmin: role === 'admin',
    isManager: role === 'admin' || role === 'gerente',
    isFinancial: role === 'admin' || role === 'gerente' || role === 'financeiro',
    isViewer: role === 'visualizador',
  };
}
