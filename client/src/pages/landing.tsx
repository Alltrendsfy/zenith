import { Button } from "@/components/ui/button"
import { Building2, BarChart3, Wallet, FileText, Shield, Zap } from "lucide-react"

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-center text-center space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-10 w-10" />
            </div>
            <div className="flex flex-col items-start">
              <h1 className="text-4xl font-bold">ZENITH ERP</h1>
              <p className="text-lg text-muted-foreground">Sistema de Gestão Empresarial</p>
            </div>
          </div>

          <p className="text-xl text-muted-foreground max-w-2xl">
            Solução completa de gestão empresarial acessível via web. 
            Gestão financeira, contábil e muito mais em um único sistema.
          </p>

          <a href="/api/login">
            <Button size="lg" className="text-base px-8" data-testid="button-login">
              Fazer Login
            </Button>
          </a>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 w-full max-w-5xl">
            <FeatureCard
              icon={BarChart3}
              title="Dashboard Executivo"
              description="Métricas financeiras em tempo real com gráficos interativos"
            />
            <FeatureCard
              icon={Wallet}
              title="Gestão Financeira"
              description="Contas a pagar, receber e gestão de múltiplas contas bancárias"
            />
            <FeatureCard
              icon={FileText}
              title="Módulo Contábil"
              description="Plano de contas hierárquico e centros de custo"
            />
            <FeatureCard
              icon={Shield}
              title="Segurança"
              description="Autenticação robusta e controle de acesso por usuário"
            />
            <FeatureCard
              icon={Zap}
              title="100% Web"
              description="Sem instalação, acesse de qualquer lugar"
            />
            <FeatureCard
              icon={Building2}
              title="Multi-empresa"
              description="Gestão isolada por usuário e empresa"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }: { icon: typeof Building2, title: string, description: string }) {
  return (
    <div className="rounded-md border bg-card p-6 hover-elevate">
      <Icon className="h-8 w-8 mb-3 text-primary" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
