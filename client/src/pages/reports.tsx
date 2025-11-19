import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { PageHeader } from "@/components/page-header"
import { PageContainer } from "@/components/page-container"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar, FileText, Printer, Download } from "lucide-react"
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, format } from "date-fns"
import type { DREReport, CostCenter } from "@shared/schema"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export default function Reports() {
  const { isAuthenticated } = useAuth()
  
  // Date filters
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [costCenterId, setCostCenterId] = useState<string>("")

  // Fetch cost centers for filter
  const { data: costCenters = [] } = useQuery<CostCenter[]>({
    queryKey: ["/api/cost-centers"],
    enabled: isAuthenticated,
  })

  // Fetch DRE report
  const getDREQueryKey = () => {
    const params = new URLSearchParams({ startDate, endDate })
    if (costCenterId) {
      params.append('costCenterId', costCenterId)
    }
    return [`/api/reports/dre?${params.toString()}`]
  }

  const { data: dreReport, isLoading: isDRELoading, refetch } = useQuery<DREReport>({
    queryKey: getDREQueryKey(),
    enabled: isAuthenticated && !!startDate && !!endDate,
  })

  // Quick date filters
  const setThisMonth = () => {
    const now = new Date()
    setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'))
    setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'))
  }

  const setLastMonth = () => {
    const lastMonth = subMonths(new Date(), 1)
    setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'))
    setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'))
  }

  const setThisYear = () => {
    const now = new Date()
    setStartDate(format(startOfYear(now), 'yyyy-MM-dd'))
    setEndDate(format(endOfYear(now), 'yyyy-MM-dd'))
  }

  const handlePrint = () => {
    window.print()
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <PageContainer>
      <PageHeader>
        <div className="flex items-center justify-between w-full gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-semibold">Relatórios</h1>
          </div>
        </div>
      </PageHeader>

      <div className="space-y-6">
        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Filtros do Relatório
            </CardTitle>
            <CardDescription>
              Selecione o período e filtros para gerar o DRE
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick date buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={setThisMonth}
                data-testid="button-filter-this-month"
              >
                Este Mês
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={setLastMonth}
                data-testid="button-filter-last-month"
              >
                Mês Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={setThisYear}
                data-testid="button-filter-this-year"
              >
                Este Ano
              </Button>
            </div>

            {/* Date range inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Data Inicial</Label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="input-start-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">Data Final</Label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="input-end-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost-center">Centro de Custo</Label>
                <Select
                  value={costCenterId || "ALL"}
                  onValueChange={(value) => setCostCenterId(value === "ALL" ? "" : value)}
                >
                  <SelectTrigger id="cost-center" data-testid="select-cost-center">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    {costCenters.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.code} - {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex items-end">
                <Button
                  onClick={() => refetch()}
                  className="w-full"
                  data-testid="button-generate-report"
                >
                  Gerar Relatório
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DRE Report */}
        {isDRELoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Gerando relatório...</p>
              </div>
            </CardContent>
          </Card>
        ) : dreReport ? (
          <div className="space-y-6">
            {/* Report Header */}
            <Card className="print:shadow-none">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-2xl">
                      DRE - Demonstração de Resultado do Exercício
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Período: {format(new Date(startDate), 'dd/MM/yyyy')} a {format(new Date(endDate), 'dd/MM/yyyy')}
                      {dreReport.costCenterName && (
                        <span className="block">Centro de Custo: {dreReport.costCenterName}</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 print:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrint}
                      data-testid="button-print-report"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Imprimir
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Revenues Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-primary pb-2">
                    <h3 className="font-semibold text-lg">RECEITAS</h3>
                    <span className="font-semibold text-lg">
                      R$ {dreReport.revenues.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {dreReport.revenues.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Nenhuma receita no período</p>
                  ) : (
                    <div className="space-y-2">
                      {dreReport.revenues.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 border-b hover-elevate active-elevate-2 px-3 rounded cursor-pointer"
                          data-testid={`dre-revenue-item-${idx}`}
                        >
                          <div className="flex-1">
                            <span className="text-sm font-medium">{item.accountName}</span>
                            <span className="text-xs text-muted-foreground ml-2">({item.accountCode})</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.percentage?.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expenses Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-destructive pb-2">
                    <h3 className="font-semibold text-lg">DESPESAS</h3>
                    <span className="font-semibold text-lg text-destructive">
                      R$ {dreReport.expenses.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {dreReport.expenses.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Nenhuma despesa no período</p>
                  ) : (
                    <div className="space-y-2">
                      {dreReport.expenses.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 border-b hover-elevate active-elevate-2 px-3 rounded cursor-pointer"
                          data-testid={`dre-expense-item-${idx}`}
                        >
                          <div className="flex-1">
                            <span className="text-sm font-medium">{item.accountName}</span>
                            <span className="text-xs text-muted-foreground ml-2">({item.accountCode})</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-destructive">
                              R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.percentage?.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Result Section */}
                <div className="space-y-3 pt-4 border-t-4">
                  <div className={`flex items-center justify-between p-4 rounded-lg ${
                    dreReport.result.grossProfit >= 0 ? 'bg-primary/10' : 'bg-destructive/10'
                  }`}>
                    <h3 className="font-bold text-xl">RESULTADO DO PERÍODO</h3>
                    <div className="text-right">
                      <div className={`font-bold text-2xl ${
                        dreReport.result.grossProfit >= 0 ? 'text-primary' : 'text-destructive'
                      }`}>
                        R$ {dreReport.result.grossProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {dreReport.result.grossProfitPercentage.toFixed(1)}% sobre receita
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
              {/* Revenue vs Expenses Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Receitas x Despesas</CardTitle>
                  <CardDescription>Comparativo do período</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        {
                          name: "Total",
                          Receitas: dreReport.revenues.total,
                          Despesas: dreReport.expenses.total,
                          Resultado: dreReport.result.grossProfit,
                        },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        formatter={(value: number) =>
                          `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        }
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Receitas" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="Despesas" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} />
                      <Bar
                        dataKey="Resultado"
                        fill={dreReport.result.grossProfit >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Expense Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Despesas</CardTitle>
                  <CardDescription>Por categoria</CardDescription>
                </CardHeader>
                <CardContent>
                  {dreReport.expenses.items.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={dreReport.expenses.items}
                          dataKey="amount"
                          nameKey="accountName"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(entry) => `${entry.accountCode}: ${entry.percentage?.toFixed(0)}%`}
                          labelLine={true}
                        >
                          {dreReport.expenses.items.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={`hsl(${(index * 360) / dreReport.expenses.items.length}, 70%, 50%)`}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) =>
                            `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          }
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      Nenhuma despesa para exibir
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Selecione um período e clique em "Gerar Relatório"
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  )
}
