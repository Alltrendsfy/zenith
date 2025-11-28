import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Building2, Mail, Lock, Loader2 } from "lucide-react";
import { SiReplit } from "react-icons/si";
import zenithLogo from "@assets/logo zenith erp_1763561150551.jpeg";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Erro ao entrar",
          description: data.message || "Credenciais inválidas",
          variant: "destructive",
        });
        return;
      }

      if (data.mustChangePassword) {
        setLocation("/change-password?first=true");
      } else {
        window.location.href = "/";
      }
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
            className="h-24 w-auto"
          />
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent-foreground bg-clip-text text-transparent">
              ZENITH ERP
            </h1>
            <p className="text-sm text-muted-foreground">Sistema de Gestão Empresarial</p>
          </div>
        </div>

        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Entrar no Sistema</CardTitle>
            <CardDescription>
              Escolha como deseja acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <a href="/api/login" className="block">
              <Button 
                variant="outline" 
                className="w-full h-12 text-base gap-3"
                data-testid="button-login-replit"
              >
                <SiReplit className="h-5 w-5" />
                Entrar com Replit
              </Button>
            </a>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  ou continue com email
                </span>
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="input-password"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base"
                disabled={isLoading}
                data-testid="button-login-email"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Entrando...
                  </>
                ) : (
                  "Entrar com Email"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Building2 className="inline-block h-4 w-4 mr-1" />
          Apenas usuários autorizados podem acessar o sistema
        </p>
      </div>
    </div>
  );
}
