import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";

const DRE_ACCOUNT_COUNTS = {
  receita: 18,
  despesa: 76,
  total: 94,
} as const;

interface ImportDreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (types: string[]) => void;
  isPending: boolean;
}

export function ImportDreDialog({ open, onOpenChange, onConfirm, isPending }: ImportDreDialogProps) {
  const [includeReceitas, setIncludeReceitas] = useState(true);
  const [includeDespesas, setIncludeDespesas] = useState(true);

  const receitasCount = DRE_ACCOUNT_COUNTS.receita;
  const despesasCount = DRE_ACCOUNT_COUNTS.despesa;

  const selectedTypes = [
    ...(includeReceitas ? ["receita"] : []),
    ...(includeDespesas ? ["despesa"] : [])
  ];

  const selectedCount = 
    (includeReceitas ? receitasCount : 0) + 
    (includeDespesas ? despesasCount : 0);

  const handleConfirm = () => {
    if (selectedTypes.length === 0) return;
    onConfirm(selectedTypes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Importar Plano de Contas DRE
          </DialogTitle>
          <DialogDescription>
            Selecione quais categorias de contas você deseja importar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-6 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3 flex-1">
              <Switch
                id="receitas"
                checked={includeReceitas}
                onCheckedChange={setIncludeReceitas}
                data-testid="switch-receitas"
              />
              <div className="flex-1">
                <Label htmlFor="receitas" className="cursor-pointer font-medium">
                  Receitas (3.xxx)
                </Label>
                <p className="text-sm text-muted-foreground">
                  {receitasCount} contas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-1">
              <Switch
                id="despesas"
                checked={includeDespesas}
                onCheckedChange={setIncludeDespesas}
                data-testid="switch-despesas"
              />
              <div className="flex-1">
                <Label htmlFor="despesas" className="cursor-pointer font-medium">
                  Despesas (4.xxx)
                </Label>
                <p className="text-sm text-muted-foreground">
                  {despesasCount} contas
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
            <span className="font-medium">Total selecionado:</span>
            <Badge variant="default" className="text-base" data-testid="text-selected-count">
              {selectedCount} de {DRE_ACCOUNT_COUNTS.total} contas
            </Badge>
          </div>

          <div className="p-4 border rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground mb-2">
              Você está prestes a importar:
            </p>
            <ul className="space-y-1 text-sm">
              {includeReceitas && (
                <li className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">Receita</Badge>
                  <span>{receitasCount} contas da série 3.xxx</span>
                </li>
              )}
              {includeDespesas && (
                <li className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Despesa</Badge>
                  <span>{despesasCount} contas da série 4.xxx</span>
                </li>
              )}
              {selectedCount === 0 && (
                <li className="text-destructive">
                  Selecione pelo menos um tipo de conta
                </li>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            data-testid="button-cancel-import"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedTypes.length === 0 || isPending}
            data-testid="button-confirm-import"
          >
            {isPending ? "Importando..." : `Importar ${selectedCount} contas`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
