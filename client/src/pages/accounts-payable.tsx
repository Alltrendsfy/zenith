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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Receipt, Search, DollarSign, Pencil, Trash2, Paperclip, FileText, Download, ExternalLink } from "lucide-react"
import { PaymentSettlementDialog } from "@/components/payment-settlement-dialog"
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
import { ObjectUploader } from "@/components/ObjectUploader"
import { apiRequest, queryClient } from "@/lib/queryClient"
import type { AccountsPayable, Supplier, ChartOfAccounts } from "@shared/schema"
import { format } from "date-fns"
import { formatDateBR } from "@/lib/date-utils"

const formSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
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
  attachmentUrl: z.string().optional(),
  attachmentFilename: z.string().optional(),
}).refine((data) => {
  // Se recorrência não for única, deve ter data de início
  if (data.recurrenceType !== 'unica' && !data.recurrenceStartDate) {
    return false;
  }
  return true;
}, {
  message: "Data de início é obrigatória para pagamentos recorrentes",
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

export default function AccountsPayable() {
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { canCreate, canUpdate, canDelete, canSettle } = usePermissions()
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [allocations, setAllocations] = useState<AllocationInput[]>([])
  const [recurrenceInstallments, setRecurrenceInstallments] = useState<RecurrenceInstallment[]>([])
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedPayable, setSelectedPayable] = useState<AccountsPayable | null>(null)
  const [editingPayable, setEditingPayable] = useState<AccountsPayable | null>(null)
  const [deletingPayable, setDeletingPayable] = useState<AccountsPayable | null>(null)
  const [documentUrl, setDocumentUrl] = useState<string>("")
  const [documentFilename, setDocumentFilename] = useState<string>("")

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

  const { data: payables, isLoading } = useQuery<AccountsPayable[]>({
    queryKey: ["/api/accounts-payable"],
    enabled: isAuthenticated,
  })

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    enabled: isAuthenticated,
  })

  const { data: chartOfAccounts, isLoading: isLoadingAccounts } = useQuery<ChartOfAccounts[]>({
    queryKey: ["/api/chart-of-accounts", { classification: "debit" }],
    enabled: isAuthenticated,
  })

  const handleGetUploadParameters = async () => {
    const res = await apiRequest("POST", "/api/objects/upload", {});
    const data = await res.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: { successful: { uploadURL: string; name: string }[] }) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const uploadURL = uploadedFile.uploadURL;
      const filename = uploadedFile.name;

      try {
        const res = await apiRequest("POST", "/api/documents/upload", {
          documentURL: uploadURL,
        });
        const data = await res.json();
        
        setDocumentUrl(data.objectPath);
        setDocumentFilename(filename);
        
        form.setValue("attachmentUrl", data.objectPath);
        form.setValue("attachmentFilename", filename);
        
        toast({
          title: "Sucesso",
          description: "Documento anexado com sucesso",
        });
      } catch (error) {
        console.error("Error setting document ACL:", error);
        toast({
          title: "Erro",
          description: "Falha ao processar documento",
          variant: "destructive",
        });
      }
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      supplierId: "",
      supplierName: "",
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
      attachmentUrl: "",
      attachmentFilename: "",
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Check if we have recurrence installments to create in batch
      if (recurrenceInstallments.length > 0) {
        // Create all installments in batch
        const installments = recurrenceInstallments.map((inst, index) => ({
          description: data.description,
          supplierId: data.supplierId || null,
          supplierName: data.supplierName || null,
          totalAmount: inst.amount,
          dueDate: inst.dueDate,
          issueDate: data.issueDate,
          documentNumber: data.documentNumber || null,
          notes: data.notes || null,
          chartOfAccountsId: data.accountId || null,
          costCenterId: data.costCenterId || null,
          recurrenceType: data.recurrenceType,
          recurrenceStatus: 'ativa' as const,
          recurrenceStartDate: data.recurrenceStartDate || null,
          recurrenceEndDate: data.recurrenceEndDate || null,
          recurrenceNextDate: null, // No next date for individual installments
          // Set parent ID only for non-first installments (they reference the first one)
          recurrenceParentId: index === 0 ? null : undefined, // Will be set to first installment's ID after creation
        }));

        const res = await apiRequest("POST", "/api/accounts-payable/batch", {
          installments,
        });
        const response = await res.json();
        
        // Save allocations for the first installment if configured
        if (allocations.length > 0 && response.length > 0) {
          await apiRequest("POST", `/api/accounts-payable/${response[0].id}/allocations`, {
            allocations,
          });
        }
        
        return response;
      }

      // Single account payable (no recurrence or unica)
      const recurrenceData = data.recurrenceType !== 'unica' ? {
        recurrenceType: data.recurrenceType,
        recurrenceStatus: 'ativa' as const,
        recurrenceStartDate: data.recurrenceStartDate,
        recurrenceEndDate: data.recurrenceEndDate || null,
        recurrenceNextDate: data.recurrenceStartDate,
      } : {
        recurrenceType: 'unica' as const,
      };

      const res = await apiRequest("POST", "/api/accounts-payable", {
        ...data,
        // Convert empty strings to null for foreign keys
        supplierId: data.supplierId || null,
        supplierName: data.supplierName || null,
        chartOfAccountsId: data.accountId || null,
        costCenterId: data.costCenterId || null,
        documentNumber: data.documentNumber || null,
        notes: data.notes || null,
        attachmentUrl: data.attachmentUrl || null,
        attachmentFilename: data.attachmentFilename || null,
        totalAmount: data.totalAmount,
        ...recurrenceData,
      })
      const response = await res.json()
      
      // Save allocations if configured
      if (allocations.length > 0 && response.id) {
        await apiRequest("POST", `/api/accounts-payable/${response.id}/allocations`, {
          allocations,
        })
      }
      
      return response
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-payable"] })
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] })
      const isArray = Array.isArray(data);
      const count = isArray ? data.length : 1;
      toast({
        title: "Sucesso",
        description: isArray 
          ? `${count} parcelas criadas com sucesso`
          : "Conta a pagar criada com sucesso",
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
        description: "Falha ao criar conta a pagar",
        variant: "destructive",
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      if (!editingPayable) throw new Error("No payable selected")
      const res = await apiRequest("PATCH", `/api/accounts-payable/${editingPayable.id}`, {
        ...data,
        supplierId: data.supplierId || null,
        supplierName: data.supplierName || null,
        chartOfAccountsId: data.accountId || null,
        costCenterId: data.costCenterId || null,
        documentNumber: data.documentNumber || null,
        notes: data.notes || null,
      })
      const response = await res.json()
      
      // Update allocations - delete old ones and create new ones
      if (allocations.length > 0) {
        await apiRequest("POST", `/api/accounts-payable/${editingPayable.id}/allocations`, {
          allocations,
        })
      } else {
        // If no allocations, delete all existing ones (if any exist)
        try {
          await apiRequest("DELETE", `/api/accounts-payable/${editingPayable.id}/allocations`)
        } catch (e) {
          // Ignore errors if no allocations existed
        }
      }
      
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-payable"] })
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] })
      toast({
        title: "Sucesso",
        description: "Conta a pagar atualizada com sucesso",
      })
      setEditingPayable(null)
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
        description: "Falha ao atualizar conta a pagar",
        variant: "destructive",
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/accounts-payable/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-payable"] })
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] })
      toast({
        title: "Sucesso",
        description: "Conta a pagar excluída com sucesso",
      })
      setDeletingPayable(null)
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
        description: "Falha ao excluir conta a pagar",
        variant: "destructive",
      })
    },
  })

  useEffect(() => {
    if (editingPayable) {
      // Load allocations first, then open dialog
      const loadAndOpenEdit = async () => {
        form.reset({
          description: editingPayable.description,
          supplierId: editingPayable.supplierId || "",
          supplierName: editingPayable.supplierName || "",
          totalAmount: editingPayable.totalAmount,
          dueDate: editingPayable.dueDate,
          issueDate: editingPayable.issueDate,
          documentNumber: editingPayable.documentNumber || "",
          notes: editingPayable.notes || "",
          accountId: editingPayable.accountId || "",
          costCenterId: editingPayable.costCenterId || "",
          recurrenceType: editingPayable.recurrenceType || "unica",
          recurrenceCount: "",
          recurrenceStartDate: "",
          recurrenceEndDate: "",
        })
        
        // Load allocations if they exist
        try {
          const res = await fetch(`/api/accounts-payable/${editingPayable.id}/allocations`, {
            credentials: "include",
          })
          if (res.ok) {
            const data = await res.json()
            if (data && Array.isArray(data) && data.length > 0) {
              setAllocations(data.map((alloc: any) => ({
                costCenterId: alloc.costCenterId,
                percentage: typeof alloc.percentage === 'string' ? parseFloat(alloc.percentage) : alloc.percentage,
                amount: alloc.amount,
              })))
            } else {
              setAllocations([])
            }
          } else {
            setAllocations([])
          }
        } catch (error) {
          console.error("Error loading allocations:", error)
          setAllocations([])
        }
        
        // Open dialog after loading allocations
        setOpen(true)
      }
      
      loadAndOpenEdit()
    }
  }, [editingPayable, form])

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

    if (editingPayable) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (payable: AccountsPayable) => {
    setEditingPayable(payable)
  }

  const handleDelete = (payable: AccountsPayable) => {
    setDeletingPayable(payable)
  }

  const confirmDelete = () => {
    if (deletingPayable) {
      deleteMutation.mutate(deletingPayable.id)
    }
  }

  if (authLoading || !isAuthenticated) {
    return null
  }

  const getSupplierName = (payable: AccountsPayable) => {
    if (payable.supplierId && suppliers) {
      const supplier = suppliers.find(s => s.id === payable.supplierId)
      return supplier ? `${supplier.razaoSocial}${supplier.nomeFantasia ? ` (${supplier.nomeFantasia})` : ''}` : payable.supplierName || "-"
    }
    return payable.supplierName || "-"
  }

  // Calculate display amount: for "parcial", show remaining balance; otherwise show total
  const getDisplayAmount = (payable: AccountsPayable): number => {
    if (payable.status === 'parcial') {
      const total = parseFloat(payable.totalAmount);
      const paid = parseFloat(payable.amountPaid || '0');
      return total - paid;
    }
    return parseFloat(payable.totalAmount);
  }

  const filteredPayables = payables?.filter(p =>
    p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getSupplierName(p).toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <PageContainer>
      <PageHeader>
        <h1 className="text-xl sm:text-2xl font-semibold">Contas a Pagar</h1>
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

          <Dialog open={open} onOpenChange={(isOpen) => {
                setOpen(isOpen)
                if (!isOpen) {
                  setEditingPayable(null)
                  form.reset()
                  setAllocations([])
                  setRecurrenceInstallments([])
                  setDocumentUrl("")
                  setDocumentFilename("")
                }
              }}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-payable" disabled={!canCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Conta a Pagar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingPayable ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}</DialogTitle>
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
                                <Input placeholder="Ex: Fornecedor XYZ" {...field} data-testid="input-description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="supplierId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fornecedor</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value === "MANUAL" ? "" : value)
                                }}
                                value={field.value || "MANUAL"}
                                data-testid="select-supplier"
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um fornecedor" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="MANUAL" data-testid="select-supplier-none">
                                    Nenhum (informar manualmente)
                                  </SelectItem>
                                  {suppliers?.map((supplier) => (
                                    <SelectItem 
                                      key={supplier.id} 
                                      value={supplier.id}
                                      data-testid={`select-supplier-${supplier.id}`}
                                    >
                                      {supplier.razaoSocial}
                                      {supplier.nomeFantasia && ` (${supplier.nomeFantasia})`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {!form.watch("supplierId") && (
                          <FormField
                            control={form.control}
                            name="supplierName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome do Fornecedor (manual)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Digite o nome" {...field} data-testid="input-supplier-name" />
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

                        <div className="md:col-span-2">
                          <FormLabel>Documento (Opcional)</FormLabel>
                          <div className="flex items-center gap-2 mt-2">
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={5242880}
                              allowedFileTypes={['image/*', 'application/pdf']}
                              onGetUploadParameters={handleGetUploadParameters}
                              onComplete={handleUploadComplete}
                              buttonVariant="outline"
                            >
                              <Paperclip className="h-4 w-4 mr-2" />
                              Anexar Documento
                            </ObjectUploader>
                            {documentFilename && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                <span className="truncate max-w-[200px]">{documentFilename}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Arquivos permitidos: Imagens e PDFs (máx. 5MB)
                          </p>
                        </div>
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
            <CardTitle className="text-lg font-semibold">Lista de Contas a Pagar</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : !filteredPayables || filteredPayables.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Nenhuma conta a pagar"
                description="Você ainda não cadastrou contas a pagar. Clique no botão acima para adicionar a primeira."
                actionLabel="Nova Conta a Pagar"
                onAction={() => setOpen(true)}
              />
            ) : (
              <>
                <div className="md:hidden">
                  <MobileCardList
                    items={filteredPayables}
                    renderCard={(payable): MobileCardProps => ({
                      title: payable.description,
                      titleIcon: <Receipt className="h-4 w-4 text-primary" />,
                      fields: [
                        {
                          label: "Fornecedor",
                          value: getSupplierName(payable),
                        },
                        {
                          label: "Vencimento",
                          value: formatDateBR(payable.dueDate),
                        },
                        {
                          label: "Valor",
                          value: `R$ ${getDisplayAmount(payable).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                          className: "text-lg font-bold font-mono",
                        },
                        {
                          label: "Status",
                          value: payable.status || 'pendente',
                          isBadge: true,
                          badgeVariant: payable.status === 'pago' ? 'default' : payable.status === 'vencido' ? 'destructive' : 'secondary',
                        },
                        ...(payable.recurrenceType && payable.recurrenceType !== 'unica' ? [{
                          label: "Recorrência",
                          value: payable.recurrenceType === 'mensal' ? 'Mensal' : payable.recurrenceType === 'trimestral' ? 'Trimestral' : 'Anual',
                          isBadge: true,
                          badgeVariant: 'outline' as const,
                        }] : []),
                      ],
                      actions: [
                        ...(payable.attachmentUrl ? [{
                          label: "Ver Anexo",
                          icon: <ExternalLink className="h-4 w-4" />,
                          onClick: () => window.open(payable.attachmentUrl!, '_blank'),
                          variant: 'outline' as const,
                          testId: `button-view-attachment-${payable.id}`,
                        }] : []),
                        ...(canUpdate ? [{
                          label: "Editar",
                          icon: <Pencil className="h-4 w-4" />,
                          onClick: () => handleEdit(payable),
                          testId: `button-edit-${payable.id}`,
                        }] : []),
                        ...(canDelete ? [{
                          label: "Excluir",
                          icon: <Trash2 className="h-4 w-4" />,
                          onClick: () => handleDelete(payable),
                          variant: 'destructive' as const,
                          testId: `button-delete-${payable.id}`,
                        }] : []),
                        ...(canSettle ? [{
                          label: "Baixar",
                          icon: <DollarSign className="h-4 w-4" />,
                          onClick: () => {
                            setSelectedPayable(payable)
                            setPaymentDialogOpen(true)
                          },
                          variant: 'default' as const,
                          disabled: payable.status === 'pago' || payable.status === 'cancelado',
                          testId: `button-baixa-${payable.id}`,
                        }] : []),
                      ],
                    })}
                    emptyMessage="Nenhuma conta a pagar encontrada"
                  />
                </div>
                
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Recorrência</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayables.map((payable) => (
                        <TableRow key={payable.id} className="hover-elevate">
                          <TableCell className="font-medium">{payable.description}</TableCell>
                          <TableCell>{getSupplierName(payable)}</TableCell>
                          <TableCell>{formatDateBR(payable.dueDate)}</TableCell>
                          <TableCell className="text-right font-mono">
                            R$ {getDisplayAmount(payable).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={payable.status || 'pendente'} />
                          </TableCell>
                          <TableCell>
                            {payable.recurrenceType && payable.recurrenceType !== 'unica' ? (
                              <Badge variant="outline" className="text-xs">
                                {payable.recurrenceType === 'mensal' && '🔄 Mensal'}
                                {payable.recurrenceType === 'trimestral' && '🔄 Trimestral'}
                                {payable.recurrenceType === 'anual' && '🔄 Anual'}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {payable.attachmentUrl && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => window.open(payable.attachmentUrl!, '_blank')}
                                  title="Visualizar documento anexado"
                                  data-testid={`button-view-attachment-${payable.id}`}
                                >
                                  <ExternalLink className="h-4 w-4 text-primary" />
                                </Button>
                              )}
                              {canUpdate && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleEdit(payable)}
                                  data-testid={`button-edit-${payable.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDelete(payable)}
                                  data-testid={`button-delete-${payable.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                              {canSettle && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedPayable(payable)
                                    setPaymentDialogOpen(true)
                                  }}
                                  disabled={payable.status === 'pago' || payable.status === 'cancelado'}
                                  data-testid={`button-baixa-${payable.id}`}
                                >
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  Baixar
                                </Button>
                              )}
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

      {selectedPayable && (
        <PaymentSettlementDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          transactionId={selectedPayable.id}
          transactionType="payable"
          description={selectedPayable.description}
          totalAmount={selectedPayable.totalAmount}
          amountPaid={selectedPayable.amountPaid || "0"}
          onSuccess={() => {
            setSelectedPayable(null)
          }}
        />
      )}

      <AlertDialog open={!!deletingPayable} onOpenChange={(isOpen) => !isOpen && setDeletingPayable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta "{deletingPayable?.description}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
