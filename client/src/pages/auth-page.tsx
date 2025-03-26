import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Redirect } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
// Upravili jsme strukturu - místo Tabs používáme standardní div strukturu
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
  const { user, loginMutation, registerMutation, refetchUser } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
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
    // Převést email na lowercase pro konzistenci
    const normalizedEmail = data.email.toLowerCase();
    console.log("Login form submitted:", { 
      email: normalizedEmail,
      passwordLength: data.password ? data.password.length : 0 
    });
    
    loginMutation.mutate({
      email: normalizedEmail,
      password: data.password,
    }, {
      onSuccess: () => {
        console.log("Manuální aktualizace stavu uživatele po přihlášení");
        // Explicitně aktualizujeme stav uživatele po úspěšném přihlášení
        refetchUser();
      },
      onError: (error) => {
        console.error("Login mutation error:", error);
      }
    });
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
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
        description: "Kód pro reset hesla byl odeslán na váš email.",
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-100 flex flex-col items-center justify-center p-4">
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Informační část */}
        <div className="hidden md:flex flex-col justify-center space-y-4 p-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">ShiftManager</h1>
            <p className="text-slate-600 text-lg">Komplexní systém pro správu směn, pracovníků a fakturace</p>
          </div>
          <div className="space-y-4 mt-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path><path d="M16 18h.01"></path></svg>
              </div>
              <p className="text-slate-600">Plánování směn a výměna mezi pracovníky</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <p className="text-slate-600">Správa pracovníků a jejich směn</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <p className="text-slate-600">Fakturační systém pro správce</p>
            </div>
          </div>
        </div>
        
        {/* Přihlašovací karta */}
        <Card className="w-full shadow-lg border-0">
          <CardContent className="p-0">
            <div className="md:hidden text-center p-6">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">ShiftManager</h1>
              <p className="text-slate-600">Systém pro správu směn a pracovníků</p>
            </div>
          
            <div className="w-full">
              <div className="grid grid-cols-2 w-full rounded-none border-b">
                <button 
                  type="button"
                  className={`py-3 text-center font-medium ${activeTab === "login" ? "border-b-2 border-primary text-primary" : "text-gray-500"}`}
                  onClick={() => setActiveTab("login")}
                >
                  {t('login')}
                </button>
                <button 
                  type="button"
                  className={`py-3 text-center font-medium ${activeTab === "register" ? "border-b-2 border-primary text-primary" : "text-gray-500"}`}
                  onClick={() => setActiveTab("register")}
                >
                  {t('register')}
                </button>
              </div>
              
              <div className={`${activeTab === "login" ? "block" : "hidden"} p-6`}>
                <Form {...loginForm}>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    console.log("Form submit event triggered");
                    loginForm.handleSubmit(onLoginSubmit)(e);
                  }} className="space-y-4">
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
                      <button 
                        type="button"
                        className="text-sm p-0 h-auto text-primary underline" 
                        onClick={() => setIsResetDialogOpen(true)}
                      >
                        Zapomenuté heslo?
                      </button>
                    </div>
                    
                    <div>
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                        onClick={() => {
                          console.log("Login button clicked");
                          console.log("Form values:", loginForm.getValues());
                          console.log("Form errors:", loginForm.formState.errors);
                        }}
                      >
                        {loginMutation.isPending ? t('loading') : t('login')}
                      </Button>
                    </div>
                    
                    <div className="text-center mt-2">

                    </div>
                  </form>
                </Form>
              </div>
              
              <div className={`${activeTab === "register" ? "block" : "hidden"} p-6`}>
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
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Reset Password Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Zapomenuté heslo</DialogTitle>
            <DialogDescription>
              Zadejte svůj e-mail pro obnovení hesla. Na tento email vám bude zaslán kód pro reset hesla.
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
              Zadejte kód, který vám byl zaslán na email {resetEmail ? resetEmail : ''} a vaše nové heslo.
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