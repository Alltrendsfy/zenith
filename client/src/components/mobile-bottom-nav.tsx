import { Link, useLocation } from "wouter";
import { Home, Receipt, Building2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: typeof Home;
  path: string;
  matchPaths?: string[];
  testId: string;
}

const navItems: NavItem[] = [
  {
    label: "Início",
    icon: Home,
    path: "/",
    testId: "nav-home",
  },
  {
    label: "Contas",
    icon: Receipt,
    path: "/accounts-payable",
    matchPaths: ["/accounts-payable", "/accounts-receivable"],
    testId: "nav-accounts",
  },
  {
    label: "Bancos",
    icon: Building2,
    path: "/bank-accounts",
    testId: "nav-banks",
  },
  {
    label: "Plano",
    icon: BookOpen,
    path: "/chart-of-accounts",
    matchPaths: ["/chart-of-accounts", "/cost-centers"],
    testId: "nav-chart",
  },
];

export function MobileBottomNav() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden"
      data-testid="mobile-bottom-nav"
    >
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.matchPaths
            ? item.matchPaths.some(p => location === p || (p !== "/" && location.startsWith(p)))
            : location === item.path || (item.path !== "/" && location.startsWith(item.path));

          return (
            <Link
              key={item.path}
              href={item.path}
              data-testid={item.testId}
              className={cn(
                "flex h-full w-full flex-col items-center justify-center gap-1 text-xs hover-elevate active-elevate-2 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
