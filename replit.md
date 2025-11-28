# ZENITH ERP - Enterprise Resource Planning System

## Overview

ZENITH ERP is a web-based enterprise resource planning system primarily focused on financial management and accounting. It offers tools for managing accounts payable/receivable, bank accounts, chart of accounts, and cost centers. The system includes an executive dashboard for real-time financial metrics, multi-user access with robust authentication, and comprehensive reporting capabilities. Its core purpose is to provide a complete solution for financial operations, including advanced cost allocation, recurring payment functionality, a versatile payment settlement system, and an activity tracking agenda module, aiming for a professional and efficient financial management experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The frontend is built with React 18 and TypeScript, utilizing Shadcn/ui (New York style) based on Radix UI, themed with Tailwind CSS. It adheres to Material Design 3 and Fluent Design principles, prioritizing mobile-first responsiveness, high information density, minimal click workflows, and a professional aesthetic. Client-side routing is handled by Wouter.

### Technical Implementations

The backend is developed with Node.js, Express.js, and TypeScript (ES modules), offering a RESTful API. It features session-based authentication, JSON and URL-encoded body parsing, robust logging, and automatic error handling. The architecture emphasizes a middleware pattern and organized route registration.

The data layer uses Drizzle ORM with a PostgreSQL dialect via Neon serverless driver. It incorporates centralized schema definitions, PostgreSQL enums, `createdAt`/`updatedAt` timestamps, UUID primary keys, and decimal types for financial amounts. Zod schemas with transformations ensure data validation.

Authentication is a hybrid model supporting Replit Auth (OIDC) for existing users and Email/Password for new users created by admin/manager roles, with secure temporary passwords and mandatory password changes on first login. Express sessions are stored in PostgreSQL.

### Feature Specifications

**User Management & Access Control:**
The system supports Admin, Gerente (Manager), Financeiro (Financial), Operacional (Operational), and Visualizador (Viewer) roles with hierarchical permissions. Access control is granular, based on cost center assignments for most roles, while Admin and Gerente roles have full system access across all cost centers. Master data (suppliers, customers, cost centers, chart of accounts) is user-scoped.

**Financial Operations:**
*   **Payment Settlement System (Baixa):** Supports partial and full payments across eight methods, with optional bank account association and automatic status updates.
*   **Recurrence:** User-defined quantity recurrence for monthly/quarterly/annual payments with editable installment previews.
*   **Bank Account Management:** Full CRUD with data integrity protection, preventing deletion of accounts with associated transactions.
*   **Cost Center Management:** Comprehensive CRUD with hierarchical support, circular reference prevention, and detailed validation for deletion (blocking if associated with children, allocations, payables, or receivables).
*   **Accounts Payable/Receivable:** Full CRUD implementation, including edit/delete, pre-loading existing data, and proper foreign key sanitization. Optional "Conta Contábil" (Chart of Accounts) field available, filtering for analytical accounts.
*   **Timezone-Safe Date Handling:** Ensures correct date storage and display without timezone shifts, using ISO strings (yyyy-MM-dd) end-to-end.

**Core Modules:**
*   **Company Settings Module:** Allows complete company registration and contact information management for admin/gerente roles.
*   **Bank Statement Report:** Provides a complete transaction history for bank accounts with progressive balance, date range filtering, and print functionality.
*   **Suppliers & Customers Management:** Comprehensive cadastro with alphabetical sorting, real-time search, duplicate validation by CPF/CNPJ, bank data fields, automatic CPF/CNPJ formatting, and active/inactive toggles.
*   **Document Attachment System:** Full document upload and storage for accounts payable/receivable using Replit Object Storage, with progress tracking, type/size validation, and secure access.
*   **Backup System:** Data backup functionality restricted to admin/gerente roles, offering JSON export of all database tables, backup history tracking, download capabilities, and daily reminders.

### System Design Choices

*   **Navigation:** Reorganized sidebar menu for improved UX, using Shadcn Collapsible components.
*   **Cost Center Filter:** Implemented across financial modules (Accounts Payable, Accounts Receivable, Bank Statement) with permission-based filtering.
*   **Error Handling:** Descriptive error messages in Portuguese for user feedback, especially during deletion validations.

## External Dependencies

### Third-Party Services

*   **Authentication**: Replit OpenID Connect (oidc.repl.co or replit.com/oidc).
*   **Database**: PostgreSQL (Neon serverless).
*   **Object Storage**: Replit Object Storage (for document attachments).

### Key NPM Packages

*   **UI & Components**: `@radix-ui/*`, `class-variance-authority`, `tailwindcss`, `lucide-react`, `recharts`, `date-fns`.
*   **Data & State**: `@tanstack/react-query`, `react-hook-form`, `zod`, `drizzle-orm`, `drizzle-zod`.
*   **Backend**: `express`, `passport`, `openid-client`, `express-session`, `connect-pg-simple`, `bcrypt`.
*   **Development**: `vite`, `tsx`, `esbuild`.