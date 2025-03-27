import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type SafeUser = Omit<User, "password">;

type AuthContextType = {
  user: SafeUser | null;
  isLoading: boolean;
  error: Error | null;
  refetchUser: () => void;
  loginMutation: UseMutationResult<SafeUser, Error, LoginData>;
  logoutMutation: UseMutationResult<unknown, Error, void>;
  registerMutation: UseMutationResult<SafeUser, Error, RegisterData>;
};

const loginSchema = z.object({
  email: z.string().email("Zadejte platný email"),
  password: z.string().min(1, "Heslo je povinné"),
});

const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
  passwordConfirm: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Hesla se neshodují",
  path: ["passwordConfirm"],
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser
  } = useQuery<SafeUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Attempting login with:", { 
        email: credentials.email, 
        passwordProvided: !!credentials.password 
      });
      try {
        const res = await apiRequest("POST", "/api/login", credentials);
        const userData = await res.json();
        console.log("Login successful:", { userId: userData.id });
        return userData;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: (user: SafeUser) => {
      console.log("Setting user data in query cache");
      queryClient.setQueryData(["/api/user"], user);
      console.log("Refreshing user data from server");
      refetchUser();
      // Přesměrování provede ProtectedRoute
    },
    onError: (error: Error) => {
      console.error("Login mutation error handler:", error);
      toast({
        title: "Přihlášení selhalo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      // Omit the passwordConfirm field
      const { passwordConfirm, ...registerData } = userData;
      const res = await apiRequest("POST", "/api/register", registerData);
      return await res.json();
    },
    onSuccess: (user: SafeUser) => {
      queryClient.setQueryData(["/api/user"], user);
      // Nebudeme zobrazovat toast aby nedošlo ke zpoždění přesměrování
      // Pozn: přesměrování bude provedeno automaticky díky ProtectedRoute
    },
    onError: (error: Error) => {
      toast({
        title: "Registrace selhala",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Attempting to logout...");
      try {
        await apiRequest("POST", "/api/logout");
      } catch (error) {
        console.error("Logout API request error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Logout successful. Clearing user data from cache.");
      // Vyčistit data uživatele z cache
      queryClient.setQueryData(["/api/user"], null);
      // Invalidovat query, aby se při příští potřebě znovu načetla
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Odhlášení úspěšné",
        description: "Byli jste úspěšně odhlášeni",
      });
      
      // Krátké zpoždění před přesměrováním, aby měl toast čas se zobrazit
      setTimeout(() => {
        // Přesměrování na přihlašovací stránku
        window.location.href = "/auth";
      }, 500);
    },
    onError: (error: Error) => {
      console.error("Logout error:", error);
      toast({
        title: "Odhlášení selhalo",
        description: error.message || "Nastala chyba při odhlašování",
        variant: "destructive",
      });
      
      // I v případě chyby vyčistíme cache a přesměrujeme na přihlašovací stránku
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      setTimeout(() => {
        window.location.href = "/auth";
      }, 1500);
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        refetchUser,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
