import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
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
import { Plus, FileText, Search, DollarSign, Pencil, Trash2 } from "lucide-react"
import { PaymentSettlementDialog } from "@/components/payment-settlement-dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { StatusBadge } from "@/components/status-badge"
import { EmptyState } from "@/components/empty-state"
import { MobileCardList, type MobileCardProps } from "@/components/mobile-card-list"
import { MobileFormActions } from "@/components/mobile-form-actions"
import { AllocationManager, type AllocationInput } from "@/components/allocation-manager"
import { RecurrencePreview, type RecurrenceInstallment } from "@/components/recurrence-preview"
import { DatePicker } from "@/components/ui/date-picker"
import { apiRequest, queryClient } from "@/lib/queryClient"
import type { AccountsReceivable, Customer, ChartOfAccounts } from "@shared/schema"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { formatDateBR } from "@/lib/date-utils"

const formSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  totalAmount: z.string().min(1, "Valor é obrigatório"),
  dueDate: z.string().min(1, "Data de vencimento é obrigatória"),
  issueDate: z.string().min(1, "Data de emissão é obrigatória"),
  documentNumber: z.string().optional(),
  notes: z.string().optional(),
  accountId: z.string().optional(),
  costCenterId: z.string().optional(),
  recurrenceType: z.enum(['unica', 'mensal', 'trimestral', 'anual']).default('unica'),
  recurrenceCount: z.string().optional(),
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
}).refine((data) => {
  // Se recorrência não for única, deve ter quantidade de parcelas
  if (data.recurrenceType !== 'unica' && (!data.recurrenceCount || parseInt(data.recurrenceCount) < 1)) {
    return false;
  }
  return true;
}, {
  message: "Quantidade de parcelas deve ser no mínimo 1",
  path: ["recurrenceCount"],
})

export default function AccountsReceivable() {
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { canCreate, canUpdate, canDelete } = usePermissions()
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [allocations, setAllocations] = useState<AllocationInput[]>([])
  const [recurrenceInstallments, setRecurrenceInstallments] = useState<RecurrenceInstallment[]>([])
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedReceivable, setSelectedReceivable] = useState<AccountsReceivable | null>(null)
  const [editingReceivable, setEditingReceivable] = useState<AccountsReceivable | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [receivableToDelete, setReceivableToDelete] = useState<AccountsReceivable | null>(null)

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

  const { data: chartOfAccounts, isLoading: isLoadingAccounts } = useQuery<ChartOfAccounts[]>({
    queryKey: ["/api/chart-of-accounts", { classification: "credit" }],
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
      accountId: "",
      costCenterId: "",
      recurrenceType: "unica",
      recurrenceCount: "",
      recurrenceStartDate: "",
      recurrenceEndDate: "",
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Check if we have recurrence installments to create in batch
      if (recurrenceInstallments.length > 0) {
        // Create all installments in batch
        const installments = recurrenceInstallments.map((inst, index) => ({
          description: data.description,
          customerId: data.customerId || null,
          customerName: data.customerName || null,
          totalAmount: inst.amount,
          dueDate: inst.dueDate,
          issueDate: data.issueDate,
          documentNumber: data.documentNumber || null,
          notes: data.notes || null,
          accountId: data.accountId || null,
          costCenterId: data.costCenterId || null,
          recurrenceType: data.recurrenceType,
          recurrenceStatus: 'ativa' as const,
          recurrenceStartDate: data.recurrenceStartDate || null,
          recurrenceEndDate: data.recurrenceEndDate || null,
          recurrenceNextDate: null,
          parentReceivableId: index === 0 ? null : undefined,
        }));

        const res = await apiRequest("POST", "/api/accounts-receivable/batch", {
          installments,
        });
        const response = await res.json();
        
        // Save allocations for the first installment if configured
        if (allocations.length > 0 && response.length > 0) {
          await apiRequest("POST", `/api/accounts-receivable/${response[0].id}/allocations`, {
            allocations,
          });
        }
        
        return response;
      }

      // Single account receivable (no recurrence or unica)
      const recurrenceData = data.recurrenceType !== 'unica' ? {
        recurrenceType: data.recurrenceType,
        recurrenceStatus: 'ativa' as const,
        recurrenceStartDate: data.recurrenceStartDate,
        recurrenceEndDate: data.recurrenceEndDate || null,
        recurrenceNextDate: data.recurrenceStartDate,
      } : {
        recurrenceType: 'unica' as const,
      };

      const res = await apiRequest("POST", "/api/accounts-receivable", {
        ...data,
        // Convert empty strings to null for foreign keys
        customerId: data.customerId || null,
        customerName: data.customerName || null,
        accountId: data.accountId || null,
        costCenterId: data.costCenterId || null,
        documentNumber: data.documentNumber || null,
        notes: data.notes || null,
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-receivable"] })
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] })
      const isArray = Array.isArray(data);
      const count = isArray ? data.length : 1;
      toast({
        title: "Sucesso",
        description: isArray 
          ? `${count} parcelas criadas com sucesso`
          : "Conta a receber criada com sucesso",
      })
      setOpen(false)
      form.reset()
      setAllocations([])
      setRecurrenceInstallments([])
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

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      if (!editingReceivable) throw new Error("No receivable selected")
      const res = await apiRequest("PATCH", `/api/accounts-receivable/${editingReceivable.id}`, {
        ...data,
        customerId: data.customerId || null,
        customerName: data.customerName || null,
        accountId: data.accountId || null,
        costCenterId: data.costCenterId || null,
        documentNumber: data.documentNumber || null,
        notes: data.notes || null,
      })
      const response = await res.json()
      
      // Update allocations - delete old ones and create new ones
      if (allocations.length > 0) {
        await apiRequest("POST", `/api/accounts-receivable/${editingReceivable.id}/allocations`, {
          allocations,
        })
      } else {
        // If no allocations, delete all existing ones (if any exist)
        try {
          await apiRequest("DELETE", `/api/accounts-receivable/${editingReceivable.id}/allocations`)
        } catch (e) {
          // Ignore errors if no allocations existed
        }
      }
      
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-receivable"] })
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] })
      toast({
        title: "Sucesso",
        description: "Conta a receber atualizada com sucesso",
      })
      setEditingReceivable(null)
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
        description: "Falha ao atualizar conta a receber",
        variant: "destructive",
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounts-receivable/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-receivable"] })
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] })
      toast({
        title: "Sucesso",
        description: "Conta a receber excluída com sucesso",
      })
      setDeleteDialogOpen(false)
      setReceivableToDelete(null)
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
        description: "Falha ao excluir conta a receber",
        variant: "destructive",
      })
    },
  })

  const handleEdit = (receivable: AccountsReceivable) => {
    setEditingReceivable(receivable)
    setRecurrenceInstallments([])
    setAllocations([])
    form.reset({
      description: receivable.description,
      customerId: receivable.customerId || "",
      customerName: receivable.customerName || "",
      totalAmount: receivable.totalAmount,
      dueDate: format(new Date(receivable.dueDate), 'yyyy-MM-dd'),
      issueDate: format(new Date(receivable.issueDate), 'yyyy-MM-dd'),
      documentNumber: receivable.documentNumber || "",
      notes: receivable.notes || "",
      accountId: receivable.accountId || "",
      costCenterId: receivable.costCenterId || "",
      recurrenceType: 'unica',
      recurrenceCount: "",
      recurrenceStartDate: "",
      recurrenceEndDate: "",
    })
    setOpen(true)
  }

  const handleDelete = (receivable: AccountsReceivable) => {
    setReceivableToDelete(receivable)
    setDeleteDialogOpen(true)
  }

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

    if (editingReceivable) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
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

  // Calculate display amount: for "parcial", show remaining balance; otherwise show total
  const getDisplayAmount = (receivable: AccountsReceivable): number => {
    if (receivable.status === 'parcial') {
      const total = parseFloat(receivable.totalAmount);
      const received = parseFloat(receivable.amountReceived || '0');
      return total - received;
    }
    return parseFloat(receivable.totalAmount);
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

          <Dialog open={open} onOpenChange={(value) => {
            setOpen(value)
            if (!value) {
              setEditingReceivable(null)
              form.reset()
              setAllocations([])
            }
          }}>
                <DialogTrigger asChild>
                  <Button disabled={!canCreate} data-testid="button-add-receivable">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Conta a Receber
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingReceivable ? "Editar Conta a Receber" : "Nova Conta a Receber"}</DialogTitle>
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
                                <DatePicker
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Selecione a data"
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
                                <DatePicker
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Selecione a data"
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
                                  <SelectTrigger data-testid="trigger-recurrence-type">
                                    <SelectValue placeholder="Selecione o tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="unica" data-testid="select-recurrence-unica">Única (sem recorrência)</SelectItem>
                                  <SelectItem value="mensal" data-testid="select-recurrence-mensal">Mensal</SelectItem>
                                  <SelectItem value="trimestral" data-testid="select-recurrence-trimestral">Trimestral</SelectItem>
                                  <SelectItem value="anual" data-testid="select-recurrence-anual">Anual</SelectItem>
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
                              name="recurrenceCount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quantidade de Parcelas *</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number"
                                      min="1"
                                      placeholder="Ex: 12"
                                      {...field}
                                      value={field.value || ''}
                                      onChange={(e) => field.onChange(e.target.value)}
                                      data-testid="input-recurrence-count" 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="recurrenceStartDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Data de Início da Recorrência *</FormLabel>
                                  <FormControl>
                                    <DatePicker
                                      value={field.value || ''}
                                      onChange={field.onChange}
                                      placeholder="Selecione a data"
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
                                    <DatePicker
                                      value={field.value || ''}
                                      onChange={field.onChange}
                                      placeholder="Selecione a data"
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
                          name="accountId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Conta Contábil</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(value === "NONE" ? "" : value)}
                                value={field.value || "NONE"}
                                data-testid="select-account"
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-account-trigger">
                                    <SelectValue placeholder="Selecione uma conta" data-testid="select-account-value" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingAccounts ? (
                                    <SelectItem value="LOADING" disabled data-testid="select-account-loading">
                                      Carregando contas...
                                    </SelectItem>
                                  ) : (
                                    <>
                                      <SelectItem value="NONE" data-testid="select-account-none">
                                        Nenhuma
                                      </SelectItem>
                                      {chartOfAccounts?.filter(acc => acc.nature === 'analitica').map((account) => (
                                        <SelectItem 
                                          key={account.id} 
                                          value={account.id}
                                          data-testid={`select-account-${account.id}`}
                                        >
                                          {account.code} - {account.name}
                                        </SelectItem>
                                      ))}
                                      {chartOfAccounts?.filter(acc => acc.nature === 'analitica').length === 0 && (
                                        <SelectItem value="EMPTY" disabled data-testid="select-account-empty">
                                          Nenhuma conta analítica disponível
                                        </SelectItem>
                                      )}
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="documentNumber"
                          render={({ field }) => (
                            <FormItem>
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

                      {form.watch("recurrenceType") !== "unica" && (
                        <div className="pt-4">
                          <RecurrencePreview
                            recurrenceType={form.watch("recurrenceType")}
                            recurrenceCount={form.watch("recurrenceCount") || ""}
                            recurrenceStartDate={form.watch("recurrenceStartDate") || ""}
                            baseAmount={form.watch("totalAmount") || ""}
                            onInstallmentsChange={setRecurrenceInstallments}
                          />
                        </div>
                      )}

                      <MobileFormActions>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                          {(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : "Salvar"}
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
                          value: formatDateBR(receivable.dueDate),
                        },
                        {
                          label: "Valor",
                          value: `R$ ${getDisplayAmount(receivable).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                          className: "text-lg font-bold font-mono",
                        },
                        {
                          label: "Status",
                          value: receivable.status || 'pendente',
                          isBadge: true,
                          badgeVariant: receivable.status === 'pago' ? 'default' : receivable.status === 'vencido' ? 'destructive' : 'secondary',
                        },
                        ...(receivable.recurrenceType && receivable.recurrenceType !== 'unica' ? [{
                          label: "Recorrência",
                          value: receivable.recurrenceType === 'mensal' ? 'Mensal' : receivable.recurrenceType === 'trimestral' ? 'Trimestral' : 'Anual',
                          isBadge: true,
                          badgeVariant: 'outline' as const,
                        }] : []),
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
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReceivables.map((receivable) => (
                        <TableRow key={receivable.id} className="hover-elevate">
                          <TableCell className="font-medium">{receivable.description}</TableCell>
                          <TableCell>{getCustomerName(receivable)}</TableCell>
                          <TableCell>{formatDateBR(receivable.dueDate)}</TableCell>
                          <TableCell className="text-right font-mono">
                            R$ {getDisplayAmount(receivable).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={!canUpdate}
                                onClick={() => handleEdit(receivable)}
                                data-testid={`button-edit-${receivable.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={!canDelete || receivable.status !== 'pendente'}
                                onClick={() => handleDelete(receivable)}
                                data-testid={`button-delete-${receivable.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedReceivable(receivable)
                                  setPaymentDialogOpen(true)
                                }}
                                disabled={receivable.status === 'pago' || receivable.status === 'cancelado'}
                                data-testid={`button-baixa-${receivable.id}`}
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                Baixar
                              </Button>
                            </div>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta a receber? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover-elevate active-elevate-2"
              onClick={() => {
                if (receivableToDelete) {
                  deleteMutation.mutate(Number(receivableToDelete.id))
                }
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedReceivable && (
        <PaymentSettlementDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          transactionId={selectedReceivable.id}
          transactionType="receivable"
          description={selectedReceivable.description}
          totalAmount={selectedReceivable.totalAmount}
          amountPaid={selectedReceivable.amountReceived || "0"}
          onSuccess={() => {
            setSelectedReceivable(null)
          }}
        />
      )}
    </PageContainer>
  )
}
