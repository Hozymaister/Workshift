import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";

// Login schema
const loginSchema = z.object({
  email: z.string().email("Zadejte platný email"),
  password: z.string().min(1, "Heslo je povinné"),
  rememberMe: z.boolean().optional(),
});

// Reset password schema
const resetPasswordSchema = z.object({
  email: z.string().email("Zadejte platný email"),
});

// New password schema
const newPasswordSchema = z.object({
  code: z.string().min(6, "Kód musí mít alespoň 6 znaků"),
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
  passwordConfirm: z.string().min(6, "Potvrzení hesla je povinné"),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Hesla se neshodují",
  path: ["passwordConfirm"],
});

// Registration schema
const registerSchema = z.object({
  firstName: z.string().min(1, "Jméno je povinné"),
  lastName: z.string().min(1, "Příjmení je povinné"),
  username: z.string().min(1, "Uživatelské jméno je povinné"),
  email: z.string().email("Zadejte platný email"),
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
  passwordConfirm: z.string().min(6, "Potvrzení hesla je povinné"),
  role: z.enum(["admin", "worker"]),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Hesla se neshodují",
  path: ["passwordConfirm"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
type NewPasswordFormValues = z.infer<typeof newPasswordSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isNewPasswordDialogOpen, setIsNewPasswordDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Registration form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
      passwordConfirm: "",
      role: "worker",
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    console.log("Login form submitted:", { email: data.email });
    
    loginMutation.mutate({
      email: data.email,
      password: data.password,
    }, {
      onSuccess: () => {
        // Okamžité přesměrování na dashboard po úspěšném přihlášení
        window.location.href = "/";
      }
    });
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        // Okamžité přesměrování na dashboard po úspěšné registraci
        window.location.href = "/";
      }
    });
  };
  
  // Reset password form
  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });
  
  // New password form
  const newPasswordForm = useForm<NewPasswordFormValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: {
      code: "",
      password: "",
      passwordConfirm: "",
    },
  });
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormValues) => {
      const res = await apiRequest("POST", "/api/reset-password", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Kód byl vygenerován",
        description: "DEMO VERZE: Kód najdete v konzoli serveru (např. [Reset code for email@example.com]: 123456)",
      });
      setResetEmail(resetPasswordForm.getValues().email);
      setIsResetDialogOpen(false);
      setIsNewPasswordDialogOpen(true);
      resetPasswordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při odesílání emailu",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // New password mutation
  const newPasswordMutation = useMutation({
    mutationFn: async (data: NewPasswordFormValues) => {
      const res = await apiRequest("POST", "/api/reset-password/confirm", {
        ...data,
        email: resetEmail,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Heslo změněno",
        description: "Vaše heslo bylo úspěšně změněno. Nyní se můžete přihlásit.",
      });
      setIsNewPasswordDialogOpen(false);
      newPasswordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při změně hesla",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onResetPasswordSubmit = (data: ResetPasswordFormValues) => {
    resetPasswordMutation.mutate(data);
  };
  
  const onNewPasswordSubmit = (data: NewPasswordFormValues) => {
    newPasswordMutation.mutate(data, {
      onSuccess: () => {
        // Po změně hesla zůstaneme na přihlašovací stránce, jen zavřeme dialog
        setIsNewPasswordDialogOpen(false);
        setActiveTab("login");
      }
    });
  };

  // If already logged in, redirect to dashboard
  if (user) {
    console.log("AuthPage: User already logged in, redirecting to dashboard");
    return <Redirect to="/" />;
  }
  console.log("AuthPage: No user found, showing login form");

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-0">
          <div className="text-center p-6">
            <h1 className="text-2xl font-bold text-primary">ShiftManager</h1>
            <p className="text-slate-500">Systém pro správu směn a pracovníků</p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full rounded-none">
              <TabsTrigger value="login">Přihlášení</TabsTrigger>
              <TabsTrigger value="register">Registrace</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="p-6">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heslo</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex items-center justify-between">
                    <FormField
                      control={loginForm.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm">Zapamatovat si mě</FormLabel>
                        </FormItem>
                      )}
                    />
                    <Button 
                      variant="link" 
                      className="text-sm p-0 h-auto" 
                      onClick={() => setIsResetDialogOpen(true)}
                    >
                      Zapomenuté heslo?
                    </Button>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Přihlašování..." : "Přihlásit se"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="register" className="p-6">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={registerForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jméno</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Příjmení</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Uživatelské jméno</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heslo</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="passwordConfirm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Potvrzení hesla</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="worker" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Pracovník
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="admin" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Správce
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Registrace..." : "Registrovat se"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Reset Password Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Zapomenuté heslo</DialogTitle>
            <DialogDescription>
              Zadejte svůj e-mail pro obnovení hesla. V demo verzi bude kód pro reset zobrazen v konzoli serveru. 
              V produkční verzi by byl odeslán na zadaný email.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...resetPasswordForm}>
            <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
              <FormField
                control={resetPasswordForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? "Odesílání..." : "Odeslat instrukce"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* New Password Dialog */}
      <Dialog open={isNewPasswordDialogOpen} onOpenChange={setIsNewPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Změna hesla</DialogTitle>
            <DialogDescription>
              Zadejte kód, který najdete v konzoli serveru (např. [Reset code for {resetEmail}]: 123456) a vaše nové heslo.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...newPasswordForm}>
            <form onSubmit={newPasswordForm.handleSubmit(onNewPasswordSubmit)} className="space-y-4">
              <FormField
                control={newPasswordForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kód pro obnovení</FormLabel>
                    <FormControl>
                      <Input placeholder="123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newPasswordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nové heslo</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newPasswordForm.control}
                name="passwordConfirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Potvrzení hesla</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={newPasswordMutation.isPending}
                >
                  {newPasswordMutation.isPending ? "Odesílání..." : "Změnit heslo"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
