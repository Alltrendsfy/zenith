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
  ArrowLeftRight,
  Calendar,
  Settings,
  TrendingUp,
  ChevronRight
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { Link, useLocation } from "wouter"
import zenithLogo from "@assets/logo zenith erp_1763561150551.jpeg"

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
  {
    title: "Centros de Custo",
    url: "/cost-centers",
    icon: CreditCard,
  },
  {
    title: "Contas Bancárias",
    url: "/bank-accounts",
    icon: Building2,
  },
  {
    title: "Plano de Contas",
    url: "/chart-of-accounts",
    icon: FileText,
  },
]

export function AppSidebar() {
  const { user } = useAuth()
  const { isAdmin, isManager, role } = usePermissions()
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/"}
                  data-testid="link-dashboard"
                >
                  <Link href="/">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton data-testid="menu-contas-a-pagar">
                      <Receipt className="h-4 w-4" />
                      <span>Contas a Pagar</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={location === "/accounts-payable"}
                          data-testid="link-cadastro-a-pagar"
                        >
                          <Link href="/accounts-payable">
                            <span>Cadastro a Pagar</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={location === "/accounts-payable-reports"}
                          data-testid="link-relatorios-pagar"
                        >
                          <Link href="/accounts-payable-reports">
                            <span>Relatórios</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton data-testid="menu-contas-a-receber">
                      <FileText className="h-4 w-4" />
                      <span>Contas a Receber</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={location === "/accounts-receivable"}
                          data-testid="link-cadastro-a-receber"
                        >
                          <Link href="/accounts-receivable">
                            <span>Cadastro a Receber</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={location === "/accounts-receivable-reports"}
                          data-testid="link-relatorios-receber"
                        >
                          <Link href="/accounts-receivable-reports">
                            <span>Relatórios</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/bank-transfers"}
                  data-testid="link-transferências"
                >
                  <Link href="/bank-transfers">
                    <ArrowLeftRight className="h-4 w-4" />
                    <span>Transferências</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton data-testid="menu-relatorios">
                      <BarChart3 className="h-4 w-4" />
                      <span>Relatórios</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={location === "/reports"}
                          data-testid="link-dre"
                        >
                          <Link href="/reports">
                            <span>DRE</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={location === "/bank-statement"}
                          data-testid="link-extrato-de-conta"
                        >
                          <Link href="/bank-statement">
                            <span>Extrato de Conta</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/agenda"}
                  data-testid="link-agenda"
                >
                  <Link href="/agenda">
                    <Calendar className="h-4 w-4" />
                    <span>Agenda</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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

        {isManager && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide">Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/company-settings"}
                    data-testid="link-dados-da-empresa"
                  >
                    <Link href="/company-settings">
                      <Building2 className="h-4 w-4" />
                      <span>Dados da Empresa</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/user-management"}
                    data-testid="link-gerenciar-usuários"
                  >
                    <Link href="/user-management">
                      <User className="h-4 w-4" />
                      <span>Gerenciar Usuários</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/settings"}
                    data-testid="link-configurações"
                  >
                    <Link href="/settings">
                      <Settings className="h-4 w-4" />
                      <span>Configurações</span>
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
