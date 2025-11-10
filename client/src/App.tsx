import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import AccountsPayable from "@/pages/accounts-payable";
import AccountsReceivable from "@/pages/accounts-receivable";
import BankAccounts from "@/pages/bank-accounts";
import ChartOfAccountsPage from "@/pages/chart-of-accounts";
import CostCenters from "@/pages/cost-centers";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
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
              <div className="flex-1 flex flex-col">
                <Switch>
                  <Route path="/" component={Dashboard} />
                  <Route path="/accounts-payable" component={AccountsPayable} />
                  <Route path="/accounts-receivable" component={AccountsReceivable} />
                  <Route path="/bank-accounts" component={BankAccounts} />
                  <Route path="/chart-of-accounts" component={ChartOfAccountsPage} />
                  <Route path="/cost-centers" component={CostCenters} />
                  <Route component={NotFound} />
                </Switch>
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
      <ThemeProvider defaultTheme="light" storageKey="zenith-erp-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
