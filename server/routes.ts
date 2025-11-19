import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requireAdmin, requirePermission } from "./permissions";
import {
  insertBankAccountSchema,
  insertAccountsPayableSchema,
  insertAccountsReceivableSchema,
  insertChartOfAccountsSchema,
  insertCostCenterSchema,
  insertBankTransferSchema,
  insertCostAllocationSchema,
  insertSupplierSchema,
  insertCustomerSchema,
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

  // User Management (Admin only)
  app.get('/api/users', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:id/role', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!['admin', 'gerente', 'financeiro', 'visualizador'].includes(role)) {
        return res.status(400).json({ message: "Role inválida" });
      }

      const user = await storage.updateUserRole(id, role);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch('/api/users/:id/status', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive deve ser um booleano" });
      }

      const user = await storage.toggleUserStatus(id, isActive);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
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

  // Bank Transfers
  app.get('/api/bank-transfers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transfers = await storage.getBankTransfers(userId);
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching bank transfers:", error);
      res.status(500).json({ message: "Failed to fetch bank transfers" });
    }
  });

  app.post('/api/bank-transfers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertBankTransferSchema.parse(req.body);
      
      // Create the transfer (with all validations and balance updates in storage)
      const transfer = await storage.createBankTransfer({
        ...validated,
        userId,
      });
      
      res.json(transfer);
    } catch (error: any) {
      console.error("Error creating bank transfer:", error);
      res.status(400).json({ message: error.message || "Falha ao criar transferência" });
    }
  });

  // Accounts Payable
  app.get('/api/accounts-payable', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Process pending recurrences before fetching accounts
      await storage.processRecurrences(userId);
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
      // Process pending recurrences before fetching accounts
      await storage.processRecurrences(userId);
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

  // Recurrence Management
  app.patch('/api/accounts-payable/:id/recurrence', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { recurrenceStatus } = req.body;

      if (!['ativa', 'pausada', 'concluida'].includes(recurrenceStatus)) {
        return res.status(400).json({ message: "Invalid recurrence status" });
      }

      const updated = await storage.updateAccountPayable(id, userId, { recurrenceStatus });
      if (!updated) {
        return res.status(404).json({ message: "Account payable not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating payable recurrence:", error);
      res.status(400).json({ message: error.message || "Failed to update recurrence" });
    }
  });

  app.patch('/api/accounts-receivable/:id/recurrence', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { recurrenceStatus } = req.body;

      if (!['ativa', 'pausada', 'concluida'].includes(recurrenceStatus)) {
        return res.status(400).json({ message: "Invalid recurrence status" });
      }

      const updated = await storage.updateAccountReceivable(id, userId, { recurrenceStatus });
      if (!updated) {
        return res.status(404).json({ message: "Account receivable not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating receivable recurrence:", error);
      res.status(400).json({ message: error.message || "Failed to update recurrence" });
    }
  });

  app.post('/api/recurrences/process', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await storage.processRecurrences(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error processing recurrences:", error);
      res.status(500).json({ message: error.message || "Failed to process recurrences" });
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

      // Delete existing allocations first (upsert pattern)
      await storage.deleteAllocations(userId, 'payable', id);

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

      // Delete existing allocations first (upsert pattern)
      await storage.deleteAllocations(userId, 'receivable', id);

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

  // Reports - DRE
  app.get('/api/reports/dre', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate, costCenterId } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Fetch all transactions within period
      const [payables, receivables, accounts, costCenters] = await Promise.all([
        storage.getAccountsPayable(userId),
        storage.getAccountsReceivable(userId),
        storage.getChartOfAccounts(userId),
        storage.getCostCenters(userId),
      ]);

      // Filter by date range and status
      const filteredPayables = payables.filter(p => {
        const issueDate = new Date(p.issueDate);
        return issueDate >= start && issueDate <= end && p.status !== 'cancelado';
      });

      const filteredReceivables = receivables.filter(r => {
        const issueDate = new Date(r.issueDate);
        return issueDate >= start && issueDate <= end && r.status !== 'cancelado';
      });

      // Get allocations if filtering by cost center
      let allocations: any[] = [];
      if (costCenterId) {
        const allAllocations = await storage.getAllAllocations(userId);
        allocations = allAllocations.filter(a => a.costCenterId === costCenterId);
      }

      // Create account lookup map
      const accountMap = new Map(accounts.map(acc => [acc.id, acc]));

      // Helper to check if transaction should be included based on cost center filter
      const shouldIncludeTransaction = (transactionId: string, type: 'payable' | 'receivable'): number => {
        if (!costCenterId) return 1; // Include 100% if no filter
        
        const txAllocations = allocations.filter(a => 
          a.transactionId === transactionId && a.transactionType === type
        );
        
        if (txAllocations.length === 0) return 0; // Exclude if no allocations match
        
        // Sum percentages for this cost center
        return txAllocations.reduce((sum, a) => sum + parseFloat(a.percentage), 0) / 100;
      };

      // Aggregate revenues
      const revenueMap = new Map<string, { account: any, amount: number }>();
      
      filteredReceivables.forEach(r => {
        if (!r.accountId) return;
        
        const account = accountMap.get(r.accountId);
        if (!account || account.type !== 'receita') return;

        const percentage = shouldIncludeTransaction(r.id, 'receivable');
        if (percentage === 0) return;

        const amount = parseFloat(r.totalAmount) * percentage;
        
        if (revenueMap.has(r.accountId)) {
          revenueMap.get(r.accountId)!.amount += amount;
        } else {
          revenueMap.set(r.accountId, { account, amount });
        }
      });

      // Aggregate expenses
      const expenseMap = new Map<string, { account: any, amount: number }>();
      
      filteredPayables.forEach(p => {
        if (!p.accountId) return;
        
        const account = accountMap.get(p.accountId);
        if (!account || account.type !== 'despesa') return;

        const percentage = shouldIncludeTransaction(p.id, 'payable');
        if (percentage === 0) return;

        const amount = parseFloat(p.totalAmount) * percentage;
        
        if (expenseMap.has(p.accountId)) {
          expenseMap.get(p.accountId)!.amount += amount;
        } else {
          expenseMap.set(p.accountId, { account, amount });
        }
      });

      // Build revenue items
      const revenueItems = Array.from(revenueMap.values()).map(({ account, amount }) => ({
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        amount,
      }));

      const totalRevenue = revenueItems.reduce((sum, item) => sum + item.amount, 0);

      // Add percentages to revenue items
      const revenueItemsWithPercentage = revenueItems.map(item => ({
        ...item,
        percentage: totalRevenue > 0 ? (item.amount / totalRevenue) * 100 : 0,
      }));

      // Build expense items
      const expenseItems = Array.from(expenseMap.values()).map(({ account, amount }) => ({
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        amount,
      }));

      const totalExpense = expenseItems.reduce((sum, item) => sum + item.amount, 0);

      // Add percentages to expense items
      const expenseItemsWithPercentage = expenseItems.map(item => ({
        ...item,
        percentage: totalRevenue > 0 ? (item.amount / totalRevenue) * 100 : 0,
      }));

      // Calculate result
      const grossProfit = totalRevenue - totalExpense;
      const grossProfitPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      // Get cost center name if filtering
      let costCenterName: string | undefined;
      if (costCenterId) {
        const costCenter = costCenters.find(cc => cc.id === costCenterId);
        costCenterName = costCenter?.name;
      }

      const report = {
        period: {
          startDate: startDate as string,
          endDate: endDate as string,
        },
        costCenterId: costCenterId as string | undefined,
        costCenterName,
        revenues: {
          title: "Receitas",
          items: revenueItemsWithPercentage,
          total: totalRevenue,
          percentage: 100,
        },
        expenses: {
          title: "Despesas",
          items: expenseItemsWithPercentage,
          total: totalExpense,
          percentage: totalRevenue > 0 ? (totalExpense / totalRevenue) * 100 : 0,
        },
        result: {
          grossProfit,
          grossProfitPercentage,
        },
        generatedAt: new Date().toISOString(),
      };

      res.json(report);
    } catch (error: any) {
      console.error("Error generating DRE:", error);
      res.status(500).json({ message: error.message || "Failed to generate DRE report" });
    }
  });

  // Suppliers
  app.get('/api/suppliers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const suppliers = await storage.getSuppliers(userId);
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post('/api/suppliers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier({
        ...validated,
        userId,
      });
      res.json(supplier);
    } catch (error: any) {
      console.error("Error creating supplier:", error);
      res.status(400).json({ message: error.message || "Failed to create supplier" });
    }
  });

  app.patch('/api/suppliers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const validated = insertSupplierSchema.partial().parse(req.body);
      const supplier = await storage.updateSupplier(id, userId, validated);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error: any) {
      console.error("Error updating supplier:", error);
      res.status(400).json({ message: error.message || "Failed to update supplier" });
    }
  });

  app.delete('/api/suppliers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const deleted = await storage.deleteSupplier(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  // Customers
  app.get('/api/customers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const customers = await storage.getCustomers(userId);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post('/api/customers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer({
        ...validated,
        userId,
      });
      res.json(customer);
    } catch (error: any) {
      console.error("Error creating customer:", error);
      res.status(400).json({ message: error.message || "Failed to create customer" });
    }
  });

  app.patch('/api/customers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const validated = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(id, userId, validated);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      console.error("Error updating customer:", error);
      res.status(400).json({ message: error.message || "Failed to update customer" });
    }
  });

  app.delete('/api/customers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const deleted = await storage.deleteCustomer(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
