# ZENITH ERP - Enterprise Resource Planning System

## Overview

ZENITH ERP is a web-based enterprise resource planning system focused on financial management and accounting. It provides tools for managing accounts payable/receivable, bank accounts, chart of accounts, and cost centers, complemented by an executive dashboard for real-time financial metrics. The system aims to offer comprehensive financial oversight, multi-user access, and secure authentication.

Key capabilities include:
- Comprehensive modules for Suppliers and Customers (Cadastros).
- Detailed Income Statement (DRE) reporting with period and cost center filtering.
- Advanced cost allocation system for proportional distribution of transactions across cost centers.
- An in-progress recurring payment functionality for Accounts Payable/Receivable.

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
- **Database Tables**: `sessions`, `users`, `bank_accounts`, `accounts_payable`, `accounts_receivable`, `chart_of_accounts`, `cost_centers`, `bank_transfers`, and `cost_allocations`.
- **Schema Patterns**: PostgreSQL enums, `createdAt`/`updatedAt` timestamps, UUID primary keys, Drizzle-Zod integration, hierarchical structures via `parentId`, and decimal types for financial amounts.
- **Key Design Decisions**: Drizzle for type-safe SQL, shared schema for consistency, hierarchical structures, and decimal types.

### Authentication & Authorization

Authentication is handled via **Replit OpenID Connect (OIDC)** using **Passport.js** and `openid-client`.
- **Session Management**: Express sessions with PostgreSQL storage via `connect-pg-simple`, 7-day TTL, HTTP-only, secure cookies.
- **User Flow**: Redirection to `/api/login`, OIDC flow, user claims stored in session, profile synced to `users` table.
- **Authorization**: `isAuthenticated` middleware for protected routes, user ID from session claims for data isolation.
- **Key Design Decisions**: Session-based auth for simplicity, PostgreSQL session store, memoized OIDC config, and token refresh.

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