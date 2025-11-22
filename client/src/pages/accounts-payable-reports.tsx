import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Calendar, TrendingDown, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface Summary {
  vencidos: { count: number; total: number };
  aVencer: { count: number; total: number };
  pagos: { count: number; total: number };
}

interface PayableReport {
  data: any[];
  summary: Summary;
  costCenterTotals: { name: string; total: number }[];
  evolutionData: { month: string; total: number; paid: number }[];
  suppliers: any[];
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export default function AccountsPayableReports() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<string>('all');
  const [supplierId, setSupplierId] = useState<string>('all');

  const { data: report, isLoading } = useQuery<PayableReport>({
    queryKey: [`/api/reports/accounts-payable?startDate=${startDate}&endDate=${endDate}&status=${status}&supplierId=${supplierId}`],
    enabled: !!startDate && !!endDate,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="title-relatorios-pagar">Relatórios de Contas a Pagar</h1>
          <p className="text-muted-foreground">Análise completa de despesas e pagamentos</p>
        </div>
        <Button variant="outline" onClick={() => window.print()} data-testid="button-print">
          <FileText className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fornecedor</label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger data-testid="select-supplier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {report?.suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.razaoSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="text-vencidos-total">
              {formatCurrency(report?.summary.vencidos.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {report?.summary.vencidos.count || 0} {report?.summary.vencidos.count === 1 ? 'título' : 'títulos'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Vencer</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avencer-total">
              {formatCurrency(report?.summary.aVencer.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {report?.summary.aVencer.count || 0} {report?.summary.aVencer.count === 1 ? 'título' : 'títulos'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success" data-testid="text-pagos-total">
              {formatCurrency(report?.summary.pagos.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {report?.summary.pagos.count || 0} {report?.summary.pagos.count === 1 ? 'título' : 'títulos'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={report?.evolutionData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tickFormatter={formatMonth} />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#8b5cf6" name="Total" />
                <Line type="monotone" dataKey="paid" stroke="#10b981" name="Pago" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por Centro de Custo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={report?.costCenterTotals || []}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}: ${formatCurrency(entry.total)}`}
                >
                  {report?.costCenterTotals.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cost Center Totals */}
      {report && report.costCenterTotals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Totalização por Centro de Custo</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Centro de Custo</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.costCenterTotals.map((cc, index) => (
                  <TableRow key={index} data-testid={`row-cost-center-${index}`}>
                    <TableCell>{cc.name}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(cc.total)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell>Total Geral</TableCell>
                  <TableCell className="text-right" data-testid="text-cost-center-grand-total">
                    {formatCurrency(report.costCenterTotals.reduce((sum, cc) => sum + cc.total, 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report && report.data.length > 0 ? (
                report.data.map((payable) => (
                  <TableRow key={payable.id} data-testid={`row-payable-${payable.id}`}>
                    <TableCell>{format(new Date(payable.dueDate), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{payable.description}</TableCell>
                    <TableCell>
                      {report.suppliers.find(s => s.id === payable.supplierId)?.razaoSocial || '-'}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(parseFloat(payable.totalAmount))}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                        payable.status === 'pago' ? 'bg-success/10 text-success' :
                        payable.status === 'vencido' ? 'bg-destructive/10 text-destructive' :
                        payable.status === 'cancelado' ? 'bg-muted text-muted-foreground' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {payable.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
