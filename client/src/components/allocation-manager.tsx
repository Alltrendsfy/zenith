import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Percent, Calculator } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { CostCenter } from "@shared/schema";

export interface AllocationInput {
  costCenterId: string;
  percentage: number;
}

interface AllocationManagerProps {
  value: AllocationInput[];
  onChange: (allocations: AllocationInput[]) => void;
  totalAmount?: number;
}

export function AllocationManager({ value, onChange, totalAmount = 0 }: AllocationManagerProps) {
  const [allocations, setAllocations] = useState<AllocationInput[]>(value);

  const { data: costCenters = [] } = useQuery<CostCenter[]>({
    queryKey: ['/api/cost-centers'],
  });

  // Sync with parent
  useEffect(() => {
    setAllocations(value);
  }, [value]);

  // Calculate total percentage
  const totalPercentage = allocations.reduce((sum, a) => sum + (a.percentage || 0), 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.01;

  const handleAdd = () => {
    const newAllocations = [
      ...allocations,
      { costCenterId: "", percentage: 0 }
    ];
    setAllocations(newAllocations);
    onChange(newAllocations);
  };

  const handleRemove = (index: number) => {
    const newAllocations = allocations.filter((_, i) => i !== index);
    setAllocations(newAllocations);
    onChange(newAllocations);
  };

  const handleCostCenterChange = (index: number, costCenterId: string) => {
    const newAllocations = [...allocations];
    newAllocations[index] = { ...newAllocations[index], costCenterId };
    setAllocations(newAllocations);
    onChange(newAllocations);
  };

  const handlePercentageChange = (index: number, percentage: string) => {
    const newAllocations = [...allocations];
    const numValue = parseFloat(percentage) || 0;
    newAllocations[index] = { ...newAllocations[index], percentage: numValue };
    setAllocations(newAllocations);
    onChange(newAllocations);
  };

  const handleEqualSplit = () => {
    if (allocations.length === 0) return;
    
    // Calculate base percentage and remainder
    const basePercentage = Math.floor((100 / allocations.length) * 100) / 100;
    const remainder = 100 - (basePercentage * allocations.length);
    
    // Distribute the remainder to the first allocation
    const newAllocations = allocations.map((a, index) => ({
      ...a,
      percentage: index === 0 ? parseFloat((basePercentage + remainder).toFixed(2)) : basePercentage
    }));
    
    setAllocations(newAllocations);
    onChange(newAllocations);
  };

  const handleClear = () => {
    setAllocations([]);
    onChange([]);
  };

  // Get available cost centers (not already selected)
  const getAvailableCostCenters = (currentCostCenterId?: string) => {
    const selectedIds = new Set(allocations.map(a => a.costCenterId).filter(Boolean));
    return costCenters.filter(cc => 
      !selectedIds.has(cc.id) || cc.id === currentCostCenterId
    );
  };

  const getCostCenterName = (costCenterId: string) => {
    const center = costCenters.find(cc => cc.id === costCenterId);
    return center ? `${center.code} - ${center.name}` : "";
  };

  const calculateAmount = (percentage: number) => {
    return ((totalAmount * percentage) / 100).toFixed(2);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Rateio por Centro de Custo</Label>
        <div className="flex items-center gap-2">
          {allocations.length > 0 && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleEqualSplit}
                data-testid="button-equal-split"
              >
                <Calculator className="w-3 h-3 mr-1" />
                Dividir Igual
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleClear}
                data-testid="button-clear-allocations"
              >
                Limpar
              </Button>
            </>
          )}
        </div>
      </div>

      {allocations.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-md">
          <p className="text-sm text-muted-foreground mb-4">
            Nenhum rateio configurado. Clique no botão abaixo para adicionar.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleAdd}
            data-testid="button-add-allocation"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Centro de Custo
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {allocations.map((allocation, index) => {
            const availableCenters = getAvailableCostCenters(allocation.costCenterId);
            const amount = calculateAmount(allocation.percentage);

            return (
              <div
                key={index}
                className="flex items-end gap-2 p-3 border rounded-md"
                data-testid={`allocation-row-${index}`}
              >
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Centro de Custo</Label>
                  <Select
                    value={allocation.costCenterId}
                    onValueChange={(value) => handleCostCenterChange(index, value)}
                  >
                    <SelectTrigger data-testid={`select-cost-center-${index}`}>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCenters.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.code} - {center.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-32 space-y-1">
                  <Label className="text-xs">Percentual</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={allocation.percentage || ""}
                      onChange={(e) => handlePercentageChange(index, e.target.value)}
                      className="pr-8"
                      data-testid={`input-percentage-${index}`}
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                {totalAmount > 0 && (
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">Valor</Label>
                    <div className="h-9 px-3 flex items-center text-sm border rounded-md bg-muted">
                      R$ {amount}
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemove(index)}
                  data-testid={`button-remove-${index}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAdd}
              disabled={allocations.some(a => !a.costCenterId)}
              data-testid="button-add-allocation"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Centro de Custo
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Total:</span>
              <Badge
                variant={isValid ? "default" : "destructive"}
                data-testid="badge-total-percentage"
              >
                {totalPercentage.toFixed(2)}%
              </Badge>
              {!isValid && (
                <span className="text-xs text-destructive">
                  Deve somar 100%
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
