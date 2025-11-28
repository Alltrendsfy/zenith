import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { useToast } from "@/hooks/use-toast"
import { useLocation } from "wouter"
import { isUnauthorizedError } from "@/lib/authUtils"
import { PageHeader } from "@/components/page-header"
import { PageContainer } from "@/components/page-container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Users, Search, Building2, Pencil, Trash2, AlertTriangle, Copy, Check, Key } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { apiRequest, queryClient } from "@/lib/queryClient"
import type { User, CostCenter } from "@shared/schema"

const ROLE_LABELS = {
  admin: "Administrador",
  gerente: "Gerente",
  financeiro: "Financeiro",
  operacional: "Operacional",
  visualizador: "Visualizador",
} as const

const ROLE_VARIANTS = {
  admin: "destructive",
  gerente: "default",
  financeiro: "secondary",
  operacional: "secondary",
  visualizador: "outline",
} as const

export default function UserManagement() {
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { isManager } = usePermissions()
  const [, setLocation] = useLocation()
  const [searchTerm, setSearchTerm] = useState("")
  const [costCenterDialogOpen, setCostCenterDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedCostCenterIds, setSelectedCostCenterIds] = useState<string[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false)
  const [generatedCredentials, setGeneratedCredentials] = useState<{email: string; password: string} | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newUserData, setNewUserData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    phone: "",
    temporaryPassword: "",
    role: "visualizador" as "admin" | "gerente" | "financeiro" | "operacional" | "visualizador",
    isActive: true,
    costCenterIds: [] as string[],
  })
  const [editUserData, setEditUserData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    phone: "",
    temporaryPassword: "",
    role: "visualizador" as "admin" | "gerente" | "financeiro" | "operacional" | "visualizador",
    isActive: true,
  })

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
    } else if (!authLoading && isAuthenticated && !isManager) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores e gerentes podem acessar esta página",
        variant: "destructive",
      })
      setTimeout(() => {
        setLocation("/")
      }, 500)
    }
  }, [isAuthenticated, authLoading, isManager, toast, setLocation])

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && isManager,
  })

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PATCH", `/api/users/${userId}/role`, { role })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] })
      toast({
        title: "Sucesso",
        description: "Role do usuário atualizada com sucesso",
      })
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
        description: "Falha ao atualizar role do usuário",
        variant: "destructive",
      })
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/users/${userId}/status`, { isActive })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] })
      toast({
        title: "Sucesso",
        description: "Status do usuário atualizado com sucesso",
      })
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
        description: "Falha ao atualizar status do usuário",
        variant: "destructive",
      })
    },
  })

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      const response = await apiRequest("POST", "/api/users", userData)
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] })
      setCreateDialogOpen(false)
      
      if (data.generatedPassword) {
        setGeneratedCredentials({
          email: newUserData.email,
          password: data.generatedPassword,
        })
        setCredentialsDialogOpen(true)
      } else {
        toast({
          title: "Sucesso",
          description: "Usuário criado com sucesso",
        })
      }
      
      setNewUserData({
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        phone: "",
        temporaryPassword: "",
        role: "visualizador",
        isActive: true,
        costCenterIds: [],
      })
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
      const errorMessage = error?.message || "Falha ao criar usuário"
      toast({
        title: "Erro",
        description: errorMessage.includes("Email já está em uso") 
          ? "Este email já está cadastrado" 
          : errorMessage.includes("Login já está em uso")
          ? "Este login já está cadastrado"
          : "Falha ao criar usuário",
        variant: "destructive",
      })
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: typeof editUserData }) => {
      await apiRequest("PATCH", `/api/users/${userId}`, userData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] })
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso",
      })
      setEditDialogOpen(false)
      setSelectedUser(null)
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
      const errorMessage = error?.message || "Falha ao atualizar usuário"
      toast({
        title: "Erro",
        description: errorMessage.includes("Email já está em uso") 
          ? "Este email já está em uso por outro usuário" 
          : errorMessage.includes("Login já está em uso")
          ? "Este login já está em uso por outro usuário"
          : "Falha ao atualizar usuário",
        variant: "destructive",
      })
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] })
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso",
      })
      setDeleteDialogOpen(false)
      setSelectedUser(null)
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
      const errorMessage = error?.message || "Falha ao excluir usuário"
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })
    },
  })

  const handleOpenEditDialog = (user: User) => {
    setSelectedUser(user)
    setEditUserData({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      username: user.username || "",
      phone: user.phone || "",
      temporaryPassword: "",
      role: user.role,
      isActive: user.isActive ?? true,
    })
    setEditDialogOpen(true)
  }

  const handleOpenDeleteDialog = (user: User) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const { data: allCostCenters } = useQuery<CostCenter[]>({
    queryKey: ["/api/all-cost-centers"],
    enabled: isAuthenticated && isManager,
  })

  const { data: userCostCenters } = useQuery<CostCenter[]>({
    queryKey: ["/api/users", selectedUserId, "cost-centers"],
    enabled: !!selectedUserId,
  })

  useEffect(() => {
    if (userCostCenters) {
      setSelectedCostCenterIds(userCostCenters.map(cc => cc.id))
    }
  }, [userCostCenters])

  const updateCostCentersMutation = useMutation({
    mutationFn: async ({ userId, costCenterIds }: { userId: string; costCenterIds: string[] }) => {
      await apiRequest("POST", `/api/users/${userId}/cost-centers`, { costCenterIds })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUserId, "cost-centers"] })
      toast({
        title: "Sucesso",
        description: "Centros de custo atualizados com sucesso",
      })
      setCostCenterDialogOpen(false)
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
        description: "Falha ao atualizar centros de custo",
        variant: "destructive",
      })
    },
  })

  const handleOpenCostCenterDialog = (userId: string, userRole: string) => {
    if (userRole === 'admin' || userRole === 'gerente') {
      toast({
        title: "Informação",
        description: "Administradores e Gerentes têm acesso a todos os centros de custo",
        variant: "default",
      })
      return
    }
    setSelectedUserId(userId)
    setCostCenterDialogOpen(true)
  }

  const handleSaveCostCenters = () => {
    if (selectedUserId) {
      updateCostCentersMutation.mutate({
        userId: selectedUserId,
        costCenterIds: selectedCostCenterIds
      })
    }
  }

  const toggleCostCenter = (costCenterId: string) => {
    setSelectedCostCenterIds(prev =>
      prev.includes(costCenterId)
        ? prev.filter(id => id !== costCenterId)
        : [...prev, costCenterId]
    )
  }

  if (authLoading || !isAuthenticated || !isManager) {
    return null
  }

  const getUserDisplayName = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim()
    }
    return user.email || "-"
  }

  const filteredUsers = users?.filter(u => {
    const displayName = getUserDisplayName(u).toLowerCase()
    const email = (u.email || "").toLowerCase()
    const search = searchTerm.toLowerCase()
    return displayName.includes(search) || email.includes(search)
  })

  return (
    <PageContainer>
      <PageHeader>
        <h1 className="text-xl sm:text-2xl font-semibold">Gerenciamento de Usuários</h1>
      </PageHeader>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários por nome ou email..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search"
            />
          </div>
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            data-testid="button-add-user"
          >
            Novo Usuário
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Carregando...</div>
          </div>
        ) : !filteredUsers || filteredUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum usuário encontrado"
            description={searchTerm ? "Tente ajustar os filtros de busca" : "Os usuários aparecerão aqui"}
          />
        ) : (
          <>
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell className="font-medium" data-testid={`text-name-${user.id}`}>
                        {getUserDisplayName(user)}
                      </TableCell>
                      <TableCell data-testid={`text-email-${user.id}`}>
                        {user.email || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={ROLE_VARIANTS[user.role as keyof typeof ROLE_VARIANTS] as any}
                          data-testid={`badge-role-${user.id}`}
                        >
                          {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.isActive ? "default" : "outline"}
                          className={user.isActive ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}
                          data-testid={`badge-status-${user.id}`}
                        >
                          {user.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Select
                            value={user.role}
                            onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role })}
                            disabled={updateRoleMutation.isPending}
                          >
                            <SelectTrigger className="w-[140px]" data-testid={`select-role-${user.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="gerente">Gerente</SelectItem>
                              <SelectItem value="financeiro">Financeiro</SelectItem>
                              <SelectItem value="operacional">Operacional</SelectItem>
                              <SelectItem value="visualizador">Visualizador</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleStatusMutation.mutate({ userId: user.id, isActive: !user.isActive })}
                            disabled={toggleStatusMutation.isPending}
                            data-testid={`button-toggle-status-${user.id}`}
                          >
                            {user.isActive ? "Desativar" : "Ativar"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCostCenterDialog(user.id, user.role)}
                            data-testid={`button-cost-centers-${user.id}`}
                          >
                            <Building2 className="h-4 w-4 mr-1" />
                            Centros
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleOpenEditDialog(user)}
                            data-testid={`button-edit-${user.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleOpenDeleteDialog(user)}
                            data-testid={`button-delete-${user.id}`}
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

            <div className="md:hidden space-y-4">
              {filteredUsers.map((user) => (
                <Card key={user.id} data-testid={`card-user-${user.id}`}>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="text-sm font-medium" data-testid={`text-name-${user.id}`}>
                        {getUserDisplayName(user)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm" data-testid={`text-email-${user.id}`}>
                        {user.email || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Role</p>
                      <Badge 
                        variant={ROLE_VARIANTS[user.role as keyof typeof ROLE_VARIANTS] as any}
                        data-testid={`badge-role-${user.id}`}
                      >
                        {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <Badge
                        variant={user.isActive ? "default" : "outline"}
                        className={user.isActive ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}
                        data-testid={`badge-status-${user.id}`}
                      >
                        {user.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="space-y-2 pt-2">
                      <Select
                        value={user.role}
                        onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role })}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger data-testid={`select-role-${user.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="gerente">Gerente</SelectItem>
                          <SelectItem value="financeiro">Financeiro</SelectItem>
                          <SelectItem value="operacional">Operacional</SelectItem>
                          <SelectItem value="visualizador">Visualizador</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => toggleStatusMutation.mutate({ userId: user.id, isActive: !user.isActive })}
                        disabled={toggleStatusMutation.isPending}
                        data-testid={`button-toggle-status-${user.id}`}
                      >
                        {user.isActive ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleOpenCostCenterDialog(user.id, user.role)}
                        data-testid={`button-cost-centers-${user.id}`}
                      >
                        <Building2 className="h-4 w-4 mr-1" />
                        Gerenciar Centros de Custo
                      </Button>
                      <div className="flex gap-2 w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleOpenEditDialog(user)}
                          data-testid={`button-edit-${user.id}`}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleOpenDeleteDialog(user)}
                          data-testid={`button-delete-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={costCenterDialogOpen} onOpenChange={setCostCenterDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Gerenciar Centros de Custo</DialogTitle>
            <DialogDescription>
              Selecione os centros de custo que este usuário poderá acessar
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh] pr-4">
            {allCostCenters && allCostCenters.length > 0 ? (
              <div className="space-y-4">
                {allCostCenters.map((center) => (
                  <div key={center.id} className="flex items-start space-x-3 p-3 rounded-md hover:bg-muted/50">
                    <Checkbox
                      id={`center-${center.id}`}
                      checked={selectedCostCenterIds.includes(center.id)}
                      onCheckedChange={() => toggleCostCenter(center.id)}
                      data-testid={`checkbox-cost-center-${center.id}`}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`center-${center.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {center.name}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Código: {center.code}
                      </p>
                      {center.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {center.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="Nenhum centro de custo cadastrado"
                description="Cadastre centros de custo primeiro"
              />
            )}
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setCostCenterDialogOpen(false)}
              data-testid="button-cancel-cost-centers"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCostCenters}
              disabled={updateCostCentersMutation.isPending}
              data-testid="button-save-cost-centers"
            >
              {updateCostCentersMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo usuário
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome *</Label>
                  <Input
                    id="firstName"
                    value={newUserData.firstName}
                    onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                    placeholder="Nome"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Sobrenome *</Label>
                  <Input
                    id="lastName"
                    value={newUserData.lastName}
                    onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                    placeholder="Sobrenome"
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Login *</Label>
                  <Input
                    id="username"
                    value={newUserData.username}
                    onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    placeholder="nome_usuario"
                    data-testid="input-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="11999999999"
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  data-testid="input-email"
                />
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Uma senha provisória será gerada automaticamente ao criar o usuário.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Perfil *</Label>
                <Select
                  value={newUserData.role}
                  onValueChange={(role: any) => setNewUserData({ ...newUserData, role })}
                >
                  <SelectTrigger id="role" data-testid="select-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="operacional">Operacional</SelectItem>
                    <SelectItem value="visualizador">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newUserData.isActive ? "active" : "inactive"}
                  onValueChange={(value) => setNewUserData({ ...newUserData, isActive: value === "active" })}
                >
                  <SelectTrigger id="status" data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {allCostCenters && allCostCenters.length > 0 && (
                <div className="space-y-2">
                  <Label>Centros de Custo (Opcional)</Label>
                  <div className="border rounded-md p-4 space-y-3 max-h-[200px] overflow-y-auto">
                    {allCostCenters.map((center) => (
                      <div key={center.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`new-user-center-${center.id}`}
                          checked={newUserData.costCenterIds.includes(center.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewUserData({
                                ...newUserData,
                                costCenterIds: [...newUserData.costCenterIds, center.id]
                              })
                            } else {
                              setNewUserData({
                                ...newUserData,
                                costCenterIds: newUserData.costCenterIds.filter(id => id !== center.id)
                              })
                            }
                          }}
                          data-testid={`checkbox-new-user-cost-center-${center.id}`}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`new-user-center-${center.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {center.name}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Código: {center.code}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false)
                setNewUserData({
                  firstName: "",
                  lastName: "",
                  email: "",
                  username: "",
                  phone: "",
                  temporaryPassword: "",
                  role: "visualizador",
                  isActive: true,
                  costCenterIds: [],
                })
              }}
              data-testid="button-cancel-create"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => createUserMutation.mutate(newUserData)}
              disabled={createUserMutation.isPending || !newUserData.firstName || !newUserData.lastName || !newUserData.email || !newUserData.username}
              data-testid="button-submit-create"
            >
              {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize os dados do usuário
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">Nome *</Label>
                  <Input
                    id="edit-firstName"
                    value={editUserData.firstName}
                    onChange={(e) => setEditUserData({ ...editUserData, firstName: e.target.value })}
                    placeholder="Nome"
                    data-testid="input-edit-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Sobrenome *</Label>
                  <Input
                    id="edit-lastName"
                    value={editUserData.lastName}
                    onChange={(e) => setEditUserData({ ...editUserData, lastName: e.target.value })}
                    placeholder="Sobrenome"
                    data-testid="input-edit-last-name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-username">Login *</Label>
                  <Input
                    id="edit-username"
                    value={editUserData.username}
                    onChange={(e) => setEditUserData({ ...editUserData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    placeholder="nome_usuario"
                    data-testid="input-edit-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input
                    id="edit-phone"
                    value={editUserData.phone}
                    onChange={(e) => setEditUserData({ ...editUserData, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="11999999999"
                    data-testid="input-edit-phone"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editUserData.email}
                  onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  data-testid="input-edit-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-temporaryPassword">Nova Senha Provisória (deixe em branco para manter)</Label>
                <Input
                  id="edit-temporaryPassword"
                  type="password"
                  value={editUserData.temporaryPassword}
                  onChange={(e) => setEditUserData({ ...editUserData, temporaryPassword: e.target.value })}
                  placeholder="Preencha apenas se quiser alterar"
                  data-testid="input-edit-temporary-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Perfil *</Label>
                <Select
                  value={editUserData.role}
                  onValueChange={(role: any) => setEditUserData({ ...editUserData, role })}
                >
                  <SelectTrigger id="edit-role" data-testid="select-edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="operacional">Operacional</SelectItem>
                    <SelectItem value="visualizador">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editUserData.isActive ? "active" : "inactive"}
                  onValueChange={(value) => setEditUserData({ ...editUserData, isActive: value === "active" })}
                >
                  <SelectTrigger id="edit-status" data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false)
                setSelectedUser(null)
              }}
              data-testid="button-cancel-edit"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  updateUserMutation.mutate({ userId: selectedUser.id, userData: editUserData })
                }
              }}
              disabled={updateUserMutation.isPending || !editUserData.firstName || !editUserData.lastName || !editUserData.email || !editUserData.username}
              data-testid="button-submit-edit"
            >
              {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Excluir Usuário
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setSelectedUser(null)
              }}
              data-testid="button-cancel-delete"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedUser) {
                  deleteUserMutation.mutate(selectedUser.id)
                }
              }}
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteUserMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Credenciais Geradas */}
      <Dialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Key className="h-5 w-5" />
              Usuário Criado com Sucesso
            </DialogTitle>
            <DialogDescription>
              As credenciais de acesso foram geradas automaticamente. Envie essas informações ao novo usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Email</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={generatedCredentials?.email || ""}
                  readOnly
                  className="font-mono"
                  data-testid="input-generated-email"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCredentials?.email || "")
                    toast({ description: "Email copiado!" })
                  }}
                  data-testid="button-copy-email"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Senha Provisória</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={generatedCredentials?.password || ""}
                  readOnly
                  className="font-mono text-lg tracking-widest"
                  data-testid="input-generated-password"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCredentials?.password || "")
                    toast({ description: "Senha copiada!" })
                  }}
                  data-testid="button-copy-password"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                O usuário deverá alterar a senha no primeiro acesso ao sistema.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setCredentialsDialogOpen(false)
                setGeneratedCredentials(null)
              }}
              data-testid="button-close-credentials"
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
