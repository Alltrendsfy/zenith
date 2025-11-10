import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { isUnauthorizedError } from "@/lib/authUtils"
import { PageHeader } from "@/components/page-header"
import { PageContainer } from "@/components/page-container"
import { MetricCard } from "@/components/metric-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, TrendingUp, TrendingDown, Building2, AlertCircle } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export default function Dashboard() {
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Não autorizado",
        description: "Você precisa fazer login. Redirecionando...",
        variant: "destructive",
      })
      setTimeout(() => {
        window.location.href = "/api/login"
      }, 500)
    }
  }, [isAuthenticated, authLoading, toast])

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/dashboard"],
    retry: false,
    enabled: isAuthenticated,
  })

  if (authLoading || !isAuthenticated) {
    return null
  }

  const cashFlowData = dashboardData?.cashFlowData || [
    { month: "Jan", receitas: 15000, despesas: 12000 },
    { month: "Fev", receitas: 18000, despesas: 14000 },
    { month: "Mar", receitas: 22000, despesas: 16000 },
    { month: "Abr", receitas: 20000, despesas: 15000 },
    { month: "Mai", receitas: 25000, despesas: 18000 },
    { month: "Jun", receitas: 28000, despesas: 20000 },
  ]

  const expensesByCostCenter = dashboardData?.expensesByCostCenter || [
    { name: "Administrativo", value: 35000 },
    { name: "Operacional", value: 45000 },
    { name: "Comercial", value: 28000 },
    { name: "TI", value: 15000 },
  ]

  return (
    <div className="flex h-screen w-full flex-col">
      <PageHeader>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </PageHeader>

      <div className="flex-1 overflow-auto">
        <PageContainer>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                icon={Wallet}
                label="Saldo Total"
                value={dashboardData?.totalBalance || "R$ 0,00"}
                isLoading={isLoading}
              />
              <MetricCard
                icon={TrendingUp}
                label="A Receber"
                value={dashboardData?.totalReceivable || "R$ 0,00"}
                trend={{ value: "12%", isPositive: true }}
                isLoading={isLoading}
              />
              <MetricCard
                icon={TrendingDown}
                label="A Pagar"
                value={dashboardData?.totalPayable || "R$ 0,00"}
                trend={{ value: "8%", isPositive: false }}
                isLoading={isLoading}
              />
              <MetricCard
                icon={Building2}
                label="Contas Bancárias"
                value={dashboardData?.bankAccountsCount || "0"}
                isLoading={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Fluxo de Caixa</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={cashFlowData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                        }}
                        formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, undefined]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="receitas"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        name="Receitas"
                      />
                      <Line
                        type="monotone"
                        dataKey="despesas"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        name="Despesas"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Despesas por Centro de Custo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={expensesByCostCenter}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                        }}
                        formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, "Valor"]}
                      />
                      <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Alertas Críticos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(!dashboardData?.alerts || dashboardData.alerts.length === 0) ? (
                  <p className="text-sm text-muted-foreground py-4">Nenhum alerta no momento</p>
                ) : (
                  <div className="space-y-2">
                    {dashboardData.alerts.map((alert: any, index: number) => (
                      <div
                        key={index}
                        className={`border-l-4 p-3 rounded ${
                          alert.type === 'critical' ? 'border-destructive' : 'border-chart-4'
                        } bg-card`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">{alert.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">{alert.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </PageContainer>
      </div>
    </div>
  )
}
