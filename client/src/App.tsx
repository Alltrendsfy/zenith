import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import AccountsPayable from "@/pages/accounts-payable";
import AccountsReceivable from "@/pages/accounts-receivable";
import BankAccounts from "@/pages/bank-accounts";
import BankTransfers from "@/pages/bank-transfers";
import ChartOfAccountsPage from "@/pages/chart-of-accounts";
import CostCenters from "@/pages/cost-centers";
import Reports from "@/pages/reports";
import Suppliers from "@/pages/suppliers";
import Customers from "@/pages/customers";
import NotFound from "@/pages/not-found";
import zenithLogo from "@assets/logo zenith erp_1763561150551.jpeg";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-mobile": "100vw",
  };

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-16 lg:px-6">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <div className="flex items-center gap-2 lg:hidden">
                    <img 
                      src={zenithLogo} 
                      alt="Zenith ERP" 
                      className="h-8 w-auto"
                    />
                  </div>
                  <div className="flex-1" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto pb-20 lg:pb-0">
                  <Switch>
                    <Route path="/" component={Dashboard} />
                    <Route path="/accounts-payable" component={AccountsPayable} />
                    <Route path="/accounts-receivable" component={AccountsReceivable} />
                    <Route path="/bank-accounts" component={BankAccounts} />
                    <Route path="/bank-transfers" component={BankTransfers} />
                    <Route path="/chart-of-accounts" component={ChartOfAccountsPage} />
                    <Route path="/cost-centers" component={CostCenters} />
                    <Route path="/reports" component={Reports} />
                    <Route path="/suppliers" component={Suppliers} />
                    <Route path="/customers" component={Customers} />
                    <Route component={NotFound} />
                  </Switch>
                </main>
                <MobileBottomNav />
              </div>
            </div>
          </SidebarProvider>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="zenith-erp-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
