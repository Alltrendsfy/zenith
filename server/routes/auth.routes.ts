/**
 * Authentication Routes
 * Handles current user information retrieval
 */

import type { Express } from 'express';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';
import { log } from '../logger';
import { getUserId } from './_shared';

export function registerAuthRoutes(app: Express) {
    // Get current authenticated user
    app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
        try {
            const userId = getUserId(req);
            const user = await storage.getUser(userId);
            if (user) {
                res.json({
                    ...user,
                    mustChangePassword: user.mustChangePassword || false,
                    authProvider: user.authProvider || 'replit',
                });
            } else {
                res.status(404).json({ message: 'Usuário não encontrado' });
            }
        } catch (error) {
            log.error('Error fetching user', { error, userId: getUserId(req) });
            res.status(500).json({ message: 'Falha ao buscar usuário' });
        }
    });
}
