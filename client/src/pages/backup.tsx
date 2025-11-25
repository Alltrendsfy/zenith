import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Database, 
  Download, 
  CloudUpload, 
  Clock, 
  FileJson, 
  CheckCircle2, 
  AlertCircle,
  HardDrive,
  RefreshCw,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import type { BackupHistory } from "@shared/schema";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "N/A";
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDaysSinceBackup(lastBackupDate: Date | string | null): number {
  if (!lastBackupDate) return -1;
  const now = new Date();
  const last = new Date(lastBackupDate);
  const diffTime = Math.abs(now.getTime() - last.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export default function Backup() {
  const { toast } = useToast();
  const { isAdmin, isManager } = usePermissions();
  const canAccessBackup = isAdmin || isManager;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: backupHistory, isLoading: historyLoading } = useQuery<BackupHistory[]>({
    queryKey: ['/api/backup/history'],
    enabled: canAccessBackup,
  });

  const { data: lastBackup, isLoading: lastBackupLoading } = useQuery<BackupHistory | null>({
    queryKey: ['/api/backup/last'],
    enabled: canAccessBackup,
  });

  if (!canAccessBackup) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card className="max-w-lg mx-auto mt-12">
          <CardHeader className="text-center">
            <ShieldAlert className="h-16 w-16 mx-auto text-amber-500 mb-4" />
            <CardTitle className="text-xl">Acesso Restrito</CardTitle>
            <CardDescription>
              Apenas administradores e gerentes podem acessar o módulo de backup.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Entre em contato com o administrador do sistema se precisar fazer backup dos dados.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const generateBackupMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const response = await apiRequest('POST', '/api/backup/generate', { notes });
      return response.json();
    },
    onSuccess: (data) => {
      const backupJson = JSON.stringify(data.data, null, 2);
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Backup gerado com sucesso!",
        description: `Arquivo ${data.filename} baixado. Salve-o no Google Drive para maior segurança.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/backup/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/backup/last'] });
      setDialogOpen(false);
      setNotes("");
      setIsGenerating(false);
    },
    onError: (error: any) => {
      setIsGenerating(false);
      toast({
        title: "Erro ao gerar backup",
        description: error.message || "Ocorreu um erro ao gerar o backup",
        variant: "destructive",
      });
    },
  });

  const daysSinceBackup = getDaysSinceBackup(lastBackup?.createdAt || null);
  const needsBackup = daysSinceBackup === -1 || daysSinceBackup >= 1;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Backup de Dados</h1>
            <p className="text-muted-foreground">Gerencie os backups do sistema ZENITH ERP</p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2" data-testid="button-new-backup">
              <Download className="h-5 w-5" />
              Fazer Backup Agora
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar Novo Backup</DialogTitle>
              <DialogDescription>
                O backup incluirá todos os dados do sistema: fornecedores, clientes, contas, transações e configurações.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Ex: Backup antes da atualização do sistema..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  data-testid="input-backup-notes"
                />
              </div>
              
              <Alert>
                <CloudUpload className="h-4 w-4" />
                <AlertTitle>Salve no Google Drive</AlertTitle>
                <AlertDescription>
                  Após o download, recomendamos que você faça upload do arquivo para o Google Drive para garantir a segurança dos dados.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  disabled={isGenerating}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={() => generateBackupMutation.mutate()}
                  disabled={isGenerating}
                  className="gap-2"
                  data-testid="button-confirm-backup"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Gerar e Baixar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {needsBackup && (
        <Alert variant={daysSinceBackup === -1 ? "destructive" : "default"} className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">
            {daysSinceBackup === -1 ? "Nenhum backup realizado" : `Último backup há ${daysSinceBackup} dia(s)`}
          </AlertTitle>
          <AlertDescription className="text-amber-600 dark:text-amber-300">
            Recomendamos fazer backup diário às 17:30 para garantir a segurança dos seus dados.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Último Backup</CardTitle>
          </CardHeader>
          <CardContent>
            {lastBackupLoading ? (
              <div className="h-16 animate-pulse bg-muted rounded" />
            ) : lastBackup ? (
              <div className="space-y-2">
                <p className="text-2xl font-bold" data-testid="text-last-backup-date">
                  {formatDateTime(lastBackup.createdAt)}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileJson className="h-4 w-4" />
                  <span>{lastBackup.filename}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Nenhum backup realizado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <HardDrive className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Dados no Backup</CardTitle>
          </CardHeader>
          <CardContent>
            {lastBackupLoading ? (
              <div className="h-16 animate-pulse bg-muted rounded" />
            ) : lastBackup ? (
              <div className="space-y-2">
                <p className="text-2xl font-bold" data-testid="text-last-backup-records">
                  {lastBackup.recordsCount?.toLocaleString('pt-BR')} registros
                </p>
                <p className="text-sm text-muted-foreground">
                  Tamanho: {formatFileSize(lastBackup.fileSize)}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">N/A</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {!needsBackup ? (
                <>
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Em dia
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Backup realizado hoje
                  </p>
                </>
              ) : (
                <>
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {daysSinceBackup === -1 ? "Faça seu primeiro backup" : `Há ${daysSinceBackup} dia(s) sem backup`}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Backups</CardTitle>
              <CardDescription>Últimos backups realizados no sistema</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2"
              onClick={() => window.open('https://drive.google.com', '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              Abrir Google Drive
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse bg-muted rounded" />
              ))}
            </div>
          ) : !backupHistory || backupHistory.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum backup encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em "Fazer Backup Agora" para criar seu primeiro backup
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead className="text-right">Registros</TableHead>
                    <TableHead className="text-right">Tamanho</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backupHistory.map((backup) => (
                    <TableRow key={backup.id} data-testid={`row-backup-${backup.id}`}>
                      <TableCell className="font-medium">
                        {formatDateTime(backup.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileJson className="h-4 w-4 text-primary" />
                          <span className="text-sm">{backup.filename}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {backup.recordsCount?.toLocaleString('pt-BR') || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatFileSize(backup.fileSize)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={backup.status === 'completed' ? 'default' : 'secondary'}>
                          {backup.status === 'completed' ? 'Concluído' : backup.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {backup.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-700 dark:text-blue-400 flex items-center gap-2">
            <CloudUpload className="h-5 w-5" />
            Como salvar no Google Drive
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-600 dark:text-blue-300">
          <ol className="list-decimal list-inside space-y-2">
            <li>Clique em "Fazer Backup Agora" para baixar o arquivo JSON</li>
            <li>Abra o <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Google Drive</a> no navegador</li>
            <li>Crie uma pasta chamada "ZENITH Backups" (se ainda não existir)</li>
            <li>Arraste o arquivo baixado para dentro da pasta</li>
            <li>Pronto! Seu backup está seguro na nuvem</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
