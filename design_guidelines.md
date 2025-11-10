# ZENITH ERP - Design Guidelines

## Design Approach
**System:** Material Design 3 + Fluent Design principles for enterprise applications
**Rationale:** ERP systems require information-dense layouts with clear data hierarchy, efficient workflows, and professional aesthetics. These systems excel at structured data presentation and form-heavy interfaces.

## Core Design Principles
1. **Information Clarity First:** Every UI element serves the purpose of presenting or collecting business data efficiently
2. **Workflow Optimization:** Minimize clicks, maximize context visibility
3. **Professional Restraint:** Clean, uncluttered interfaces that project competence and reliability
4. **Consistent Patterns:** Reusable components across all modules for rapid learning

---

## Typography System

**Font Families:**
- Primary: Inter (400, 500, 600, 700) - UI text, tables, forms
- Monospace: JetBrains Mono (400, 500) - numbers, financial data, codes

**Hierarchy:**
- Page Titles: text-2xl font-semibold
- Section Headers: text-lg font-semibold
- Card Titles: text-base font-medium
- Body Text: text-sm
- Labels/Captions: text-xs font-medium uppercase tracking-wide
- Table Data: text-sm
- Financial Numbers: font-mono text-sm tracking-tight

---

## Layout System

**Spacing Primitives:**
Use Tailwind units: **2, 4, 6, 8, 12, 16** as the core spacing set.
- Component padding: p-4, p-6
- Section spacing: space-y-6, gap-6
- Card padding: p-6
- Form field spacing: space-y-4
- Table cell padding: px-4 py-3

**Grid Structure:**
- Dashboard: 12-column grid with responsive breakpoints (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Data tables: Full-width with horizontal scroll on mobile
- Forms: Single column on mobile, 2-column on desktop (md:grid-cols-2)

**Container Strategy:**
- Application Shell: Full viewport with fixed sidebar (256px desktop, collapsible mobile)
- Content Area: max-w-7xl mx-auto with px-6 py-8
- Modal Dialogs: max-w-2xl for forms, max-w-4xl for data views

---

## Component Library

### Navigation
**Sidebar (Desktop):**
- Fixed left, width: 256px, full height
- Logo area at top (h-16)
- Navigation menu with icons + labels
- Module sections with visual grouping (border-t divider)
- User profile area at bottom
- Active state: subtle background treatment

**Mobile Navigation:**
- Collapsible hamburger menu
- Full-screen overlay with navigation
- Bottom tab bar for critical actions (Dashboard, Quick Actions)

**Header:**
- Fixed top bar (h-16)
- Company logo/name, search bar (if applicable), user menu, theme toggle, notification bell
- Breadcrumb trail on pages (text-sm with separators)

### Dashboard Components

**Metric Cards:**
- Grid layout: 4 cards on desktop (lg:grid-cols-4), 2 on tablet, 1 on mobile
- Structure: Icon, Label (text-xs uppercase), Value (text-2xl font-semibold), Trend indicator (↑↓ with percentage)
- Height: Consistent h-32
- Shadow: subtle elevation

**Charts:**
- Full-width or 2-column grid depending on importance
- Title above chart (text-lg font-semibold)
- Legend integrated within chart area
- Recharts library styled to match system theme
- Minimum height: h-80 for readability

**Alert/Notification Cards:**
- Distinct border-l-4 treatment with icon
- Types: Critical (red border), Warning (yellow), Info (blue), Success (green)
- Compact list format with timestamp
- Action buttons inline

**Recent Transactions Table:**
- Striped rows for readability
- Sticky header on scroll
- Responsive: stack on mobile with card-like treatment
- Columns: Date, Description, Type, Amount (right-aligned, monospace)

### Data Tables
**Structure:**
- Sticky header (shadow on scroll)
- Alternating row treatment (subtle)
- Right-aligned numeric columns
- Left-aligned text columns
- Row hover state
- Checkbox column for bulk actions (40px width)
- Action column (right-most, 100px, with icon buttons)

**Features:**
- Search input above table (with icon)
- Filter dropdowns inline with search
- Pagination below (showing "X-Y of Z results")
- Export button (top-right)

### Forms

**Layout:**
- Two-column grid on desktop (md:grid-cols-2), single column mobile
- Full-width for textareas and complex inputs
- Consistent label positioning (above input)
- Helper text below inputs (text-xs)
- Required field indicator (asterisk)

**Input Components:**
- Text inputs: h-10, rounded corners, border treatment
- Select dropdowns: Consistent height with chevron icon
- Date pickers: Calendar overlay with Radix UI
- Currency inputs: Prefix with R$ symbol, monospace font
- Number inputs: Right-aligned for financial data

**Actions:**
- Primary action: right-aligned, prominent
- Secondary actions: left-aligned or next to primary
- Destructive actions: separated with divider
- Form spacing: pt-6 for button row

### Cards & Panels
**Standard Card:**
- Rounded corners, subtle shadow
- Padding: p-6
- Header with title + action button (if needed)
- Divider between sections (border-b)

**Financial Summary Cards:**
- Larger text for amounts (text-3xl font-bold monospace)
- Label above amount (text-sm)
- Positive/negative visual treatment (without color, use icons: ↑ ↓)

**Module Cards (for navigation):**
- Icon at top (32px)
- Module name (text-lg font-semibold)
- Brief description (text-sm)
- Hover: subtle elevation increase
- Grid: 3 columns desktop, 2 tablet, 1 mobile

### Modals & Dialogs
**Structure:**
- Overlay with backdrop blur
- Centered modal with max-width constraints
- Header: title + close button (X icon top-right)
- Body: scrollable content area with padding
- Footer: actions (consistent with form actions)

**Sizes:**
- Small: max-w-md (confirmations)
- Medium: max-w-2xl (standard forms)
- Large: max-w-4xl (detailed views)

### Financial Components

**Account Summary Blocks:**
- Bank account name (text-base font-medium)
- Account number (text-xs monospace)
- Balance (text-2xl font-bold monospace)
- Layout: Horizontal on desktop, vertical stack on mobile

**Transaction Lists:**
- Date column (80px, text-sm)
- Description (flex-grow)
- Category/Account (150px)
- Amount (120px, right-aligned, monospace)
- Status badge (60px)

**Payment/Receipt Forms:**
- Parcelamento section: Collapsible accordion
- Installment preview: Table showing all installments
- Quick codes input: Autocomplete with dropdown

### Status & Badges
**Badge Styles:**
- Rounded-full, px-2 py-1, text-xs font-medium
- Types: Paid, Pending, Overdue, Cancelled, Active, Inactive
- Icon + text combination when needed

---

## Responsive Behavior

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**Mobile Adaptations:**
- Sidebar becomes overlay menu
- Tables become card stacks
- Multi-column grids become single column
- Form 2-column becomes single column
- Chart heights reduce (h-64 on mobile)
- Action buttons become full-width

---

## Data Visualization

**Charts (Recharts):**
- Line charts: Cash flow projections, revenue trends
- Bar charts: Monthly comparisons, expense by category
- Pie charts: Budget distribution (max 6 segments)
- Area charts: Cumulative data over time

**Chart Specifications:**
- Aspect ratio: 16:9 for primary charts
- Grid lines: subtle, horizontal only
- Axes labels: text-xs
- Tooltips: Custom with detailed info
- Legend: bottom or right placement

---

## Micro-interactions
**Minimal Animation Budget:**
- Hover states: Subtle scale (scale-105) on cards only
- Loading states: Skeleton screens, no spinners
- Page transitions: None (instant)
- Form validation: Instant inline feedback (no delays)
- Toast notifications: Slide in from top-right

**Prohibited:**
- No scroll-triggered animations
- No parallax effects
- No complex transitions
- No decorative animations

---

## Accessibility
- Consistent focus states (ring-2 ring-offset-2)
- Keyboard navigation for all actions
- ARIA labels for icon-only buttons
- Sufficient contrast ratios (will be ensured with color selection)
- Form field associations with labels

---

## Theme Structure
**Light/Dark Mode Support:**
- System uses next-themes for toggling
- All components support both themes
- Toggle in header (sun/moon icon)
- Neutral base without color references (handled later)

---

## Images
**This application does NOT use marketing images or hero images.** As a data-driven ERP dashboard:
- Profile pictures: User avatars (circular, 32px-40px)
- Company logo: Header area (auto height, max 40px)
- Empty states: Simple illustrations (optional, 200x200px)
- Icons: Lucide React library throughout (16px-24px)