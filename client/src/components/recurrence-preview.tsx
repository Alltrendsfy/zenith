import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { generateInstallmentDates, RecurrenceType } from "@shared/recurrenceUtils"
import { Edit2, Check, X } from "lucide-react"
import { format } from "date-fns"

export interface RecurrenceInstallment {
  installmentNumber: number
  dueDate: string
  amount: string
}

interface RecurrencePreviewProps {
  recurrenceType: RecurrenceType
  recurrenceCount: string
  recurrenceStartDate: string
  baseAmount: string
  onInstallmentsChange: (installments: RecurrenceInstallment[]) => void
}

export function RecurrencePreview({
  recurrenceType,
  recurrenceCount,
  recurrenceStartDate,
  baseAmount,
  onInstallmentsChange,
}: RecurrencePreviewProps) {
  const [installments, setInstallments] = useState<RecurrenceInstallment[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDueDate, setEditDueDate] = useState("")
  const [editAmount, setEditAmount] = useState("")

  // Generate installments when parameters change
  useEffect(() => {
    if (recurrenceType === 'unica' || !recurrenceCount || !recurrenceStartDate || !baseAmount) {
      setInstallments([])
      onInstallmentsChange([])
      return
    }

    const count = parseInt(recurrenceCount)
    if (isNaN(count) || count < 1) {
      setInstallments([])
      onInstallmentsChange([])
      return
    }

    const dates = generateInstallmentDates(recurrenceStartDate, recurrenceType, count)
    const newInstallments: RecurrenceInstallment[] = dates.map((date, index) => ({
      installmentNumber: index + 1,
      dueDate: date,
      amount: baseAmount,
    }))

    setInstallments(newInstallments)
    onInstallmentsChange(newInstallments)
  }, [recurrenceType, recurrenceCount, recurrenceStartDate, baseAmount, onInstallmentsChange])

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditDueDate(installments[index].dueDate)
    setEditAmount(installments[index].amount)
  }

  const handleSaveEdit = () => {
    if (editingIndex === null) return

    const updated = [...installments]
    updated[editingIndex] = {
      ...updated[editingIndex],
      dueDate: editDueDate,
      amount: editAmount,
    }

    setInstallments(updated)
    onInstallmentsChange(updated)
    setEditingIndex(null)
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditDueDate("")
    setEditAmount("")
  }

  if (installments.length === 0) {
    return null
  }

  const total = installments.reduce((sum, inst) => {
    const amount = parseFloat(inst.amount) || 0
    return sum + amount
  }, 0)

  return (
    <Card data-testid="recurrence-preview">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">
          Preview das Parcelas
        </CardTitle>
        <Badge variant="secondary" data-testid="installment-count-badge">
          {installments.length} parcela{installments.length !== 1 ? 's' : ''}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-4">
          Você pode editar a data de vencimento e o valor de cada parcela antes de salvar.
        </div>

        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installments.map((inst, index) => (
                <TableRow key={index} data-testid={`installment-row-${index}`}>
                  <TableCell className="font-medium">
                    {inst.installmentNumber}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="h-8"
                        data-testid={`edit-due-date-${index}`}
                      />
                    ) : (
                      <span data-testid={`due-date-${index}`}>
                        {format(new Date(inst.dueDate + 'T00:00:00'), 'dd/MM/yyyy')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="h-8 font-mono"
                        data-testid={`edit-amount-${index}`}
                      />
                    ) : (
                      <span className="font-mono" data-testid={`amount-${index}`}>
                        R$ {parseFloat(inst.amount).toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingIndex === index ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleSaveEdit}
                          className="h-8 w-8"
                          data-testid={`save-edit-${index}`}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="h-8 w-8"
                          data-testid={`cancel-edit-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(index)}
                        className="h-8 w-8"
                        data-testid={`edit-button-${index}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={2} className="text-right">
                  Total:
                </TableCell>
                <TableCell colSpan={2} className="font-mono" data-testid="total-amount">
                  R$ {total.toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
