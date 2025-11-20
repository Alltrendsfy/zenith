import {
  LayoutDashboard,
  Receipt,
  FileText,
  CreditCard,
  Building2,
  User,
  LogOut,
  BarChart3,
  Users,
  Truck,
  ArrowLeftRight
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { Link, useLocation } from "wouter"
import zenithLogo from "@assets/logo zenith erp_1763561150551.jpeg"

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Contas a Pagar",
    url: "/accounts-payable",
    icon: Receipt,
  },
  {
    title: "Contas a Receber",
    url: "/accounts-receivable",
    icon: FileText,
  },
  {
    title: "Contas Bancárias",
    url: "/bank-accounts",
    icon: Building2,
  },
  {
    title: "Transferências",
    url: "/bank-transfers",
    icon: ArrowLeftRight,
  },
  {
    title: "Plano de Contas",
    url: "/chart-of-accounts",
    icon: FileText,
  },
  {
    title: "Centros de Custo",
    url: "/cost-centers",
    icon: CreditCard,
  },
  {
    title: "Relatórios",
    url: "/reports",
    icon: BarChart3,
  },
]

const cadastrosItems = [
  {
    title: "Fornecedores",
    url: "/suppliers",
    icon: Truck,
  },
  {
    title: "Clientes",
    url: "/customers",
    icon: Users,
  },
]

export function AppSidebar() {
  const { user } = useAuth()
  const { isAdmin, role } = usePermissions()
  const [location] = useLocation()

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    }
    return user?.email?.[0].toUpperCase() || "U"
  }

  const getRoleLabel = () => {
    switch (role) {
      case 'admin': return 'Administrador'
      case 'gerente': return 'Gerente'
      case 'financeiro': return 'Financeiro'
      case 'visualizador': return 'Visualizador'
      default: return 'Visualizador'
    }
  }

  const getRoleBadgeVariant = () => {
    switch (role) {
      case 'admin': return 'destructive' as const
      case 'gerente': return 'default' as const
      case 'financeiro': return 'secondary' as const
      case 'visualizador': return 'outline' as const
      default: return 'outline' as const
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img 
            src={zenithLogo} 
            alt="Zenith ERP" 
            className="h-10 w-auto"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">ZENITH ERP</span>
            <span className="text-xs text-muted-foreground">Gestão Empresarial</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide">Cadastros</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {cadastrosItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide">Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/user-management"}
                    data-testid="link-user-management"
                  >
                    <Link href="/user-management">
                      <User className="h-4 w-4" />
                      <span>Gerenciar Usuários</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profileImageUrl || undefined} className="object-cover" />
            <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-user-name">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <a
            href="/api/logout"
            className="flex h-8 w-8 items-center justify-center rounded hover-elevate active-elevate-2"
            data-testid="button-logout"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </a>
        </div>
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-muted-foreground">Perfil de Acesso:</span>
          <Badge variant={getRoleBadgeVariant()} className="text-xs" data-testid="badge-user-role">
            {getRoleLabel()}
          </Badge>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
