import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { isUnauthorizedError } from "@/lib/authUtils"
import { PageHeader } from "@/components/page-header"
import { PageContainer } from "@/components/page-container"
import { Button } from "@/components/ui/button"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, ArrowLeftRight, Search } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { EmptyState } from "@/components/empty-state"
import { MobileCardList, type MobileCardProps } from "@/components/mobile-card-list"
import { MobileFormActions } from "@/components/mobile-form-actions"
import { apiRequest, queryClient } from "@/lib/queryClient"
import type { BankTransfer, BankAccount } from "@shared/schema"
import { format } from "date-fns"

const formSchema = z.object({
  fromAccountId: z.string().min(1, "Conta de origem é obrigatória"),
  toAccountId: z.string().min(1, "Conta de destino é obrigatória"),
  amount: z.string().min(1, "Valor é obrigatório"),
  transferDate: z.string().min(1, "Data é obrigatória"),
  description: z.string().optional(),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: "As contas de origem e destino devem ser diferentes",
  path: ["toAccountId"],
})

export default function BankTransfers() {
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

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

  const { data: transfers, isLoading } = useQuery<BankTransfer[]>({
    queryKey: ["/api/bank-transfers"],
    enabled: isAuthenticated,
  })

  const { data: accounts } = useQuery<BankAccount[]>({
    queryKey: ["/api/bank-accounts"],
    enabled: isAuthenticated,
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromAccountId: "",
      toAccountId: "",
      amount: "",
      transferDate: format(new Date(), 'yyyy-MM-dd'),
      description: "",
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const res = await apiRequest("POST", "/api/bank-transfers", data)
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transfers"] })
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] })
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] })
      toast({
        title: "Sucesso",
        description: "Transferência realizada com sucesso",
      })
      setOpen(false)
      form.reset()
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Não autorizado",
          description: "Você precisa fazer login novamente...",
          variant: "destructive",
        })
        window.location.href = "/api/login"
      } else {
        toast({
          title: "Erro",
          description: "Falha ao criar transferência",
          variant: "destructive",
        })
      }
    },
  })

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createMutation.mutate(data)
  }

  if (authLoading || !isAuthenticated) {
    return null
  }

  const getAccountName = (accountId: string) => {
    const account = accounts?.find(a => a.id === accountId)
    return account?.name || "Conta não encontrada"
  }

  const filteredTransfers = transfers?.filter(transfer => {
    if (!searchTerm) return true
    const fromName = getAccountName(transfer.fromAccountId).toLowerCase()
    const toName = getAccountName(transfer.toAccountId).toLowerCase()
    const description = transfer.description?.toLowerCase() || ""
    const search = searchTerm.toLowerCase()
    return fromName.includes(search) || toName.includes(search) || description.includes(search)
  }) || []

  return (
    <PageContainer>
      <PageHeader>
        <h1 className="text-xl sm:text-2xl font-semibold">Transferências Bancárias</h1>
      </PageHeader>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transferências..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-transfer">
                <Plus className="h-4 w-4 mr-2" />
                Nova Transferência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Transferência</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fromAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Conta de Origem *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            data-testid="select-from-account"
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a conta" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {accounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name} - R$ {parseFloat(account.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="toAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Conta de Destino *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            data-testid="select-to-account"
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a conta" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {accounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name} - R$ {parseFloat(account.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor *</FormLabel>
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
                      name="transferDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data da Transferência *</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value)}
                              data-testid="input-transfer-date" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Observações adicionais..." {...field} data-testid="input-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <MobileFormActions>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                      {createMutation.isPending ? "Transferindo..." : "Transferir"}
                    </Button>
                  </MobileFormActions>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Lista de Transferências</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : !filteredTransfers || filteredTransfers.length === 0 ? (
              <EmptyState
                icon={ArrowLeftRight}
                title="Nenhuma transferência"
                description="Você ainda não realizou transferências entre contas. Clique no botão acima para realizar a primeira."
                actionLabel="Nova Transferência"
                onAction={() => setOpen(true)}
              />
            ) : (
              <>
                <div className="md:hidden">
                  <MobileCardList
                    items={filteredTransfers}
                    renderCard={(transfer): MobileCardProps => ({
                      title: `${getAccountName(transfer.fromAccountId)} → ${getAccountName(transfer.toAccountId)}`,
                      titleIcon: <ArrowLeftRight className="h-4 w-4 text-primary" />,
                      fields: [
                        {
                          label: "Data",
                          value: format(new Date(transfer.transferDate), 'dd/MM/yyyy'),
                        },
                        {
                          label: "Valor",
                          value: `R$ ${parseFloat(transfer.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                          className: "text-lg font-bold font-mono",
                        },
                        ...(transfer.description ? [{
                          label: "Descrição",
                          value: transfer.description,
                        }] : []),
                      ],
                    })}
                    emptyMessage="Nenhuma transferência encontrada"
                  />
                </div>
                
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Conta de Origem</TableHead>
                        <TableHead>Conta de Destino</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Descrição</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransfers.map((transfer) => (
                        <TableRow key={transfer.id} className="hover-elevate">
                          <TableCell>{format(new Date(transfer.transferDate), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="font-medium">{getAccountName(transfer.fromAccountId)}</TableCell>
                          <TableCell className="font-medium">{getAccountName(transfer.toAccountId)}</TableCell>
                          <TableCell className="text-right font-mono">
                            R$ {parseFloat(transfer.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {transfer.description || "-"}
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
