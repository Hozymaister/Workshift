import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout/layout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Bell, Lock, UserCircle, Settings, HelpCircle } from "lucide-react";
import { OnboardingSettings } from "@/components/onboarding/settings";
import { useToast } from "@/hooks/use-toast";

const profileFormSchema = z.object({
  firstName: z.string().min(2, {
    message: "Jméno musí obsahovat alespoň 2 znaky.",
  }),
  lastName: z.string().min(2, {
    message: "Příjmení musí obsahovat alespoň 2 znaky.",
  }),
  email: z.string().email({
    message: "Neplatný formát e-mailové adresy.",
  }),
});

const accountFormSchema = z.object({
  username: z.string().min(2, {
    message: "Uživatelské jméno musí obsahovat alespoň 2 znaky.",
  }),
  language: z.string({
    required_error: "Prosím vyberte jazyk.",
  }),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, {
    message: "Prosím zadejte současné heslo.",
  }),
  newPassword: z.string().min(6, {
    message: "Nové heslo musí obsahovat alespoň 6 znaků.",
  }),
  confirmPassword: z.string().min(6, {
    message: "Heslo pro potvrzení musí obsahovat alespoň 6 znaků.",
  }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Hesla se neshodují",
  path: ["confirmPassword"],
});

const notificationsFormSchema = z.object({
  shiftNotification: z.boolean().default(true),
  emailNotification: z.boolean().default(true),
  notifyExchangeRequests: z.boolean().default(true),
  notifyNewShifts: z.boolean().default(true),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type AccountFormValues = z.infer<typeof accountFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;
type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  
  if (!user) {
    return <div>Načítání nastavení...</div>;
  }

  // Formulář pro profil
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
    },
  });

  // Formulář pro účet
  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      username: user?.username || "",
      language: "cs",
    },
  });

  // Formulář pro heslo
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Formulář pro notifikace
  const notificationsForm = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
      shiftNotification: true,
      emailNotification: true,
      notifyExchangeRequests: true,
      notifyNewShifts: true,
    },
  });

  // Zpracování odeslaného formuláře pro profil
  function onProfileSubmit(data: ProfileFormValues) {
    toast({
      title: "Profil aktualizován",
      description: "Vaše profilové údaje byly úspěšně aktualizovány.",
    });
  }

  // Zpracování odeslaného formuláře pro účet
  function onAccountSubmit(data: AccountFormValues) {
    toast({
      title: "Účet aktualizován",
      description: "Vaše nastavení účtu bylo úspěšně aktualizováno.",
    });
  }

  // Zpracování odeslaného formuláře pro heslo
  function onPasswordSubmit(data: PasswordFormValues) {
    toast({
      title: "Heslo změněno",
      description: "Vaše heslo bylo úspěšně změněno. Při příštím přihlášení použijte nové heslo.",
    });
    passwordForm.reset({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }

  // Zpracování odeslaného formuláře pro notifikace
  function onNotificationsSubmit(data: NotificationsFormValues) {
    toast({
      title: "Nastavení notifikací aktualizováno",
      description: "Vaše nastavení notifikací bylo úspěšně aktualizováno.",
    });
  }

  return (
    <Layout title="Nastavení">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Nastavení účtu</h1>
          <p className="text-slate-500">Správa vašeho účtu a nastavení aplikace</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-between">
            <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-5 gap-2">
              <TabsTrigger value="profile" className="flex items-center space-x-2">
                <UserCircle className="h-4 w-4" />
                <span>Profil</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Účet</span>
              </TabsTrigger>
              <TabsTrigger value="password" className="flex items-center space-x-2">
                <Lock className="h-4 w-4" />
                <span>Heslo</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span>Notifikace</span>
              </TabsTrigger>
              <TabsTrigger value="onboarding" className="flex items-center space-x-2">
                <HelpCircle className="h-4 w-4" />
                <span>Průvodce</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Obsah záložky Profil */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Osobní údaje</CardTitle>
                <CardDescription>
                  Aktualizujte své osobní údaje, které budou viditelné pro ostatní uživatele.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Jméno</FormLabel>
                            <FormControl>
                              <Input {...field} className="bg-white" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Příjmení</FormLabel>
                            <FormControl>
                              <Input {...field} className="bg-white" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" className="bg-white" />
                          </FormControl>
                          <FormDescription>
                            Tento e-mail bude použit pro případnou komunikaci a obnovu hesla.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit">Uložit změny</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Obsah záložky Účet */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Nastavení účtu</CardTitle>
                <CardDescription>
                  Změňte nastavení svého účtu a preference aplikace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...accountForm}>
                  <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-6">
                    <FormField
                      control={accountForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Uživatelské jméno</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-white" />
                          </FormControl>
                          <FormDescription>
                            Uživatelské jméno používáte při přihlášení do aplikace.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={accountForm.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jazyk</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Vyberte jazyk" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cs">Čeština</SelectItem>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="sk">Slovenčina</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Zvolený jazyk bude použit v celé aplikaci.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit">Uložit změny</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Obsah záložky Heslo */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Změna hesla</CardTitle>
                <CardDescription>
                  Změňte své heslo pro přihlášení do aplikace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Současné heslo</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Separator />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nové heslo</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" className="bg-white" />
                          </FormControl>
                          <FormDescription>
                            Heslo by mělo obsahovat alespoň 6 znaků.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Potvrzení nového hesla</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit">Změnit heslo</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Obsah záložky Notifikace */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Nastavení notifikací</CardTitle>
                <CardDescription>
                  Určete, jaké notifikace chcete dostávat a jakým způsobem.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...notificationsForm}>
                  <form onSubmit={notificationsForm.handleSubmit(onNotificationsSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-md font-medium">Způsob doručení</h3>
                      <FormField
                        control={notificationsForm.control}
                        name="shiftNotification"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Notifikace v aplikaci</FormLabel>
                              <FormDescription>
                                Obdržíte notifikace přímo v aplikaci.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={notificationsForm.control}
                        name="emailNotification"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">E-mailové notifikace</FormLabel>
                              <FormDescription>
                                Obdržíte notifikace na svůj e-mail.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-md font-medium">Typy notifikací</h3>
                      <FormField
                        control={notificationsForm.control}
                        name="notifyExchangeRequests"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Žádosti o výměnu směny</FormLabel>
                              <FormDescription>
                                Budete informováni o nových žádostech o výměnu směny.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={notificationsForm.control}
                        name="notifyNewShifts"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Nové směny</FormLabel>
                              <FormDescription>
                                Budete informováni o nových přidělených směnách.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit">Uložit nastavení</Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="border-t bg-slate-50">
                <p className="text-sm text-muted-foreground">
                  Tato nastavení ovlivňují pouze notifikace v této aplikaci, ne e-mailové zprávy ze systému.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Obsah záložky Průvodce */}
          <TabsContent value="onboarding">
            <Card>
              <CardHeader>
                <CardTitle>Nastavení průvodce aplikací</CardTitle>
                <CardDescription>
                  Upravte nastavení průvodce a nápovědu v aplikaci
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OnboardingSettings />
              </CardContent>
              <CardFooter className="border-t bg-slate-50">
                <p className="text-sm text-muted-foreground">
                  Průvodce vám pomůže objevit všechny funkce aplikace a efektivně ji využívat.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}