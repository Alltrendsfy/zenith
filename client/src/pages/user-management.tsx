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
import { Users, Search } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { apiRequest, queryClient } from "@/lib/queryClient"
import type { User } from "@shared/schema"

const ROLE_LABELS = {
  admin: "Administrador",
  gerente: "Gerente",
  financeiro: "Financeiro",
  visualizador: "Visualizador",
} as const

const ROLE_VARIANTS = {
  admin: "destructive",
  gerente: "default",
  financeiro: "secondary",
  visualizador: "outline",
} as const

export default function UserManagement() {
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { isManager } = usePermissions()
  const [, setLocation] = useLocation()
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
                            <SelectTrigger className="w-[160px]" data-testid={`select-role-${user.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="gerente">Gerente</SelectItem>
                              <SelectItem value="financeiro">Financeiro</SelectItem>
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </PageContainer>
  )
}
