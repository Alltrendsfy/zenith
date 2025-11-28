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

// Enums - Must be defined before tables that use them
export const userRoleEnum = pgEnum('user_role', ['admin', 'gerente', 'financeiro', 'operacional', 'visualizador']);
export const accountTypeEnum = pgEnum('account_type', ['receita', 'despesa', 'ativo', 'passivo']);
export const accountNatureEnum = pgEnum('account_nature', ['analitica', 'sintetica']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pendente', 'pago', 'parcial', 'cancelado', 'vencido']);
export const paymentIntervalEnum = pgEnum('payment_interval', ['mensal', 'quinzenal', 'semanal', 'personalizado']);
export const transactionTypeEnum = pgEnum('transaction_type', ['payable', 'receivable']);
export const personTypeEnum = pgEnum('person_type', ['fisica', 'juridica']);
export const recurrenceTypeEnum = pgEnum('recurrence_type', ['unica', 'mensal', 'trimestral', 'anual']);
export const recurrenceStatusEnum = pgEnum('recurrence_status', ['ativa', 'pausada', 'concluida']);
export const activityScopeEnum = pgEnum('activity_scope', ['empresarial', 'pessoal']);
export const activityStatusEnum = pgEnum('activity_status', ['pendente', 'concluida']);
export const activityPriorityEnum = pgEnum('activity_priority', ['baixa', 'media', 'alta']);
export const paymentMethodEnum = pgEnum('payment_method', ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia', 'cheque', 'outros']);

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
  username: varchar("username").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default("admin").notNull(),
  isActive: boolean("is_active").default(true),
  temporaryPassword: varchar("temporary_password"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertUserSchema = z.object({
  email: z.string().email("Email inválido"),
  username: z.string().min(3, "Login deve ter no mínimo 3 caracteres").regex(/^[a-zA-Z0-9_]+$/, "Login deve conter apenas letras, números e underscore"),
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  phone: z.string().min(10, "Telefone deve ter no mínimo 10 dígitos"),
  role: z.enum(['admin', 'gerente', 'financeiro', 'operacional', 'visualizador'], {
    required_error: "Role é obrigatória",
  }),
  isActive: z.boolean().default(true),
  temporaryPassword: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const updateUserSchema = z.object({
  email: z.string().email("Email inválido").optional(),
  username: z.string().min(3, "Login deve ter no mínimo 3 caracteres").regex(/^[a-zA-Z0-9_]+$/, "Login deve conter apenas letras, números e underscore").optional(),
  firstName: z.string().min(1, "Nome é obrigatório").optional(),
  lastName: z.string().min(1, "Sobrenome é obrigatório").optional(),
  phone: z.string().min(10, "Telefone deve ter no mínimo 10 dígitos").optional(),
  role: z.enum(['admin', 'gerente', 'financeiro', 'operacional', 'visualizador']).optional(),
  isActive: z.boolean().optional(),
  temporaryPassword: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

// Activities (Atividades/Agenda)
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  scope: activityScopeEnum("scope").notNull().default('pessoal'),
  status: activityStatusEnum("status").notNull().default('pendente'),
  priority: activityPriorityEnum("priority").notNull().default('media'),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at"),
  allDay: boolean("all_day").default(false),
  relatedEntityType: varchar("related_entity_type", { length: 50 }),
  relatedEntityId: varchar("related_entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_activities_user_id").on(table.userId),
  index("idx_activities_start_at").on(table.startAt),
  index("idx_activities_status").on(table.status),
]);

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startAt: z.string().or(z.date()).transform(val => typeof val === 'string' ? new Date(val) : val),
  endAt: z.string().or(z.date()).nullable().transform(val => {
    if (!val) return null;
    return typeof val === 'string' ? new Date(val) : val;
  }),
});

export const updateActivitySchema = insertActivitySchema.partial();

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

// Suppliers (Fornecedores)
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  personType: personTypeEnum("person_type").notNull().default('juridica'),
  cnpjCpf: varchar("cnpj_cpf", { length: 18 }),
  razaoSocial: varchar("razao_social", { length: 255 }).notNull(),
  nomeFantasia: varchar("nome_fantasia", { length: 255 }),
  email: varchar("email", { length: 255 }),
  telefone: varchar("telefone", { length: 20 }),
  celular: varchar("celular", { length: 20 }),
  cep: varchar("cep", { length: 10 }),
  endereco: varchar("endereco", { length: 500 }),
  numero: varchar("numero", { length: 20 }),
  complemento: varchar("complemento", { length: 100 }),
  bairro: varchar("bairro", { length: 100 }),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  pais: varchar("pais", { length: 100 }).default('Brasil'),
  website: varchar("website", { length: 255 }),
  instagram: varchar("instagram", { length: 100 }),
  facebook: varchar("facebook", { length: 100 }),
  linkedin: varchar("linkedin", { length: 100 }),
  observacoes: text("observacoes"),
  banco: varchar("banco", { length: 100 }),
  agencia: varchar("agencia", { length: 20 }),
  contaCorrente: varchar("conta_corrente", { length: 30 }),
  chavePix: varchar("chave_pix", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_suppliers_user_id").on(table.userId),
  index("idx_suppliers_cnpj_cpf").on(table.cnpjCpf),
]);

export const suppliersRelations = relations(suppliers, ({ one }) => ({
  user: one(users, {
    fields: [suppliers.userId],
    references: [users.id],
  }),
}));

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

// Customers (Clientes)
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  personType: personTypeEnum("person_type").notNull().default('fisica'),
  cnpjCpf: varchar("cnpj_cpf", { length: 18 }),
  razaoSocial: varchar("razao_social", { length: 255 }).notNull(),
  nomeFantasia: varchar("nome_fantasia", { length: 255 }),
  email: varchar("email", { length: 255 }),
  telefone: varchar("telefone", { length: 20 }),
  celular: varchar("celular", { length: 20 }),
  cep: varchar("cep", { length: 10 }),
  endereco: varchar("endereco", { length: 500 }),
  numero: varchar("numero", { length: 20 }),
  complemento: varchar("complemento", { length: 100 }),
  bairro: varchar("bairro", { length: 100 }),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  pais: varchar("pais", { length: 100 }).default('Brasil'),
  website: varchar("website", { length: 255 }),
  instagram: varchar("instagram", { length: 100 }),
  facebook: varchar("facebook", { length: 100 }),
  linkedin: varchar("linkedin", { length: 100 }),
  observacoes: text("observacoes"),
  banco: varchar("banco", { length: 100 }),
  agencia: varchar("agencia", { length: 20 }),
  contaCorrente: varchar("conta_corrente", { length: 30 }),
  chavePix: varchar("chave_pix", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_customers_user_id").on(table.userId),
  index("idx_customers_cnpj_cpf").on(table.cnpjCpf),
]);

export const customersRelations = relations(customers, ({ one }) => ({
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),
}));

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

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
  userId: true,
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
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCostCenterSchema = z.object({
  code: z.string().min(1, "Código é obrigatório").optional(),
  name: z.string().min(1, "Nome é obrigatório").optional(),
  parentId: z.string().nullable().optional(),
  level: z.number().optional(),
  isActive: z.boolean().optional(),
  description: z.string().nullable().optional(),
});

export type CostCenter = typeof costCenters.$inferSelect;
export type InsertCostCenter = z.infer<typeof insertCostCenterSchema>;
export type UpdateCostCenter = z.infer<typeof updateCostCenterSchema>;

// User Cost Centers - Many-to-many relationship between users and cost centers
export const userCostCenters = pgTable("user_cost_centers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  costCenterId: varchar("cost_center_id").notNull().references(() => costCenters.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_cost_centers_user_id").on(table.userId),
  index("idx_user_cost_centers_cost_center_id").on(table.costCenterId),
]);

export const userCostCentersRelations = relations(userCostCenters, ({ one }) => ({
  user: one(users, {
    fields: [userCostCenters.userId],
    references: [users.id],
  }),
  costCenter: one(costCenters, {
    fields: [userCostCenters.costCenterId],
    references: [costCenters.id],
  }),
}));

export type UserCostCenter = typeof userCostCenters.$inferSelect;

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
  initialBalanceDate: date("initial_balance_date"),
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
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateBankAccountSchema = createInsertSchema(bankAccounts).pick({
  name: true,
  bankName: true,
  bankCode: true,
  agency: true,
  accountNumber: true,
  description: true,
}).partial();

export const updateBankAccountBalanceSchema = createInsertSchema(bankAccounts).pick({
  name: true,
  bankName: true,
  bankCode: true,
  agency: true,
  accountNumber: true,
  description: true,
  initialBalance: true,
  initialBalanceDate: true,
}).partial();

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type UpdateBankAccount = z.infer<typeof updateBankAccountSchema>;
export type UpdateBankAccountBalance = z.infer<typeof updateBankAccountBalanceSchema>;

// Accounts Payable (Contas a Pagar)
export const accountsPayable = pgTable("accounts_payable", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  description: varchar("description", { length: 500 }).notNull(),
  supplierId: varchar("supplier_id").references(() => suppliers.id, { onDelete: 'set null' }),
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
  attachmentUrl: varchar("attachment_url", { length: 500 }),
  attachmentFilename: varchar("attachment_filename", { length: 255 }),
  // Parcelamento
  installmentNumber: integer("installment_number"),
  totalInstallments: integer("total_installments"),
  parentPayableId: varchar("parent_payable_id"),
  // Recorrência
  recurrenceType: recurrenceTypeEnum("recurrence_type").default('unica'),
  recurrenceStatus: recurrenceStatusEnum("recurrence_status"),
  recurrenceStartDate: date("recurrence_start_date"),
  recurrenceEndDate: date("recurrence_end_date"),
  recurrenceNextDate: date("recurrence_next_date"),
  recurrenceParentId: varchar("recurrence_parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_accounts_payable_user_id").on(table.userId),
  index("idx_accounts_payable_supplier_id").on(table.supplierId),
  index("idx_accounts_payable_due_date").on(table.dueDate),
  index("idx_accounts_payable_status").on(table.status),
  index("idx_accounts_payable_recurrence_next").on(table.recurrenceNextDate),
]);

export const accountsPayableRelations = relations(accountsPayable, ({ one }) => ({
  user: one(users, {
    fields: [accountsPayable.userId],
    references: [users.id],
  }),
  supplier: one(suppliers, {
    fields: [accountsPayable.supplierId],
    references: [suppliers.id],
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
  userId: true,
  createdAt: true,
  updatedAt: true,
}).refine((data) => data.costCenterId && data.costCenterId.trim() !== '', {
  message: 'Centro de Custo é obrigatório',
  path: ['costCenterId'],
}).transform((data) => ({
  ...data,
  recurrenceStartDate: data.recurrenceStartDate === '' ? null : data.recurrenceStartDate,
  recurrenceEndDate: data.recurrenceEndDate === '' ? null : data.recurrenceEndDate,
  recurrenceNextDate: data.recurrenceNextDate === '' ? null : data.recurrenceNextDate,
}));

export const updateAccountsPayableSchema = createInsertSchema(accountsPayable).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial().transform((data) => ({
  ...data,
  recurrenceStartDate: data.recurrenceStartDate === '' ? null : data.recurrenceStartDate,
  recurrenceEndDate: data.recurrenceEndDate === '' ? null : data.recurrenceEndDate,
  recurrenceNextDate: data.recurrenceNextDate === '' ? null : data.recurrenceNextDate,
}));

export type AccountsPayable = typeof accountsPayable.$inferSelect;
export type InsertAccountsPayable = z.infer<typeof insertAccountsPayableSchema>;
export type UpdateAccountsPayable = z.infer<typeof updateAccountsPayableSchema>;

// Accounts Receivable (Contas a Receber)
export const accountsReceivable = pgTable("accounts_receivable", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  description: varchar("description", { length: 500 }).notNull(),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: 'set null' }),
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
  attachmentUrl: varchar("attachment_url", { length: 500 }),
  attachmentFilename: varchar("attachment_filename", { length: 255 }),
  // Parcelamento
  installmentNumber: integer("installment_number"),
  totalInstallments: integer("total_installments"),
  parentReceivableId: varchar("parent_receivable_id"),
  // Recorrência
  recurrenceType: recurrenceTypeEnum("recurrence_type").default('unica'),
  recurrenceStatus: recurrenceStatusEnum("recurrence_status"),
  recurrenceStartDate: date("recurrence_start_date"),
  recurrenceEndDate: date("recurrence_end_date"),
  recurrenceNextDate: date("recurrence_next_date"),
  recurrenceParentId: varchar("recurrence_parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_accounts_receivable_user_id").on(table.userId),
  index("idx_accounts_receivable_customer_id").on(table.customerId),
  index("idx_accounts_receivable_due_date").on(table.dueDate),
  index("idx_accounts_receivable_status").on(table.status),
  index("idx_accounts_receivable_recurrence_next").on(table.recurrenceNextDate),
]);

export const accountsReceivableRelations = relations(accountsReceivable, ({ one }) => ({
  user: one(users, {
    fields: [accountsReceivable.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [accountsReceivable.customerId],
    references: [customers.id],
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
  userId: true,
  createdAt: true,
  updatedAt: true,
}).refine((data) => data.costCenterId && data.costCenterId.trim() !== '', {
  message: 'Centro de Custo é obrigatório',
  path: ['costCenterId'],
}).transform((data) => ({
  ...data,
  recurrenceStartDate: data.recurrenceStartDate === '' ? null : data.recurrenceStartDate,
  recurrenceEndDate: data.recurrenceEndDate === '' ? null : data.recurrenceEndDate,
  recurrenceNextDate: data.recurrenceNextDate === '' ? null : data.recurrenceNextDate,
}));

export const updateAccountsReceivableSchema = createInsertSchema(accountsReceivable).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type AccountsReceivable = typeof accountsReceivable.$inferSelect;
export type InsertAccountsReceivable = z.infer<typeof insertAccountsReceivableSchema>;
export type UpdateAccountsReceivable = z.infer<typeof updateAccountsReceivableSchema>;

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
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type BankTransfer = typeof bankTransfers.$inferSelect;
export type InsertBankTransfer = z.infer<typeof insertBankTransferSchema>;

// Cost Allocations (Rateio de Centros de Custo)
export const costAllocations = pgTable("cost_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  transactionId: varchar("transaction_id").notNull(),
  costCenterId: varchar("cost_center_id").notNull().references(() => costCenters.id, { onDelete: 'cascade' }),
  percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_cost_allocations_user_id").on(table.userId),
  index("idx_cost_allocations_transaction").on(table.transactionType, table.transactionId),
  index("idx_cost_allocations_cost_center").on(table.costCenterId),
]);

export const costAllocationsRelations = relations(costAllocations, ({ one }) => ({
  user: one(users, {
    fields: [costAllocations.userId],
    references: [users.id],
  }),
  costCenter: one(costCenters, {
    fields: [costAllocations.costCenterId],
    references: [costCenters.id],
  }),
}));

export const insertCostAllocationSchema = createInsertSchema(costAllocations).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type CostAllocation = typeof costAllocations.$inferSelect;
export type InsertCostAllocation = z.infer<typeof insertCostAllocationSchema>;

// Payments (Pagamentos/Baixas) - Registro de liquidação de contas a pagar/receber
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  transactionId: varchar("transaction_id").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  bankAccountId: varchar("bank_account_id").references(() => bankAccounts.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_payments_user_id").on(table.userId),
  index("idx_payments_transaction").on(table.transactionType, table.transactionId),
  index("idx_payments_bank_account").on(table.bankAccountId),
  index("idx_payments_date").on(table.paymentDate),
]);

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  bankAccount: one(bankAccounts, {
    fields: [payments.bankAccountId],
    references: [bankAccounts.id],
  }),
}));

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Companies (Empresas)
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  razaoSocial: varchar("razao_social", { length: 255 }).notNull(),
  nomeFantasia: varchar("nome_fantasia", { length: 255 }),
  cnpj: varchar("cnpj", { length: 18 }),
  inscricaoEstadual: varchar("inscricao_estadual", { length: 50 }),
  inscricaoMunicipal: varchar("inscricao_municipal", { length: 50 }),
  email: varchar("email", { length: 255 }),
  telefone: varchar("telefone", { length: 20 }),
  website: varchar("website", { length: 255 }),
  cep: varchar("cep", { length: 10 }),
  endereco: varchar("endereco", { length: 500 }),
  numero: varchar("numero", { length: 20 }),
  complemento: varchar("complemento", { length: 100 }),
  bairro: varchar("bairro", { length: 100 }),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  logoUrl: varchar("logo_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_companies_user_id").on(table.userId),
]);

export const companiesRelations = relations(companies, ({ one }) => ({
  user: one(users, {
    fields: [companies.userId],
    references: [users.id],
  }),
}));

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCompanySchema = insertCompanySchema.partial();

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

// Backup History
export const backupHistory = pgTable("backup_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileSize: integer("file_size"),
  tablesIncluded: text("tables_included").array(),
  recordsCount: integer("records_count"),
  status: varchar("status", { length: 50 }).default('completed'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_backup_history_user_id").on(table.userId),
  index("idx_backup_history_created_at").on(table.createdAt),
]);

export const backupHistoryRelations = relations(backupHistory, ({ one }) => ({
  user: one(users, {
    fields: [backupHistory.userId],
    references: [users.id],
  }),
}));

export const insertBackupHistorySchema = createInsertSchema(backupHistory).omit({
  id: true,
  createdAt: true,
});

export type BackupHistory = typeof backupHistory.$inferSelect;
export type InsertBackupHistory = z.infer<typeof insertBackupHistorySchema>;

// DRE (Demonstração de Resultado do Exercício) Types
export interface DRELineItem {
  accountId?: string;
  accountCode?: string;
  accountName: string;
  amount: number;
  percentage?: number; // Percentual sobre receita total
  children?: DRELineItem[]; // Para contas hierárquicas
}

export interface DRESection {
  title: string;
  items: DRELineItem[];
  total: number;
  percentage?: number;
}

export interface DREReport {
  period: {
    startDate: string;
    endDate: string;
  };
  costCenterId?: string;
  costCenterName?: string;
  revenues: DRESection;
  expenses: DRESection;
  result: {
    grossProfit: number; // Receitas - Despesas
    grossProfitPercentage: number;
  };
  generatedAt: string;
}

export interface DREFilters {
  startDate: string;
  endDate: string;
  costCenterId?: string;
}

export interface DREComparison {
  current: DREReport;
  previous: DREReport;
  variance: {
    revenues: number;
    revenuesPercentage: number;
    expenses: number;
    expensesPercentage: number;
    result: number;
    resultPercentage: number;
  };
}
