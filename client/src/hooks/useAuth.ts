import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface AuthUser extends User {
  mustChangePassword?: boolean;
  authProvider?: 'replit' | 'local';
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    mustChangePassword: user?.mustChangePassword || false,
    authProvider: user?.authProvider || 'replit',
  };
}
