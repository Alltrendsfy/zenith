import {
  users,
  type User,
  type UpsertUser,
  type BankAccount,
  type InsertBankAccount,
  type AccountsPayable,
  type InsertAccountsPayable,
  type AccountsReceivable,
  type InsertAccountsReceivable,
  type ChartOfAccounts,
  type InsertChartOfAccounts,
  type CostCenter,
  type InsertCostCenter,
  type BankTransfer,
  type InsertBankTransfer,
  type CostAllocation,
  type InsertCostAllocation,
  type Supplier,
  type InsertSupplier,
  type Customer,
  type InsertCustomer,
  type Activity,
  type InsertActivity,
  type Payment,
  type InsertPayment,
  type Company,
  type InsertCompany,
  bankAccounts,
  accountsPayable,
  accountsReceivable,
  chartOfAccounts,
  costCenters,
  userCostCenters,
  bankTransfers,
  costAllocations,
  suppliers,
  customers,
  activities,
  payments,
  companies,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: 'admin' | 'gerente' | 'financeiro' | 'operacional' | 'visualizador'): Promise<User | undefined>;
  toggleUserStatus(userId: string, isActive: boolean): Promise<User | undefined>;
  
  // User Cost Centers
  getUserCostCenters(userId: string): Promise<CostCenter[]>;
  setUserCostCenters(userId: string, costCenterIds: string[]): Promise<void>;
  removeUserCostCenter(userId: string, costCenterId: string): Promise<void>;

  // Bank Accounts
  getBankAccounts(userId: string): Promise<BankAccount[]>;
  getBankAccount(id: string, userId: string): Promise<BankAccount | undefined>;
  createBankAccount(account: InsertBankAccount): Promise<BankAccount>;
  updateBankAccount(id: string, userId: string, data: Partial<InsertBankAccount>): Promise<BankAccount | undefined>;
  deleteBankAccount(id: string, userId: string): Promise<boolean>;

  // Accounts Payable
  getAccountsPayable(userId: string, userRole?: string): Promise<AccountsPayable[]>;
  getAccountPayable(id: string, userId: string): Promise<AccountsPayable | undefined>;
  createAccountPayable(account: InsertAccountsPayable): Promise<AccountsPayable>;
  createAccountsPayableBatch(accounts: InsertAccountsPayable[]): Promise<AccountsPayable[]>;
  updateAccountPayable(id: string, userId: string, data: Partial<InsertAccountsPayable>): Promise<AccountsPayable | undefined>;
  deleteAccountPayable(id: string, userId: string): Promise<boolean>;

  // Accounts Receivable
  getAccountsReceivable(userId: string, userRole?: string): Promise<AccountsReceivable[]>;
  getAccountReceivable(id: string, userId: string): Promise<AccountsReceivable | undefined>;
  createAccountReceivable(account: InsertAccountsReceivable): Promise<AccountsReceivable>;
  createAccountsReceivableBatch(accounts: InsertAccountsReceivable[]): Promise<AccountsReceivable[]>;
  updateAccountReceivable(id: string, userId: string, userRole: string, data: Partial<InsertAccountsReceivable>): Promise<AccountsReceivable | undefined>;
  deleteAccountReceivable(id: string, userId: string, userRole: string): Promise<boolean>;

  // Chart of Accounts
  getChartOfAccounts(userId: string): Promise<ChartOfAccounts[]>;
  getChartAccount(id: string, userId: string): Promise<ChartOfAccounts | undefined>;
  createChartAccount(account: InsertChartOfAccounts): Promise<ChartOfAccounts>;
  updateChartAccount(id: string, userId: string, data: Partial<InsertChartOfAccounts>): Promise<ChartOfAccounts | undefined>;
  deleteChartAccount(id: string, userId: string): Promise<boolean>;
  importChartOfAccounts(userId: string, types?: string[]): Promise<{ created: number; skipped: number; accounts: ChartOfAccounts[] }>;

  // Cost Centers
  getCostCenters(userId: string): Promise<CostCenter[]>;
  getCostCenter(id: string, userId: string): Promise<CostCenter | undefined>;
  createCostCenter(center: InsertCostCenter): Promise<CostCenter>;
  updateCostCenter(id: string, userId: string, data: Partial<InsertCostCenter>): Promise<CostCenter | undefined>;
  deleteCostCenter(id: string, userId: string): Promise<boolean>;

  // Bank Transfers
  getBankTransfers(userId: string): Promise<BankTransfer[]>;
  createBankTransfer(transfer: InsertBankTransfer & { userId: string }): Promise<BankTransfer>;

  // Cost Allocations
  getAllAllocations(userId: string): Promise<CostAllocation[]>;
  getAllocations(userId: string, transactionType: 'payable' | 'receivable', transactionId: string): Promise<CostAllocation[]>;
  createAllocations(userId: string, transactionType: 'payable' | 'receivable', transactionId: string, allocations: InsertCostAllocation[]): Promise<CostAllocation[]>;
  deleteAllocations(userId: string, transactionType: 'payable' | 'receivable', transactionId: string): Promise<boolean>;

  // Suppliers
  getSuppliers(userId: string): Promise<Supplier[]>;
  getSupplier(id: string, userId: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, userId: string, data: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: string, userId: string): Promise<boolean>;

  // Customers
  getCustomers(userId: string): Promise<Customer[]>;
  getCustomer(id: string, userId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, userId: string, data: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string, userId: string): Promise<boolean>;

  // Activities
  getActivities(userId: string, filters?: { startDate?: string; endDate?: string; scope?: string; status?: string }): Promise<Activity[]>;
  getActivity(id: string, userId: string): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: string, userId: string, data: Partial<InsertActivity>): Promise<Activity | undefined>;
  toggleActivityStatus(id: string, userId: string): Promise<Activity | undefined>;
  deleteActivity(id: string, userId: string): Promise<boolean>;

  // Payments (Baixas)
  getPayments(userId: string, filters?: { transactionType?: 'payable' | 'receivable'; transactionId?: string }): Promise<Payment[]>;
  getPayment(id: string, userId: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment & { userId: string }): Promise<Payment>;
  processPayableBaixa(payableId: string, userId: string, payment: { paymentMethod: string; bankAccountId?: string; amount: string; paymentDate: string; notes?: string }): Promise<{ payment: Payment; payable: AccountsPayable }>;
  processReceivableBaixa(receivableId: string, userId: string, payment: { paymentMethod: string; bankAccountId?: string; amount: string; paymentDate: string; notes?: string }): Promise<{ payment: Payment; receivable: AccountsReceivable }>;

  // Company
  getCompany(userId: string): Promise<Company | undefined>;
  upsertCompany(company: InsertCompany & { userId: string }): Promise<Company>;

  // Bank Statement
  getBankStatement(userId: string, bankAccountId: string, startDate: string, endDate: string): Promise<BankStatementEntry[]>;

  // Test Data Cleanup
  deleteAllTransactions(userId: string): Promise<void>;
  getCostAllocations(userId: string): Promise<CostAllocation[]>;
}

export interface BankStatementEntry {
  date: string;
  type: 'C' | 'D'; // Crédito ou Débito
  description: string;
  entityName: string | null; // Fornecedor/Cliente
  accountCode: string | null; // Código da conta contábil
  accountName: string | null; // Nome da conta contábil
  costCenterCode: string | null;
  costCenterName: string | null;
  documentNumber: string | null;
  amount: string;
  balance: string; // Saldo após a transação
  transactionId: string; // Para referência/rastreamento
  transactionType: 'payment_out' | 'payment_in' | 'transfer_out' | 'transfer_in';
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existing = await db.select().from(users).where(eq(users.id, userData.id!));
    
    if (existing.length > 0) {
      const [user] = await db
        .update(users)
        .set({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id!))
        .returning();
      return user;
    } else {
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(userId: string, role: 'admin' | 'gerente' | 'financeiro' | 'operacional' | 'visualizador'): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async toggleUserStatus(userId: string, isActive: boolean): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  // User Cost Centers
  async getUserCostCenters(userId: string): Promise<CostCenter[]> {
    const userCostCenterLinks = await db
      .select()
      .from(userCostCenters)
      .where(eq(userCostCenters.userId, userId));
    
    if (userCostCenterLinks.length === 0) {
      return [];
    }

    const costCenterIds = userCostCenterLinks.map(link => link.costCenterId);
    const centers = await db
      .select()
      .from(costCenters)
      .where(sql`${costCenters.id} = ANY(${costCenterIds})`);
    
    return centers;
  }

  async setUserCostCenters(userId: string, costCenterIds: string[]): Promise<void> {
    await db.delete(userCostCenters).where(eq(userCostCenters.userId, userId));
    
    if (costCenterIds.length > 0) {
      const values = costCenterIds.map(costCenterId => ({
        userId,
        costCenterId
      }));
      await db.insert(userCostCenters).values(values);
    }
  }

  async removeUserCostCenter(userId: string, costCenterId: string): Promise<void> {
    await db
      .delete(userCostCenters)
      .where(
        and(
          eq(userCostCenters.userId, userId),
          eq(userCostCenters.costCenterId, costCenterId)
        )
      );
  }

  async getUserAllowedCostCenters(userId: string, userRole: string): Promise<string[] | null> {
    if (userRole === 'admin' || userRole === 'gerente') {
      return null;
    }
    
    const links = await db
      .select()
      .from(userCostCenters)
      .where(eq(userCostCenters.userId, userId));
    
    return links.map(link => link.costCenterId);
  }

  async canAccessCostCenter(userId: string, userRole: string, costCenterId: string | null): Promise<boolean> {
    // Admin and gerente can access any cost center
    if (userRole === 'admin' || userRole === 'gerente') {
      return true;
    }
    
    // Allow null cost center (optional field)
    if (!costCenterId) {
      return true;
    }
    
    const allowedCenters = await this.getUserAllowedCostCenters(userId, userRole);
    if (allowedCenters === null) {
      return true;
    }
    
    return allowedCenters.includes(costCenterId);
  }

  // Bank Accounts
  async getBankAccounts(userId: string): Promise<BankAccount[]> {
    return await db.select().from(bankAccounts).where(eq(bankAccounts.userId, userId)).orderBy(desc(bankAccounts.createdAt));
  }

  async getBankAccount(id: string, userId: string): Promise<BankAccount | undefined> {
    const [account] = await db.select().from(bankAccounts).where(and(eq(bankAccounts.id, id), eq(bankAccounts.userId, userId)));
    return account;
  }

  async createBankAccount(account: InsertBankAccount): Promise<BankAccount> {
    const [created] = await db.insert(bankAccounts).values(account).returning();
    return created;
  }

  async updateBankAccount(id: string, userId: string, data: Partial<InsertBankAccount>): Promise<BankAccount | undefined> {
    const [updated] = await db
      .update(bankAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(bankAccounts.id, id), eq(bankAccounts.userId, userId)))
      .returning();
    return updated;
  }

  async deleteBankAccount(id: string, userId: string): Promise<boolean> {
    // Check if the account has any associated transactions
    const [payables] = await db.select({ count: sql<number>`count(*)::int` })
      .from(accountsPayable)
      .where(and(eq(accountsPayable.bankAccountId, id), eq(accountsPayable.userId, userId)));
    
    const [receivables] = await db.select({ count: sql<number>`count(*)::int` })
      .from(accountsReceivable)
      .where(and(eq(accountsReceivable.bankAccountId, id), eq(accountsReceivable.userId, userId)));
    
    const [transfers] = await db.select({ count: sql<number>`count(*)::int` })
      .from(bankTransfers)
      .where(and(
        or(
          eq(bankTransfers.fromAccountId, id),
          eq(bankTransfers.toAccountId, id)
        ),
        eq(bankTransfers.userId, userId)
      ));
    
    const totalTransactions = (payables?.count || 0) + (receivables?.count || 0) + (transfers?.count || 0);
    
    if (totalTransactions > 0) {
      throw new Error(`Não é possível excluir esta conta bancária porque ela possui ${totalTransactions} transação(ões) associada(s). Remova as transações antes de excluir a conta.`);
    }
    
    const result = await db.delete(bankAccounts).where(and(eq(bankAccounts.id, id), eq(bankAccounts.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Accounts Payable
  async getAccountsPayable(userId: string, userRole?: string): Promise<AccountsPayable[]> {
    if (userRole === 'admin' || userRole === 'gerente') {
      return await db.select().from(accountsPayable).orderBy(desc(accountsPayable.dueDate));
    }
    
    const allowedCostCenters = await this.getUserAllowedCostCenters(userId, userRole || '');
    if (allowedCostCenters === null) {
      return await db.select().from(accountsPayable).orderBy(desc(accountsPayable.dueDate));
    }
    
    if (allowedCostCenters.length === 0) {
      return [];
    }
    
    return await db.select().from(accountsPayable)
      .where(sql`${accountsPayable.costCenterId} = ANY(${allowedCostCenters})`)
      .orderBy(desc(accountsPayable.dueDate));
  }

  async getAccountPayable(id: string, userId: string): Promise<AccountsPayable | undefined> {
    const [account] = await db.select().from(accountsPayable).where(and(eq(accountsPayable.id, id), eq(accountsPayable.userId, userId)));
    return account;
  }

  async createAccountPayable(account: InsertAccountsPayable): Promise<AccountsPayable> {
    const [created] = await db.insert(accountsPayable).values(account).returning();
    return created;
  }

  async createAccountsPayableBatch(accounts: InsertAccountsPayable[]): Promise<AccountsPayable[]> {
    if (accounts.length === 0) {
      return [];
    }
    
    // Use transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // Insert first installment
      const [firstAccount] = await tx.insert(accountsPayable).values(accounts[0]).returning();
      const allCreated: AccountsPayable[] = [firstAccount];
      
      // Insert remaining installments with parent reference
      if (accounts.length > 1) {
        const remainingAccounts = accounts.slice(1).map(acc => ({
          ...acc,
          recurrenceParentId: firstAccount.id,
        }));
        
        const remaining = await tx.insert(accountsPayable).values(remainingAccounts).returning();
        allCreated.push(...remaining);
      }
      
      return allCreated;
    });
  }

  async updateAccountPayable(id: string, userId: string, data: Partial<InsertAccountsPayable>): Promise<AccountsPayable | undefined> {
    const [updated] = await db
      .update(accountsPayable)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(accountsPayable.id, id), eq(accountsPayable.userId, userId)))
      .returning();
    return updated;
  }

  async deleteAccountPayable(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(accountsPayable).where(and(eq(accountsPayable.id, id), eq(accountsPayable.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Accounts Receivable
  async getAccountsReceivable(userId: string, userRole?: string): Promise<AccountsReceivable[]> {
    if (userRole === 'admin' || userRole === 'gerente') {
      return await db.select().from(accountsReceivable).orderBy(desc(accountsReceivable.dueDate));
    }
    
    const allowedCostCenters = await this.getUserAllowedCostCenters(userId, userRole || '');
    if (allowedCostCenters === null) {
      return await db.select().from(accountsReceivable).orderBy(desc(accountsReceivable.dueDate));
    }
    
    if (allowedCostCenters.length === 0) {
      return [];
    }
    
    return await db.select().from(accountsReceivable)
      .where(sql`${accountsReceivable.costCenterId} = ANY(${allowedCostCenters})`)
      .orderBy(desc(accountsReceivable.dueDate));
  }

  async getAccountReceivable(id: string, userId: string): Promise<AccountsReceivable | undefined> {
    const [account] = await db.select().from(accountsReceivable).where(and(eq(accountsReceivable.id, id), eq(accountsReceivable.userId, userId)));
    return account;
  }

  async createAccountReceivable(account: InsertAccountsReceivable): Promise<AccountsReceivable> {
    const [created] = await db.insert(accountsReceivable).values(account).returning();
    return created;
  }

  async createAccountsReceivableBatch(accounts: InsertAccountsReceivable[]): Promise<AccountsReceivable[]> {
    if (accounts.length === 0) {
      return [];
    }
    
    // Use transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // Insert first installment
      const [firstAccount] = await tx.insert(accountsReceivable).values(accounts[0]).returning();
      const allCreated: AccountsReceivable[] = [firstAccount];
      
      // Insert remaining installments with parent reference
      if (accounts.length > 1) {
        const remainingAccounts = accounts.slice(1).map(acc => ({
          ...acc,
          parentReceivableId: firstAccount.id,
        }));
        
        const remaining = await tx.insert(accountsReceivable).values(remainingAccounts).returning();
        allCreated.push(...remaining);
      }
      
      return allCreated;
    });
  }

  async updateAccountReceivable(id: string, userId: string, userRole: string, data: Partial<InsertAccountsReceivable>): Promise<AccountsReceivable | undefined> {
    try {
      // Get the existing account to check permissions and status
      const [existing] = await db
        .select()
        .from(accountsReceivable)
        .where(eq(accountsReceivable.id, id));

      if (!existing) {
        return undefined;
      }

      // Validate permissions: admin/gerente can edit any, others only their own
      if (userRole !== 'admin' && userRole !== 'gerente' && existing.userId !== userId) {
        throw new Error("Você não tem permissão para editar esta conta a receber");
      }

      // If the account is already paid, reject attempts to update protected fields
      if (existing.status === 'pago') {
        const protectedFields = ['amountReceived', 'status', 'recurrenceType', 'recurrenceCount', 'recurrenceStartDate', 'recurrenceEndDate', 'recurrenceNextDate', 'recurrenceStatus'];
        const attemptedProtectedFields = protectedFields.filter(field => data[field as keyof typeof data] !== undefined);
        
        if (attemptedProtectedFields.length > 0) {
          throw new Error("Não é possível alterar campos protegidos de uma conta que já foi paga");
        }
        
        const { amountReceived, status, recurrenceType, recurrenceCount, recurrenceStartDate, recurrenceEndDate, recurrenceNextDate, recurrenceStatus, ...allowedData } = data;
        
        // Only update allowed fields for paid accounts
        const [updated] = await db
          .update(accountsReceivable)
          .set({ ...allowedData, updatedAt: new Date() })
          .where(eq(accountsReceivable.id, id))
          .returning();
        return updated;
      }

      // For non-paid accounts, allow all updates
      const [updated] = await db
        .update(accountsReceivable)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(accountsReceivable.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error(`[updateAccountReceivable] Error updating account ${id}:`, error);
      throw error;
    }
  }

  async deleteAccountReceivable(id: string, userId: string, userRole: string): Promise<boolean> {
    try {
      // Get the existing account to check permissions and status
      const [existing] = await db
        .select()
        .from(accountsReceivable)
        .where(eq(accountsReceivable.id, id));

      if (!existing) {
        return false;
      }

      // Validate permissions: admin/gerente can delete any, others only their own
      if (userRole !== 'admin' && userRole !== 'gerente' && existing.userId !== userId) {
        throw new Error("Você não tem permissão para excluir esta conta a receber");
      }

      // Validate that the account is not paid
      if (existing.status === 'pago') {
        throw new Error("Não é possível excluir uma conta a receber que já foi paga");
      }

      // Use transaction to ensure atomicity
      return await db.transaction(async (tx) => {
        // First, delete associated allocations
        await tx
          .delete(costAllocations)
          .where(
            and(
              eq(costAllocations.transactionType, 'receivable'),
              eq(costAllocations.transactionId, id)
            )
          );

        // Then delete the account
        const result = await tx
          .delete(accountsReceivable)
          .where(eq(accountsReceivable.id, id));

        return result.rowCount ? result.rowCount > 0 : false;
      });
    } catch (error) {
      console.error(`[deleteAccountReceivable] Error deleting account ${id}:`, error);
      throw error;
    }
  }

  // Chart of Accounts
  async getChartOfAccounts(userId: string): Promise<ChartOfAccounts[]> {
    return await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.userId, userId)).orderBy(chartOfAccounts.code);
  }

  async getChartAccount(id: string, userId: string): Promise<ChartOfAccounts | undefined> {
    const [account] = await db.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.id, id), eq(chartOfAccounts.userId, userId)));
    return account;
  }

  async createChartAccount(account: InsertChartOfAccounts): Promise<ChartOfAccounts> {
    const [created] = await db.insert(chartOfAccounts).values(account).returning();
    return created;
  }

  async updateChartAccount(id: string, userId: string, data: Partial<InsertChartOfAccounts>): Promise<ChartOfAccounts | undefined> {
    const [updated] = await db
      .update(chartOfAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(chartOfAccounts.id, id), eq(chartOfAccounts.userId, userId)))
      .returning();
    return updated;
  }

  async deleteChartAccount(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(chartOfAccounts).where(and(eq(chartOfAccounts.id, id), eq(chartOfAccounts.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async importChartOfAccounts(userId: string, types?: string[]): Promise<{ created: number; skipped: number; accounts: ChartOfAccounts[] }> {
    const seedPath = join(process.cwd(), 'server', 'dre-seed.json');
    const seedData = JSON.parse(readFileSync(seedPath, 'utf-8'));
    
    let accountsToImport = seedData.accounts;
    if (types && types.length > 0) {
      accountsToImport = seedData.accounts.filter((a: any) => types.includes(a.type));
    }
    
    const existingAccounts = await this.getChartOfAccounts(userId);
    const existingCodes = new Set(existingAccounts.map(a => a.code));
    
    const codeToIdMap = new Map<string, string>();
    existingAccounts.forEach(acc => codeToIdMap.set(acc.code, acc.id));
    
    const parentCodes = new Set(
      accountsToImport
        .map((a: any) => a.parentCode)
        .filter((code: string | undefined) => code !== undefined)
    );
    
    const createdAccounts: ChartOfAccounts[] = [];
    let created = 0;
    let skipped = 0;
    
    for (const seedAccount of accountsToImport) {
      if (existingCodes.has(seedAccount.code)) {
        skipped++;
        continue;
      }
      
      let parentId: string | null = null;
      if (seedAccount.parentCode) {
        parentId = codeToIdMap.get(seedAccount.parentCode) || null;
        if (!parentId) {
          console.warn(`Parent account ${seedAccount.parentCode} not found for ${seedAccount.code}`);
        }
      }
      
      const isParent = parentCodes.has(seedAccount.code);
      const nature = isParent ? 'sintetica' : 'analitica';
      
      const newAccount = await this.createChartAccount({
        userId,
        code: seedAccount.code,
        name: seedAccount.name,
        type: seedAccount.type as 'receita' | 'despesa' | 'ativo' | 'passivo',
        nature: nature as 'analitica' | 'sintetica',
        parentId,
      });
      
      codeToIdMap.set(newAccount.code, newAccount.id);
      createdAccounts.push(newAccount);
      created++;
    }
    
    return { created, skipped, accounts: createdAccounts };
  }

  // Cost Centers
  async getCostCenters(userId: string): Promise<CostCenter[]> {
    return await db.select().from(costCenters).where(eq(costCenters.userId, userId)).orderBy(costCenters.code);
  }

  async getCostCenter(id: string, userId: string): Promise<CostCenter | undefined> {
    const [center] = await db.select().from(costCenters).where(and(eq(costCenters.id, id), eq(costCenters.userId, userId)));
    return center;
  }

  // Helper to check if creating a parent relationship would create a cycle
  private async wouldCreateCycle(centerId: string, proposedParentId: string, userId: string): Promise<boolean> {
    // Self-reference check
    if (centerId === proposedParentId) {
      return true;
    }
    
    // Walk up the parent chain from proposedParentId
    let currentId: string | null = proposedParentId;
    const visited = new Set<string>();
    
    while (currentId) {
      // Prevent infinite loops
      if (visited.has(currentId)) {
        return true;
      }
      visited.add(currentId);
      
      // If we reach the center we're trying to update, we have a cycle
      if (currentId === centerId) {
        return true;
      }
      
      // Get parent of current node
      const [current] = await db
        .select({ parentId: costCenters.parentId })
        .from(costCenters)
        .where(and(eq(costCenters.id, currentId), eq(costCenters.userId, userId)));
      
      if (!current) {
        break; // Parent not found, no cycle
      }
      
      currentId = current.parentId;
    }
    
    return false;
  }

  async createCostCenter(center: InsertCostCenter): Promise<CostCenter> {
    // Note: For creation, we generate the ID after insert, so we can't check cycles beforehand
    // The database structure naturally prevents self-reference on creation
    const [created] = await db.insert(costCenters).values(center).returning();
    return created;
  }

  async updateCostCenter(id: string, userId: string, data: Partial<InsertCostCenter>): Promise<CostCenter | undefined> {
    // If updating parentId, check for circular reference
    if (data.parentId !== undefined && data.parentId !== null) {
      const wouldCycle = await this.wouldCreateCycle(id, data.parentId, userId);
      if (wouldCycle) {
        throw new Error("Não é possível definir este centro de custo como pai porque criaria uma referência circular na hierarquia.");
      }
    }
    
    const [updated] = await db
      .update(costCenters)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(costCenters.id, id), eq(costCenters.userId, userId)))
      .returning();
    return updated;
  }

  async deleteCostCenter(id: string, userId: string): Promise<boolean> {
    // Check if the cost center has any child cost centers
    const [children] = await db.select({ count: sql<number>`count(*)::int` })
      .from(costCenters)
      .where(and(eq(costCenters.parentId, id), eq(costCenters.userId, userId)));
    
    if ((children?.count || 0) > 0) {
      throw new Error(`Não é possível excluir este centro de custo porque ele possui ${children.count} centro(s) de custo filho(s). Remova ou reatribua os centros filhos antes de excluir.`);
    }
    
    // Check cost allocations (rateio) - these are the main way cost centers are used
    const [allocations] = await db.select({ count: sql<number>`count(*)::int` })
      .from(costAllocations)
      .where(and(eq(costAllocations.costCenterId, id), eq(costAllocations.userId, userId)));
    
    if ((allocations?.count || 0) > 0) {
      throw new Error(`Não é possível excluir este centro de custo porque ele possui ${allocations.count} rateio(s) de custo associado(s). Remova os rateios antes de excluir o centro de custo.`);
    }
    
    // Check if the cost center has any associated payables or receivables
    const [payables] = await db.select({ count: sql<number>`count(*)::int` })
      .from(accountsPayable)
      .where(and(eq(accountsPayable.costCenterId, id), eq(accountsPayable.userId, userId)));
    
    if ((payables?.count || 0) > 0) {
      throw new Error(`Não é possível excluir este centro de custo porque ele possui ${payables.count} conta(s) a pagar associada(s). Remova as contas antes de excluir o centro de custo.`);
    }
    
    const [receivables] = await db.select({ count: sql<number>`count(*)::int` })
      .from(accountsReceivable)
      .where(and(eq(accountsReceivable.costCenterId, id), eq(accountsReceivable.userId, userId)));
    
    if ((receivables?.count || 0) > 0) {
      throw new Error(`Não é possível excluir este centro de custo porque ele possui ${receivables.count} conta(s) a receber associada(s). Remova as contas antes de excluir o centro de custo.`);
    }
    
    const result = await db.delete(costCenters).where(and(eq(costCenters.id, id), eq(costCenters.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Bank Transfers
  async getBankTransfers(userId: string): Promise<BankTransfer[]> {
    return await db.select().from(bankTransfers).where(eq(bankTransfers.userId, userId)).orderBy(desc(bankTransfers.transferDate));
  }

  async createBankTransfer(transfer: InsertBankTransfer & { userId: string }): Promise<BankTransfer> {
    // 1. Validate that accounts are different
    if (transfer.fromAccountId === transfer.toAccountId) {
      throw new Error("Contas de origem e destino devem ser diferentes");
    }

    // 2. Validate amount is positive
    const amount = parseFloat(transfer.amount);
    if (amount <= 0) {
      throw new Error("Valor deve ser maior que zero");
    }

    // 3. Fetch both accounts and verify they exist and belong to the user
    const [fromAccount] = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, transfer.fromAccountId), eq(bankAccounts.userId, transfer.userId)));
    
    const [toAccount] = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, transfer.toAccountId), eq(bankAccounts.userId, transfer.userId)));

    if (!fromAccount) {
      throw new Error("Conta de origem não encontrada");
    }

    if (!toAccount) {
      throw new Error("Conta de destino não encontrada");
    }

    // 4. Verify sufficient balance
    const currentBalance = parseFloat(fromAccount.balance);
    if (currentBalance < amount) {
      throw new Error("Saldo insuficiente na conta de origem");
    }

    // 5. Perform balance updates and create transfer
    try {
      // Update from account (debit)
      const newFromBalance = (currentBalance - amount).toFixed(2);
      await db
        .update(bankAccounts)
        .set({ balance: newFromBalance, updatedAt: new Date() })
        .where(and(eq(bankAccounts.id, transfer.fromAccountId), eq(bankAccounts.userId, transfer.userId)));

      // Update to account (credit)
      const currentToBalance = parseFloat(toAccount.balance);
      const newToBalance = (currentToBalance + amount).toFixed(2);
      await db
        .update(bankAccounts)
        .set({ balance: newToBalance, updatedAt: new Date() })
        .where(and(eq(bankAccounts.id, transfer.toAccountId), eq(bankAccounts.userId, transfer.userId)));

      // Create transfer record
      const [created] = await db.insert(bankTransfers).values(transfer).returning();
      return created;
    } catch (error) {
      // If any update fails, throw error (in a real system, we'd use transactions)
      console.error("Error during bank transfer:", error);
      throw new Error("Erro ao processar transferência. Por favor, tente novamente.");
    }
  }

  // Cost Allocations
  async getAllAllocations(userId: string): Promise<CostAllocation[]> {
    return await db
      .select()
      .from(costAllocations)
      .where(eq(costAllocations.userId, userId))
      .orderBy(desc(costAllocations.createdAt));
  }

  async getAllocations(userId: string, transactionType: 'payable' | 'receivable', transactionId: string): Promise<CostAllocation[]> {
    return await db
      .select()
      .from(costAllocations)
      .where(
        and(
          eq(costAllocations.userId, userId),
          eq(costAllocations.transactionType, transactionType),
          eq(costAllocations.transactionId, transactionId)
        )
      )
      .orderBy(costAllocations.createdAt);
  }

  async createAllocations(userId: string, transactionType: 'payable' | 'receivable', transactionId: string, allocations: InsertCostAllocation[]): Promise<CostAllocation[]> {
    // Delete existing allocations first
    await db.delete(costAllocations).where(
      and(
        eq(costAllocations.userId, userId),
        eq(costAllocations.transactionType, transactionType),
        eq(costAllocations.transactionId, transactionId)
      )
    );

    // Insert new allocations
    if (allocations.length === 0) {
      return [];
    }

    const values = allocations.map(alloc => ({
      ...alloc,
      userId,
      transactionType,
      transactionId,
    }));

    const created = await db.insert(costAllocations).values(values).returning();
    return created;
  }

  async deleteAllocations(userId: string, transactionType: 'payable' | 'receivable', transactionId: string): Promise<boolean> {
    const result = await db.delete(costAllocations).where(
      and(
        eq(costAllocations.userId, userId),
        eq(costAllocations.transactionType, transactionType),
        eq(costAllocations.transactionId, transactionId)
      )
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Suppliers
  async getSuppliers(userId: string): Promise<Supplier[]> {
    return await db.select().from(suppliers).where(eq(suppliers.userId, userId)).orderBy(asc(suppliers.razaoSocial));
  }

  async getSupplier(id: string, userId: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)));
    return supplier;
  }

  async findSupplierByCpfCnpj(userId: string, cpfCnpj: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(
      and(
        eq(suppliers.userId, userId),
        sql`REPLACE(REPLACE(REPLACE(${suppliers.cnpjCpf}, '.', ''), '/', ''), '-', '') = ${cpfCnpj}`
      )
    );
    return supplier;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [created] = await db.insert(suppliers).values(supplier).returning();
    return created;
  }

  async updateSupplier(id: string, userId: string, data: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [updated] = await db
      .update(suppliers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)))
      .returning();
    return updated;
  }

  async deleteSupplier(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Customers
  async getCustomers(userId: string): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.userId, userId)).orderBy(asc(customers.razaoSocial));
  }

  async getCustomer(id: string, userId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.userId, userId)));
    return customer;
  }

  async findCustomerByCpfCnpj(userId: string, cpfCnpj: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(
      and(
        eq(customers.userId, userId),
        sql`REPLACE(REPLACE(REPLACE(${customers.cnpjCpf}, '.', ''), '/', ''), '-', '') = ${cpfCnpj}`
      )
    );
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async updateCustomer(id: string, userId: string, data: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.userId, userId)))
      .returning();
    return updated;
  }

  async deleteCustomer(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(customers).where(and(eq(customers.id, id), eq(customers.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Recurrence Management
  async generateNextPayable(parentPayable: AccountsPayable): Promise<AccountsPayable | null> {
    if (parentPayable.recurrenceType === 'unica' || !parentPayable.recurrenceNextDate) {
      return null;
    }

    // Calculate next due date
    const nextDueDate = new Date(parentPayable.recurrenceNextDate);
    const nextIssueDate = new Date(nextDueDate);
    nextIssueDate.setDate(nextIssueDate.getDate() - (new Date(parentPayable.dueDate).getTime() - new Date(parentPayable.issueDate).getTime()) / (1000 * 60 * 60 * 24));

    // Calculate next recurrence date
    let newNextDate: Date | null = new Date(nextDueDate);
    switch (parentPayable.recurrenceType) {
      case 'mensal':
        newNextDate.setMonth(newNextDate.getMonth() + 1);
        break;
      case 'trimestral':
        newNextDate.setMonth(newNextDate.getMonth() + 3);
        break;
      case 'anual':
        newNextDate.setFullYear(newNextDate.getFullYear() + 1);
        break;
      default:
        newNextDate = null;
    }

    // Check if we've reached the end date
    if (parentPayable.recurrenceEndDate && newNextDate) {
      if (newNextDate > new Date(parentPayable.recurrenceEndDate)) {
        // Mark recurrence as completed
        await this.updateAccountPayable(parentPayable.id, parentPayable.userId, {
          recurrenceStatus: 'concluida'
        });
        return null;
      }
    }

    // Create next installment
    const nextPayable: InsertAccountsPayable = {
      userId: parentPayable.userId,
      description: parentPayable.description,
      supplierId: parentPayable.supplierId,
      supplierName: parentPayable.supplierName,
      accountId: parentPayable.accountId,
      costCenterId: parentPayable.costCenterId,
      totalAmount: parentPayable.totalAmount,
      amountPaid: '0.00',
      dueDate: nextDueDate.toISOString().split('T')[0],
      issueDate: nextIssueDate.toISOString().split('T')[0],
      status: 'pendente',
      bankAccountId: parentPayable.bankAccountId,
      documentNumber: parentPayable.documentNumber,
      notes: parentPayable.notes,
      recurrenceType: 'unica',
      recurrenceParentId: parentPayable.id,
    };

    const [created] = await db.insert(accountsPayable).values(nextPayable).returning();

    // Update parent recurrence next date
    if (newNextDate) {
      await this.updateAccountPayable(parentPayable.id, parentPayable.userId, {
        recurrenceNextDate: newNextDate.toISOString().split('T')[0]
      });
    }

    return created;
  }

  async generateNextReceivable(parentReceivable: AccountsReceivable): Promise<AccountsReceivable | null> {
    if (parentReceivable.recurrenceType === 'unica' || !parentReceivable.recurrenceNextDate) {
      return null;
    }

    // Calculate next due date
    const nextDueDate = new Date(parentReceivable.recurrenceNextDate);
    const nextIssueDate = new Date(nextDueDate);
    nextIssueDate.setDate(nextIssueDate.getDate() - (new Date(parentReceivable.dueDate).getTime() - new Date(parentReceivable.issueDate).getTime()) / (1000 * 60 * 60 * 24));

    // Calculate next recurrence date
    let newNextDate: Date | null = new Date(nextDueDate);
    switch (parentReceivable.recurrenceType) {
      case 'mensal':
        newNextDate.setMonth(newNextDate.getMonth() + 1);
        break;
      case 'trimestral':
        newNextDate.setMonth(newNextDate.getMonth() + 3);
        break;
      case 'anual':
        newNextDate.setFullYear(newNextDate.getFullYear() + 1);
        break;
      default:
        newNextDate = null;
    }

    // Check if we've reached the end date
    if (parentReceivable.recurrenceEndDate && newNextDate) {
      if (newNextDate > new Date(parentReceivable.recurrenceEndDate)) {
        // Mark recurrence as completed
        await this.updateAccountReceivable(parentReceivable.id, parentReceivable.userId, {
          recurrenceStatus: 'concluida'
        });
        return null;
      }
    }

    // Create next installment
    const nextReceivable: InsertAccountsReceivable = {
      userId: parentReceivable.userId,
      description: parentReceivable.description,
      customerId: parentReceivable.customerId,
      customerName: parentReceivable.customerName,
      accountId: parentReceivable.accountId,
      costCenterId: parentReceivable.costCenterId,
      totalAmount: parentReceivable.totalAmount,
      amountReceived: '0.00',
      dueDate: nextDueDate.toISOString().split('T')[0],
      issueDate: nextIssueDate.toISOString().split('T')[0],
      status: 'pendente',
      bankAccountId: parentReceivable.bankAccountId,
      documentNumber: parentReceivable.documentNumber,
      notes: parentReceivable.notes,
      recurrenceType: 'unica',
      recurrenceParentId: parentReceivable.id,
    };

    const [created] = await db.insert(accountsReceivable).values(nextReceivable).returning();

    // Update parent recurrence next date
    if (newNextDate) {
      await this.updateAccountReceivable(parentReceivable.id, parentReceivable.userId, {
        recurrenceNextDate: newNextDate.toISOString().split('T')[0]
      });
    }

    return created;
  }

  async processRecurrences(userId: string): Promise<{ payablesGenerated: number; receivablesGenerated: number }> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get all active recurrences for payables
    const activePayables = await db
      .select()
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.userId, userId),
          eq(accountsPayable.recurrenceStatus, 'ativa'),
          sql`${accountsPayable.recurrenceNextDate} <= ${today}`
        )
      );

    // Get all active recurrences for receivables
    const activeReceivables = await db
      .select()
      .from(accountsReceivable)
      .where(
        and(
          eq(accountsReceivable.userId, userId),
          eq(accountsReceivable.recurrenceStatus, 'ativa'),
          sql`${accountsReceivable.recurrenceNextDate} <= ${today}`
        )
      );

    let payablesGenerated = 0;
    let receivablesGenerated = 0;

    // Generate next payables
    for (const payable of activePayables) {
      const generated = await this.generateNextPayable(payable);
      if (generated) {
        payablesGenerated++;
      }
    }

    // Generate next receivables
    for (const receivable of activeReceivables) {
      const generated = await this.generateNextReceivable(receivable);
      if (generated) {
        receivablesGenerated++;
      }
    }

    return { payablesGenerated, receivablesGenerated };
  }

  // Activities operations
  async getActivities(userId: string, filters?: { startDate?: string; endDate?: string; scope?: string; status?: string }): Promise<Activity[]> {
    const conditions = [eq(activities.userId, userId)];

    if (filters?.startDate && filters?.endDate) {
      conditions.push(
        sql`${activities.startAt} >= ${filters.startDate}::timestamp`,
        sql`${activities.startAt} <= ${filters.endDate}::timestamp`
      );
    }

    if (filters?.scope) {
      conditions.push(eq(activities.scope, filters.scope as any));
    }

    if (filters?.status) {
      conditions.push(eq(activities.status, filters.status as any));
    }

    return await db
      .select()
      .from(activities)
      .where(and(...conditions))
      .orderBy(desc(activities.startAt));
  }

  async getActivity(id: string, userId: string): Promise<Activity | undefined> {
    const [activity] = await db
      .select()
      .from(activities)
      .where(and(eq(activities.id, id), eq(activities.userId, userId)));
    return activity;
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [created] = await db.insert(activities).values(activity).returning();
    return created;
  }

  async updateActivity(id: string, userId: string, data: Partial<InsertActivity>): Promise<Activity | undefined> {
    const [updated] = await db
      .update(activities)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(activities.id, id), eq(activities.userId, userId)))
      .returning();
    return updated;
  }

  async toggleActivityStatus(id: string, userId: string): Promise<Activity | undefined> {
    const activity = await this.getActivity(id, userId);
    if (!activity) return undefined;

    const newStatus = activity.status === 'pendente' ? 'concluida' : 'pendente';
    return await this.updateActivity(id, userId, { status: newStatus });
  }

  async deleteActivity(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(activities)
      .where(and(eq(activities.id, id), eq(activities.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Payment operations
  async getPayments(userId: string, filters?: { transactionType?: 'payable' | 'receivable'; transactionId?: string }): Promise<Payment[]> {
    const conditions = [eq(payments.userId, userId)];

    if (filters?.transactionType) {
      conditions.push(eq(payments.transactionType, filters.transactionType));
    }

    if (filters?.transactionId) {
      conditions.push(eq(payments.transactionId, filters.transactionId));
    }

    return await db
      .select()
      .from(payments)
      .where(and(...conditions))
      .orderBy(desc(payments.paymentDate));
  }

  async getPayment(id: string, userId: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.userId, userId)));
    return payment;
  }

  async createPayment(payment: InsertPayment & { userId: string }): Promise<Payment> {
    const [created] = await db.insert(payments).values(payment).returning();
    return created;
  }

  async processPayableBaixa(
    payableId: string,
    userId: string,
    paymentData: { paymentMethod: string; bankAccountId?: string; amount: string; paymentDate: string; notes?: string }
  ): Promise<{ payment: Payment; payable: AccountsPayable }> {
    // Get the payable
    const payable = await this.getAccountPayable(payableId, userId);
    if (!payable) {
      throw new Error('Conta a pagar não encontrada');
    }

    // Create payment record
    const payment = await this.createPayment({
      userId,
      transactionType: 'payable',
      transactionId: payableId,
      paymentMethod: paymentData.paymentMethod as any,
      bankAccountId: paymentData.bankAccountId,
      amount: paymentData.amount,
      paymentDate: paymentData.paymentDate,
      notes: paymentData.notes,
    });

    // Update payable's amountPaid
    const currentPaid = parseFloat(payable.amountPaid || '0');
    const paymentAmount = parseFloat(paymentData.amount);
    const totalAmount = parseFloat(payable.totalAmount);
    const newAmountPaid = currentPaid + paymentAmount;

    // Determine new status
    let newStatus: 'pendente' | 'pago' | 'parcial' | 'cancelado' | 'vencido' = 'pendente';
    if (newAmountPaid >= totalAmount) {
      newStatus = 'pago';
    } else if (newAmountPaid > 0) {
      newStatus = 'parcial';
    }

    // Update payable
    const updatedPayable = await this.updateAccountPayable(payableId, userId, {
      amountPaid: newAmountPaid.toFixed(2),
      status: newStatus,
    });

    if (!updatedPayable) {
      throw new Error('Erro ao atualizar conta a pagar');
    }

    // Update bank account balance if bankAccountId is provided
    if (paymentData.bankAccountId) {
      const bankAccount = await this.getBankAccount(paymentData.bankAccountId, userId);
      if (bankAccount) {
        const currentBalance = parseFloat(bankAccount.balance);
        const newBalance = currentBalance - paymentAmount;
        await this.updateBankAccount(paymentData.bankAccountId, userId, {
          balance: newBalance.toFixed(2),
        });
      }
    }

    return { payment, payable: updatedPayable };
  }

  async processReceivableBaixa(
    receivableId: string,
    userId: string,
    paymentData: { paymentMethod: string; bankAccountId?: string; amount: string; paymentDate: string; notes?: string }
  ): Promise<{ payment: Payment; receivable: AccountsReceivable }> {
    // Get the receivable
    const receivable = await this.getAccountReceivable(receivableId, userId);
    if (!receivable) {
      throw new Error('Conta a receber não encontrada');
    }

    // Create payment record
    const payment = await this.createPayment({
      userId,
      transactionType: 'receivable',
      transactionId: receivableId,
      paymentMethod: paymentData.paymentMethod as any,
      bankAccountId: paymentData.bankAccountId,
      amount: paymentData.amount,
      paymentDate: paymentData.paymentDate,
      notes: paymentData.notes,
    });

    // Update receivable's amountReceived
    const currentReceived = parseFloat(receivable.amountReceived || '0');
    const paymentAmount = parseFloat(paymentData.amount);
    const totalAmount = parseFloat(receivable.totalAmount);
    const newAmountReceived = currentReceived + paymentAmount;

    // Determine new status
    let newStatus: 'pendente' | 'pago' | 'parcial' | 'cancelado' | 'vencido' = 'pendente';
    if (newAmountReceived >= totalAmount) {
      newStatus = 'pago';
    } else if (newAmountReceived > 0) {
      newStatus = 'parcial';
    }

    // Update receivable
    const updatedReceivable = await this.updateAccountReceivable(receivableId, userId, {
      amountReceived: newAmountReceived.toFixed(2),
      status: newStatus,
    });

    if (!updatedReceivable) {
      throw new Error('Erro ao atualizar conta a receber');
    }

    // Update bank account balance if bankAccountId is provided
    if (paymentData.bankAccountId) {
      const bankAccount = await this.getBankAccount(paymentData.bankAccountId, userId);
      if (bankAccount) {
        const currentBalance = parseFloat(bankAccount.balance);
        const newBalance = currentBalance + paymentAmount;
        await this.updateBankAccount(paymentData.bankAccountId, userId, {
          balance: newBalance.toFixed(2),
        });
      }
    }

    return { payment, receivable: updatedReceivable };
  }

  // Company operations
  async getCompany(userId: string): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.userId, userId))
      .limit(1);
    return company;
  }

  async upsertCompany(companyData: InsertCompany & { userId: string }): Promise<Company> {
    // Check if company already exists for this user
    const existing = await this.getCompany(companyData.userId);
    
    if (existing) {
      // Update existing company
      const [updated] = await db
        .update(companies)
        .set({
          ...companyData,
          updatedAt: new Date(),
        })
        .where(eq(companies.userId, companyData.userId))
        .returning();
      return updated;
    } else {
      // Create new company
      const [created] = await db
        .insert(companies)
        .values(companyData)
        .returning();
      return created;
    }
  }

  // Bank Statement - Aggregates all bank transactions (payments + transfers)
  async getBankStatement(userId: string, bankAccountId: string, startDate: string, endDate: string): Promise<BankStatementEntry[]> {
    const entries: BankStatementEntry[] = [];

    // Get bank account initial balance
    const [bankAccount] = await db.select().from(bankAccounts)
      .where(and(eq(bankAccounts.id, bankAccountId), eq(bankAccounts.userId, userId)));
    
    if (!bankAccount) {
      return [];
    }

    // 1. Fetch all payments for this bank account
    const paymentsData = await db.select({
      payment: payments,
      payable: accountsPayable,
      receivable: accountsReceivable,
      supplier: suppliers,
      customer: customers,
      chartAccount: chartOfAccounts,
      costCenter: costCenters,
    })
    .from(payments)
    .leftJoin(accountsPayable, and(
      eq(payments.transactionType, sql`'payable'`),
      eq(payments.transactionId, accountsPayable.id)
    ))
    .leftJoin(accountsReceivable, and(
      eq(payments.transactionType, sql`'receivable'`),
      eq(payments.transactionId, accountsReceivable.id)
    ))
    .leftJoin(suppliers, eq(accountsPayable.supplierId, suppliers.id))
    .leftJoin(customers, eq(accountsReceivable.customerId, customers.id))
    .leftJoin(chartOfAccounts, sql`${chartOfAccounts.id} = COALESCE(${accountsPayable.accountId}, ${accountsReceivable.accountId})`)
    .leftJoin(costCenters, sql`${costCenters.id} = COALESCE(${accountsPayable.costCenterId}, ${accountsReceivable.costCenterId})`)
    .where(and(
      eq(payments.userId, userId),
      eq(payments.bankAccountId, bankAccountId),
      sql`${payments.paymentDate} >= ${startDate}`,
      sql`${payments.paymentDate} <= ${endDate}`
    ));

    // Process payments
    for (const row of paymentsData) {
      const payment = row.payment;
      const transaction = row.payable || row.receivable;
      const entity = row.supplier || row.customer;
      
      if (!transaction) continue;

      entries.push({
        date: payment.paymentDate,
        type: payment.transactionType === 'payable' ? 'D' : 'C',
        description: transaction.description || 'Pagamento/Recebimento',
        entityName: entity?.razaoSocial || null,
        accountCode: row.chartAccount?.code || null,
        accountName: row.chartAccount?.name || null,
        costCenterCode: row.costCenter?.code || null,
        costCenterName: row.costCenter?.name || null,
        documentNumber: transaction.documentNumber || null,
        amount: payment.amount,
        balance: '0', // Will calculate later
        transactionId: payment.id,
        transactionType: payment.transactionType === 'payable' ? 'payment_out' : 'payment_in',
      });
    }

    // 2. Fetch all transfers involving this bank account
    const transfersData = await db.select({
      transfer: bankTransfers,
      fromAccount: {
        id: bankAccounts.id,
        name: bankAccounts.name,
      },
      toAccount: sql`to_acc`.as('toAccount'),
    })
    .from(bankTransfers)
    .leftJoin(bankAccounts, eq(bankTransfers.fromAccountId, bankAccounts.id))
    .leftJoin(sql`${bankAccounts} as to_acc`, sql`${bankTransfers.toAccountId} = to_acc.id`)
    .where(and(
      eq(bankTransfers.userId, userId),
      sql`(${bankTransfers.fromAccountId} = ${bankAccountId} OR ${bankTransfers.toAccountId} = ${bankAccountId})`,
      sql`${bankTransfers.transferDate} >= ${startDate}`,
      sql`${bankTransfers.transferDate} <= ${endDate}`
    ));

    // Process transfers
    for (const row of transfersData) {
      const transfer = row.transfer;
      const isOutgoing = transfer.fromAccountId === bankAccountId;
      
      entries.push({
        date: transfer.transferDate,
        type: isOutgoing ? 'D' : 'C',
        description: transfer.description || (isOutgoing ? 'Transferência enviada' : 'Transferência recebida'),
        entityName: null,
        accountCode: null,
        accountName: null,
        costCenterCode: null,
        costCenterName: null,
        documentNumber: null,
        amount: transfer.amount,
        balance: '0', // Will calculate later
        transactionId: transfer.id,
        transactionType: isOutgoing ? 'transfer_out' : 'transfer_in',
      });
    }

    // 3. Sort by date
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 4. Calculate progressive balance
    let runningBalance = parseFloat(bankAccount.initialBalance || '0');
    for (const entry of entries) {
      const amount = parseFloat(entry.amount);
      if (entry.type === 'C') {
        runningBalance += amount;
      } else {
        runningBalance -= amount;
      }
      entry.balance = runningBalance.toFixed(2);
    }

    return entries;
  }

  // Get all cost allocations for a user
  async getCostAllocations(userId: string): Promise<CostAllocation[]> {
    return await db.select().from(costAllocations).where(eq(costAllocations.userId, userId));
  }

  // Delete all transactions (preserving master data)
  async deleteAllTransactions(userId: string): Promise<void> {
    // Delete in correct order to respect foreign key constraints
    
    // 1. Delete cost allocations
    await db.delete(costAllocations).where(eq(costAllocations.userId, userId));
    
    // 2. Delete payments
    await db.delete(payments).where(eq(payments.userId, userId));
    
    // 3. Delete bank transfers
    await db.delete(bankTransfers).where(eq(bankTransfers.userId, userId));
    
    // 4. Delete accounts payable
    await db.delete(accountsPayable).where(eq(accountsPayable.userId, userId));
    
    // 5. Delete accounts receivable
    await db.delete(accountsReceivable).where(eq(accountsReceivable.userId, userId));
    
    // 6. Delete activities
    await db.delete(activities).where(eq(activities.userId, userId));
    
    // 7. Reset bank account balances
    await db.update(bankAccounts)
      .set({ 
        currentBalance: '0.00',
        updatedAt: new Date()
      })
      .where(eq(bankAccounts.userId, userId));
  }
}

export const storage = new DatabaseStorage();
