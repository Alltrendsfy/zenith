import type { Request } from 'express';

/**
 * Authenticated user structure that supports both local and Replit authentication
 */
export interface AuthenticatedUser {
    id: string;
    authProvider: 'local' | 'replit';
    claims?: {
        sub: string;
        email?: string;
        exp?: number;
        [key: string]: any;
    };
    role: 'admin' | 'gerente' | 'financeiro' | 'operacional' | 'visualizador';
    isActive: boolean;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
}

/**
 * Safely extracts the user ID from an authenticated request,
 * handling both local and Replit authentication providers.
 * 
 * @param req - Express request object with authenticated user
 * @returns User ID string
 * @throws Error if user is not authenticated or user object is invalid
 * 
 * @example
 * ```typescript
 * app.get('/api/data', isAuthenticated, async (req, res) => {
 *   const userId = getUserId(req);
 *   const data = await storage.getData(userId);
 *   res.json(data);
 * });
 * ```
 */
export function getUserId(req: Request): string {
    const user = req.user as AuthenticatedUser;

    if (!user) {
        throw new Error('User not authenticated');
    }

    // For local authentication, use the id field directly
    if (user.authProvider === 'local') {
        if (!user.id) {
            throw new Error('Local user missing id');
        }
        return user.id;
    }

    // For Replit authentication, use claims.sub
    if (!user.claims || !user.claims.sub) {
        throw new Error('Replit user missing claims.sub');
    }

    return user.claims.sub;
}
