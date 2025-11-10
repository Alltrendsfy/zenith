import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: string
  trend?: {
    value: string
    isPositive: boolean
  }
  isLoading?: boolean
}

export function MetricCard({ icon: Icon, label, value, trend, isLoading }: MetricCardProps) {
  if (isLoading) {
    return (
      <Card className="h-32">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-8 w-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-32">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
            </div>
            <p className="text-2xl font-semibold font-mono tracking-tight" data-testid={`text-${label.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
          </div>
          {trend && (
            <div className={`text-xs font-medium ${trend.isPositive ? 'text-chart-2' : 'text-destructive'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
