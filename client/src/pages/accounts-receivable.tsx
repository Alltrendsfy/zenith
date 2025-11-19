import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { isUnauthorizedError } from "@/lib/authUtils"
import { PageHeader } from "@/components/page-header"
import { PageContainer } from "@/components/page-container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, FileText, Search } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { StatusBadge } from "@/components/status-badge"
import { EmptyState } from "@/components/empty-state"
import { MobileCardList, type MobileCardProps } from "@/components/mobile-card-list"
import { MobileFormActions } from "@/components/mobile-form-actions"
import { AllocationManager, type AllocationInput } from "@/components/allocation-manager"
import { apiRequest, queryClient } from "@/lib/queryClient"
import type { AccountsReceivable, Customer } from "@shared/schema"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"

const formSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  totalAmount: z.string().min(1, "Valor é obrigatório"),
  dueDate: z.string().min(1, "Data de vencimento é obrigatória"),
  issueDate: z.string().min(1, "Data de emissão é obrigatória"),
  documentNumber: z.string().optional(),
  notes: z.string().optional(),
  recurrenceType: z.enum(['unica', 'mensal', 'trimestral', 'anual']).default('unica'),
  recurrenceStartDate: z.string().optional(),
  recurrenceEndDate: z.string().optional(),
}).refine((data) => {
  // Se recorrência não for única, deve ter data de início
  if (data.recurrenceType !== 'unica' && !data.recurrenceStartDate) {
    return false;
  }
  return true;
}, {
  message: "Data de início é obrigatória para recebimentos recorrentes",
  path: ["recurrenceStartDate"],
})

export default function AccountsReceivable() {
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [allocations, setAllocations] = useState<AllocationInput[]>([])

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

  const { data: receivables, isLoading } = useQuery<AccountsReceivable[]>({
    queryKey: ["/api/accounts-receivable"],
    enabled: isAuthenticated,
  })

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: isAuthenticated,
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      customerId: "",
      customerName: "",
      totalAmount: "",
      dueDate: "",
      issueDate: "",
      documentNumber: "",
      notes: "",
      recurrenceType: "unica",
      recurrenceStartDate: "",
      recurrenceEndDate: "",
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Prepare recurrence data
      const recurrenceData = data.recurrenceType !== 'unica' ? {
        recurrenceType: data.recurrenceType,
        recurrenceStatus: 'ativa' as const,
        recurrenceStartDate: data.recurrenceStartDate,
        recurrenceEndDate: data.recurrenceEndDate || null,
        recurrenceNextDate: data.recurrenceStartDate, // First occurrence
      } : {
        recurrenceType: 'unica' as const,
      };

      const res = await apiRequest("POST", "/api/accounts-receivable", {
        ...data,
        totalAmount: data.totalAmount,
        ...recurrenceData,
      })
      const response = await res.json()
      
      // Save allocations if configured
      if (allocations.length > 0 && response.id) {
        await apiRequest("POST", `/api/accounts-receivable/${response.id}/allocations`, {
          allocations,
        })
      }
      
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-receivable"] })
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] })
      toast({
        title: "Sucesso",
        description: "Conta a receber criada com sucesso",
      })
      setOpen(false)
      form.reset()
      setAllocations([])
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Não autorizado",
          description: "Você precisa fazer login novamente...",
          variant: "destructive",
        })
        setTimeout(() => {
          window.location.href = "/api/login"
        }, 500)
        return
      }
      toast({
        title: "Erro",
        description: "Falha ao criar conta a receber",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Validate allocations if configured
    if (allocations.length > 0) {
      const totalPercentage = allocations.reduce((sum, a) => sum + (a.percentage || 0), 0)
      const isValid = Math.abs(totalPercentage - 100) < 0.01
      
      if (!isValid) {
        toast({
          title: "Erro de validação",
          description: "Os percentuais de rateio devem somar exatamente 100%",
          variant: "destructive",
        })
        return
      }

      // Check if all cost centers are selected
      if (allocations.some(a => !a.costCenterId)) {
        toast({
          title: "Erro de validação",
          description: "Selecione um centro de custo para cada linha de rateio",
          variant: "destructive",
        })
        return
      }
    }

    createMutation.mutate(data)
  }

  if (authLoading || !isAuthenticated) {
    return null
  }

  const getCustomerName = (receivable: AccountsReceivable) => {
    if (receivable.customerId && customers) {
      const customer = customers.find(c => c.id === receivable.customerId)
      return customer ? `${customer.razaoSocial}${customer.nomeFantasia ? ` (${customer.nomeFantasia})` : ''}` : receivable.customerName || "-"
    }
    return receivable.customerName || "-"
  }

  const filteredReceivables = receivables?.filter(r =>
    r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCustomerName(r).toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <PageContainer>
      <PageHeader>
        <h1 className="text-xl sm:text-2xl font-semibold">Contas a Receber</h1>
      </PageHeader>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar contas..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search"
            />
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-receivable">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Conta a Receber
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nova Conta a Receber</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Descrição *</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Cliente ABC - Serviços" {...field} data-testid="input-description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="customerId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cliente</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value === "MANUAL" ? "" : value)
                                }}
                                value={field.value || "MANUAL"}
                                data-testid="select-customer"
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um cliente" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="MANUAL" data-testid="select-customer-none">
                                    Nenhum (informar manualmente)
                                  </SelectItem>
                                  {customers?.map((customer) => (
                                    <SelectItem 
                                      key={customer.id} 
                                      value={customer.id}
                                      data-testid={`select-customer-${customer.id}`}
                                    >
                                      {customer.razaoSocial}
                                      {customer.nomeFantasia && ` (${customer.nomeFantasia})`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {!form.watch("customerId") && (
                          <FormField
                            control={form.control}
                            name="customerName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome do Cliente (manual)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Digite o nome" {...field} data-testid="input-customer-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name="totalAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor Total *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="font-mono text-right"
                                  {...field}
                                  data-testid="input-amount"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="issueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data de Emissão *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value)}
                                  data-testid="input-issue-date" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data de Vencimento *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value)}
                                  data-testid="input-due-date" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="recurrenceType"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Tipo de Recorrência</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                data-testid="select-recurrence-type"
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="unica">Única (sem recorrência)</SelectItem>
                                  <SelectItem value="mensal">Mensal</SelectItem>
                                  <SelectItem value="trimestral">Trimestral</SelectItem>
                                  <SelectItem value="anual">Anual</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {form.watch("recurrenceType") !== "unica" && (
                          <>
                            <FormField
                              control={form.control}
                              name="recurrenceStartDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Data de Início da Recorrência *</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="date" 
                                      {...field}
                                      value={field.value || ''}
                                      onChange={(e) => field.onChange(e.target.value)}
                                      data-testid="input-recurrence-start-date" 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="recurrenceEndDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Data de Término (opcional)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="date" 
                                      {...field}
                                      value={field.value || ''}
                                      onChange={(e) => field.onChange(e.target.value)}
                                      data-testid="input-recurrence-end-date" 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        <FormField
                          control={form.control}
                          name="documentNumber"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Número do Documento</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: NF-12345" {...field} data-testid="input-document" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Observações</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Observações adicionais..." {...field} data-testid="input-notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="pt-4 border-t">
                        <AllocationManager
                          value={allocations}
                          onChange={setAllocations}
                          totalAmount={parseFloat(form.watch("totalAmount") || "0")}
                        />
                      </div>

                      <MobileFormActions>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                          {createMutation.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                      </MobileFormActions>
                    </form>
                  </Form>
                </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Lista de Contas a Receber</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : !filteredReceivables || filteredReceivables.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nenhuma conta a receber"
                description="Você ainda não cadastrou contas a receber. Clique no botão acima para adicionar a primeira."
                actionLabel="Nova Conta a Receber"
                onAction={() => setOpen(true)}
              />
            ) : (
              <>
                <div className="md:hidden">
                  <MobileCardList
                    items={filteredReceivables}
                    renderCard={(receivable): MobileCardProps => ({
                      title: receivable.description,
                      titleIcon: <FileText className="h-4 w-4 text-primary" />,
                      fields: [
                        {
                          label: "Cliente",
                          value: getCustomerName(receivable),
                        },
                        {
                          label: "Vencimento",
                          value: format(new Date(receivable.dueDate), 'dd/MM/yyyy'),
                        },
                        {
                          label: "Valor Total",
                          value: `R$ ${parseFloat(receivable.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                          className: "text-lg font-bold font-mono",
                        },
                        {
                          label: "Status",
                          value: receivable.status || 'pendente',
                          isBadge: true,
                          badgeVariant: receivable.status === 'pago' ? 'default' : receivable.status === 'vencido' ? 'destructive' : 'secondary',
                        },
                      ],
                    })}
                    emptyMessage="Nenhuma conta a receber encontrada"
                  />
                </div>
                
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Recorrência</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReceivables.map((receivable) => (
                        <TableRow key={receivable.id} className="hover-elevate">
                          <TableCell className="font-medium">{receivable.description}</TableCell>
                          <TableCell>{getCustomerName(receivable)}</TableCell>
                          <TableCell>{format(new Date(receivable.dueDate), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-right font-mono">
                            R$ {parseFloat(receivable.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={receivable.status || 'pendente'} />
                          </TableCell>
                          <TableCell>
                            {receivable.recurrenceType && receivable.recurrenceType !== 'unica' ? (
                              <Badge variant="outline" className="text-xs">
                                {receivable.recurrenceType === 'mensal' && '🔄 Mensal'}
                                {receivable.recurrenceType === 'trimestral' && '🔄 Trimestral'}
                                {receivable.recurrenceType === 'anual' && '🔄 Anual'}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
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
      </div>
    </PageContainer>
  )
}
