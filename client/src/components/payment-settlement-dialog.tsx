import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const paymentMethodLabels: Record<string, string> = {
  'pix': 'PIX',
  'dinheiro': 'Dinheiro',
  'cartao_credito': 'Cartão de Crédito',
  'cartao_debito': 'Cartão de Débito',
  'transferencia': 'Transferência Bancária',
  'boleto': 'Boleto',
  'cheque': 'Cheque',
  'outros': 'Outros',
};

const paymentSchema = z.object({
  paymentMethod: z.string().min(1, "Método de pagamento é obrigatório"),
  bankAccountId: z.string().optional(),
  amount: z.string().min(1, "Valor é obrigatório"),
  paymentDate: z.string().min(1, "Data de pagamento é obrigatória"),
  notes: z.string().optional(),
}).transform((data) => ({
  ...data,
  bankAccountId: data.bankAccountId === '' ? undefined : data.bankAccountId,
  notes: data.notes === '' ? undefined : data.notes,
}));

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  transactionType: 'payable' | 'receivable';
  description: string;
  totalAmount: string;
  amountPaid?: string;
  onSuccess?: () => void;
}

export function PaymentSettlementDialog({
  open,
  onOpenChange,
  transactionId,
  transactionType,
  description,
  totalAmount,
  amountPaid = "0",
  onSuccess,
}: PaymentSettlementDialogProps) {
  const { toast } = useToast();
  
  const remainingAmount = (parseFloat(totalAmount) - parseFloat(amountPaid)).toFixed(2);
  
  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "",
      amount: remainingAmount,
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['/api/bank-accounts'],
  });

  // Reset form when transaction changes
  useEffect(() => {
    const newRemainingAmount = (parseFloat(totalAmount) - parseFloat(amountPaid)).toFixed(2);
    form.reset({
      paymentMethod: "",
      amount: newRemainingAmount,
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
    });
  }, [transactionId, totalAmount, amountPaid, form]);

  const mutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const endpoint = transactionType === 'payable' 
        ? `/api/accounts-payable/${transactionId}/baixa`
        : `/api/accounts-receivable/${transactionId}/baixa`;
      
      return await apiRequest('POST', endpoint, data);
    },
    onSuccess: () => {
      toast({
        title: "Baixa registrada",
        description: `Pagamento registrado com sucesso`,
      });
      queryClient.invalidateQueries({ 
        queryKey: transactionType === 'payable' 
          ? ['/api/accounts-payable'] 
          : ['/api/accounts-receivable'] 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao registrar baixa",
        description: error.message || "Ocorreu um erro ao processar o pagamento",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {transactionType === 'payable' ? 'Baixar Conta a Pagar' : 'Baixar Conta a Receber'}
          </DialogTitle>
          <DialogDescription>
            Registre o {transactionType === 'payable' ? 'pagamento' : 'recebimento'} de: {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor Total:</span>
            <span className="font-medium">R$ {parseFloat(totalAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {transactionType === 'payable' ? 'Pago' : 'Recebido'}:
            </span>
            <span className="font-medium">R$ {parseFloat(amountPaid).toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">Restante:</span>
            <span className="font-semibold text-lg">R$ {remainingAmount}</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-1 overflow-y-auto">
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pagamento *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-payment-method">
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(paymentMethodLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bankAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta Bancária (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger data-testid="select-bank-account">
                        <SelectValue placeholder="Nenhuma" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bankAccounts.length > 0 ? (
                        bankAccounts.map((account: any) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-accounts" disabled>
                          Nenhuma conta cadastrada
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      data-testid="input-payment-amount"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data do Pagamento *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      data-testid="input-payment-date"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre o pagamento"
                      className="resize-none"
                      rows={3}
                      data-testid="input-payment-notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4 sticky bottom-0 bg-background">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                data-testid="button-cancel-payment"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1"
                data-testid="button-submit-payment"
              >
                {mutation.isPending ? "Processando..." : "Registrar Baixa"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
