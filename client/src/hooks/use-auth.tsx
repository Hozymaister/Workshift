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
  loginMutation: UseMutationResult<SafeUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SafeUser, Error, RegisterData>;
};

const loginSchema = z.object({
  email: z.string().email("Zadejte platný email"),
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
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
  } = useQuery<SafeUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        const res = await apiRequest("POST", "/api/login", credentials);
        const data = await res.json();
        // Předběžně nastavíme data, aby přesměrování bylo rychlejší
        queryClient.setQueryData(["/api/user"], data);
        return data;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: (user: SafeUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Přihlášení úspěšné",
        description: `Vítejte zpět, ${user.firstName}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Login onError called:", error.message);
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
      toast({
        title: "Registrace úspěšná",
        description: `Vítejte, ${user.firstName}!`,
      });
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
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Odhlášení úspěšné",
        description: "Byli jste úspěšně odhlášeni",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Odhlášení selhalo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
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
