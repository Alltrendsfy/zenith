import { Badge } from "@/components/ui/badge"

type Status = 'pendente' | 'pago' | 'parcial' | 'cancelado' | 'vencido'

interface StatusBadgeProps {
  status: Status
}

const statusConfig = {
  pendente: { label: 'Pendente', variant: 'secondary' as const },
  pago: { label: 'Pago', variant: 'default' as const },
  parcial: { label: 'Parcial', variant: 'secondary' as const },
  cancelado: { label: 'Cancelado', variant: 'destructive' as const },
  vencido: { label: 'Vencido', variant: 'destructive' as const },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pendente

  return (
    <Badge variant={config.variant} className="rounded-full">
      {config.label}
    </Badge>
  )
}
