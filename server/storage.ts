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
  bankAccounts,
  accountsPayable,
  accountsReceivable,
  chartOfAccounts,
  costCenters,
  bankTransfers,
  costAllocations,
  suppliers,
  customers,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

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

  // Cost Centers
  getCostCenters(userId: string): Promise<CostCenter[]>;
  getCostCenter(id: string, userId: string): Promise<CostCenter | undefined>;
  createCostCenter(center: InsertCostCenter): Promise<CostCenter>;
  updateCostCenter(id: string, userId: string, data: Partial<InsertCostCenter>): Promise<CostCenter | undefined>;
  deleteCostCenter(id: string, userId: string): Promise<boolean>;

  // Bank Transfers
  getBankTransfers(userId: string): Promise<BankTransfer[]>;
  createBankTransfer(transfer: InsertBankTransfer): Promise<BankTransfer>;

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

  async createBankTransfer(transfer: InsertBankTransfer): Promise<BankTransfer> {
    const [created] = await db.insert(bankTransfers).values(transfer).returning();
    return created;
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
}

export const storage = new DatabaseStorage();
