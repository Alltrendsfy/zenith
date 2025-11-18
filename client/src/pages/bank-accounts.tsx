import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { isUnauthorizedError } from "@/lib/authUtils"
import { PageHeader } from "@/components/page-header"
import { PageContainer } from "@/components/page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Building2, ArrowLeftRight } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { EmptyState } from "@/components/empty-state"
import { apiRequest, queryClient } from "@/lib/queryClient"
import type { BankAccount } from "@shared/schema"

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  bankName: z.string().optional(),
  bankCode: z.string().optional(),
  agency: z.string().optional(),
  accountNumber: z.string().optional(),
  initialBalance: z.string().min(1, "Saldo inicial é obrigatório"),
  description: z.string().optional(),
})

export default function BankAccounts() {
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [open, setOpen] = useState(false)

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

  const { data: accounts, isLoading } = useQuery<BankAccount[]>({
    queryKey: ["/api/bank-accounts"],
    enabled: isAuthenticated,
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      bankName: "",
      bankCode: "",
      agency: "",
      accountNumber: "",
      initialBalance: "0",
      description: "",
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      await apiRequest("POST", "/api/bank-accounts", {
        ...data,
        initialBalance: data.initialBalance,
        balance: data.initialBalance,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] })
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] })
      toast({
        title: "Sucesso",
        description: "Conta bancária criada com sucesso",
      })
      setOpen(false)
      form.reset()
    },
    onError: (error) => {
      console.error("Mutation error:", error)
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
        description: error instanceof Error ? error.message : "Falha ao criar conta bancária",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log("Form submitted with data:", data)
    console.log("Form errors:", form.formState.errors)
    createMutation.mutate(data)
  }

  if (authLoading || !isAuthenticated) {
    return null
  }

  const totalBalance = accounts?.reduce((sum, acc) => sum + parseFloat(acc.balance || "0"), 0) || 0

  return (
    <div className="flex h-screen w-full flex-col">
      <PageHeader>
        <h1 className="text-2xl font-semibold">Contas Bancárias</h1>
      </PageHeader>

      <div className="flex-1 overflow-auto">
        <PageContainer>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Saldo Consolidado</p>
                <p className="text-3xl font-bold font-mono" data-testid="text-total-balance">
                  R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-account">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Conta Bancária
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nova Conta Bancária</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Nome da Conta *</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Conta Corrente Principal" {...field} data-testid="input-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bankName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome do Banco</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Banco do Brasil" {...field} data-testid="input-bank-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bankCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código do Banco</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: 001" {...field} data-testid="input-bank-code" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="agency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Agência</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: 1234-5" {...field} data-testid="input-agency" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="accountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número da Conta</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: 12345-6" {...field} data-testid="input-account-number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="initialBalance"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Saldo Inicial *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="font-mono text-right"
                                  {...field}
                                  data-testid="input-initial-balance"
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
                                <Textarea placeholder="Descrição adicional..." {...field} data-testid="input-description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                          {createMutation.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-40 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : !accounts || accounts.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <EmptyState
                    icon={Building2}
                    title="Nenhuma conta bancária"
                    description="Você ainda não cadastrou contas bancárias. Clique no botão acima para adicionar a primeira."
                    actionLabel="Nova Conta Bancária"
                    onAction={() => setOpen(true)}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map((account) => (
                  <Card key={account.id} className="hover-elevate">
                    <CardHeader>
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        {account.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {account.bankName && (
                        <div>
                          <p className="text-xs text-muted-foreground">Banco</p>
                          <p className="text-sm">{account.bankName}</p>
                        </div>
                      )}
                      {account.accountNumber && (
                        <div>
                          <p className="text-xs text-muted-foreground font-mono">
                            {account.agency ? `Ag: ${account.agency} / ` : ""}Conta: {account.accountNumber}
                          </p>
                        </div>
                      )}
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">Saldo Atual</p>
                        <p className="text-2xl font-bold font-mono">
                          R$ {parseFloat(account.balance || "0").toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </PageContainer>
      </div>
    </div>
  )
}
