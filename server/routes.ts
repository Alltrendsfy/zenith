import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requireAdmin, requirePermission, requireManager } from "./permissions";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import {
  insertBankAccountSchema,
  updateBankAccountSchema,
  insertAccountsPayableSchema,
  updateAccountsPayableSchema,
  insertAccountsReceivableSchema,
  updateAccountsReceivableSchema,
  insertChartOfAccountsSchema,
  insertCostCenterSchema,
  updateCostCenterSchema,
  insertBankTransferSchema,
  insertCostAllocationSchema,
  insertSupplierSchema,
  insertCustomerSchema,
  insertActivitySchema,
  updateActivitySchema,
  insertCompanySchema,
  insertUserSchema,
} from "@shared/schema";
import { validateAllocations, calculateAmounts } from "@shared/allocationUtils";
import { z } from "zod";

function stringToDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

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

  // User Management (Admin and Manager)
  app.get('/api/users', isAuthenticated, requireManager, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', isAuthenticated, requireManager, async (req: any, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const newUser = await storage.createUser(validatedData);
      
      // Set cost centers if provided
      if (req.body.costCenterIds && Array.isArray(req.body.costCenterIds)) {
        await storage.setUserCostCenters(newUser.id, req.body.costCenterIds);
      }
      
      res.status(201).json(newUser);
    } catch (error: any) {
      console.error("Error creating user:", error);
      if (error.message === "Email já está em uso") {
        return res.status(409).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Falha ao criar usuário" });
    }
  });

  app.patch('/api/users/:id/role', isAuthenticated, requireManager, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!['admin', 'gerente', 'financeiro', 'operacional', 'visualizador'].includes(role)) {
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

  app.patch('/api/users/:id/status', isAuthenticated, requireManager, async (req: any, res) => {
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

  // User Cost Centers Management
  app.get('/api/users/:userId/cost-centers', isAuthenticated, requireManager, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const costCenters = await storage.getUserCostCenters(userId);
      res.json(costCenters);
    } catch (error) {
      console.error("Error fetching user cost centers:", error);
      res.status(500).json({ message: "Failed to fetch user cost centers" });
    }
  });

  app.post('/api/users/:userId/cost-centers', isAuthenticated, requireManager, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { costCenterIds } = req.body;

      if (!Array.isArray(costCenterIds)) {
        return res.status(400).json({ message: "costCenterIds deve ser um array" });
      }

      await storage.setUserCostCenters(userId, costCenterIds);
      const updatedCostCenters = await storage.getUserCostCenters(userId);
      
      res.json(updatedCostCenters);
    } catch (error) {
      console.error("Error setting user cost centers:", error);
      res.status(500).json({ message: "Failed to set user cost centers" });
    }
  });

  app.delete('/api/users/:userId/cost-centers/:costCenterId', isAuthenticated, requireManager, async (req: any, res) => {
    try {
      const { userId, costCenterId } = req.params;
      await storage.removeUserCostCenter(userId, costCenterId);
      res.json({ message: "Centro de custo removido com sucesso" });
    } catch (error) {
      console.error("Error removing user cost center:", error);
      res.status(500).json({ message: "Failed to remove user cost center" });
    }
  });

  // Reports - Accounts Payable
  app.get('/api/reports/accounts-payable', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role;
      const { startDate, endDate, status, supplierId } = req.query;

      const accountsPayable = await storage.getAccountsPayable(userId, userRole);
      const costAllocations = await storage.getCostAllocations(userId);
      const costCenters = await storage.getCostCenters(userId);
      const suppliers = await storage.getSuppliers(userId);

      // Filter by date range
      let filtered = accountsPayable;
      if (startDate && endDate) {
        const startDateObj = stringToDate(startDate as string);
        const endDateObj = stringToDate(endDate as string);
        filtered = filtered.filter(p => {
          const dueDate = stringToDate(p.dueDate);
          return dueDate >= startDateObj && dueDate <= endDateObj;
        });
      }

      // Filter by status
      if (status && status !== 'all') {
        filtered = filtered.filter(p => p.status === status);
      }

      // Filter by supplier
      if (supplierId && supplierId !== 'all') {
        filtered = filtered.filter(p => p.supplierId === supplierId);
      }

      // Calculate summaries
      const now = new Date();
      const vencidos = filtered.filter(p => 
        p.status !== 'cancelado' && p.status !== 'pago' && stringToDate(p.dueDate) < now
      );
      const aVencer = filtered.filter(p => 
        p.status === 'pendente' && stringToDate(p.dueDate) >= now
      );
      const pagos = filtered.filter(p => p.status === 'pago');

      const totalVencidos = vencidos.reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0);
      const totalAVencer = aVencer.reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0);
      const totalPagos = pagos.reduce((sum, p) => sum + parseFloat(p.amountPaid || "0"), 0);

      // Total by cost center
      const costCenterTotals = new Map<string, { name: string; total: number }>();
      
      const payableAllocations = costAllocations.filter(a => a.transactionType === 'payable');
      
      payableAllocations.forEach(allocation => {
        const payable = filtered.find(p => p.id === allocation.transactionId);
        if (payable && payable.status !== 'cancelado') {
          const costCenter = costCenters.find(cc => cc.id === allocation.costCenterId);
          const key = costCenter?.id || '__unallocated__';
          const name = costCenter?.name || 'Sem Centro de Custo';
          
          const current = costCenterTotals.get(key) || { name, total: 0 };
          costCenterTotals.set(key, {
            name,
            total: current.total + parseFloat(allocation.amount)
          });
        }
      });

      // Add unallocated amounts
      const allocationsByPayable = new Map<string, number>();
      payableAllocations.forEach(allocation => {
        const current = allocationsByPayable.get(allocation.transactionId) || 0;
        allocationsByPayable.set(allocation.transactionId, current + parseFloat(allocation.amount));
      });

      let unallocatedTotal = 0;
      filtered
        .filter(p => p.status !== 'cancelado')
        .forEach(payable => {
          const totalAmount = parseFloat(payable.totalAmount || "0");
          const allocatedAmount = allocationsByPayable.get(payable.id) || 0;
          const unallocatedAmount = totalAmount - allocatedAmount;
          
          if (unallocatedAmount > 0.01) {
            unallocatedTotal += unallocatedAmount;
          }
        });

      if (unallocatedTotal > 0) {
        const current = costCenterTotals.get('__unallocated__') || { name: 'Sem Centro de Custo', total: 0 };
        costCenterTotals.set('__unallocated__', {
          name: current.name,
          total: current.total + unallocatedTotal
        });
      }

      // Evolution data (last 6 months)
      const evolutionData = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date();
        month.setMonth(month.getMonth() - i);
        const monthStr = month.toISOString().slice(0, 7);
        
        const monthPayables = accountsPayable.filter(p => {
          return p.dueDate.startsWith(monthStr) && p.status !== 'cancelado';
        });
        
        const total = monthPayables.reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0);
        const paid = monthPayables.filter(p => p.status === 'pago').reduce((sum, p) => sum + parseFloat(p.amountPaid || "0"), 0);
        
        evolutionData.push({
          month: monthStr,
          total: Number(total.toFixed(2)),
          paid: Number(paid.toFixed(2)),
        });
      }

      res.json({
        data: filtered,
        summary: {
          vencidos: {
            count: vencidos.length,
            total: Number(totalVencidos.toFixed(2))
          },
          aVencer: {
            count: aVencer.length,
            total: Number(totalAVencer.toFixed(2))
          },
          pagos: {
            count: pagos.length,
            total: Number(totalPagos.toFixed(2))
          }
        },
        costCenterTotals: Array.from(costCenterTotals.values()).map(cc => ({
          name: cc.name,
          total: Number(cc.total.toFixed(2))
        })),
        evolutionData,
        suppliers,
      });
    } catch (error) {
      console.error("Error generating accounts payable report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Reports - Accounts Receivable
  app.get('/api/reports/accounts-receivable', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role;
      const { startDate, endDate, status, customerId } = req.query;

      const accountsReceivable = await storage.getAccountsReceivable(userId, userRole);
      const customers = await storage.getCustomers(userId);

      // Filter by date range
      let filtered = accountsReceivable;
      if (startDate && endDate) {
        const startDateObj = stringToDate(startDate as string);
        const endDateObj = stringToDate(endDate as string);
        filtered = filtered.filter(r => {
          const dueDate = stringToDate(r.dueDate);
          return dueDate >= startDateObj && dueDate <= endDateObj;
        });
      }

      // Filter by status
      if (status && status !== 'all') {
        filtered = filtered.filter(r => r.status === status);
      }

      // Filter by customer
      if (customerId && customerId !== 'all') {
        filtered = filtered.filter(r => r.customerId === customerId);
      }

      // Calculate summaries
      const now = new Date();
      const vencidos = filtered.filter(r => 
        r.status !== 'cancelado' && r.status !== 'pago' && stringToDate(r.dueDate) < now
      );
      const aVencer = filtered.filter(r => 
        r.status === 'pendente' && stringToDate(r.dueDate) >= now
      );
      const recebidos = filtered.filter(r => r.status === 'pago');

      const totalVencidos = vencidos.reduce((sum, r) => sum + parseFloat(r.totalAmount || "0"), 0);
      const totalAVencer = aVencer.reduce((sum, r) => sum + parseFloat(r.totalAmount || "0"), 0);
      const totalRecebidos = recebidos.reduce((sum, r) => sum + parseFloat(r.amountReceived || "0"), 0);

      // Defaulting customers
      const defaultingCustomers = new Map<string, { name: string; count: number; total: number }>();
      
      vencidos.forEach(receivable => {
        if (receivable.customerId) {
          const customer = customers.find(c => c.id === receivable.customerId);
          const key = receivable.customerId;
          const name = customer?.razaoSocial || 'Cliente Desconhecido';
          
          const current = defaultingCustomers.get(key) || { name, count: 0, total: 0 };
          defaultingCustomers.set(key, {
            name,
            count: current.count + 1,
            total: current.total + parseFloat(receivable.totalAmount || "0")
          });
        }
      });

      // Evolution data (last 6 months)
      const evolutionData = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date();
        month.setMonth(month.getMonth() - i);
        const monthStr = month.toISOString().slice(0, 7);
        
        const monthReceivables = accountsReceivable.filter(r => {
          return r.dueDate.startsWith(monthStr) && r.status !== 'cancelado';
        });
        
        const total = monthReceivables.reduce((sum, r) => sum + parseFloat(r.totalAmount || "0"), 0);
        const received = monthReceivables.filter(r => r.status === 'pago').reduce((sum, r) => sum + parseFloat(r.amountReceived || "0"), 0);
        
        evolutionData.push({
          month: monthStr,
          total: Number(total.toFixed(2)),
          received: Number(received.toFixed(2)),
        });
      }

      res.json({
        data: filtered,
        summary: {
          vencidos: {
            count: vencidos.length,
            total: Number(totalVencidos.toFixed(2))
          },
          aVencer: {
            count: aVencer.length,
            total: Number(totalAVencer.toFixed(2))
          },
          recebidos: {
            count: recebidos.length,
            total: Number(totalRecebidos.toFixed(2))
          }
        },
        defaultingCustomers: Array.from(defaultingCustomers.values()).map(c => ({
          name: c.name,
          count: c.count,
          total: Number(c.total.toFixed(2))
        })),
        evolutionData,
        customers,
      });
    } catch (error) {
      console.error("Error generating accounts receivable report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Test Data Cleanup
  app.delete('/api/test-data', isAuthenticated, requireManager, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Delete all transactions while preserving master data
      await storage.deleteAllTransactions(userId);
      
      res.json({ message: "Dados de teste removidos com sucesso" });
    } catch (error) {
      console.error("Error deleting test data:", error);
      res.status(500).json({ message: "Failed to delete test data" });
    }
  });

  // Dashboard
  app.get('/api/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role;
      
      const [bankAccounts, accountsPayable, accountsReceivable, costAllocations, costCenters] = await Promise.all([
        storage.getBankAccounts(userId),
        storage.getAccountsPayable(userId, userRole),
        storage.getAccountsReceivable(userId, userRole),
        storage.getAllAllocations(userId),
        storage.getCostCenters(userId),
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
        a.status !== 'pago' && a.status !== 'cancelado' && stringToDate(a.dueDate) < new Date()
      );
      
      if (overduePayables.length > 0) {
        alerts.push({
          type: 'critical',
          title: `${overduePayables.length} conta(s) a pagar vencida(s)`,
          description: 'Há contas a pagar com vencimento atrasado',
          date: 'Agora',
        });
      }

      // Calculate Cash Flow Data (last 6 months)
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const now = new Date();
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
          month: monthNames[date.getMonth()],
          year: date.getFullYear(),
          monthIndex: date.getMonth(),
        };
      });

      const cashFlowData = last6Months.map(({ month, year, monthIndex }) => {
        // Include only non-canceled transactions for cash flow projection
        const receitas = accountsReceivable
          .filter(a => {
            if (a.status === 'cancelado') return false;
            const dueDate = stringToDate(a.dueDate);
            return dueDate.getMonth() === monthIndex && dueDate.getFullYear() === year;
          })
          .reduce((sum, acc) => sum + parseFloat(acc.totalAmount || "0"), 0);

        const despesas = accountsPayable
          .filter(a => {
            if (a.status === 'cancelado') return false;
            const dueDate = stringToDate(a.dueDate);
            return dueDate.getMonth() === monthIndex && dueDate.getFullYear() === year;
          })
          .reduce((sum, acc) => sum + parseFloat(acc.totalAmount || "0"), 0);

        return {
          month,
          receitas: Number(receitas.toFixed(2)),
          despesas: Number(despesas.toFixed(2)),
        };
      });

      // Calculate Expenses by Cost Center
      const payableAllocations = costAllocations.filter(a => a.transactionType === 'payable');
      const expensesByCostCenterMap = new Map<string, number>();

      // Sum allocated expenses by cost center
      payableAllocations.forEach(allocation => {
        const current = expensesByCostCenterMap.get(allocation.costCenterId) || 0;
        expensesByCostCenterMap.set(allocation.costCenterId, current + parseFloat(allocation.amount));
      });

      // Group allocations by transaction to detect partial allocations
      const allocationsByPayable = new Map<string, number>();
      payableAllocations.forEach(allocation => {
        const current = allocationsByPayable.get(allocation.transactionId) || 0;
        allocationsByPayable.set(allocation.transactionId, current + parseFloat(allocation.amount));
      });

      // Calculate unallocated amounts (fully unallocated + partial allocations)
      let unallocatedTotal = 0;

      accountsPayable
        .filter(p => p.status !== 'cancelado')
        .forEach(payable => {
          const totalAmount = parseFloat(payable.totalAmount || "0");
          const allocatedAmount = allocationsByPayable.get(payable.id) || 0;
          const unallocatedAmount = totalAmount - allocatedAmount;
          
          if (unallocatedAmount > 0.01) { // Use small threshold to avoid floating point issues
            unallocatedTotal += unallocatedAmount;
          }
        });

      if (unallocatedTotal > 0) {
        const current = expensesByCostCenterMap.get('__unallocated__') || 0;
        expensesByCostCenterMap.set('__unallocated__', current + unallocatedTotal);
      }

      const expensesByCostCenter = Array.from(expensesByCostCenterMap.entries())
        .map(([costCenterId, value]) => {
          if (costCenterId === '__unallocated__') {
            return {
              name: 'Sem Centro de Custo',
              value: Number(value.toFixed(2)),
            };
          }
          const costCenter = costCenters.find(cc => cc.id === costCenterId);
          return {
            name: costCenter ? costCenter.name : 'Sem Centro de Custo',
            value: Number(value.toFixed(2)),
          };
        })
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10 cost centers

      res.json({
        totalBalance: `R$ ${totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        totalReceivable: `R$ ${totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        totalPayable: `R$ ${totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        bankAccountsCount: bankAccounts.length.toString(),
        alerts,
        cashFlowData,
        expensesByCostCenter,
      });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Bank Accounts (all authenticated users can view)
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

  app.post('/api/bank-accounts', isAuthenticated, requirePermission('canCreate'), async (req: any, res) => {
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

  app.patch('/api/bank-accounts/:id', isAuthenticated, requirePermission('canUpdate'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      // Convert empty strings to null for optional fields
      const sanitizedBody = Object.fromEntries(
        Object.entries(req.body).map(([key, value]) => [key, value === "" ? null : value])
      );
      
      const validated = updateBankAccountSchema.parse(sanitizedBody);
      
      const account = await storage.updateBankAccount(id, userId, validated);
      if (!account) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      
      res.json(account);
    } catch (error: any) {
      console.error("Error updating bank account:", error);
      res.status(400).json({ message: error.message || "Failed to update bank account" });
    }
  });

  app.delete('/api/bank-accounts/:id', isAuthenticated, requirePermission('canDelete'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const success = await storage.deleteBankAccount(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting bank account:", error);
      res.status(400).json({ message: error.message || "Failed to delete bank account" });
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

  app.post('/api/bank-transfers', isAuthenticated, requirePermission('canCreate'), async (req: any, res) => {
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
      const userRole = req.user.role;
      // Process pending recurrences before fetching accounts
      await storage.processRecurrences(userId);
      const accounts = await storage.getAccountsPayable(userId, userRole);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching accounts payable:", error);
      res.status(500).json({ message: "Failed to fetch accounts payable" });
    }
  });

  app.post('/api/accounts-payable', isAuthenticated, requirePermission('canCreate'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role;
      
      // Convert empty strings to null for optional foreign keys
      const sanitizedData = {
        ...req.body,
        supplierId: req.body.supplierId === '' ? null : req.body.supplierId,
        bankAccountId: req.body.bankAccountId === '' ? null : req.body.bankAccountId,
        costCenterId: req.body.costCenterId === '' ? null : req.body.costCenterId,
        accountId: req.body.accountId === '' ? null : req.body.accountId,
        chartOfAccountsId: req.body.chartOfAccountsId === '' ? null : req.body.chartOfAccountsId,
        recurrenceParentId: req.body.recurrenceParentId === '' ? null : req.body.recurrenceParentId,
      };
      
      const validated = insertAccountsPayableSchema.parse(sanitizedData);
      
      // Verify user has access to the selected cost center
      const hasAccess = await storage.canAccessCostCenter(userId, userRole, validated.costCenterId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Você não tem acesso ao centro de custo selecionado" });
      }
      
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

  app.post('/api/accounts-payable/batch', isAuthenticated, requirePermission('canCreate'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role;
      const { installments } = req.body;
      
      if (!Array.isArray(installments) || installments.length === 0) {
        return res.status(400).json({ message: "Installments array is required and cannot be empty" });
      }
      
      // Validate each installment and add userId, converting empty strings to null
      const validatedInstallments = installments.map(inst => {
        const sanitized = {
          ...inst,
          supplierId: inst.supplierId === '' ? null : inst.supplierId,
          bankAccountId: inst.bankAccountId === '' ? null : inst.bankAccountId,
          costCenterId: inst.costCenterId === '' ? null : inst.costCenterId,
          accountId: inst.accountId === '' ? null : inst.accountId,
          chartOfAccountsId: inst.chartOfAccountsId === '' ? null : inst.chartOfAccountsId,
          recurrenceParentId: inst.recurrenceParentId === '' ? null : inst.recurrenceParentId,
        };
        const validated = insertAccountsPayableSchema.parse(sanitized);
        return {
          ...validated,
          userId,
        };
      });
      
      // Verify user has access to all selected cost centers
      for (const inst of validatedInstallments) {
        const hasAccess = await storage.canAccessCostCenter(userId, userRole, inst.costCenterId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem acesso a um ou mais centros de custo selecionados" });
        }
      }
      
      const accounts = await storage.createAccountsPayableBatch(validatedInstallments);
      res.json(accounts);
    } catch (error: any) {
      console.error("Error creating accounts payable batch:", error);
      res.status(400).json({ message: error.message || "Failed to create accounts payable batch" });
    }
  });

  app.patch('/api/accounts-payable/:id', isAuthenticated, requirePermission('canUpdate'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role;
      const { id } = req.params;
      
      const sanitizedData = {
        ...req.body,
        supplierId: req.body.supplierId === '' ? null : req.body.supplierId,
        bankAccountId: req.body.bankAccountId === '' ? null : req.body.bankAccountId,
        costCenterId: req.body.costCenterId === '' ? null : req.body.costCenterId,
        accountId: req.body.accountId === '' ? null : req.body.accountId,
        chartOfAccountsId: req.body.chartOfAccountsId === '' ? null : req.body.chartOfAccountsId,
      };
      
      const validated = updateAccountsPayableSchema.parse(sanitizedData);
      
      // Verify user has access to the selected cost center
      if (validated.costCenterId !== undefined) {
        const hasAccess = await storage.canAccessCostCenter(userId, userRole, validated.costCenterId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem acesso ao centro de custo selecionado" });
        }
      }
      
      const payable = await storage.updateAccountPayable(id, userId, validated);
      if (!payable) {
        return res.status(404).json({ message: "Conta a pagar não encontrada" });
      }
      res.json(payable);
    } catch (error: any) {
      console.error("Error updating account payable:", error);
      res.status(400).json({ message: error.message || "Falha ao atualizar conta a pagar" });
    }
  });

  app.delete('/api/accounts-payable/:id', isAuthenticated, requirePermission('canDelete'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const deleted = await storage.deleteAccountPayable(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Conta a pagar não encontrada" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting account payable:", error);
      res.status(500).json({ message: "Falha ao excluir conta a pagar" });
    }
  });

  // Accounts Receivable
  app.get('/api/accounts-receivable', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role;
      // Process pending recurrences before fetching accounts
      await storage.processRecurrences(userId);
      const accounts = await storage.getAccountsReceivable(userId, userRole);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching accounts receivable:", error);
      res.status(500).json({ message: "Failed to fetch accounts receivable" });
    }
  });

  app.post('/api/accounts-receivable', isAuthenticated, requirePermission('canCreate'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role;
      
      // Convert empty strings to null for optional foreign keys
      const sanitizedData = {
        ...req.body,
        customerId: req.body.customerId === '' ? null : req.body.customerId,
        bankAccountId: req.body.bankAccountId === '' ? null : req.body.bankAccountId,
        costCenterId: req.body.costCenterId === '' ? null : req.body.costCenterId,
        chartOfAccountsId: req.body.chartOfAccountsId === '' ? null : req.body.chartOfAccountsId,
        parentReceivableId: req.body.parentReceivableId === '' ? null : req.body.parentReceivableId,
      };
      
      const validated = insertAccountsReceivableSchema.parse(sanitizedData);
      
      // Verify user has access to the selected cost center
      const hasAccess = await storage.canAccessCostCenter(userId, userRole, validated.costCenterId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Você não tem acesso ao centro de custo selecionado" });
      }
      
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

  app.post('/api/accounts-receivable/batch', isAuthenticated, requirePermission('canCreate'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role;
      const { installments } = req.body;
      
      if (!Array.isArray(installments) || installments.length === 0) {
        return res.status(400).json({ message: "Installments array is required and cannot be empty" });
      }
      
      // Validate each installment and add userId, converting empty strings to null
      const validatedInstallments = installments.map(inst => {
        const sanitized = {
          ...inst,
          customerId: inst.customerId === '' ? null : inst.customerId,
          bankAccountId: inst.bankAccountId === '' ? null : inst.bankAccountId,
          costCenterId: inst.costCenterId === '' ? null : inst.costCenterId,
          chartOfAccountsId: inst.chartOfAccountsId === '' ? null : inst.chartOfAccountsId,
          parentReceivableId: inst.parentReceivableId === '' ? null : inst.parentReceivableId,
        };
        const validated = insertAccountsReceivableSchema.parse(sanitized);
        return {
          ...validated,
          userId,
        };
      });
      
      // Verify user has access to all selected cost centers
      for (const inst of validatedInstallments) {
        const hasAccess = await storage.canAccessCostCenter(userId, userRole, inst.costCenterId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem acesso a um ou mais centros de custo selecionados" });
        }
      }
      
      const accounts = await storage.createAccountsReceivableBatch(validatedInstallments);
      res.json(accounts);
    } catch (error: any) {
      console.error("Error creating accounts receivable batch:", error);
      res.status(400).json({ message: error.message || "Failed to create accounts receivable batch" });
    }
  });

  app.patch('/api/accounts-receivable/:id', isAuthenticated, requirePermission('canUpdate'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role;
      const { id } = req.params;
      
      const sanitizedData = {
        ...req.body,
        customerId: req.body.customerId === '' ? null : req.body.customerId,
        bankAccountId: req.body.bankAccountId === '' ? null : req.body.bankAccountId,
        costCenterId: req.body.costCenterId === '' ? null : req.body.costCenterId,
        accountId: req.body.accountId === '' ? null : req.body.accountId,
        chartOfAccountsId: req.body.chartOfAccountsId === '' ? null : req.body.chartOfAccountsId,
      };
      
      const validated = updateAccountsReceivableSchema.parse(sanitizedData);
      
      // Verify user has access to the selected cost center
      if (validated.costCenterId !== undefined) {
        const hasAccess = await storage.canAccessCostCenter(userId, userRole, validated.costCenterId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem acesso ao centro de custo selecionado" });
        }
      }
      
      const receivable = await storage.updateAccountReceivable(id, userId, userRole, validated);
      if (!receivable) {
        return res.status(404).json({ message: "Conta a receber não encontrada" });
      }
      res.json(receivable);
    } catch (error: any) {
      console.error("Error updating account receivable:", error);
      res.status(400).json({ message: error.message || "Falha ao atualizar conta a receber" });
    }
  });

  app.delete('/api/accounts-receivable/:id', isAuthenticated, requirePermission('canDelete'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role;
      const { id } = req.params;
      const deleted = await storage.deleteAccountReceivable(id, userId, userRole);
      if (!deleted) {
        return res.status(404).json({ message: "Conta a receber não encontrada" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting account receivable:", error);
      res.status(400).json({ message: error.message || "Falha ao excluir conta a receber" });
    }
  });

  // Recurrence Management
  app.patch('/api/accounts-payable/:id/recurrence', isAuthenticated, requirePermission('canUpdate'), async (req: any, res) => {
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

  app.patch('/api/accounts-receivable/:id/recurrence', isAuthenticated, requirePermission('canUpdate'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role;
      const { id } = req.params;
      const { recurrenceStatus } = req.body;

      if (!['ativa', 'pausada', 'concluida'].includes(recurrenceStatus)) {
        return res.status(400).json({ message: "Invalid recurrence status" });
      }

      const updated = await storage.updateAccountReceivable(id, userId, userRole, { recurrenceStatus });
      if (!updated) {
        return res.status(404).json({ message: "Account receivable not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating receivable recurrence:", error);
      res.status(400).json({ message: error.message || "Failed to update recurrence" });
    }
  });

  app.post('/api/recurrences/process', isAuthenticated, requirePermission('canCreate'), async (req: any, res) => {
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
      const classification = req.query.classification as string | undefined;
      
      let accounts = await storage.getChartOfAccounts(userId);
      
      if (classification === 'debit') {
        accounts = accounts.filter(acc => acc.type === 'despesa' || acc.type === 'ativo');
      } else if (classification === 'credit') {
        accounts = accounts.filter(acc => acc.type === 'receita' || acc.type === 'passivo');
      }
      
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching chart of accounts:", error);
      res.status(500).json({ message: "Failed to fetch chart of accounts" });
    }
  });

  app.post('/api/chart-of-accounts', isAuthenticated, requireManager, async (req: any, res) => {
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

  app.post('/api/chart-of-accounts/import', isAuthenticated, requireManager, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const importSchema = z.object({
        types: z.array(z.enum(['receita', 'despesa'])).optional(),
      });
      
      const validation = importSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Parâmetros inválidos",
          errors: validation.error.errors 
        });
      }
      
      const { types } = validation.data;
      const result = await storage.importChartOfAccounts(userId, types);
      res.json(result);
    } catch (error: any) {
      console.error("Error importing chart of accounts:", error);
      res.status(500).json({ message: error.message || "Failed to import chart of accounts" });
    }
  });

  app.patch('/api/chart-of-accounts/:id', isAuthenticated, requireManager, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const sanitizedData = {
        ...req.body,
        parentId: req.body.parentId === '' || req.body.parentId === 'none' ? null : req.body.parentId,
        quickCode: req.body.quickCode === '' ? null : req.body.quickCode,
        description: req.body.description === '' ? null : req.body.description,
      };
      
      const validated = insertChartOfAccountsSchema.partial().parse(sanitizedData);
      const account = await storage.updateChartAccount(id, userId, validated);
      
      if (!account) {
        return res.status(404).json({ message: "Conta não encontrada" });
      }
      
      res.json(account);
    } catch (error: any) {
      console.error("Error updating chart account:", error);
      res.status(400).json({ message: error.message || "Failed to update chart account" });
    }
  });

  app.delete('/api/chart-of-accounts/:id', isAuthenticated, requireManager, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const account = await storage.getChartAccount(id, userId);
      if (!account) {
        return res.status(404).json({ message: "Conta não encontrada" });
      }
      
      const children = await storage.getChartOfAccounts(userId);
      const hasChildren = children.some(c => c.parentId === id);
      if (hasChildren) {
        return res.status(409).json({ message: "Não é possível excluir conta que possui contas filhas" });
      }
      
      const payables = await storage.getAccountsPayable(userId);
      const hasPayables = payables.some(p => p.accountId === id);
      if (hasPayables) {
        return res.status(409).json({ message: "Não é possível excluir conta vinculada a contas a pagar" });
      }
      
      const receivables = await storage.getAccountsReceivable(userId);
      const hasReceivables = receivables.some(r => r.accountId === id);
      if (hasReceivables) {
        return res.status(409).json({ message: "Não é possível excluir conta vinculada a contas a receber" });
      }
      
      const deleted = await storage.deleteChartAccount(id, userId);
      if (!deleted) {
        return res.status(500).json({ message: "Falha ao excluir conta" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting chart account:", error);
      res.status(400).json({ message: error.message || "Failed to delete chart account" });
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

  app.post('/api/cost-centers', isAuthenticated, requireManager, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Sanitize empty strings to null for optional fields
      const sanitizedData = {
        ...req.body,
        parentId: req.body.parentId === '' || req.body.parentId === 'none' ? null : req.body.parentId,
        description: req.body.description === '' ? null : req.body.description,
      };
      
      const validated = insertCostCenterSchema.parse(sanitizedData);
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

  app.patch('/api/cost-centers/:id', isAuthenticated, requireManager, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      // Convert empty strings and 'none' to null for optional fields
      const sanitizedData = {
        ...req.body,
        parentId: req.body.parentId === '' || req.body.parentId === 'none' ? null : req.body.parentId,
        description: req.body.description === '' ? null : req.body.description,
      };
      
      const validated = updateCostCenterSchema.parse(sanitizedData);
      const updated = await storage.updateCostCenter(id, userId, validated);
      
      if (!updated) {
        return res.status(404).json({ message: "Centro de custo não encontrado" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating cost center:", error);
      res.status(400).json({ message: error.message || "Failed to update cost center" });
    }
  });

  app.delete('/api/cost-centers/:id', isAuthenticated, requireManager, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const deleted = await storage.deleteCostCenter(id, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Centro de custo não encontrado" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting cost center:", error);
      res.status(400).json({ message: error.message || "Failed to delete cost center" });
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

  app.post('/api/accounts-payable/:id/allocations', isAuthenticated, requirePermission('canCreate'), async (req: any, res) => {
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

  app.delete('/api/accounts-payable/:id/allocations', isAuthenticated, requirePermission('canDelete'), async (req: any, res) => {
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

  app.post('/api/accounts-receivable/:id/allocations', isAuthenticated, requirePermission('canCreate'), async (req: any, res) => {
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

  app.delete('/api/accounts-receivable/:id/allocations', isAuthenticated, requirePermission('canDelete'), async (req: any, res) => {
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

      const start = stringToDate(startDate as string);
      const end = stringToDate(endDate as string);

      // Fetch all transactions within period
      const [payables, receivables, accounts, costCenters] = await Promise.all([
        storage.getAccountsPayable(userId),
        storage.getAccountsReceivable(userId),
        storage.getChartOfAccounts(userId),
        storage.getCostCenters(userId),
      ]);

      // Filter by date range and status
      const filteredPayables = payables.filter(p => {
        const issueDate = stringToDate(p.issueDate);
        return issueDate >= start && issueDate <= end && p.status !== 'cancelado';
      });

      const filteredReceivables = receivables.filter(r => {
        const issueDate = stringToDate(r.issueDate);
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

  // Reports - Bank Statement
  app.get('/api/reports/bank-statement', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate query parameters with Zod
      const querySchema = z.object({
        bankAccountId: z.string().uuid({ message: "bankAccountId must be a valid UUID" }),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "startDate must be in YYYY-MM-DD format" }),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "endDate must be in YYYY-MM-DD format" }),
      });

      const validation = querySchema.safeParse(req.query);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid query parameters",
          errors: validation.error.errors 
        });
      }

      const { bankAccountId, startDate, endDate } = validation.data;

      // Validate date ordering
      if (stringToDate(startDate) > stringToDate(endDate)) {
        return res.status(400).json({ 
          message: "startDate must be before or equal to endDate" 
        });
      }

      // Verify bank account ownership
      const bankAccount = await storage.getBankAccount(bankAccountId, userId);
      if (!bankAccount) {
        return res.status(404).json({ 
          message: "Bank account not found or access denied" 
        });
      }

      const statement = await storage.getBankStatement(
        userId,
        bankAccountId,
        startDate,
        endDate
      );

      res.json(statement);
    } catch (error: any) {
      console.error("Error generating bank statement:", error);
      res.status(500).json({ message: error.message || "Failed to generate bank statement" });
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

  app.post('/api/suppliers', isAuthenticated, requirePermission('canCreate'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertSupplierSchema.parse(req.body);
      
      if (validated.cnpjCpf) {
        const cleanCpfCnpj = validated.cnpjCpf.replace(/\D/g, '');
        const existing = await storage.findSupplierByCpfCnpj(userId, cleanCpfCnpj);
        if (existing) {
          return res.status(400).json({ message: "Já existe um fornecedor cadastrado com este CPF/CNPJ" });
        }
      }
      
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

  app.patch('/api/suppliers/:id', isAuthenticated, requirePermission('canUpdate'), async (req: any, res) => {
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

  app.delete('/api/suppliers/:id', isAuthenticated, requirePermission('canDelete'), async (req: any, res) => {
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

  app.post('/api/customers', isAuthenticated, requirePermission('canCreate'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertCustomerSchema.parse(req.body);
      
      if (validated.cnpjCpf) {
        const cleanCpfCnpj = validated.cnpjCpf.replace(/\D/g, '');
        const existing = await storage.findCustomerByCpfCnpj(userId, cleanCpfCnpj);
        if (existing) {
          return res.status(400).json({ message: "Já existe um cliente cadastrado com este CPF/CNPJ" });
        }
      }
      
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

  app.patch('/api/customers/:id', isAuthenticated, requirePermission('canUpdate'), async (req: any, res) => {
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

  app.delete('/api/customers/:id', isAuthenticated, requirePermission('canDelete'), async (req: any, res) => {
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

  // Activities
  app.get('/api/activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate, scope, status } = req.query;
      
      const activities = await storage.getActivities(userId, {
        startDate: startDate as string,
        endDate: endDate as string,
        scope: scope as string,
        status: status as string,
      });
      
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.get('/api/activities/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const activity = await storage.getActivity(id, userId);
      
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      res.json(activity);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  app.post('/api/activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity({
        ...validated,
        userId,
      });
      res.json(activity);
    } catch (error: any) {
      console.error("Error creating activity:", error);
      res.status(400).json({ message: error.message || "Failed to create activity" });
    }
  });

  app.patch('/api/activities/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      // Ensure at least one field is provided
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: "At least one field is required for update" });
      }
      
      const validated = updateActivitySchema.parse(req.body);
      const activity = await storage.updateActivity(id, userId, validated);
      
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      res.json(activity);
    } catch (error: any) {
      console.error("Error updating activity:", error);
      res.status(400).json({ message: error.message || "Failed to update activity" });
    }
  });

  app.patch('/api/activities/:id/toggle', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const activity = await storage.toggleActivityStatus(id, userId);
      
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      res.json(activity);
    } catch (error) {
      console.error("Error toggling activity status:", error);
      res.status(500).json({ message: "Failed to toggle activity status" });
    }
  });

  app.delete('/api/activities/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const deleted = await storage.deleteActivity(id, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting activity:", error);
      res.status(500).json({ message: "Failed to delete activity" });
    }
  });

  // Payment validation schema
  const paymentBaixaSchema = z.object({
    paymentMethod: z.enum(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia', 'cheque', 'outros']),
    bankAccountId: z.string().optional(),
    amount: z.string()
      .min(1, "Valor é obrigatório")
      .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Valor deve ser um número positivo"
      }),
    paymentDate: z.string().min(1, "Data de pagamento é obrigatória"),
    notes: z.string().optional(),
  }).transform((data) => ({
    ...data,
    bankAccountId: data.bankAccountId === '' ? undefined : data.bankAccountId,
  }));

  // Payment routes (Baixas)
  app.get('/api/payments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { transactionType, transactionId } = req.query;
      
      const filters: any = {};
      if (transactionType) filters.transactionType = transactionType;
      if (transactionId) filters.transactionId = transactionId;
      
      const payments = await storage.getPayments(userId, filters);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post('/api/accounts-payable/:id/baixa', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role;
      const { id } = req.params;
      
      // Block operacional and visualizador from performing settlement
      if (userRole === 'operacional' || userRole === 'visualizador') {
        return res.status(403).json({ message: "Você não tem permissão para efetuar baixas" });
      }
      
      // Validate request body with Zod
      const validated = paymentBaixaSchema.parse(req.body);

      const result = await storage.processPayableBaixa(id, userId, {
        paymentMethod: validated.paymentMethod,
        bankAccountId: validated.bankAccountId,
        amount: validated.amount,
        paymentDate: validated.paymentDate,
        notes: validated.notes,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error processing payable baixa:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Dados de pagamento inválidos", 
          errors: error.errors 
        });
      }
      res.status(400).json({ message: error.message || "Failed to process payment" });
    }
  });

  app.post('/api/accounts-receivable/:id/baixa', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.role;
      const { id } = req.params;
      
      // Block operacional and visualizador from performing settlement
      if (userRole === 'operacional' || userRole === 'visualizador') {
        return res.status(403).json({ message: "Você não tem permissão para efetuar baixas" });
      }
      
      // Validate request body with Zod
      const validated = paymentBaixaSchema.parse(req.body);

      const result = await storage.processReceivableBaixa(id, userId, {
        paymentMethod: validated.paymentMethod,
        bankAccountId: validated.bankAccountId,
        amount: validated.amount,
        paymentDate: validated.paymentDate,
        notes: validated.notes,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error processing receivable baixa:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Dados de pagamento inválidos", 
          errors: error.errors 
        });
      }
      res.status(400).json({ message: error.message || "Failed to process payment" });
    }
  });

  // Company routes (Admin and Manager)
  app.get('/api/company', isAuthenticated, requireManager, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompany(userId);
      res.json(company || null);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company data" });
    }
  });

  app.post('/api/company', isAuthenticated, requireManager, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body (insertCompanySchema already omits userId)
      const validated = insertCompanySchema.parse(req.body);
      
      // Add userId to the validated data
      const company = await storage.upsertCompany({ ...validated, userId });
      res.json(company);
    } catch (error: any) {
      console.error("Error upserting company:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Dados da empresa inválidos", 
          errors: error.errors 
        });
      }
      res.status(400).json({ message: error.message || "Failed to save company data" });
    }
  });

  // Object Storage routes for document uploads
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.post("/api/documents/upload", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { documentURL } = req.body;
      
      if (!documentURL) {
        return res.status(400).json({ error: "documentURL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        documentURL,
        {
          owner: userId,
          visibility: "private",
        },
      );

      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
