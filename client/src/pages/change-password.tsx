import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import zenithLogo from "@assets/logo zenith erp_1763561150551.jpeg";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  const isFirstLogin = new URLSearchParams(window.location.search).get("first") === "true";

  const passwordRequirements = [
    { met: newPassword.length >= 8, text: "Mínimo 8 caracteres" },
    { met: /[A-Z]/.test(newPassword), text: "Uma letra maiúscula" },
    { met: /[a-z]/.test(newPassword), text: "Uma letra minúscula" },
    { met: /[0-9]/.test(newPassword), text: "Um número" },
  ];

  const allRequirementsMet = passwordRequirements.every(r => r.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!allRequirementsMet) {
      toast({
        title: "Senha inválida",
        description: "A nova senha não atende aos requisitos mínimos",
        variant: "destructive",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: "Senhas não conferem",
        description: "A confirmação da senha deve ser igual à nova senha",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          currentPassword: isFirstLogin ? undefined : currentPassword,
          newPassword 
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Erro ao alterar senha",
          description: data.message || "Não foi possível alterar a senha",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi alterada com sucesso. Você será redirecionado.",
      });

      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro de conexão. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-4 mb-8">
          <img 
            src={zenithLogo} 
            alt="Zenith ERP" 
            className="h-20 w-auto"
          />
          <div className="flex flex-col items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent-foreground bg-clip-text text-transparent">
              ZENITH ERP
            </h1>
          </div>
        </div>

        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-xl flex items-center justify-center gap-2">
              <Lock className="h-5 w-5" />
              {isFirstLogin ? "Definir Nova Senha" : "Alterar Senha"}
            </CardTitle>
            <CardDescription>
              {isFirstLogin 
                ? "Por segurança, você precisa criar uma nova senha para continuar"
                : "Altere sua senha de acesso ao sistema"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {!isFirstLogin && (
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pr-10"
                      required={!isFirstLogin}
                      data-testid="input-current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                    required
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="space-y-1 mt-2">
                  {passwordRequirements.map((req, idx) => (
                    <div 
                      key={idx}
                      className={`flex items-center gap-2 text-sm ${req.met ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'}`}
                    >
                      <CheckCircle2 className={`h-3.5 w-3.5 ${req.met ? 'opacity-100' : 'opacity-30'}`} />
                      <span>{req.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                    required
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-sm ${passwordsMatch ? 'text-green-600 dark:text-green-500' : 'text-destructive'}`}>
                    {passwordsMatch ? "Senhas conferem" : "Senhas não conferem"}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base mt-6"
                disabled={isLoading || !allRequirementsMet || !passwordsMatch}
                data-testid="button-change-password"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Alterando...
                  </>
                ) : (
                  "Salvar Nova Senha"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
