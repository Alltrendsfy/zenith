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
} from "@shared/schema";

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
      const bankAccounts = await storage.getBankAccounts(userId);
      const totalBalance = bankAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance || "0"), 0);

      res.json({
        totalBalance: `R$ ${totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        totalReceivable: "R$ 0,00",
        totalPayable: "R$ 0,00",
        bankAccountsCount: bankAccounts.length.toString(),
        alerts: [],
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
      const validated = insertBankAccountSchema.parse(req.body);
      const account = await storage.createBankAccount({
        ...validated,
        userId,
      });
      res.json(account);
    } catch (error: any) {
      console.error("Error creating bank account:", error);
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

  const httpServer = createServer(app);
  return httpServer;
}
