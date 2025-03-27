import React, { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Definice typů
type SafeUser = Omit<User, "password">;

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
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
  loginMutation: UseMutationResult<SafeUser, Error, LoginData>;
  logoutMutation: UseMutationResult<unknown, Error, void>;
  registerMutation: UseMutationResult<SafeUser, Error, RegisterData>;
};

// Vytvoření kontextu s výchozí hodnotou null
export const AuthContext = createContext<AuthContextType | null>(null);

// Provider komponenta
export function AuthProvider({ children }: { children: ReactNode }) {
  // Využití Toast hooku
  const { toast } = useToast();

  // Získání informací o aktuálním uživateli
  const userQuery = useQuery<SafeUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Login mutation pro přihlášení
  const login = useMutation<SafeUser, Error, LoginData>({
    mutationFn: async (credentials) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return res.json();
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/user"], userData);
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
  const register = useMutation<SafeUser, Error, RegisterData>({
    mutationFn: async (userData) => {
      const { passwordConfirm, ...registerData } = userData;
      const res = await apiRequest("POST", "/api/register", registerData);
      return res.json();
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/user"], userData);
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
  const logout = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      return apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Vyčistit data uživatele z cache
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
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
      
      setTimeout(() => {
        window.location.href = "/auth";
      }, 1500);
    },
  });

  // Hodnota kontextu
  const contextValue: AuthContextType = {
    user: userQuery.data ?? null,
    isLoading: userQuery.isLoading,
    error: userQuery.error ?? null,
    refetchUser: userQuery.refetch,
    loginMutation: login,
    logoutMutation: logout,
    registerMutation: register,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook pro použití auth kontextu
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
}
