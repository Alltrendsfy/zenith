import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, CreditCard, Search, ChevronRight, Pencil, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { MobileFormActions } from "@/components/mobile-form-actions"
import { apiRequest, queryClient } from "@/lib/queryClient"
import type { CostCenter } from "@shared/schema"

const formSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  name: z.string().min(1, "Nome é obrigatório"),
  parentId: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
})

export default function CostCenters() {
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { canCreate, canUpdate, canDelete } = usePermissions()
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingCenter, setEditingCenter] = useState<CostCenter | null>(null)
  const [deletingCenter, setDeletingCenter] = useState<CostCenter | null>(null)

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

  const { data: costCenters, isLoading } = useQuery<CostCenter[]>({
    queryKey: ["/api/cost-centers"],
    enabled: isAuthenticated,
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      isActive: true,
    },
  })

  useEffect(() => {
    if (editingCenter) {
      form.reset({
        code: editingCenter.code,
        name: editingCenter.name,
        description: editingCenter.description || "",
        parentId: editingCenter.parentId || undefined,
        isActive: editingCenter.isActive ?? true,
      })
      setOpen(true)
    }
  }, [editingCenter, form])

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const parentId = data.parentId && data.parentId !== "none" ? data.parentId : null
      await apiRequest("POST", "/api/cost-centers", {
        ...data,
        parentId,
        level: parentId ? 2 : 1,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cost-centers"] })
      toast({
        title: "Sucesso",
        description: "Centro de custo criado com sucesso",
      })
      setOpen(false)
      form.reset()
    },
    onError: (error: any) => {
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
        description: error.message || "Falha ao criar centro de custo",
        variant: "destructive",
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      if (!editingCenter) return
      const parentId = data.parentId && data.parentId !== "none" ? data.parentId : null
      await apiRequest("PATCH", `/api/cost-centers/${editingCenter.id}`, {
        ...data,
        parentId,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cost-centers"] })
      toast({
        title: "Sucesso",
        description: "Centro de custo atualizado com sucesso",
      })
      setOpen(false)
      setEditingCenter(null)
      form.reset()
    },
    onError: (error: any) => {
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
        description: error.message || "Falha ao atualizar centro de custo",
        variant: "destructive",
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/cost-centers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cost-centers"] })
      toast({
        title: "Sucesso",
        description: "Centro de custo excluído com sucesso",
      })
      setDeletingCenter(null)
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
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
        description: error.message || "Falha ao excluir centro de custo",
        variant: "destructive",
      })
      setDeletingCenter(null)
    },
  })

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingCenter) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDialogClose = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setEditingCenter(null)
      form.reset()
    }
  }

  if (authLoading || !isAuthenticated) {
    return null
  }

  const filteredCostCenters = costCenters?.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <PageContainer>
      <PageHeader>
        <h1 className="text-xl sm:text-2xl font-semibold">Centros de Custo</h1>
      </PageHeader>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar centros de custo..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search"
            />
          </div>

          <Dialog open={open} onOpenChange={handleDialogClose}>
                <DialogTrigger asChild>
                  <Button disabled={!canCreate} data-testid="button-add-cost-center">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Centro de Custo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingCenter ? "Editar Centro de Custo" : "Novo Centro de Custo"}</DialogTitle>
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
                                <Input placeholder="Ex: ADM-001" {...field} data-testid="input-code" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome *</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Administrativo" {...field} data-testid="input-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="parentId"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Centro Pai (Opcional)</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""} data-testid="select-parent">
                                <FormControl>
                                  <SelectTrigger data-testid="select-parent-trigger">
                                    <SelectValue placeholder="Selecione o centro pai..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none" data-testid="select-parent-none">Nenhum (Centro Raiz)</SelectItem>
                                  {costCenters?.filter(c => c.id !== editingCenter?.id).map((center) => (
                                    <SelectItem key={center.id} value={center.id} data-testid={`select-parent-${center.id}`}>
                                      {center.code} - {center.name}
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
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2 flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Status</FormLabel>
                                <div className="text-sm text-muted-foreground">
                                  {field.value ? "Centro de custo ativo" : "Centro de custo inativo"}
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-is-active"
                                />
                              </FormControl>
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
                                <Textarea placeholder="Descrição do centro de custo..." {...field} data-testid="input-description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <MobileFormActions>
                        <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                          Cancelar
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createMutation.isPending || updateMutation.isPending} 
                          data-testid="button-submit"
                        >
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
            <CardTitle className="text-lg font-semibold">Centros de Custo</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : !filteredCostCenters || filteredCostCenters.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="Nenhum centro de custo"
                description="Você ainda não cadastrou centros de custo. Clique no botão acima para adicionar o primeiro."
                actionLabel="Novo Centro de Custo"
                onAction={() => setOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCostCenters.map((center) => (
                      <TableRow key={center.id} className="hover-elevate">
                        <TableCell className="font-mono text-sm">{center.code}</TableCell>
                        <TableCell className="font-medium">
                          {center.level > 1 && (
                            <ChevronRight className="inline h-3 w-3 text-muted-foreground mr-1" />
                          )}
                          {center.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {center.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={center.isActive ? "default" : "secondary"}>
                            {center.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingCenter(center)}
                              disabled={!canUpdate}
                              data-testid={`button-edit-${center.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeletingCenter(center)}
                              disabled={!canDelete}
                              data-testid={`button-delete-${center.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deletingCenter} onOpenChange={(open) => !open && setDeletingCenter(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o centro de custo "{deletingCenter?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCenter && deleteMutation.mutate(deletingCenter.id)}
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
