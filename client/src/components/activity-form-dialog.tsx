import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { buildActivityPayload, invalidateActivityQueries } from "@/lib/activityUtils";
import { type Activity } from "@shared/schema";
import { z } from "zod";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Form schema without transform - keeps data as strings
const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  scope: z.enum(["empresarial", "pessoal"]),
  status: z.enum(["pendente", "concluida"]),
  priority: z.enum(["baixa", "media", "alta"]),
  startAt: z.string().min(1, "Data de início é obrigatória"),
  endAt: z.string().optional(),
  allDay: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: Activity;
}

// Helper to get form defaults for create mode
const getCreateDefaults = (): FormData => ({
  title: "",
  description: "",
  scope: "pessoal" as const,
  status: "pendente" as const,
  priority: "media" as const,
  startAt: "",
  endAt: "",
  allDay: false,
});

// Helper to get form defaults for edit mode
const getEditDefaults = (activity: Activity): FormData => {
  const startDate = typeof activity.startAt === 'string' 
    ? new Date(activity.startAt) 
    : activity.startAt;
  const endDate = activity.endAt 
    ? (typeof activity.endAt === 'string' ? new Date(activity.endAt) : activity.endAt)
    : null;
  
  return {
    title: activity.title,
    description: activity.description || "",
    scope: activity.scope,
    status: activity.status,
    priority: activity.priority,
    startAt: startDate.toISOString().slice(0, 16),
    endAt: endDate ? endDate.toISOString().slice(0, 16) : "",
    allDay: activity.allDay || false,
  };
};

export function ActivityFormDialog({ open, onOpenChange, activity }: ActivityFormDialogProps) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: activity ? getEditDefaults(activity) : getCreateDefaults(),
  });

  // Watch activity prop and open state to reset form
  useEffect(() => {
    if (open) {
      form.reset(activity ? getEditDefaults(activity) : getCreateDefaults());
    }
  }, [open, activity, form]);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const createMutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof buildActivityPayload>) => {
      await apiRequest("POST", "/api/activities", payload);
    },
    onSuccess: () => {
      invalidateActivityQueries(queryClient);
      toast({
        title: "Sucesso",
        description: "Atividade criada com sucesso",
      });
      handleOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar atividade",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof buildActivityPayload>) => {
      if (!activity) return;
      await apiRequest("PATCH", `/api/activities/${activity.id}`, payload);
    },
    onSuccess: () => {
      invalidateActivityQueries(queryClient);
      toast({
        title: "Sucesso",
        description: "Atividade atualizada com sucesso",
      });
      handleOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar atividade",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const payload = buildActivityPayload(data);
    
    if (activity) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activity ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
          <DialogDescription>
            {activity
              ? "Atualize as informações da atividade"
              : "Crie uma nova atividade na sua agenda"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nome da atividade"
                      {...field}
                      data-testid="input-activity-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes da atividade"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-activity-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-activity-scope">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pessoal">Pessoal</SelectItem>
                        <SelectItem value="empresarial">Empresarial</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-activity-priority">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-activity-status">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allDay"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-all-day"
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Dia inteiro</FormLabel>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data/Hora Início</FormLabel>
                    <FormControl>
                      <Input
                        type={form.watch("allDay") ? "date" : "datetime-local"}
                        {...field}
                        data-testid="input-activity-start"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!form.watch("allDay") && (
                <FormField
                  control={form.control}
                  name="endAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data/Hora Fim (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-activity-end"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
                data-testid="button-cancel-activity"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-save-activity"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {activity ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
