import { Request, Response, NextFunction } from 'express';

// Define the permission levels for each role
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
    canManageUsers: true,
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

export type UserRole = keyof typeof ROLE_PERMISSIONS;

// Helper function to check if user has a specific permission
export function hasPermission(role: UserRole | null | undefined, permission: keyof typeof ROLE_PERMISSIONS.admin): boolean {
  if (!role || !(role in ROLE_PERMISSIONS)) {
    return false;
  }
  return ROLE_PERMISSIONS[role][permission];
}

// Middleware to require specific permission
export function requirePermission(permission: keyof typeof ROLE_PERMISSIONS.admin) {
  return (req: any, res: Response, next: NextFunction) => {
    const userRole = req.user?.role as UserRole;
    
    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({ 
        message: "Você não tem permissão para realizar esta ação" 
      });
    }
    
    next();
  };
}

// Middleware to require specific role(s)
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: any, res: Response, next: NextFunction) => {
    const userRole = req.user?.role as UserRole;
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: "Você não tem permissão para acessar este recurso" 
      });
    }
    
    next();
  };
}

// Middleware to check if user is admin
export const requireAdmin = requireRole('admin');

// Middleware to check if user can manage data (admin or gerente)
export const requireManager = requireRole('admin', 'gerente');

// Middleware to check if user can access financial data
export const requireFinancial = requireRole('admin', 'gerente', 'financeiro');
