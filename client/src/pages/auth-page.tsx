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

// Common password validation function
const passwordsMatch = (data: any) => data.password === data.passwordConfirm;

// Registration schema pro zaměstnance
const registerWorkerSchema = z.object({
  firstName: z.string().min(1, "Jméno je povinné"),
  lastName: z.string().min(1, "Příjmení je povinné"),
  username: z.string().min(1, "Uživatelské jméno je povinné"),
  email: z.string().email("Zadejte platný email"),
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
  passwordConfirm: z.string().min(6, "Potvrzení hesla je povinné"),
  role: z.literal("worker"),
}).refine(passwordsMatch, {
  message: "Hesla se neshodují",
  path: ["passwordConfirm"],
});

// Registration schema pro firmy
const registerCompanySchema = z.object({
  firstName: z.string().min(1, "Jméno je povinné"),
  lastName: z.string().min(1, "Příjmení je povinné"),
  username: z.string().min(1, "Uživatelské jméno je povinné"),
  email: z.string().email("Zadejte platný email"),
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
  passwordConfirm: z.string().min(6, "Potvrzení hesla je povinné"),
  role: z.literal("company"),
  companyName: z.string().min(1, "Název firmy je povinný"),
  companyId: z.string().min(8, "IČO musí mít 8 číslic").max(8, "IČO musí mít 8 číslic"),
  companyVatId: z.string().optional(),
  companyAddress: z.string().min(1, "Adresa firmy je povinná"),
  companyCity: z.string().min(1, "Město je povinné"),
  companyZip: z.string().min(5, "PSČ musí mít 5 číslic").max(5, "PSČ musí mít 5 číslic"),
}).refine(passwordsMatch, {
  message: "Hesla se neshodují",
  path: ["passwordConfirm"],
});

// Společný registrační typ (pro typovou kontrolu)
type RegisterFormValues = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
  role: "worker" | "company";
  // Firemní údaje (pouze pro role="company")
  companyName?: string;
  companyId?: string;
  companyVatId?: string;
  companyAddress?: string;
  companyCity?: string;
  companyZip?: string;
};

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterWorkerFormValues = z.infer<typeof registerWorkerSchema>;
type RegisterCompanyFormValues = z.infer<typeof registerCompanySchema>;
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
  const [registrationType, setRegistrationType] = useState<"worker"|"company">("worker");

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Registration form pro zaměstnance
  const registerWorkerForm = useForm<RegisterWorkerFormValues>({
    resolver: zodResolver(registerWorkerSchema),
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
  
  // Registration form pro firmy
  const registerCompanyForm = useForm<RegisterCompanyFormValues>({
    resolver: zodResolver(registerCompanySchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
      passwordConfirm: "",
      role: "company",
      companyName: "",
      companyId: "",
      companyVatId: "",
      companyAddress: "",
      companyCity: "",
      companyZip: "",
    },
  });
  
  // Zpětná kompatibilita
  const registerForm = registrationType === "worker" ? registerWorkerForm : registerCompanyForm;

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

  const onRegisterSubmit = (data: any) => {
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
                    
                    <div className="text-center mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-center mb-2 space-x-4">
                        <button 
                          type="button"
                          className="text-sm text-gray-600 hover:text-primary transition-colors"
                          onClick={() => setActiveTab("about")}
                        >
                          O nás
                        </button>
                        <button 
                          type="button"
                          className="text-sm text-gray-600 hover:text-primary transition-colors"
                          onClick={() => setActiveTab("pricing")}
                        >
                          Předplatné
                        </button>
                        <button 
                          type="button"
                          className="text-sm text-gray-600 hover:text-primary transition-colors"
                          onClick={() => setActiveTab("contact")}
                        >
                          Kontakt
                        </button>
                      </div>
                    </div>
                  </form>
                </Form>
              </div>
              
              {/* O nás */}
              <div className={`${activeTab === "about" ? "block" : "hidden"} p-6`}>
                <div className="space-y-4">
                  <button 
                    type="button"
                    className="text-sm text-primary flex items-center"
                    onClick={() => setActiveTab("login")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="m15 18-6-6 6-6"/></svg>
                    Zpět na přihlášení
                  </button>
                  
                  <h2 className="text-xl font-semibold text-gray-800">O aplikaci ShiftManager</h2>
                  <p className="text-gray-600">
                    ShiftManager je kompletní systém pro správu směn, pracovníků a fakturace, který usnadňuje každodenní práci manažerům i zaměstnancům.
                  </p>
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-800">Naše výhody:</h3>
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                      <li>Přehledné plánování směn s kalendářem</li>
                      <li>Automatické výpočty odpracovaných hodin</li>
                      <li>Snadná správa pracovníků a jejich mezd</li>
                      <li>Možnost výměny směn mezi pracovníky</li>
                      <li>Detailní reporty a statistiky</li>
                      <li>Generování faktur a finančních přehledů</li>
                    </ul>
                  </div>
                  <p className="text-gray-600">
                    Aplikace je optimalizována pro mobilní zařízení a dostupná odkudkoliv.
                  </p>
                </div>
              </div>
              
              {/* Předplatné */}
              <div className={`${activeTab === "pricing" ? "block" : "hidden"} p-6`}>
                <div className="space-y-4">
                  <button 
                    type="button"
                    className="text-sm text-primary flex items-center"
                    onClick={() => setActiveTab("login")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="m15 18-6-6 6-6"/></svg>
                    Zpět na přihlášení
                  </button>
                  
                  <h2 className="text-xl font-semibold text-gray-800">Varianty předplatného</h2>
                  <p className="text-gray-600">
                    Vyberte si variantu předplatného, která nejlépe vyhovuje vašim potřebám:
                  </p>
                  
                  <div className="grid gap-4">
                    {/* Free Basic */}
                    <div className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800">Free Basic</h3>
                          <p className="text-sm text-gray-500">Zdarma</p>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Zdarma</span>
                      </div>
                      <ul className="mt-3 space-y-1 text-sm text-gray-600">
                        <li className="flex items-center">
                          <svg className="w-3.5 h-3.5 mr-2 text-green-500 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
                          </svg>
                          Plánování směn
                        </li>
                        <li className="flex items-center">
                          <svg className="w-3.5 h-3.5 mr-2 text-green-500 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
                          </svg>
                          Přehledná tabulka směn
                        </li>
                        <li className="flex items-center text-gray-400">
                          <svg className="w-3.5 h-3.5 mr-2 text-gray-300 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
                          </svg>
                          Evidence objektů
                        </li>
                        <li className="flex items-center text-gray-400">
                          <svg className="w-3.5 h-3.5 mr-2 text-gray-300 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
                          </svg>
                          Výměna směn
                        </li>
                      </ul>
                    </div>
                    
                    {/* Lite */}
                    <div className="border rounded-lg p-4 bg-white border-blue-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800">Lite</h3>
                          <p className="text-sm text-gray-500">40 Kč/měsíc</p>
                        </div>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Populární</span>
                      </div>
                      <ul className="mt-3 space-y-1 text-sm text-gray-600">
                        <li className="flex items-center">
                          <svg className="w-3.5 h-3.5 mr-2 text-green-500 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
                          </svg>
                          Plánování směn
                        </li>
                        <li className="flex items-center">
                          <svg className="w-3.5 h-3.5 mr-2 text-green-500 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
                          </svg>
                          Přehledná tabulka směn
                        </li>
                        <li className="flex items-center">
                          <svg className="w-3.5 h-3.5 mr-2 text-green-500 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
                          </svg>
                          Evidence objektů
                        </li>
                        <li className="flex items-center text-gray-400">
                          <svg className="w-3.5 h-3.5 mr-2 text-gray-300 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
                          </svg>
                          Fakturace
                        </li>
                      </ul>
                    </div>
                    
                    {/* Pro */}
                    <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-primary/20">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800">Pro</h3>
                          <p className="text-sm text-gray-500">99 Kč/měsíc</p>
                        </div>
                        <span className="bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5 rounded">Doporučeno</span>
                      </div>
                      <ul className="mt-3 space-y-1 text-sm text-gray-600">
                        <li className="flex items-center">
                          <svg className="w-3.5 h-3.5 mr-2 text-green-500 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
                          </svg>
                          Plánování směn
                        </li>
                        <li className="flex items-center">
                          <svg className="w-3.5 h-3.5 mr-2 text-green-500 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
                          </svg>
                          Přehledná tabulka směn
                        </li>
                        <li className="flex items-center">
                          <svg className="w-3.5 h-3.5 mr-2 text-green-500 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
                          </svg>
                          Evidence objektů
                        </li>
                        <li className="flex items-center">
                          <svg className="w-3.5 h-3.5 mr-2 text-green-500 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
                          </svg>
                          Výměna směn
                        </li>
                        <li className="flex items-center">
                          <svg className="w-3.5 h-3.5 mr-2 text-green-500 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
                          </svg>
                          Fakturace a reporty
                        </li>
                        <li className="flex items-center">
                          <svg className="w-3.5 h-3.5 mr-2 text-green-500 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
                          </svg>
                          Správa zákazníků
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Kontakt */}
              <div className={`${activeTab === "contact" ? "block" : "hidden"} p-6`}>
                <div className="space-y-4">
                  <button 
                    type="button"
                    className="text-sm text-primary flex items-center"
                    onClick={() => setActiveTab("login")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="m15 18-6-6 6-6"/></svg>
                    Zpět na přihlášení
                  </button>
                  
                  <h2 className="text-xl font-semibold text-gray-800">Kontaktujte nás</h2>
                  <p className="text-gray-600">
                    Máte-li jakékoliv dotazy ohledně aplikace nebo předplatného, neváhejte nás kontaktovat:
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-primary mt-0.5"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      <div>
                        <p className="font-medium text-gray-700">Email</p>
                        <p className="text-gray-600">info@shiftmanager.cz</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-primary mt-0.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      <div>
                        <p className="font-medium text-gray-700">Telefon</p>
                        <p className="text-gray-600">+420 123 456 789</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-primary mt-0.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      <div>
                        <p className="font-medium text-gray-700">Adresa</p>
                        <p className="text-gray-600">ShiftManager s.r.o.</p>
                        <p className="text-gray-600">Technologická 1, 708 00 Ostrava</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`${activeTab === "register" ? "block" : "hidden"} p-6`}>
                {/* Výběr typu účtu */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-700 mb-2">Vyberte typ účtu:</h3>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setRegistrationType("worker")}
                      className={`flex-1 p-3 border rounded-lg text-center ${
                        registrationType === "worker" 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex justify-center mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                      </div>
                      <h4 className="font-medium">Pracovník</h4>
                      <p className="text-xs text-gray-500">Pro zaměstnance</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegistrationType("company")}
                      className={`flex-1 p-3 border rounded-lg text-center ${
                        registrationType === "company" 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex justify-center mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                      </div>
                      <h4 className="font-medium">Firma</h4>
                      <p className="text-xs text-gray-500">Pro společnosti</p>
                    </button>
                  </div>
                </div>
                
                {/* Formulář pro zaměstnance */}
                {registrationType === "worker" && (
                  <Form {...registerWorkerForm}>
                    <form onSubmit={registerWorkerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerWorkerForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('first_name')}</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerWorkerForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('last_name')}</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={registerWorkerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('username')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerWorkerForm.control}
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
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerWorkerForm.control}
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
                          control={registerWorkerForm.control}
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
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Registrace..." : "Registrovat se"}
                      </Button>
                    </form>
                  </Form>
                )}
                
                {/* Formulář pro firmy */}
                {registrationType === "company" && (
                  <Form {...registerCompanyForm}>
                    <form onSubmit={registerCompanyForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerCompanyForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('first_name')}</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerCompanyForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('last_name')}</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={registerCompanyForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('username')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerCompanyForm.control}
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
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerCompanyForm.control}
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
                          control={registerCompanyForm.control}
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
                      </div>
                      
                      <div className="border-t pt-4 mt-4">
                        <h3 className="font-medium text-gray-700 mb-3">Firemní údaje</h3>
                        
                        <FormField
                          control={registerCompanyForm.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Název firmy</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <FormField
                            control={registerCompanyForm.control}
                            name="companyId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>IČO</FormLabel>
                                <FormControl>
                                  <Input {...field} maxLength={8} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={registerCompanyForm.control}
                            name="companyVatId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>DIČ (nepovinné)</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="CZ12345678" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={registerCompanyForm.control}
                          name="companyAddress"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Adresa firmy</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <FormField
                            control={registerCompanyForm.control}
                            name="companyCity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Město</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={registerCompanyForm.control}
                            name="companyZip"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>PSČ</FormLabel>
                                <FormControl>
                                  <Input {...field} maxLength={5} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full mt-6" 
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Registrace..." : "Registrovat se"}
                      </Button>
                    </form>
                  </Form>
                )}
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