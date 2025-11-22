import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, AlertTriangle, Settings as SettingsIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const deleteTestDataMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', '/api/test-data');
    },
    onSuccess: () => {
      toast({
        title: "Dados removidos",
        description: "Todos os lançamentos de teste foram removidos. Os cadastros foram preservados.",
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover dados",
        description: error.message || "Ocorreu um erro ao remover os dados de teste.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="title-settings">
          <SettingsIcon className="h-8 w-8" />
          Configurações
        </h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Limpeza de Dados de Teste
          </CardTitle>
          <CardDescription>
            Remove todos os lançamentos financeiros e atividades, preservando cadastros de fornecedores, clientes, centros de custo e contas bancárias.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium">O que será removido:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Todas as contas a pagar</li>
                  <li>Todas as contas a receber</li>
                  <li>Todos os pagamentos (baixas)</li>
                  <li>Todas as transferências bancárias</li>
                  <li>Todas as alocações de centro de custo</li>
                  <li>Todas as atividades da agenda</li>
                  <li>Saldos das contas bancárias (zerados)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-success/50 bg-success/10 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium">O que será preservado:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Cadastro de fornecedores</li>
                  <li>Cadastro de clientes</li>
                  <li>Cadastro de centros de custo</li>
                  <li>Cadastro de contas bancárias</li>
                  <li>Plano de contas</li>
                  <li>Dados da empresa</li>
                  <li>Usuários e permissões</li>
                </ul>
              </div>
            </div>
          </div>

          <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={deleteTestDataMutation.isPending}
                data-testid="button-delete-test-data"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteTestDataMutation.isPending ? 'Removendo...' : 'Limpar Dados de Teste'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Confirmar Limpeza de Dados
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-4">
                  <p>
                    Esta ação removerá <strong>todos os lançamentos financeiros e atividades</strong> do sistema.
                  </p>
                  <p className="text-destructive font-medium">
                    Esta operação não pode ser desfeita!
                  </p>
                  <p>
                    Os cadastros de fornecedores, clientes, centros de custo e contas bancárias serão preservados.
                  </p>
                  <p>
                    Deseja continuar?
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    deleteTestDataMutation.mutate();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete"
                >
                  Sim, limpar dados
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sobre o Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Sistema:</p>
              <p className="font-medium">ZENITH ERP</p>
            </div>
            <div>
              <p className="text-muted-foreground">Versão:</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-muted-foreground">Módulo:</p>
              <p className="font-medium">Gestão Empresarial</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ambiente:</p>
              <p className="font-medium">Produção</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
