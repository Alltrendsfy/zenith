import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { PageHeader } from "@/components/page-header"
import { PageContainer } from "@/components/page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Calendar, Printer, FileDown } from "lucide-react"
import { startOfMonth, endOfMonth, format } from "date-fns"
import type { BankAccount } from "@shared/schema"

interface BankStatementEntry {
  date: string;
  type: 'C' | 'D';
  description: string;
  entityName: string | null;
  accountCode: string | null;
  accountName: string | null;
  costCenterCode: string | null;
  costCenterName: string | null;
  documentNumber: string | null;
  amount: string;
  balance: string;
  transactionId: string;
  transactionType: 'payment_out' | 'payment_in' | 'transfer_out' | 'transfer_in';
}

export default function BankStatement() {
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  
  const [bankAccountId, setBankAccountId] = useState<string>("")
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'))

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

  // Fetch bank accounts
  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
    queryKey: ["/api/bank-accounts"],
    enabled: isAuthenticated,
  })

  // Auto-select first bank account
  useEffect(() => {
    if (bankAccounts.length > 0 && !bankAccountId) {
      setBankAccountId(bankAccounts[0].id)
    }
  }, [bankAccounts, bankAccountId])

  // Fetch bank statement
  const getStatementQueryKey = () => {
    if (!bankAccountId || !startDate || !endDate) return null
    const params = new URLSearchParams({ 
      bankAccountId, 
      startDate, 
      endDate 
    })
    return `/api/reports/bank-statement?${params.toString()}`
  }

  const { data: statement = [], isLoading, refetch } = useQuery<BankStatementEntry[]>({
    queryKey: [getStatementQueryKey()],
    enabled: isAuthenticated && !!bankAccountId && !!startDate && !!endDate,
  })

  const selectedBankAccount = bankAccounts.find(acc => acc.id === bankAccountId)

  const handlePrint = () => {
    window.print()
  }

  const getTotalCredits = () => {
    return statement
      .filter(entry => entry.type === 'C')
      .reduce((sum, entry) => sum + parseFloat(entry.amount), 0)
  }

  const getTotalDebits = () => {
    return statement
      .filter(entry => entry.type === 'D')
      .reduce((sum, entry) => sum + parseFloat(entry.amount), 0)
  }

  if (authLoading || !isAuthenticated) {
    return null
  }

  return (
    <PageContainer>
      <PageHeader>
        <h1 className="text-xl sm:text-2xl font-semibold">Extrato Bancário</h1>
      </PageHeader>

      <div className="space-y-6">
        {/* Filters Card */}
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Filtros do Extrato
            </CardTitle>
            <CardDescription>
              Selecione o banco e o período para gerar o extrato
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank-account">Conta Bancária *</Label>
                <Select
                  value={bankAccountId}
                  onValueChange={setBankAccountId}
                >
                  <SelectTrigger id="bank-account" data-testid="select-bank-account">
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account, idx) => (
                      <SelectItem 
                        key={account.id} 
                        value={account.id}
                        data-testid={`select-bank-option-${idx}`}
                      >
                        {account.name} {account.bankName && `- ${account.bankName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-date">Data Inicial *</Label>
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
                <Label htmlFor="end-date">Data Final *</Label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="input-end-date"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => refetch()}
                disabled={!bankAccountId || !startDate || !endDate}
                data-testid="button-generate-statement"
              >
                Gerar Extrato
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statement Report */}
        {statement.length > 0 && (
          <Card className="print:shadow-none">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-2xl">
                    Extrato Bancário - {selectedBankAccount?.name}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Período: {format(new Date(startDate), 'dd/MM/yyyy')} a {format(new Date(endDate), 'dd/MM/yyyy')}
                    {selectedBankAccount?.bankName && (
                      <span className="block">Banco: {selectedBankAccount.bankName}</span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2 print:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    data-testid="button-print-statement"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg print:bg-transparent print:border print:p-2">
                <div>
                  <p className="text-xs text-muted-foreground">Total de Créditos</p>
                  <p className="text-lg font-bold text-green-600 font-mono" data-testid="text-total-credits">
                    R$ {getTotalCredits().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total de Débitos</p>
                  <p className="text-lg font-bold text-red-600 font-mono" data-testid="text-total-debits">
                    R$ {getTotalDebits().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo Final</p>
                  <p className="text-lg font-bold font-mono" data-testid="text-final-balance">
                    R$ {parseFloat(statement[statement.length - 1]?.balance || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Table View */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-center">C/D</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Fornecedor/Cliente</TableHead>
                      <TableHead>Conta Contábil</TableHead>
                      <TableHead>Centro de Custo</TableHead>
                      <TableHead>Nº Doc</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statement.map((entry, idx) => (
                      <TableRow 
                        key={`${entry.transactionId}-${idx}`}
                        data-testid={`statement-entry-${idx}`}
                      >
                        <TableCell className="whitespace-nowrap" data-testid={`cell-date-${idx}`}>
                          {format(new Date(entry.date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-center" data-testid={`cell-type-${idx}`}>
                          <span 
                            className={`font-bold ${
                              entry.type === 'C' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {entry.type}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" data-testid={`cell-description-${idx}`}>
                          {entry.description}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" data-testid={`cell-entity-${idx}`}>
                          {entry.entityName || '-'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm" data-testid={`cell-account-${idx}`}>
                          {entry.accountName ? (
                            <span title={entry.accountCode ? `${entry.accountCode} - ${entry.accountName}` : entry.accountName}>
                              {entry.accountName}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-center" data-testid={`cell-cost-center-${idx}`}>
                          {entry.costCenterCode ? (
                            <span title={entry.costCenterName || ''}>
                              {entry.costCenterCode}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`cell-document-${idx}`}>
                          {entry.documentNumber || '-'}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-semibold ${
                          entry.type === 'C' ? 'text-green-600' : 'text-red-600'
                        }`} data-testid={`cell-amount-${idx}`}>
                          {entry.type === 'C' ? '+' : '-'}R$ {parseFloat(entry.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold" data-testid={`cell-balance-${idx}`}>
                          R$ {parseFloat(entry.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {statement.length === 0 && !isLoading && bankAccountId && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhum lançamento encontrado</p>
              <p className="text-sm text-muted-foreground mt-2">
                Não há transações para o período selecionado
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  )
}
