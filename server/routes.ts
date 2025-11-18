import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertBankAccountSchema,
  insertAccountsPayableSchema,
  insertAccountsReceivableSchema,
  insertChartOfAccountsSchema,
  insertCostCenterSchema,
  insertBankTransferSchema,
  insertCostAllocationSchema,
} from "@shared/schema";
import { validateAllocations, calculateAmounts } from "@shared/allocationUtils";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard
  app.get('/api/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const [bankAccounts, accountsPayable, accountsReceivable] = await Promise.all([
        storage.getBankAccounts(userId),
        storage.getAccountsPayable(userId),
        storage.getAccountsReceivable(userId),
      ]);

      const totalBalance = bankAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance || "0"), 0);
      
      const totalPayable = accountsPayable
        .filter(a => a.status !== 'pago' && a.status !== 'cancelado')
        .reduce((sum, acc) => sum + parseFloat(acc.totalAmount || "0"), 0);
      
      const totalReceivable = accountsReceivable
        .filter(a => a.status !== 'pago' && a.status !== 'cancelado')
        .reduce((sum, acc) => sum + parseFloat(acc.totalAmount || "0"), 0);

      const alerts = [];
      
      const overduePayables = accountsPayable.filter(a => 
        a.status !== 'pago' && a.status !== 'cancelado' && new Date(a.dueDate) < new Date()
      );
      
      if (overduePayables.length > 0) {
        alerts.push({
          type: 'critical',
          title: `${overduePayables.length} conta(s) a pagar vencida(s)`,
          description: 'Há contas a pagar com vencimento atrasado',
          date: 'Agora',
        });
      }

      res.json({
        totalBalance: `R$ ${totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        totalReceivable: `R$ ${totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        totalPayable: `R$ ${totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        bankAccountsCount: bankAccounts.length.toString(),
        alerts,
      });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Bank Accounts
  app.get('/api/bank-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accounts = await storage.getBankAccounts(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      res.status(500).json({ message: "Failed to fetch bank accounts" });
    }
  });

  app.post('/api/bank-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("[POST /api/bank-accounts] Request body:", JSON.stringify(req.body, null, 2));
      
      const validated = insertBankAccountSchema.parse(req.body);
      console.log("[POST /api/bank-accounts] Validated data:", JSON.stringify(validated, null, 2));
      
      const account = await storage.createBankAccount({
        ...validated,
        userId,
      });
      console.log("[POST /api/bank-accounts] Created account:", account.id);
      
      res.json(account);
    } catch (error: any) {
      console.error("[POST /api/bank-accounts] Error:", error);
      console.error("[POST /api/bank-accounts] Error message:", error.message);
      console.error("[POST /api/bank-accounts] Error stack:", error.stack);
      res.status(400).json({ message: error.message || "Failed to create bank account" });
    }
  });

  // Accounts Payable
  app.get('/api/accounts-payable', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accounts = await storage.getAccountsPayable(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching accounts payable:", error);
      res.status(500).json({ message: "Failed to fetch accounts payable" });
    }
  });

  app.post('/api/accounts-payable', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertAccountsPayableSchema.parse(req.body);
      const account = await storage.createAccountPayable({
        ...validated,
        userId,
      });
      res.json(account);
    } catch (error: any) {
      console.error("Error creating account payable:", error);
      res.status(400).json({ message: error.message || "Failed to create account payable" });
    }
  });

  // Accounts Receivable
  app.get('/api/accounts-receivable', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accounts = await storage.getAccountsReceivable(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching accounts receivable:", error);
      res.status(500).json({ message: "Failed to fetch accounts receivable" });
    }
  });

  app.post('/api/accounts-receivable', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertAccountsReceivableSchema.parse(req.body);
      const account = await storage.createAccountReceivable({
        ...validated,
        userId,
      });
      res.json(account);
    } catch (error: any) {
      console.error("Error creating account receivable:", error);
      res.status(400).json({ message: error.message || "Failed to create account receivable" });
    }
  });

  // Chart of Accounts
  app.get('/api/chart-of-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accounts = await storage.getChartOfAccounts(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching chart of accounts:", error);
      res.status(500).json({ message: "Failed to fetch chart of accounts" });
    }
  });

  app.post('/api/chart-of-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertChartOfAccountsSchema.parse(req.body);
      const account = await storage.createChartAccount({
        ...validated,
        userId,
      });
      res.json(account);
    } catch (error: any) {
      console.error("Error creating chart account:", error);
      res.status(400).json({ message: error.message || "Failed to create chart account" });
    }
  });

  // Cost Centers
  app.get('/api/cost-centers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const centers = await storage.getCostCenters(userId);
      res.json(centers);
    } catch (error) {
      console.error("Error fetching cost centers:", error);
      res.status(500).json({ message: "Failed to fetch cost centers" });
    }
  });

  app.post('/api/cost-centers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertCostCenterSchema.parse(req.body);
      const center = await storage.createCostCenter({
        ...validated,
        userId,
      });
      res.json(center);
    } catch (error: any) {
      console.error("Error creating cost center:", error);
      res.status(400).json({ message: error.message || "Failed to create cost center" });
    }
  });

  // Cost Allocations - Accounts Payable
  app.get('/api/accounts-payable/:id/allocations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const allocations = await storage.getAllocations(userId, 'payable', id);
      res.json(allocations);
    } catch (error) {
      console.error("Error fetching payable allocations:", error);
      res.status(500).json({ message: "Failed to fetch allocations" });
    }
  });

  app.post('/api/accounts-payable/:id/allocations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const allocationInputs = req.body.allocations;

      // Validate percentages
      const validation = validateAllocations(allocationInputs);
      if (!validation.isValid) {
        return res.status(400).json({ message: validation.errors.join(', ') });
      }

      // Get transaction to calculate amounts
      const transaction = await storage.getAccountPayable(id, userId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Calculate amounts
      const allocationsWithAmounts = calculateAmounts(allocationInputs, parseFloat(transaction.totalAmount));

      // Create allocations
      const allocationsData = allocationsWithAmounts.map(a => ({
        transactionType: 'payable' as const,
        transactionId: id,
        costCenterId: a.costCenterId,
        percentage: a.percentage.toString(),
        amount: a.amount.toString(),
      }));

      const created = await storage.createAllocations(userId, 'payable', id, allocationsData);
      res.json(created);
    } catch (error: any) {
      console.error("Error creating payable allocations:", error);
      res.status(400).json({ message: error.message || "Failed to create allocations" });
    }
  });

  app.delete('/api/accounts-payable/:id/allocations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.deleteAllocations(userId, 'payable', id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting payable allocations:", error);
      res.status(500).json({ message: "Failed to delete allocations" });
    }
  });

  // Cost Allocations - Accounts Receivable
  app.get('/api/accounts-receivable/:id/allocations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const allocations = await storage.getAllocations(userId, 'receivable', id);
      res.json(allocations);
    } catch (error) {
      console.error("Error fetching receivable allocations:", error);
      res.status(500).json({ message: "Failed to fetch allocations" });
    }
  });

  app.post('/api/accounts-receivable/:id/allocations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const allocationInputs = req.body.allocations;

      // Validate percentages
      const validation = validateAllocations(allocationInputs);
      if (!validation.isValid) {
        return res.status(400).json({ message: validation.errors.join(', ') });
      }

      // Get transaction to calculate amounts
      const transaction = await storage.getAccountReceivable(id, userId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Calculate amounts
      const allocationsWithAmounts = calculateAmounts(allocationInputs, parseFloat(transaction.totalAmount));

      // Create allocations
      const allocationsData = allocationsWithAmounts.map(a => ({
        transactionType: 'receivable' as const,
        transactionId: id,
        costCenterId: a.costCenterId,
        percentage: a.percentage.toString(),
        amount: a.amount.toString(),
      }));

      const created = await storage.createAllocations(userId, 'receivable', id, allocationsData);
      res.json(created);
    } catch (error: any) {
      console.error("Error creating receivable allocations:", error);
      res.status(400).json({ message: error.message || "Failed to create allocations" });
    }
  });

  app.delete('/api/accounts-receivable/:id/allocations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.deleteAllocations(userId, 'receivable', id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting receivable allocations:", error);
      res.status(500).json({ message: "Failed to delete allocations" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
