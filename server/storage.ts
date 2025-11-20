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
  bankAccounts,
  accountsPayable,
  accountsReceivable,
  chartOfAccounts,
  costCenters,
  bankTransfers,
  costAllocations,
  suppliers,
  customers,
  activities,
  payments,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: 'admin' | 'gerente' | 'financeiro' | 'visualizador'): Promise<User | undefined>;
  toggleUserStatus(userId: string, isActive: boolean): Promise<User | undefined>;

  // Bank Accounts
  getBankAccounts(userId: string): Promise<BankAccount[]>;
  getBankAccount(id: string, userId: string): Promise<BankAccount | undefined>;
  createBankAccount(account: InsertBankAccount): Promise<BankAccount>;
  updateBankAccount(id: string, userId: string, data: Partial<InsertBankAccount>): Promise<BankAccount | undefined>;
  deleteBankAccount(id: string, userId: string): Promise<boolean>;

  // Accounts Payable
  getAccountsPayable(userId: string): Promise<AccountsPayable[]>;
  getAccountPayable(id: string, userId: string): Promise<AccountsPayable | undefined>;
  createAccountPayable(account: InsertAccountsPayable): Promise<AccountsPayable>;
  updateAccountPayable(id: string, userId: string, data: Partial<InsertAccountsPayable>): Promise<AccountsPayable | undefined>;
  deleteAccountPayable(id: string, userId: string): Promise<boolean>;

  // Accounts Receivable
  getAccountsReceivable(userId: string): Promise<AccountsReceivable[]>;
  getAccountReceivable(id: string, userId: string): Promise<AccountsReceivable | undefined>;
  createAccountReceivable(account: InsertAccountsReceivable): Promise<AccountsReceivable>;
  updateAccountReceivable(id: string, userId: string, data: Partial<InsertAccountsReceivable>): Promise<AccountsReceivable | undefined>;
  deleteAccountReceivable(id: string, userId: string): Promise<boolean>;

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
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(userId: string, role: 'admin' | 'gerente' | 'financeiro' | 'visualizador'): Promise<User | undefined> {
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
    const result = await db.delete(bankAccounts).where(and(eq(bankAccounts.id, id), eq(bankAccounts.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Accounts Payable
  async getAccountsPayable(userId: string): Promise<AccountsPayable[]> {
    return await db.select().from(accountsPayable).where(eq(accountsPayable.userId, userId)).orderBy(desc(accountsPayable.dueDate));
  }

  async getAccountPayable(id: string, userId: string): Promise<AccountsPayable | undefined> {
    const [account] = await db.select().from(accountsPayable).where(and(eq(accountsPayable.id, id), eq(accountsPayable.userId, userId)));
    return account;
  }

  async createAccountPayable(account: InsertAccountsPayable): Promise<AccountsPayable> {
    const [created] = await db.insert(accountsPayable).values(account).returning();
    return created;
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
  async getAccountsReceivable(userId: string): Promise<AccountsReceivable[]> {
    return await db.select().from(accountsReceivable).where(eq(accountsReceivable.userId, userId)).orderBy(desc(accountsReceivable.dueDate));
  }

  async getAccountReceivable(id: string, userId: string): Promise<AccountsReceivable | undefined> {
    const [account] = await db.select().from(accountsReceivable).where(and(eq(accountsReceivable.id, id), eq(accountsReceivable.userId, userId)));
    return account;
  }

  async createAccountReceivable(account: InsertAccountsReceivable): Promise<AccountsReceivable> {
    const [created] = await db.insert(accountsReceivable).values(account).returning();
    return created;
  }

  async updateAccountReceivable(id: string, userId: string, data: Partial<InsertAccountsReceivable>): Promise<AccountsReceivable | undefined> {
    const [updated] = await db
      .update(accountsReceivable)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(accountsReceivable.id, id), eq(accountsReceivable.userId, userId)))
      .returning();
    return updated;
  }

  async deleteAccountReceivable(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(accountsReceivable).where(and(eq(accountsReceivable.id, id), eq(accountsReceivable.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
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

  async createCostCenter(center: InsertCostCenter): Promise<CostCenter> {
    const [created] = await db.insert(costCenters).values(center).returning();
    return created;
  }

  async updateCostCenter(id: string, userId: string, data: Partial<InsertCostCenter>): Promise<CostCenter | undefined> {
    const [updated] = await db
      .update(costCenters)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(costCenters.id, id), eq(costCenters.userId, userId)))
      .returning();
    return updated;
  }

  async deleteCostCenter(id: string, userId: string): Promise<boolean> {
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
    return await db.select().from(suppliers).where(eq(suppliers.userId, userId)).orderBy(desc(suppliers.createdAt));
  }

  async getSupplier(id: string, userId: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)));
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
    return await db.select().from(customers).where(eq(customers.userId, userId)).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string, userId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.userId, userId)));
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
}

export const storage = new DatabaseStorage();
