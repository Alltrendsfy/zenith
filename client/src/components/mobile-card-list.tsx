import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface MobileCardField {
  label: string;
  value: string | number | null;
  className?: string;
  isBadge?: boolean;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

export interface MobileCardAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
}

export interface MobileCardProps {
  title: string;
  titleIcon?: React.ReactNode;
  fields: MobileCardField[];
  actions?: MobileCardAction[];
  onClick?: () => void;
}

export function MobileCard({
  title,
  titleIcon,
  fields,
  actions,
  onClick,
}: MobileCardProps) {
  return (
    <Card
      className={onClick ? "hover-elevate cursor-pointer" : ""}
      onClick={onClick}
      data-testid={`mobile-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            {titleIcon}
            {title}
          </CardTitle>
          {actions && actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid={`button-actions-${title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action, idx) => (
                  <DropdownMenuItem
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                    }}
                    className={
                      action.variant === "destructive"
                        ? "text-destructive focus:text-destructive"
                        : ""
                    }
                    data-testid={`action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map((field, idx) => (
          <div key={idx} className="space-y-1">
            <p className="text-xs text-muted-foreground">{field.label}</p>
            {field.isBadge ? (
              <Badge 
                variant={field.badgeVariant || "default"}
                data-testid={`badge-${field.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {field.value || "-"}
              </Badge>
            ) : (
              <p 
                className={field.className || "text-sm"}
                data-testid={`text-${field.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {field.value || "-"}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface MobileCardListProps<T> {
  items: T[];
  renderCard: (item: T) => MobileCardProps;
  emptyMessage?: string;
}

export function MobileCardList<T>({
  items,
  renderCard,
  emptyMessage = "Nenhum registro encontrado",
}: MobileCardListProps<T>) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item, idx) => (
        <MobileCard key={idx} {...renderCard(item)} />
      ))}
    </div>
  );
}
