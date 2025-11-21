# ZENITH ERP - Enterprise Resource Planning System

## Overview

ZENITH ERP is a web-based enterprise resource planning system focused on financial management and accounting. It provides tools for managing accounts payable/receivable, bank accounts, chart of accounts, and cost centers, complemented by an executive dashboard for real-time financial metrics. The system aims to offer comprehensive financial oversight, multi-user access, and secure authentication.

Key capabilities include:
- Comprehensive modules for Suppliers and Customers (Cadastros).
- Detailed Income Statement (DRE) reporting with period and cost center filtering.
- Advanced cost allocation system for proportional distribution of transactions across cost centers.
- Recurring payment functionality for Accounts Payable/Receivable.
- **Payment Settlement System (Baixa)**: Complete payment tracking with partial/full payments, multiple payment methods (PIX, cash, cards, bank transfer, boleto, cheque), optional bank account association, and automatic status updates.
- **Agenda module** for tracking business and personal activities with daily/weekly/monthly views, priority management, and status toggles.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with **React 18** and **TypeScript** using **Vite**.
- **UI Component System**: Shadcn/ui (New York style) based on Radix UI, customized with **Tailwind CSS** for theming, adhering to Material Design 3 and Fluent Design principles.
- **Routing**: **Wouter** for client-side routing with code splitting.
- **State Management**: **TanStack Query** for server state.
- **Form Handling**: **React Hook Form** with **Zod** validation.
- **Styling**: Tailwind CSS, CSS variables for theming, custom typography (Inter, JetBrains Mono).
- **Mobile Responsiveness**: Mobile-first design with specific breakpoints, bottom navigation, adaptive card lists, and sticky form actions.
- **Key Design Decisions**: Information-dense, minimal click workflows, professional aesthetic, consistent component patterns, and mobile-first approach.

### Backend Architecture

The backend utilizes **Node.js** with **Express.js** and **TypeScript** (ES modules).
- **API Pattern**: RESTful API with session-based authentication under `/api` prefix.
- **Request Processing**: JSON and URL-encoded body parsing, request/response logging, and automatic error handling.
- **Development/Production**: `tsx` for development, `esbuild` for production bundling.
- **Key Architectural Decisions**: Session-based auth for server-side control, middleware pattern, and route registration via `registerRoutes`.

### Data Layer

The data layer uses **Drizzle ORM** with **PostgreSQL** dialect via **Neon serverless** driver.
- **Schema**: Centralized schema definitions in `shared/schema.ts` with type inference.
- **Database Tables**: `sessions`, `users`, `bank_accounts`, `accounts_payable`, `accounts_receivable`, `chart_of_accounts`, `cost_centers`, `bank_transfers`, `cost_allocations`, `payments`, `activities`, and `companies`.
- **Payment Methods Enum**: PIX, dinheiro (cash), cartao_credito, cartao_debito, transferencia, boleto, cheque, outros.
- **Schema Patterns**: PostgreSQL enums, `createdAt`/`updatedAt` timestamps, UUID primary keys, Drizzle-Zod integration, hierarchical structures via `parentId`, and decimal types for financial amounts.
- **Key Design Decisions**: Drizzle for type-safe SQL, shared schema for consistency, hierarchical structures, decimal types, and Zod transformations for nullable fields.
- **Data Validation**: Zod schemas with `.transform()` to convert empty strings to `undefined` for optional fields, preventing FK constraint violations.

### Authentication & Authorization

Authentication is handled via **Replit OpenID Connect (OIDC)** using **Passport.js** and `openid-client`.
- **Session Management**: Express sessions with PostgreSQL storage via `connect-pg-simple`, 7-day TTL, HTTP-only, secure cookies.
- **User Flow**: Redirection to `/api/login`, OIDC flow, user claims stored in session, profile synced to `users` table.
- **Authorization**: `isAuthenticated` middleware for protected routes, user ID from session claims for data isolation.
- **User Roles**: Default role set to 'admin' for initial setup and testing convenience.
- **Key Design Decisions**: Session-based auth for simplicity, PostgreSQL session store, memoized OIDC config, and token refresh.

## Recent Changes (November 2025)

### Payment Settlement System (Baixa)
- **Implementation Date**: November 20, 2025
- **Tables Added**: `payments` table with FK to `bank_accounts`, `accounts_payable`, and `accounts_receivable`
- **Features**:
  - Partial and full payment recording
  - Eight payment methods supported
  - Optional bank account association
  - Automatic status calculation: "Pendente" → "Parcial" → "Pago"
  - Amount validation and remaining balance calculation
- **Technical Details**:
  - Frontend: `PaymentSettlementDialog` component with React Hook Form + Zod validation
  - Backend: Zod schema validation with empty string transformation
  - Storage: `createPayment`, `processPayableBaixa`, `processReceivableBaixa` methods
  - API Routes: `POST /api/accounts-payable/:id/baixa` and `POST /api/accounts-receivable/:id/baixa`
- **Testing**: End-to-end tested with partial payment (R$300) and final payment (R$500), verifying status transitions and optional bank account handling.

### Company Settings Module
- **Implementation Date**: November 20, 2025
- **Tables Added**: `companies` table with unique constraint on `userId` (one-to-one with users)
- **Features**:
  - Complete company registration: Razão Social, Nome Fantasia, CNPJ, tax IDs
  - Contact information: email, phone, website
  - Address fields: CEP, street, number, complement, neighborhood, city, state
  - Logo URL storage
  - **Access**: Available to admin and gerente roles
- **Technical Details**:
  - Frontend: `CompanySettings` page using shared `insertCompanySchema` with UI extensions for optional URL/email validation
  - Schema Pattern: Optional URL/email fields accept empty strings, transformed to undefined before submission
  - Backend: API routes validate with `insertCompanySchema` and `requireManager` middleware, add userId from session
  - Storage: `getCompany`, `upsertCompany` methods with unique constraint handling
  - API Routes: `GET /api/company`, `POST /api/company` (protected by `requireManager`)
  - Navigation: Integrated in Administration section of sidebar (Settings icon)
- **Bug Fixes**: Fixed `upsertUser` method to prevent unique constraint violations during login by checking for existing user ID before insert
- **Testing**: End-to-end tested with create/update workflows, empty optional fields, and URL field validation.

### Manager Role Permissions Update
- **Implementation Date**: November 20, 2025
- **Changes Made**:
  - Extended gerente (manager) role permissions to match admin capabilities for administrative functions
  - **canManageUsers**: Changed from `false` to `true` for gerente role in both frontend (`usePermissions.ts`) and backend (`permissions.ts`)
  - Updated sidebar visibility: ADMINISTRAÇÃO section now visible to both admin and gerente (`isManager` check)
  - Updated API route protection: All company and user management routes now use `requireManager` middleware instead of `requireAdmin`
- **Affected Functionality**:
  - **Dados da Empresa (Company Settings)**: Now accessible to gerente users
  - **Gerenciar Usuários (User Management)**: Now accessible to gerente users for full CRUD operations on user roles and status
- **Technical Details**:
  - Frontend: `app-sidebar.tsx` uses `isManager` (admin OR gerente) instead of `isAdmin`
  - Backend Routes: `GET/POST /api/company`, `GET /api/users`, `PATCH /api/users/:id/role`, `PATCH /api/users/:id/status` protected by `requireManager`
  - Permission Helper: `isManager` returns true for both admin and gerente roles
- **Testing**: End-to-end tested with gerente user login, verified sidebar visibility, company settings access/edit, and user management access/operations.

### Bank Statement Report (Extrato Bancário)
- **Implementation Date**: November 21, 2025
- **Features**:
  - Complete transaction history for bank accounts with progressive balance calculation
  - **Filters**: Bank account selection, date range (start/end date)
  - **Transaction Aggregation**: Combines payments from Accounts Payable (debits), Accounts Receivable (credits), and Bank Transfers
  - **Detailed Columns**: Date, C/D (Credit/Debit indicator), Description, Entity (Supplier/Customer), Chart of Account, Cost Center, Document Number, Amount, Progressive Balance
  - **Summary Totals**: Total Credits, Total Debits, Final Balance
  - **Print Functionality**: Print-optimized view for physical records
- **Technical Details**:
  - Frontend: `bank-statement.tsx` page with responsive design, filters using Shadcn Select and date inputs
  - Backend: `getBankStatement` storage method aggregating from `payments` and `bank_transfers` tables
  - API Route: `GET /api/reports/bank-statement?bankAccountId=X&startDate=Y&endDate=Z` with Zod validation (`bankStatementFiltersSchema`)
  - **Progressive Balance Logic**: Starts from initial bank account balance, chronologically sorts all transactions, subtracts debits, adds credits
  - **Data Aggregation**: LEFT JOINs to suppliers, customers, chart_of_accounts, cost_centers; UNION of payable/receivable payments with transfers
  - **Security**: Ownership verification via `getBankAccount(bankAccountId, userId)` ensures users only access their own data
  - **Data-testid Attributes**: Complete coverage on filters, table rows/cells, summary totals for automated testing
- **Bug Fixes**: Corrected `getBankAccount` parameter order in API route (was `userId, bankAccountId`, now correctly `bankAccountId, userId`)
- **Testing**: End-to-end automated test validates transaction display, progressive balance calculation (R$ 5.000,00 → R$ 3.800,00 → R$ 2.950,00), summary totals (R$ 2.050,00 debits), and print button functionality.

## External Dependencies

### Third-Party Services

- **Authentication**: Replit OpenID Connect (oidc.repl.co or replit.com/oidc).
- **Database**: PostgreSQL (Neon serverless).

### Key NPM Packages

- **UI & Components**: `@radix-ui/*`, `class-variance-authority`, `tailwindcss`, `lucide-react`, `recharts`, `date-fns`.
- **Data & State**: `@tanstack/react-query`, `react-hook-form`, `zod`, `drizzle-orm`, `drizzle-zod`.
- **Backend**: `express`, `passport`, `openid-client`, `express-session`, `connect-pg-simple`.
- **Development**: `vite`, `tsx`, `esbuild`.

### Environment Variables

- `DATABASE_URL` (Required): PostgreSQL connection string.
- `SESSION_SECRET` (Required): Session encryption key.
- `REPL_ID` (Required): Replit deployment identifier.
- `ISSUER_URL` (Required): OIDC issuer URL.
- `NODE_ENV` (Optional): Environment mode.