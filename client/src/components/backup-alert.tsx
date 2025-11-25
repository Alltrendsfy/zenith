import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Database, X, Clock } from "lucide-react";
import { Link } from "wouter";
import type { BackupHistory } from "@shared/schema";
import { usePermissions } from "@/hooks/usePermissions";

function getBrazilTime(): Date {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const brazilOffset = -3 * 60 * 60000;
  return new Date(utcTime + brazilOffset);
}

function isAfterBackupTime(): boolean {
  const brazilTime = getBrazilTime();
  const hours = brazilTime.getHours();
  const minutes = brazilTime.getMinutes();
  return hours > 17 || (hours === 17 && minutes >= 30);
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function getDaysSinceBackup(lastBackupDate: Date | string | null): number {
  if (!lastBackupDate) return -1;
  const now = new Date();
  const last = new Date(lastBackupDate);
  const diffTime = Math.abs(now.getTime() - last.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function BackupAlert() {
  const { isAdmin } = usePermissions();
  const [dismissed, setDismissed] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const { data: lastBackup } = useQuery<BackupHistory | null>({
    queryKey: ['/api/backup/last'],
    enabled: isAdmin,
  });

  useEffect(() => {
    const checkBackupStatus = () => {
      if (!isAdmin) {
        setShowAlert(false);
        return;
      }

      const afterBackupTime = isAfterBackupTime();
      const brazilTime = getBrazilTime();
      
      if (lastBackup?.createdAt) {
        const lastBackupDate = new Date(lastBackup.createdAt);
        const backupToday = isSameDay(lastBackupDate, brazilTime);
        
        if (backupToday) {
          setShowAlert(false);
          return;
        }
      }

      if (afterBackupTime || !lastBackup) {
        setShowAlert(true);
      } else {
        setShowAlert(false);
      }
    };

    checkBackupStatus();

    const interval = setInterval(checkBackupStatus, 60000);
    return () => clearInterval(interval);
  }, [lastBackup, isAdmin]);

  if (!showAlert || dismissed || !isAdmin) {
    return null;
  }

  const daysSinceBackup = getDaysSinceBackup(lastBackup?.createdAt || null);
  const isUrgent = daysSinceBackup === -1 || daysSinceBackup > 1;

  return (
    <Alert 
      variant={isUrgent ? "destructive" : "default"} 
      className={`relative ${isUrgent ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'}`}
      data-testid="alert-backup-reminder"
    >
      <Database className={`h-4 w-4 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`} />
      <AlertTitle className={`${isUrgent ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'} flex items-center gap-2`}>
        <Clock className="h-4 w-4" />
        {isUrgent ? 'Backup Urgente!' : 'Lembrete: Hora do Backup Diário'}
      </AlertTitle>
      <AlertDescription className={`${isUrgent ? 'text-red-600 dark:text-red-300' : 'text-amber-600 dark:text-amber-300'}`}>
        <p className="mb-2">
          {daysSinceBackup === -1 
            ? 'Você ainda não fez nenhum backup. Proteja seus dados agora!'
            : daysSinceBackup === 0
            ? 'São 17:30 - hora de fazer o backup diário para garantir a segurança dos seus dados.'
            : `Último backup há ${daysSinceBackup} dia(s). Faça um backup agora para proteger seus dados.`
          }
        </p>
        <div className="flex items-center gap-3 mt-3">
          <Link href="/backup">
            <Button 
              size="sm" 
              className="gap-2"
              data-testid="button-go-to-backup"
            >
              <Database className="h-4 w-4" />
              Fazer Backup
            </Button>
          </Link>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setDismissed(true)}
            className={isUrgent ? 'text-red-600 hover:text-red-700' : 'text-amber-600 hover:text-amber-700'}
            data-testid="button-dismiss-backup-alert"
          >
            Lembrar Depois
          </Button>
        </div>
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0"
        onClick={() => setDismissed(true)}
        data-testid="button-close-backup-alert"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
