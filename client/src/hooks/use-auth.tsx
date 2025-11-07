// Nová a jednodušší implementace AuthContext
import { createContext, ReactNode, useContext, useState } from "react";
import { User } from "@shared/schema";
import { UseMutationResult, useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient, setCsrfToken } from "../lib/queryClient";
import { toast } from "@/hooks/use-toast";

// Definice typů
export type SafeUser = Omit<User, "password">;

export type LoginData = {
  email: string;
  password: string;
};

export type RegisterData = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  role: string;
  [key: string]: any; // Pro další možné vlastnosti
};

type AuthContextType = {
  user: SafeUser | null;
  isLoading: boolean;
  error: Error | null;
  refetchUser: () => void;
  loginMutation: UseMutationResult<AuthSuccessResponse, Error, LoginData>;
  logoutMutation: UseMutationResult<unknown, Error, void>;
  registerMutation: UseMutationResult<AuthSuccessResponse, Error, RegisterData>;
};

// Defaultní hodnota pro context
const defaultContext: AuthContextType = {
  user: null,
  isLoading: false,
  error: null,
  refetchUser: () => {},
  loginMutation: {
    mutate: () => {},
    mutateAsync: async () => ({}),
    reset: () => {},
    context: undefined,
    data: undefined,
    error: null,
    failureCount: 0,
    failureReason: null,
    isPending: false,
    isSuccess: false,
    isError: false,
    status: 'idle',
    variables: undefined,
    isIdle: true,
    isLoading: false,
    isPaused: false,
    submittedAt: 0
  } as any,
  logoutMutation: {
    mutate: () => {},
    mutateAsync: async () => ({}),
    reset: () => {},
    context: undefined,
    data: undefined,
    error: null,
    failureCount: 0,
    failureReason: null,
    isPending: false,
    isSuccess: false,
    isError: false,
    status: 'idle',
    variables: undefined,
    isIdle: true,
    isLoading: false,
    isPaused: false,
    submittedAt: 0
  } as any,
  registerMutation: {
    mutate: () => {},
    mutateAsync: async () => ({}),
    reset: () => {},
    context: undefined,
    data: undefined,
    error: null,
    failureCount: 0,
    failureReason: null,
    isPending: false,
    isSuccess: false,
    isError: false,
    status: 'idle',
    variables: undefined,
    isIdle: true,
    isLoading: false,
    isPaused: false,
    submittedAt: 0
  } as any
};

// Vytvoření kontextu
export const AuthContext = createContext<AuthContextType>(defaultContext);

type AuthSuccessResponse = {
  user: SafeUser;
  csrfToken?: string;
};

// Provider komponenta
export function AuthProvider({ children }: { children: ReactNode }) {
  // Získání informací o aktuálním uživateli
  const userQuery = useQuery<SafeUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 5 * 60 * 1000, // 5 minut cache
    retry: false,
  });

  // Login mutation pro přihlášení
  const loginMutation = useMutation<AuthSuccessResponse, Error, LoginData>({
    mutationFn: async (credentials) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return res.json();
    },
    onSuccess: ({ user, csrfToken }) => {
      if (csrfToken) {
        setCsrfToken(csrfToken);
      }
      queryClient.setQueryData(["/api/user"], user);
      userQuery.refetch();
      window.location.href = "/";
    },
    onError: (error) => {
      console.error("Login failed:", error);
      toast({
        title: "Přihlášení selhalo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Register mutation pro registraci
  const registerMutation = useMutation<AuthSuccessResponse, Error, RegisterData>({
    mutationFn: async (userData) => {
      const { passwordConfirm, ...registerData } = userData;
      const res = await apiRequest("POST", "/api/register", registerData);
      return res.json();
    },
    onSuccess: ({ user, csrfToken }) => {
      if (csrfToken) {
        setCsrfToken(csrfToken);
      }
      queryClient.setQueryData(["/api/user"], user);
      window.location.href = "/";
    },
    onError: (error) => {
      toast({
        title: "Registrace selhala",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation pro odhlášení
  const logoutMutation = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      return apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Vyčistit data uživatele z cache
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setCsrfToken(null);
      
      toast({
        title: "Odhlášení úspěšné",
        description: "Byli jste úspěšně odhlášeni",
      });
      
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500);
    },
    onError: (error) => {
      toast({
        title: "Odhlášení selhalo",
        description: error.message,
        variant: "destructive",
      });

      // I v případě chyby vyčistíme cache a přesměrujeme
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setCsrfToken(null);
      
      setTimeout(() => {
        window.location.href = "/auth";
      }, 1500);
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: userQuery.data ?? null,
        isLoading: userQuery.isLoading,
        error: userQuery.error ?? null,
        refetchUser: userQuery.refetch,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook pro použití auth kontextu
export function useAuth() {
  return useContext(AuthContext);
}
