import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - Required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 50 }).default("user"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Enums
export const accountTypeEnum = pgEnum('account_type', ['receita', 'despesa', 'ativo', 'passivo']);
export const accountNatureEnum = pgEnum('account_nature', ['analitica', 'sintetica']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pendente', 'pago', 'parcial', 'cancelado', 'vencido']);
export const paymentIntervalEnum = pgEnum('payment_interval', ['mensal', 'quinzenal', 'semanal', 'personalizado']);

// Chart of Accounts (Plano de Contas)
export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  code: varchar("code", { length: 50 }).notNull(),
  quickCode: varchar("quick_code", { length: 20 }),
  name: varchar("name", { length: 255 }).notNull(),
  type: accountTypeEnum("type").notNull(),
  nature: accountNatureEnum("nature").notNull(),
  parentId: varchar("parent_id"),
  level: integer("level").notNull().default(1),
  isActive: boolean("is_active").default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_chart_of_accounts_user_id").on(table.userId),
  index("idx_chart_of_accounts_code").on(table.code),
  index("idx_chart_of_accounts_quick_code").on(table.quickCode),
]);

export const chartOfAccountsRelations = relations(chartOfAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [chartOfAccounts.userId],
    references: [users.id],
  }),
  parent: one(chartOfAccounts, {
    fields: [chartOfAccounts.parentId],
    references: [chartOfAccounts.id],
    relationName: "accountHierarchy"
  }),
  children: many(chartOfAccounts, { relationName: "accountHierarchy" }),
}));

export const insertChartOfAccountsSchema = createInsertSchema(chartOfAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ChartOfAccounts = typeof chartOfAccounts.$inferSelect;
export type InsertChartOfAccounts = z.infer<typeof insertChartOfAccountsSchema>;

// Cost Centers (Centros de Custo)
export const costCenters = pgTable("cost_centers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: varchar("parent_id"),
  level: integer("level").notNull().default(1),
  isActive: boolean("is_active").default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_cost_centers_user_id").on(table.userId),
  index("idx_cost_centers_code").on(table.code),
]);

export const costCentersRelations = relations(costCenters, ({ one, many }) => ({
  user: one(users, {
    fields: [costCenters.userId],
    references: [users.id],
  }),
  parent: one(costCenters, {
    fields: [costCenters.parentId],
    references: [costCenters.id],
    relationName: "costCenterHierarchy"
  }),
  children: many(costCenters, { relationName: "costCenterHierarchy" }),
}));

export const insertCostCenterSchema = createInsertSchema(costCenters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CostCenter = typeof costCenters.$inferSelect;
export type InsertCostCenter = z.infer<typeof insertCostCenterSchema>;

// Bank Accounts (Contas Bancárias)
export const bankAccounts = pgTable("bank_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  bankName: varchar("bank_name", { length: 255 }),
  bankCode: varchar("bank_code", { length: 10 }),
  agency: varchar("agency", { length: 20 }),
  accountNumber: varchar("account_number", { length: 50 }),
  balance: decimal("balance", { precision: 15, scale: 2 }).default('0.00'),
  initialBalance: decimal("initial_balance", { precision: 15, scale: 2 }).default('0.00'),
  isActive: boolean("is_active").default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_bank_accounts_user_id").on(table.userId),
]);

export const bankAccountsRelations = relations(bankAccounts, ({ one }) => ({
  user: one(users, {
    fields: [bankAccounts.userId],
    references: [users.id],
  }),
}));

export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;

// Accounts Payable (Contas a Pagar)
export const accountsPayable = pgTable("accounts_payable", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  description: varchar("description", { length: 500 }).notNull(),
  supplierName: varchar("supplier_name", { length: 255 }),
  accountId: varchar("account_id").references(() => chartOfAccounts.id),
  costCenterId: varchar("cost_center_id").references(() => costCenters.id),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 15, scale: 2 }).default('0.00'),
  dueDate: date("due_date").notNull(),
  issueDate: date("issue_date").notNull(),
  status: transactionStatusEnum("status").default('pendente'),
  bankAccountId: varchar("bank_account_id").references(() => bankAccounts.id),
  documentNumber: varchar("document_number", { length: 100 }),
  notes: text("notes"),
  // Parcelamento
  installmentNumber: integer("installment_number"),
  totalInstallments: integer("total_installments"),
  parentPayableId: varchar("parent_payable_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_accounts_payable_user_id").on(table.userId),
  index("idx_accounts_payable_due_date").on(table.dueDate),
  index("idx_accounts_payable_status").on(table.status),
]);

export const accountsPayableRelations = relations(accountsPayable, ({ one }) => ({
  user: one(users, {
    fields: [accountsPayable.userId],
    references: [users.id],
  }),
  account: one(chartOfAccounts, {
    fields: [accountsPayable.accountId],
    references: [chartOfAccounts.id],
  }),
  costCenter: one(costCenters, {
    fields: [accountsPayable.costCenterId],
    references: [costCenters.id],
  }),
  bankAccount: one(bankAccounts, {
    fields: [accountsPayable.bankAccountId],
    references: [bankAccounts.id],
  }),
}));

export const insertAccountsPayableSchema = createInsertSchema(accountsPayable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AccountsPayable = typeof accountsPayable.$inferSelect;
export type InsertAccountsPayable = z.infer<typeof insertAccountsPayableSchema>;

// Accounts Receivable (Contas a Receber)
export const accountsReceivable = pgTable("accounts_receivable", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  description: varchar("description", { length: 500 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }),
  accountId: varchar("account_id").references(() => chartOfAccounts.id),
  costCenterId: varchar("cost_center_id").references(() => costCenters.id),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  amountReceived: decimal("amount_received", { precision: 15, scale: 2 }).default('0.00'),
  dueDate: date("due_date").notNull(),
  issueDate: date("issue_date").notNull(),
  status: transactionStatusEnum("status").default('pendente'),
  bankAccountId: varchar("bank_account_id").references(() => bankAccounts.id),
  documentNumber: varchar("document_number", { length: 100 }),
  notes: text("notes"),
  // Parcelamento
  installmentNumber: integer("installment_number"),
  totalInstallments: integer("total_installments"),
  parentReceivableId: varchar("parent_receivable_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_accounts_receivable_user_id").on(table.userId),
  index("idx_accounts_receivable_due_date").on(table.dueDate),
  index("idx_accounts_receivable_status").on(table.status),
]);

export const accountsReceivableRelations = relations(accountsReceivable, ({ one }) => ({
  user: one(users, {
    fields: [accountsReceivable.userId],
    references: [users.id],
  }),
  account: one(chartOfAccounts, {
    fields: [accountsReceivable.accountId],
    references: [chartOfAccounts.id],
  }),
  costCenter: one(costCenters, {
    fields: [accountsReceivable.costCenterId],
    references: [costCenters.id],
  }),
  bankAccount: one(bankAccounts, {
    fields: [accountsReceivable.bankAccountId],
    references: [bankAccounts.id],
  }),
}));

export const insertAccountsReceivableSchema = createInsertSchema(accountsReceivable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AccountsReceivable = typeof accountsReceivable.$inferSelect;
export type InsertAccountsReceivable = z.infer<typeof insertAccountsReceivableSchema>;

// Bank Transfers (Transferências Bancárias)
export const bankTransfers = pgTable("bank_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  fromAccountId: varchar("from_account_id").notNull().references(() => bankAccounts.id),
  toAccountId: varchar("to_account_id").notNull().references(() => bankAccounts.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  transferDate: date("transfer_date").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_bank_transfers_user_id").on(table.userId),
  index("idx_bank_transfers_date").on(table.transferDate),
]);

export const bankTransfersRelations = relations(bankTransfers, ({ one }) => ({
  user: one(users, {
    fields: [bankTransfers.userId],
    references: [users.id],
  }),
  fromAccount: one(bankAccounts, {
    fields: [bankTransfers.fromAccountId],
    references: [bankAccounts.id],
    relationName: "fromAccount"
  }),
  toAccount: one(bankAccounts, {
    fields: [bankTransfers.toAccountId],
    references: [bankAccounts.id],
    relationName: "toAccount"
  }),
}));

export const insertBankTransferSchema = createInsertSchema(bankTransfers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type BankTransfer = typeof bankTransfers.$inferSelect;
export type InsertBankTransfer = z.infer<typeof insertBankTransferSchema>;
