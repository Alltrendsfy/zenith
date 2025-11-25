# ZENITH ERP - Enterprise Resource Planning System

## Overview

ZENITH ERP is a web-based enterprise resource planning system focused on financial management and accounting, offering comprehensive tools for managing accounts payable/receivable, bank accounts, chart of accounts, and cost centers. It includes an executive dashboard for real-time financial metrics, multi-user access, and secure authentication. Key capabilities encompass detailed income statement reporting, advanced cost allocation, recurring payment functionality, a complete payment settlement system with various payment methods, and an agenda module for activity tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

Built with React 18 and TypeScript using Vite, the frontend employs Shadcn/ui (New York style) based on Radix UI, customized with Tailwind CSS for theming, adhering to Material Design 3 and Fluent Design principles. Wouter handles client-side routing, TanStack Query manages server state, and React Hook Form with Zod provides form handling and validation. The design prioritizes mobile-first responsiveness, information density, minimal click workflows, and a professional aesthetic.

### Backend Architecture

The backend is developed with Node.js, Express.js, and TypeScript (ES modules), providing a RESTful API with session-based authentication. It features JSON and URL-encoded body parsing, comprehensive logging, and automatic error handling. Development uses `tsx`, while production bundling is handled by `esbuild`. Architectural decisions emphasize a middleware pattern and organized route registration.

### Data Layer

Drizzle ORM with a PostgreSQL dialect, accessed via Neon serverless driver, forms the data layer. It uses centralized schema definitions with type inference, including tables for sessions, users, financial accounts, payments, activities, and company information. Key design choices include PostgreSQL enums, `createdAt`/`updatedAt` timestamps, UUID primary keys, and decimal types for financial amounts. Zod schemas with transformations ensure robust data validation and handle nullable fields.

### Authentication & Authorization

Authentication is managed via Replit OpenID Connect (OIDC) using Passport.js and `openid-client`. Express sessions, stored in PostgreSQL with `connect-pg-simple`, provide secure session management. Authorization is handled by `isAuthenticated` middleware for protected routes, with user IDs from session claims enforcing data isolation. 

**User Roles and Permissions:**
The system supports five distinct roles with hierarchical permissions:
- **Admin**: Full system access, user management, backup capabilities, sees all data across all cost centers
- **Gerente (Manager)**: Full system access except backups, user management, sees all data across all cost centers
- **Financeiro (Financial)**: Full CRUD + settlement on assigned cost centers, restricted to assigned cost center data
- **Operacional (Operational)**: Create and edit on assigned cost centers, NO settlement or delete, restricted to assigned cost center data
- **Visualizador (Viewer)**: View-only access to assigned cost center data

**Cost Center-Based Access Control:**
The system implements granular access control through cost center assignments:
- **userCostCenters table**: Many-to-many relationship linking users to authorized cost centers
- **Query-level filtering**: Backend automatically filters accounts payable/receivable queries based on user's assigned cost centers
- **Admin/Gerente bypass**: These roles see ALL transactions regardless of cost center assignments (getUserAllowedCostCenters returns null)
- **Role-based restrictions**: Restricted roles (financeiro, operacional, visualizador) only see transactions for their assigned cost centers
- **Optional cost center field**: costCenterId is optional in transactions; canAccessCostCenter allows null values to prevent blocking record creation

**Data Visibility Model:**
- **Admin and Gerente roles**: View ALL financial transactions (accounts payable/receivable) across the entire company, enabling comprehensive financial oversight and management.
- **Other roles (financeiro, operacional, visualizador)**: View only transactions associated with their assigned cost centers, maintaining strict data isolation for department-level work.
- **Master data (suppliers, customers, cost centers, chart of accounts)**: Remains user-scoped for all roles, allowing teams to maintain their own cadastros.

**Permission Matrix:**
| Permission | Admin | Gerente | Financeiro | Operacional | Visualizador |
|------------|-------|---------|------------|-------------|--------------|
| View All Data | ✓ | ✓ | ✗ | ✗ | ✗ |
| View Assigned Centers | N/A | N/A | ✓ | ✓ | ✓ |
| Create Transactions | ✓ | ✓ | ✓ | ✓ | ✗ |
| Edit Transactions | ✓ | ✓ | ✓ | ✓ | ✗ |
| Delete Transactions | ✓ | ✓ | ✓ | ✗ | ✗ |
| Settle Payments | ✓ | ✓ | ✓ | ✗ | ✗ |
| Manage Users | ✓ | ✓ | ✗ | ✗ | ✗ |
| System Backup | ✓ | ✗ | ✗ | ✗ | ✗ |

### Key Features

*   **Payment Settlement System (Baixa)**: Supports partial and full payments across eight methods, with optional bank account association and automatic status updates.
*   **Company Settings Module**: Allows complete company registration and contact information management, accessible to admin and gerente roles.
*   **Manager Role Permissions**: Gerente role now has expanded administrative permissions, mirroring admin capabilities for company and user management.
*   **Bank Statement Report**: Provides a complete transaction history for bank accounts with progressive balance calculation, date range filtering, and print functionality, aggregating data from payments and transfers.
*   **Sidebar Menu Reorganization**: Restructured navigation for improved UX, logical grouping of financial operations, master data management, and administration sections, utilizing Shadcn Collapsible components.
*   **Chart of Accounts Integration**: Optional "Conta Contábil" (Chart of Accounts) field added to Accounts Payable and Receivable forms, filtering for analytical accounts.
*   **Recurrence with Editable Preview**: User-defined quantity recurrence for monthly/quarterly/annual payments. RecurrencePreview component displays all installments in an editable table, allowing modification of individual due dates and amounts before saving. Batch creation endpoints (POST /api/accounts-payable/batch and /api/accounts-receivable/batch) create all installments atomically with proper parent-child linkage via recurrenceParentId/parentReceivableId.
*   **Bank Account Management**: Full edit and delete capabilities for bank accounts with data integrity protection. Edit functionality allows updating mutable fields (name, bank details, description) while preventing changes to financial balances. Delete validation prevents removal of accounts with associated transactions (payables, receivables, or transfers), displaying descriptive error messages in Portuguese. Dedicated `updateBankAccountSchema` ensures immutable fields cannot be modified post-creation.
*   **Cost Center Management**: Comprehensive edit and delete capabilities with hierarchical support and data integrity validation. Edit functionality allows updating all mutable fields (code, name, parentId, level, description) with automatic circular reference prevention. The `wouldCreateCycle` validation ensures hierarchical integrity by blocking attempts to create parent-child loops. Delete validation includes four specific checks: hierarchical children (blocks if cost center has child centers), cost allocations/rateios (primary association method), accounts payable, and accounts receivable. Each validation provides descriptive Portuguese error messages indicating the specific blocker and count. Both POST and PATCH routes sanitize empty strings and "none" values to null for optional fields. Frontend includes "Centro Pai (Opcional)" dropdown for hierarchical organization and displays backend error messages in toasts for clear user feedback.
*   **Timezone-Safe Date Handling**: Comprehensive date handling fixes ensure dates are stored and displayed correctly without timezone-related shifts. DatePicker component uses manual date formatting (`formatDateBR`) instead of date-fns to avoid timezone conversion issues. Calendar component has `showOutsideDays=false` to prevent accidentally selecting days from adjacent months. All date values are kept as ISO strings (yyyy-MM-dd) end-to-end from frontend to backend, with conversion only for display purposes.
*   **Accounts Payable Edit/Delete**: Full CRUD implementation with edit and delete capabilities. Edit functionality pre-loads existing data including allocations, uses `updateAccountsPayableSchema` for validation, and properly sanitizes foreign key fields (accountId, supplierId, bankAccountId, costCenterId) to prevent constraint violations. Delete functionality includes confirmation dialog and proper permission checks. Admin and gerente roles can edit/delete any payable; other roles can only modify their own records.
*   **Suppliers & Customers Enhanced Management**: Comprehensive cadastro modules with alphabetical sorting by razão social, real-time search filtering (razaoSocial, cnpjCpf, nomeFantasia, email), and duplicate validation by CPF/CNPJ. Bank data fields include banco, agência, conta corrente, and chave PIX. Automatic CPF/CNPJ formatting on input (CPF: XXX.XXX.XXX-XX, CNPJ: XX.XXX.XXX/XXXX-XX) with backend storage of unformatted values. Active/inactive toggle (isActive) for supplier/customer status management. Duplicate blocking prevents multiple registrations with the same CPF/CNPJ per user. Formatting utilities (`formatCPFCNPJ`, `handleCPFCNPJInput`, `unformatCPFCNPJ`) in `client/src/lib/format-utils.ts` ensure consistent display and data integrity.
*   **Document Attachment System**: Full document upload and storage capability for accounts payable and receivable using Replit Object Storage. Custom ObjectUploader component provides native file input with progress tracking, type validation (images/PDFs), and size limits (5MB max). Backend infrastructure includes secure upload URL generation (POST /api/objects/upload) and ACL management (POST /api/documents/upload) for protected file access. Schema fields `attachmentUrl` and `attachmentFilename` store document references. Frontend displays attachment indicators in both desktop tables and mobile lists, with direct document viewing via external link buttons. Upload state management ensures proper cleanup when forms are closed. Complete integration in both accounts payable and accounts receivable modules for archival of source documents (invoices, receipts, contracts).
*   **User Registration**: Complete user creation functionality exclusive to admin and gerente roles. POST /api/users endpoint validates required fields (firstName, lastName, email, role) with strict Zod schema validation to prevent privilege escalation. Backend validates email uniqueness and supports optional cost center assignment during registration. Frontend features "Novo Usuário" button (visible only to admin/gerente) that opens a Dialog with form fields for all user data including optional cost center selection. Mutation handles success/error feedback in Portuguese. Enhanced `upsertUser` method checks for existing users by email first (OIDC compatibility) before attempting insert, preventing duplicate key errors and server crashes.
*   **Backup System**: Complete data backup functionality for disaster recovery. Admin-only access enforced at both backend (requireAdmin middleware on all /api/backup/* endpoints) and frontend (permission-based UI gating). Features include: JSON export of all database tables, backup history tracking with metadata (filename, file size, tables included, records count, notes), download-to-device for Google Drive storage, and daily reminder alert on dashboard at 17:30 Brasilia time if no backup was performed that day. The BackupAlert component uses timezone-aware logic to determine visibility and auto-dismisses after backup completion. Non-admin users see "Acesso Restrito" message when attempting to access backup page.

## External Dependencies

### Third-Party Services

*   **Authentication**: Replit OpenID Connect (oidc.repl.co or replit.com/oidc).
*   **Database**: PostgreSQL (Neon serverless).

### Key NPM Packages

*   **UI & Components**: `@radix-ui/*`, `class-variance-authority`, `tailwindcss`, `lucide-react`, `recharts`, `date-fns`.
*   **Data & State**: `@tanstack/react-query`, `react-hook-form`, `zod`, `drizzle-orm`, `drizzle-zod`.
*   **Backend**: `express`, `passport`, `openid-client`, `express-session`, `connect-pg-simple`.
*   **Development**: `vite`, `tsx`, `esbuild`.

### Environment Variables

*   `DATABASE_URL` (Required)
*   `SESSION_SECRET` (Required)
*   `REPL_ID` (Required)
*   `ISSUER_URL` (Required)
*   `NODE_ENV` (Optional)