import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

type AuthUser = User & {
  authProvider?: 'replit' | 'local' | null;
};

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    mustChangePassword: user?.mustChangePassword === true,
    authProvider: (user?.authProvider || 'replit') as 'replit' | 'local',
  };
}
