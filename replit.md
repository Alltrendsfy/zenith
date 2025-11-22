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

Authentication is managed via Replit OpenID Connect (OIDC) using Passport.js and `openid-client`. Express sessions, stored in PostgreSQL with `connect-pg-simple`, provide secure session management. Authorization is handled by `isAuthenticated` middleware for protected routes, with user IDs from session claims enforcing data isolation. User roles (admin and gerente) control access to various modules and functionalities.

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