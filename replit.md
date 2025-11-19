# ZENITH ERP - Enterprise Resource Planning System

## Overview

ZENITH ERP is a web-based enterprise resource planning system focused on financial management and accounting. The application provides comprehensive tools for managing accounts payable/receivable, bank accounts, chart of accounts, and cost centers with an executive dashboard for real-time financial metrics.

The system is built as a full-stack TypeScript application with a React frontend and Express backend, designed for multi-user access with secure authentication via Replit's OpenID Connect implementation.

**Recent Updates:**
- **November 19, 2025 - DRE Financial Reporting**: Implemented comprehensive Income Statement (DRE - Demonstração do Resultado do Exercício) reporting module with period filters, cost center filtering, hierarchical revenue/expense display, visual charts (bar and pie), and print functionality. Full integration with cost allocation system for multi-center reporting.
- **November 2024 - Cost Allocation System**: Implemented comprehensive rateio system allowing proportional distribution of financial transactions across multiple cost centers with percentage-based allocation and automatic amount calculation.
- **November 2024 - Brand Identity Overhaul**: Complete visual identity redesign based on Zenith logo with cyan (#00D4FF) primary color and deep blue (#0A1520) backgrounds. Dark mode set as default. All components updated with new color palette and logo integration via Vite asset pipeline.

## User Preferences

Preferred communication style: Simple, everyday language.

## Key Features

### DRE - Demonstração do Resultado do Exercício (Income Statement)
Comprehensive financial reporting module for analyzing revenues, expenses, and profitability:
- **Period filtering**: Quick presets (This Month, Last Month, This Year) plus custom date range selection
- **Cost center filtering**: Filter entire report by specific cost center using allocation data
- **Hierarchical structure**: Organized display of Revenues → Expenses → Net Income with subtotals
- **Percentage analysis**: Automatic calculation of each line item as percentage of total revenue
- **Visual analytics**: Bar chart (revenue vs expenses comparison) and pie chart (expense distribution by account)
- **Print-ready output**: Optimized print layout with window.print() integration
- **Empty state handling**: Clear messaging when no transactions exist for selected period
- **Real-time filtering**: Dynamic query with TanStack Query for instant period/filter updates

**Implementation**:
- Backend: `/api/reports/dre` endpoint with date range and cost center query params
- Frontend: `/reports` page with filter controls, hierarchical display, and Recharts visualizations
- Storage: `getAllAllocations()` method for cross-transaction cost center queries
- Types: `DREReport`, `DRESection`, `DREItem` schemas in `shared/schema.ts`

**Future enhancements noted**: Comparative period analysis, drill-down to transaction details, performance optimization for large datasets

### Cost Allocation System (Rateio)
The system supports proportional distribution of financial transactions across multiple cost centers:
- **Percentage-based allocation**: Each transaction can be split across N cost centers with specific percentages
- **Automatic amount calculation**: Server-side calculation ensures amounts match percentages × total amount
- **Validation**: Frontend and backend validation ensures allocations sum to exactly 100%
- **Quick actions**: Equal split button for uniform distribution, clear button for resetting
- **Real-time feedback**: Visual indicators show total percentage and validation status
- **Backwards compatible**: Maintains legacy `costCenterId` field for single cost center records

**Implementation**:
- Backend: `cost_allocations` table, REST API endpoints (`/api/accounts-payable/:id/allocations`, `/api/accounts-receivable/:id/allocations`)
- Frontend: `AllocationManager` component with add/remove rows, percentage inputs, validation badges
- Utilities: `shared/allocationUtils.ts` provides `validateAllocations`, `calculateAmounts`, `createEqualDistribution` helpers

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, built using Vite as the build tool and development server.

**UI Component System**: Shadcn/ui library (New York style) built on Radix UI primitives. The design follows Material Design 3 and Fluent Design principles optimized for enterprise data-dense interfaces. All components are highly customized with Tailwind CSS for consistent theming.

**Routing**: Wouter for client-side routing with route-based code splitting.

**State Management**: TanStack Query (React Query) for server state management with infinite stale time and disabled refetching by default. No global client state library - local component state via React hooks.

**Form Handling**: React Hook Form with Zod validation using `@hookform/resolvers` for type-safe form schemas.

**Styling System**: 
- Tailwind CSS with custom design tokens
- CSS variables for theming (light/dark mode support)
- Custom spacing primitives (2, 4, 6, 8, 12, 16)
- Typography: Inter for UI, JetBrains Mono for financial data
- Component-based design system with reusable patterns

**Mobile Responsiveness**:
- **Breakpoints**: Mobile (< 768px), Tablet (768-1023px), Desktop (≥ 1024px)
- **MobileBottomNav**: Fixed bottom navigation (< 1024px) with 4 main sections, active state highlighting via matchPaths
- **MobileCardList**: Transforms tables to vertical cards on mobile while maintaining table view on desktop
- **MobileFormActions**: Sticky bottom action bar for forms on mobile, static on desktop
- **Dashboard**: Responsive metrics grid (1/2/3 columns) and charts (240px mobile, 320px desktop)
- **Sidebar**: Collapsible overlay on mobile, permanent on desktop
- **Touch-optimized**: All interactive elements sized for touch (min 44px height), proper spacing, no hover-dependent interactions

**Key Design Decisions**:
- Information-dense layouts prioritizing data clarity
- Minimal click workflows with maximum context visibility
- Professional aesthetic with restrained color palette
- Consistent component patterns across all modules for rapid learning
- Mobile-first responsive design with native-like mobile navigation

### Backend Architecture

**Runtime**: Node.js with Express.js framework.

**Language**: TypeScript with ES modules (`"type": "module"` in package.json).

**API Pattern**: RESTful API with session-based authentication. All routes under `/api` prefix.

**Request Processing**:
- JSON body parsing with raw body capture for webhook validation
- URL-encoded form data support
- Request/response logging middleware for API routes only
- Automatic error handling and status code management

**Development/Production Split**: 
- Development: `tsx` for direct TypeScript execution with Vite middleware integration
- Production: esbuild bundling with platform-specific optimizations

**Key Architectural Decisions**:
- Session-based auth chosen over JWT for better server-side control and revocation
- Middleware pattern for cross-cutting concerns (logging, auth)
- Route registration pattern via `registerRoutes` function for clean server setup
- Vite integration in development for hot module replacement

### Data Layer

**ORM**: Drizzle ORM with PostgreSQL dialect.

**Database Driver**: Neon serverless PostgreSQL client with WebSocket support for serverless environments.

**Connection Pooling**: Connection pool managed via `@neondatabase/serverless` Pool class.

**Schema Organization**: Centralized schema definitions in `shared/schema.ts` with type inference for TypeScript safety.

**Database Tables**:
- `sessions`: Session storage for authentication (required by connect-pg-simple)
- `users`: User accounts with profile information and roles
- `bank_accounts`: Bank account management with balances
- `accounts_payable`: Payables tracking with status and amounts
- `accounts_receivable`: Receivables tracking with status and amounts
- `chart_of_accounts`: Hierarchical account structure (receita/despesa/ativo/passivo)
- `cost_centers`: Hierarchical cost center tracking
- `bank_transfers`: Inter-account transfer records
- `cost_allocations`: Many-to-many allocation table for distributing transactions across cost centers with percentage and amount tracking (transactionType: 'payable' | 'receivable', percentage must sum to 100%, amounts auto-calculated)

**Schema Patterns**:
- PostgreSQL enums for constrained fields (account types, transaction status, payment intervals)
- Timestamp fields (`createdAt`, `updatedAt`) on all major entities
- UUID primary keys via `gen_random_uuid()`
- Drizzle-Zod integration for runtime validation matching database constraints

**Key Design Decisions**:
- Drizzle chosen for type-safe SQL queries and excellent TypeScript integration
- Shared schema between client/server for type consistency
- Hierarchical structures (chart of accounts, cost centers) via self-referencing `parentId`
- Decimal types for financial amounts to prevent floating-point errors

### Authentication & Authorization

**Provider**: Replit OpenID Connect (OIDC) authentication.

**Strategy**: Passport.js with `openid-client` library for OIDC protocol handling.

**Session Management**:
- Express sessions with PostgreSQL storage via `connect-pg-simple`
- 7-day session TTL with automatic cleanup
- HTTP-only cookies for session tokens
- Secure cookies in production environment

**User Flow**:
1. Unauthenticated users redirected to `/api/login`
2. OIDC flow to Replit authentication
3. User claims stored in session with access/refresh tokens
4. Session persisted to PostgreSQL `sessions` table
5. User profile synchronized to `users` table

**Authorization Pattern**: `isAuthenticated` middleware for protected routes. User ID extracted from session claims (`req.user.claims.sub`) for data isolation.

**Key Design Decisions**:
- Session-based auth for simplicity and server-side session control
- PostgreSQL session store for reliability and consistency with main database
- Memoized OIDC configuration for performance
- Token refresh handling for long-lived sessions

## External Dependencies

### Third-Party Services

**Authentication**: Replit OpenID Connect (oidc.repl.co or replit.com/oidc) for user authentication and identity management.

**Database**: PostgreSQL database (Neon serverless) via `DATABASE_URL` environment variable.

### Key NPM Packages

**UI & Components**:
- `@radix-ui/*`: Unstyled, accessible UI primitives (20+ components)
- `class-variance-authority`: Type-safe component variant management
- `tailwindcss`: Utility-first CSS framework
- `lucide-react`: Icon library
- `recharts`: Charting library for dashboard visualizations
- `date-fns`: Date manipulation and formatting

**Data & State**:
- `@tanstack/react-query`: Server state management and caching
- `react-hook-form`: Performant form state management
- `zod`: Schema validation
- `drizzle-orm`: Type-safe ORM
- `drizzle-zod`: Zod schema generation from Drizzle schemas

**Backend**:
- `express`: Web application framework
- `passport`: Authentication middleware
- `openid-client`: OpenID Connect client implementation
- `express-session`: Session middleware
- `connect-pg-simple`: PostgreSQL session store

**Development**:
- `vite`: Build tool and dev server
- `tsx`: TypeScript execution for development
- `esbuild`: Production bundling
- Replit-specific plugins: runtime error overlay, cartographer, dev banner

### Environment Variables

**Required**:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `REPL_ID`: Replit deployment identifier (for OIDC)
- `ISSUER_URL`: OIDC issuer URL (defaults to https://replit.com/oidc)

**Optional**:
- `NODE_ENV`: Environment mode (development/production)