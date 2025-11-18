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
import { Plus, FileText, Search, ChevronRight } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { apiRequest, queryClient } from "@/lib/queryClient"
import type { ChartOfAccounts } from "@shared/schema"

const formSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  quickCode: z.string().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum(['receita', 'despesa', 'ativo', 'passivo']),
  nature: z.enum(['analitica', 'sintetica']),
  parentId: z.string().optional(),
  description: z.string().optional(),
})

export default function ChartOfAccountsPage() {
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

  const { data: accounts, isLoading } = useQuery<ChartOfAccounts[]>({
    queryKey: ["/api/chart-of-accounts"],
    enabled: isAuthenticated,
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      quickCode: "",
      name: "",
      type: "despesa",
      nature: "analitica",
      description: "",
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      await apiRequest("POST", "/api/chart-of-accounts", {
        ...data,
        level: data.parentId ? 2 : 1,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chart-of-accounts"] })
      toast({
        title: "Sucesso",
        description: "Conta criada com sucesso",
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
        setTimeout(() => {
          window.location.href = "/api/login"
        }, 500)
        return
      }
      toast({
        title: "Erro",
        description: "Falha ao criar conta",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createMutation.mutate(data)
  }

  if (authLoading || !isAuthenticated) {
    return null
  }

  const filteredAccounts = accounts?.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.quickCode?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const typeLabels = {
    receita: { label: "Receita", color: "default" },
    despesa: { label: "Despesa", color: "secondary" },
    ativo: { label: "Ativo", color: "default" },
    passivo: { label: "Passivo", color: "secondary" },
  }

  return (
    <PageContainer>
      <PageHeader>
        <h1 className="text-xl sm:text-2xl font-semibold">Plano de Contas</h1>
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
                  <Button data-testid="button-add-account">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Conta
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nova Conta Contábil</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código *</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: 1.1.001" {...field} data-testid="input-code" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="quickCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quick Code</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: ALU" {...field} data-testid="input-quick-code" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Nome *</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Aluguel" {...field} data-testid="input-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-type">
                                    <SelectValue placeholder="Selecione o tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="receita">Receita</SelectItem>
                                  <SelectItem value="despesa">Despesa</SelectItem>
                                  <SelectItem value="ativo">Ativo</SelectItem>
                                  <SelectItem value="passivo">Passivo</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="nature"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Natureza *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-nature">
                                    <SelectValue placeholder="Selecione a natureza" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="analitica">Analítica</SelectItem>
                                  <SelectItem value="sintetica">Sintética</SelectItem>
                                </SelectContent>
                              </Select>
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
                                <Textarea placeholder="Descrição da conta..." {...field} data-testid="input-description" />
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Plano de Contas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : !filteredAccounts || filteredAccounts.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nenhuma conta cadastrada"
                description="Você ainda não cadastrou contas contábeis. Clique no botão acima para adicionar a primeira."
                actionLabel="Nova Conta"
                onAction={() => setOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Quick Code</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Natureza</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.map((account) => (
                      <TableRow key={account.id} className="hover-elevate">
                        <TableCell className="font-mono text-sm">{account.code}</TableCell>
                        <TableCell>
                          {account.quickCode && (
                            <Badge variant="outline" className="font-mono text-xs">
                              {account.quickCode}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {account.level > 1 && (
                            <ChevronRight className="inline h-3 w-3 text-muted-foreground mr-1" />
                          )}
                          {account.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={typeLabels[account.type]?.color as any}>
                            {typeLabels[account.type]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm capitalize">{account.nature}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
