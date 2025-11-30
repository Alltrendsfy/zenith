import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle2, RefreshCw, ArrowUpDown } from "lucide-react"
import { apiRequest, queryClient } from "@/lib/queryClient"
import type { AccountsPayable, AccountsReceivable, CostCenter } from "@shared/schema"
import { formatDateBR } from "@/lib/date-utils"

export default function BatchCostCenter() {
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const [selectedPayableIds, setSelectedPayableIds] = useState<string[]>([])
  const [selectedReceivableIds, setSelectedReceivableIds] = useState<string[]>([])
  const [selectedCostCenterPayable, setSelectedCostCenterPayable] = useState<string>("")
  const [selectedCostCenterReceivable, setSelectedCostCenterReceivable] = useState<string>("")

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

  const isManager = user?.role === 'admin' || user?.role === 'gerente'

  const { data: payablesWithoutCC = [], isLoading: isLoadingPayables, refetch: refetchPayables } = useQuery<AccountsPayable[]>({
    queryKey: ["/api/accounts-payable/without-cost-center"],
    enabled: isAuthenticated && isManager,
  })

  const { data: receivablesWithoutCC = [], isLoading: isLoadingReceivables, refetch: refetchReceivables } = useQuery<AccountsReceivable[]>({
    queryKey: ["/api/accounts-receivable/without-cost-center"],
    enabled: isAuthenticated && isManager,
  })

  const { data: costCenters = [] } = useQuery<CostCenter[]>({
    queryKey: ["/api/cost-centers"],
    enabled: isAuthenticated,
  })

  const batchUpdatePayableMutation = useMutation({
    mutationFn: async ({ payableIds, costCenterId }: { payableIds: string[], costCenterId: string }) => {
      const res = await apiRequest('PATCH', '/api/accounts-payable/batch-update-cost-center', { payableIds, costCenterId })
      return await res.json()
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sucesso",
        description: data.message || "Contas a pagar atualizadas com sucesso",
      })
      setSelectedPayableIds([])
      setSelectedCostCenterPayable("")
      refetchPayables()
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-payable"] })
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar contas a pagar",
        variant: "destructive",
      })
    },
  })

  const batchUpdateReceivableMutation = useMutation({
    mutationFn: async ({ receivableIds, costCenterId }: { receivableIds: string[], costCenterId: string }) => {
      const res = await apiRequest('PATCH', '/api/accounts-receivable/batch-update-cost-center', { receivableIds, costCenterId })
      return await res.json()
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sucesso",
        description: data.message || "Contas a receber atualizadas com sucesso",
      })
      setSelectedReceivableIds([])
      setSelectedCostCenterReceivable("")
      refetchReceivables()
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-receivable"] })
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar contas a receber",
        variant: "destructive",
      })
    },
  })

  const handleSelectAllPayables = (checked: boolean) => {
    if (checked) {
      setSelectedPayableIds(payablesWithoutCC.map(p => p.id))
    } else {
      setSelectedPayableIds([])
    }
  }

  const handleSelectAllReceivables = (checked: boolean) => {
    if (checked) {
      setSelectedReceivableIds(receivablesWithoutCC.map(r => r.id))
    } else {
      setSelectedReceivableIds([])
    }
  }

  const handlePayableCheckbox = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedPayableIds([...selectedPayableIds, id])
    } else {
      setSelectedPayableIds(selectedPayableIds.filter(pid => pid !== id))
    }
  }

  const handleReceivableCheckbox = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedReceivableIds([...selectedReceivableIds, id])
    } else {
      setSelectedReceivableIds(selectedReceivableIds.filter(rid => rid !== id))
    }
  }

  const handleUpdatePayables = () => {
    if (selectedPayableIds.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos uma conta a pagar",
        variant: "destructive",
      })
      return
    }
    if (!selectedCostCenterPayable) {
      toast({
        title: "Atenção",
        description: "Selecione um centro de custo",
        variant: "destructive",
      })
      return
    }
    batchUpdatePayableMutation.mutate({
      payableIds: selectedPayableIds,
      costCenterId: selectedCostCenterPayable,
    })
  }

  const handleUpdateReceivables = () => {
    if (selectedReceivableIds.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos uma conta a receber",
        variant: "destructive",
      })
      return
    }
    if (!selectedCostCenterReceivable) {
      toast({
        title: "Atenção",
        description: "Selecione um centro de custo",
        variant: "destructive",
      })
      return
    }
    batchUpdateReceivableMutation.mutate({
      receivableIds: selectedReceivableIds,
      costCenterId: selectedCostCenterReceivable,
    })
  }

  const formatCurrency = (value: string) => {
    const num = parseFloat(value)
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num)
  }

  if (authLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    )
  }

  if (!isManager) {
    return (
      <PageContainer>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Atualização em Lote</h1>
          <p className="text-muted-foreground">Atribuir centro de custo a múltiplas contas</p>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
              <p className="text-muted-foreground">
                Apenas administradores e gerentes podem acessar esta funcionalidade.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  const totalPayables = payablesWithoutCC.length
  const totalReceivables = receivablesWithoutCC.length
  const totalWithoutCC = totalPayables + totalReceivables

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Atualização em Lote</h1>
        <p className="text-muted-foreground">Atribuir centro de custo a múltiplas contas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sem Centro de Custo</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-without-cc">{totalWithoutCC}</div>
            <p className="text-xs text-muted-foreground">contas pendentes de atribuição</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas a Pagar</CardTitle>
            <Badge variant="outline">{totalPayables}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-payables-count">{totalPayables}</div>
            <p className="text-xs text-muted-foreground">sem centro de custo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas a Receber</CardTitle>
            <Badge variant="outline">{totalReceivables}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-receivables-count">{totalReceivables}</div>
            <p className="text-xs text-muted-foreground">sem centro de custo</p>
          </CardContent>
        </Card>
      </div>

      {totalWithoutCC === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Tudo Certo!</h3>
              <p className="text-muted-foreground">
                Todas as contas já possuem centro de custo atribuído.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="payables" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payables" data-testid="tab-payables">
              Contas a Pagar ({totalPayables})
            </TabsTrigger>
            <TabsTrigger value="receivables" data-testid="tab-receivables">
              Contas a Receber ({totalReceivables})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payables">
            <Card>
              <CardHeader>
                <CardTitle>Contas a Pagar sem Centro de Custo</CardTitle>
                <CardDescription>
                  Selecione as contas e atribua um centro de custo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {totalPayables === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    Nenhuma conta a pagar sem centro de custo
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                      <div className="flex-1">
                        <Select
                          value={selectedCostCenterPayable}
                          onValueChange={setSelectedCostCenterPayable}
                        >
                          <SelectTrigger data-testid="select-cost-center-payable">
                            <SelectValue placeholder="Selecione o Centro de Custo" />
                          </SelectTrigger>
                          <SelectContent>
                            {costCenters.map((cc) => (
                              <SelectItem key={cc.id} value={cc.id}>
                                {cc.code} - {cc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleUpdatePayables}
                        disabled={selectedPayableIds.length === 0 || !selectedCostCenterPayable || batchUpdatePayableMutation.isPending}
                        data-testid="button-update-payables"
                      >
                        {batchUpdatePayableMutation.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Atualizando...
                          </>
                        ) : (
                          <>
                            <ArrowUpDown className="mr-2 h-4 w-4" />
                            Atualizar Selecionadas ({selectedPayableIds.length})
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedPayableIds.length === payablesWithoutCC.length && payablesWithoutCC.length > 0}
                                onCheckedChange={handleSelectAllPayables}
                                data-testid="checkbox-select-all-payables"
                              />
                            </TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payablesWithoutCC.map((payable) => (
                            <TableRow key={payable.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedPayableIds.includes(payable.id)}
                                  onCheckedChange={(checked) => handlePayableCheckbox(payable.id, checked as boolean)}
                                  data-testid={`checkbox-payable-${payable.id}`}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{payable.description}</TableCell>
                              <TableCell>{formatDateBR(payable.dueDate)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(payable.totalAmount)}</TableCell>
                              <TableCell>
                                <Badge variant={payable.status === 'pendente' ? 'secondary' : 'default'}>
                                  {payable.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receivables">
            <Card>
              <CardHeader>
                <CardTitle>Contas a Receber sem Centro de Custo</CardTitle>
                <CardDescription>
                  Selecione as contas e atribua um centro de custo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {totalReceivables === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    Nenhuma conta a receber sem centro de custo
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                      <div className="flex-1">
                        <Select
                          value={selectedCostCenterReceivable}
                          onValueChange={setSelectedCostCenterReceivable}
                        >
                          <SelectTrigger data-testid="select-cost-center-receivable">
                            <SelectValue placeholder="Selecione o Centro de Custo" />
                          </SelectTrigger>
                          <SelectContent>
                            {costCenters.map((cc) => (
                              <SelectItem key={cc.id} value={cc.id}>
                                {cc.code} - {cc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleUpdateReceivables}
                        disabled={selectedReceivableIds.length === 0 || !selectedCostCenterReceivable || batchUpdateReceivableMutation.isPending}
                        data-testid="button-update-receivables"
                      >
                        {batchUpdateReceivableMutation.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Atualizando...
                          </>
                        ) : (
                          <>
                            <ArrowUpDown className="mr-2 h-4 w-4" />
                            Atualizar Selecionadas ({selectedReceivableIds.length})
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedReceivableIds.length === receivablesWithoutCC.length && receivablesWithoutCC.length > 0}
                                onCheckedChange={handleSelectAllReceivables}
                                data-testid="checkbox-select-all-receivables"
                              />
                            </TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {receivablesWithoutCC.map((receivable) => (
                            <TableRow key={receivable.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedReceivableIds.includes(receivable.id)}
                                  onCheckedChange={(checked) => handleReceivableCheckbox(receivable.id, checked as boolean)}
                                  data-testid={`checkbox-receivable-${receivable.id}`}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{receivable.description}</TableCell>
                              <TableCell>{formatDateBR(receivable.dueDate)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(receivable.totalAmount)}</TableCell>
                              <TableCell>
                                <Badge variant={receivable.status === 'pendente' ? 'secondary' : 'default'}>
                                  {receivable.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </PageContainer>
  )
}
