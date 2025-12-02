/**
 * User Management Routes
 * Handles CRUD operations for users, role updates, and status management
 */

import type { Express } from 'express';
import { isAuthenticated } from '../replitAuth';
import { requireManager } from '../auth-helpers';
import { storage } from '../storage';
import { log } from '../logger';
import { generateTemporaryPassword, hashPassword } from '../auth-utils';
import { insertUserSchema, updateUserSchema } from '@shared/schema';
import { ALL_ROLES } from '../constants';

// Helper to get user ID from request
function getUserId(req: any): string {
    return req.user?.id || req.user?.claims?.sub;
}

export function registerUserRoutes(app: Express) {
    // Get all users
    app.get('/api/users', isAuthenticated, requireManager, async (req: any, res) => {
        try {
            const users = await storage.getAllUsers();
            res.json(users);
        } catch (error) {
            log.error('Error fetching users', { error });
            res.status(500).json({ message: 'Falha ao buscar usuários' });
        }
    });

    // Create new user
    app.post('/api/users', isAuthenticated, requireManager, async (req: any, res) => {
        try {
            const validatedData = insertUserSchema.parse(req.body);

            const temporaryPassword = generateTemporaryPassword(8);
            const passwordHash = await hashPassword(temporaryPassword);

            const newUser = await storage.createUser({
                ...validatedData,
                passwordHash: passwordHash,
                mustChangePassword: true,
                authProvider: 'local',
            });

            if (req.body.costCenterIds && Array.isArray(req.body.costCenterIds)) {
                await storage.setUserCostCenters(newUser.id, req.body.costCenterIds);
            }

            // SECURITY: Don't return temporary password in response
            log.info(`Temporary password generated for user ${newUser.email}`, { userId: newUser.id });
            log.info('This password should be sent via email in production');

            res.status(201).json({
                ...newUser,
                message: 'Usuário criado com sucesso. Senha temporária será enviada por email.',
            });
        } catch (error: any) {
            log.error('Error creating user', { error });
            if (error.message === 'Email já está em uso' || error.message === 'Login já está em uso') {
                return res.status(409).json({ message: error.message });
            }
            if (error.name === 'ZodError') {
                return res.status(400).json({
                    message: 'Dados inválidos',
                    errors: error.errors
                });
            }
            res.status(500).json({ message: 'Falha ao criar usuário' });
        }
    });

    // Update user
    app.patch('/api/users/:id', isAuthenticated, requireManager, async (req: any, res) => {
        try {
            const { id } = req.params;
            const validatedData = updateUserSchema.parse(req.body);

            const updatedUser = await storage.updateUser(id, validatedData);

            if (!updatedUser) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }

            res.json(updatedUser);
        } catch (error: any) {
            log.error('Error updating user', { error, userId: req.params.id });
            if (error.message === 'Usuário não encontrado') {
                return res.status(404).json({ message: error.message });
            }
            if (error.message === 'Email já está em uso por outro usuário' || error.message === 'Login já está em uso por outro usuário') {
                return res.status(409).json({ message: error.message });
            }
            if (error.name === 'ZodError') {
                return res.status(400).json({
                    message: 'Dados inválidos',
                    errors: error.errors
                });
            }
            res.status(500).json({ message: 'Falha ao atualizar usuário' });
        }
    });

    // Delete user
    app.delete('/api/users/:id', isAuthenticated, requireManager, async (req: any, res) => {
        try {
            const { id } = req.params;

            // Prevent users from deleting themselves
            if (id === req.user.id) {
                return res.status(400).json({ message: 'Você não pode excluir seu próprio usuário' });
            }

            await storage.deleteUser(id);
            log.info('User deleted', { userId: id, deletedBy: getUserId(req) });
            res.json({ message: 'Usuário excluído com sucesso' });
        } catch (error: any) {
            log.error('Error deleting user', { error, userId: req.params.id });
            if (error.message && error.message.includes('Não é possível excluir')) {
                return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: 'Falha ao excluir usuário' });
        }
    });

    // Update user role
    app.patch('/api/users/:id/role', isAuthenticated, requireManager, async (req: any, res) => {
        try {
            const { id } = req.params;
            const { role } = req.body;

            if (!ALL_ROLES.includes(role)) {
                return res.status(400).json({ message: 'Role inválida' });
            }

            const user = await storage.updateUserRole(id, role);

            if (!user) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }

            log.info('User role updated', { userId: id, newRole: role, updatedBy: getUserId(req) });
            res.json(user);
        } catch (error) {
            log.error('Error updating user role', { error, userId: req.params.id });
            res.status(500).json({ message: 'Falha ao atualizar role do usuário' });
        }
    });

    // Update user status (active/inactive)
    app.patch('/api/users/:id/status', isAuthenticated, requireManager, async (req: any, res) => {
        try {
            const { id } = req.params;
            const { isActive } = req.body;

            if (typeof isActive !== 'boolean') {
                return res.status(400).json({ message: 'Status inválido' });
            }

            // Prevent users from deactivating themselves
            if (id === req.user.id && !isActive) {
                return res.status(400).json({ message: 'Você não pode desativar seu próprio usuário' });
            }

            const user = await storage.updateUserStatus(id, isActive);

            if (!user) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }

            log.info('User status updated', { userId: id, isActive, updatedBy: getUserId(req) });
            res.json(user);
        } catch (error) {
            log.error('Error updating user status', { error, userId: req.params.id });
            res.status(500).json({ message: 'Falha ao atualizar status do usuário' });
        }
    });
}
