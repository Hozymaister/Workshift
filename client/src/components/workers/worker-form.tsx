import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertUserSchema, User } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  CalendarIcon, 
  Loader2, 
  User as UserIcon 
} from "lucide-react";

// Typ bezpečného uživatele (bez hesla)
export type SafeUser = Omit<User, "password">;

// Rozšíříme schema o validační pravidla
const workerFormSchema = insertUserSchema.extend({
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
  confirmPassword: z.string(),
  dateOfBirth: z.date().optional(),
  personalId: z.string().optional(),
  phone: z.string().optional(),
  hourlyWage: z.string().transform((value) => value === "" ? undefined : parseInt(value)).optional(),
  notes: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Hesla se neshodují",
  path: ["confirmPassword"],
});

type WorkerFormValues = z.infer<typeof workerFormSchema>;

interface WorkerFormProps {
  isOpen: boolean;
  onClose: () => void;
  workerToEdit?: SafeUser;
}

export function WorkerForm({ isOpen, onClose, workerToEdit }: WorkerFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");

  // Nastavení výchozích hodnot formuláře
  const defaultValues: Partial<WorkerFormValues> = {
    firstName: workerToEdit?.firstName || "",
    lastName: workerToEdit?.lastName || "",
    email: workerToEdit?.email || "",
    username: workerToEdit?.username || "",
    password: workerToEdit ? "••••••" : "", // Dummy password for edit mode
    confirmPassword: workerToEdit ? "••••••" : "",
    role: workerToEdit?.role || "worker",
    dateOfBirth: workerToEdit?.dateOfBirth ? new Date(workerToEdit.dateOfBirth) : undefined,
    personalId: workerToEdit?.personalId || "",
    phone: workerToEdit?.phone || "",
    hourlyWage: workerToEdit?.hourlyWage !== undefined ? workerToEdit.hourlyWage.toString() : "",
    notes: workerToEdit?.notes || "",
  };

  const form = useForm<WorkerFormValues>({
    resolver: zodResolver(workerFormSchema),
    defaultValues,
  });

  // Mutace pro vytvoření pracovníka
  const createWorkerMutation = useMutation({
    mutationFn: async (data: WorkerFormValues) => {
      const response = await apiRequest("POST", "/api/workers", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Nepodařilo se vytvořit pracovníka");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workers"] });
      toast({
        title: "Pracovník vytvořen",
        description: "Nový pracovník byl úspěšně přidán do systému."
      });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při vytváření pracovníka",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutace pro aktualizaci pracovníka
  const updateWorkerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<WorkerFormValues> }) => {
      // Pokud heslo nebylo změněno (stále je dummy), odstraníme ho z dat
      if (data.password === "••••••") {
        delete data.password;
        delete data.confirmPassword;
      }

      const response = await apiRequest("PATCH", `/api/workers/${id}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Nepodařilo se aktualizovat pracovníka");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workers"] });
      toast({
        title: "Pracovník aktualizován",
        description: "Údaje pracovníka byly úspěšně aktualizovány."
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při aktualizaci pracovníka",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: WorkerFormValues) => {
    if (workerToEdit) {
      updateWorkerMutation.mutate({ id: workerToEdit.id, data: values });
    } else {
      createWorkerMutation.mutate(values);
    }
  };

  const isPending = createWorkerMutation.isPending || updateWorkerMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserIcon className="mr-2 h-5 w-5 text-primary" />
            {workerToEdit ? "Upravit pracovníka" : "Přidat nového pracovníka"}
          </DialogTitle>
          <DialogDescription>
            {workerToEdit 
              ? "Upravte údaje pracovníka v systému." 
              : "Vyplňte formulář pro přidání nového pracovníka do systému."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">Obecné údaje</TabsTrigger>
                <TabsTrigger value="details">Detailní informace</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jméno *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Příjmení *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail *</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uživatelské jméno *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heslo *</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Potvrzení hesla *</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        >
                          <option value="worker">Pracovník</option>
                          <option value="admin">Správce</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Datum narození</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={`w-full pl-3 text-left font-normal ${
                                  !field.value && "text-muted-foreground"
                                }`}
                              >
                                {field.value ? (
                                  format(field.value, "d. MMMM yyyy", { locale: cs })
                                ) : (
                                  <span>Vyberte datum</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="personalId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rodné číslo</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefonní číslo</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="hourlyWage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hodinová mzda (Kč)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poznámky</FormLabel>
                      <FormControl>
                        <Textarea rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Zrušit
              </Button>
              <Button 
                type="submit" 
                disabled={isPending}
                className="bg-gradient-to-r from-primary to-primary/80"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ukládání...
                  </>
                ) : (
                  <>{workerToEdit ? "Aktualizovat" : "Přidat"} pracovníka</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}