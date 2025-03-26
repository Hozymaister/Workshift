import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Workplace, User } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  Warehouse,
  Calendar,
  Music,
  Edit,
  Trash2,
  Plus,
  Loader2,
  MapPin,
  ClipboardList,
  Crown,
  UserCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  name: z.string().min(2, "Název musí mít alespoň 2 znaky").max(50, "Název může mít maximálně 50 znaků"),
  type: z.enum(["warehouse", "event", "club"], {
    errorMap: () => ({ message: "Zvolte typ objektu" }),
  }),
  address: z.string().optional(),
  notes: z.string().optional(),
  managerId: z.number().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function WorkplacesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [workplaceToEdit, setWorkplaceToEdit] = useState<Workplace | null>(null);
  const [workplaceToDelete, setWorkplaceToDelete] = useState<number | null>(null);
  
  const isAdmin = user?.role === "admin";
  
  const { data: workplaces, isLoading } = useQuery<Workplace[]>({
    queryKey: ["/api/workplaces"],
  });
  
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "warehouse",
      address: "",
      notes: "",
    },
  });
  
  // Reset form when dialog opens/closes or workplace to edit changes
  const resetForm = () => {
    if (workplaceToEdit) {
      form.reset({
        name: workplaceToEdit.name,
        type: workplaceToEdit.type as any,
        address: workplaceToEdit.address || "",
        notes: workplaceToEdit.notes || "",
        managerId: workplaceToEdit.managerId || null,
      });
    } else {
      form.reset({
        name: "",
        type: "warehouse",
        address: "",
        notes: "",
        managerId: null,
      });
    }
  };
  
  // Create workplace mutation
  const createWorkplaceMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/workplaces", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workplaces"] });
      toast({
        title: "Úspěch",
        description: "Pracovní objekt byl úspěšně vytvořen.",
      });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: `Vytvoření objektu selhalo: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update workplace mutation
  const updateWorkplaceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormValues }) => {
      const res = await apiRequest("PUT", `/api/workplaces/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workplaces"] });
      toast({
        title: "Úspěch",
        description: "Pracovní objekt byl úspěšně aktualizován.",
      });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: `Aktualizace objektu selhala: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete workplace mutation
  const deleteWorkplaceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/workplaces/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workplaces"] });
      toast({
        title: "Úspěch",
        description: "Pracovní objekt byl úspěšně smazán.",
      });
      setWorkplaceToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: `Smazání objektu selhalo: ${error.message}`,
        variant: "destructive",
      });
      setWorkplaceToDelete(null);
    },
  });
  
  const onSubmit = (values: FormValues) => {
    if (workplaceToEdit) {
      updateWorkplaceMutation.mutate({ id: workplaceToEdit.id, data: values });
    } else {
      createWorkplaceMutation.mutate(values);
    }
  };
  
  const openDialog = (workplace?: Workplace) => {
    setWorkplaceToEdit(workplace || null);
    setIsFormDialogOpen(true);
    if (workplace) {
      form.reset({
        name: workplace.name,
        type: workplace.type as any,
        address: workplace.address || "",
        notes: workplace.notes || "",
        managerId: workplace.managerId || null,
      });
    } else {
      form.reset({
        name: "",
        type: "warehouse",
        address: "",
        notes: "",
        managerId: null,
      });
    }
  };
  
  const closeDialog = () => {
    setIsFormDialogOpen(false);
    setWorkplaceToEdit(null);
  };
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "warehouse":
        return <Warehouse className="h-4 w-4" />;
      case "event":
        return <Calendar className="h-4 w-4" />;
      case "club":
        return <Music className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };
  
  const getTypeName = (type: string) => {
    switch (type) {
      case "warehouse":
        return "Sklad";
      case "event":
        return "Event";
      case "club":
        return "Klub";
      default:
        return "Neznámý";
    }
  };
  
  const getWorkplaceTypeBgClass = (type: string | undefined) => {
    if (!type) return "bg-slate-100 text-slate-700";
    
    switch (type.toLowerCase()) {
      case "warehouse":
      case "sklad":
        return "bg-orange-100 text-orange-700";
      case "office":
      case "kancelář":
        return "bg-blue-100 text-blue-700";
      case "event":
        return "bg-green-100 text-green-700";
      case "club":
      case "kultura":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-100">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 pb-16 md:pb-0">
        <Header title="Pracovní objekty" />
        
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Pracovní objekty</h2>
              <p className="mt-1 text-sm text-slate-500">Seznam a správa pracovních objektů</p>
            </div>
            {isAdmin && (
              <div className="mt-4 md:mt-0">
                <Button onClick={() => openDialog()} className="inline-flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Nový objekt
                </Button>
              </div>
            )}
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Seznam pracovních objektů</CardTitle>
              <CardDescription>Přehled všech pracovních objektů v systému</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : workplaces && workplaces.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Název</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Adresa</TableHead>
                      <TableHead>Poznámky</TableHead>
                      {isAdmin && <TableHead className="text-right">Akce</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workplaces.map((workplace) => (
                      <TableRow 
                        key={workplace.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => navigate(`/workplaces/${workplace.id}`)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {workplace.name}
                            {workplace.managerId && (
                              <Badge variant="outline" className="ml-2 text-xs text-amber-700 bg-amber-50">
                                <Crown className="h-3 w-3 mr-1 text-amber-500" />
                                <span>Správce</span>
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("font-normal", getWorkplaceTypeBgClass(workplace.type))}>
                            <span className="flex items-center">
                              {getTypeIcon(workplace.type)}
                              <span className="ml-1">{getTypeName(workplace.type)}</span>
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-slate-700">
                            {workplace.address ? (
                              <>
                                <MapPin className="h-4 w-4 mr-1" />
                                <span className="text-sm">{workplace.address}</span>
                              </>
                            ) : (
                              <span className="text-sm text-slate-400">Není uvedeno</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-slate-700">
                            {workplace.notes ? (
                              <>
                                <ClipboardList className="h-4 w-4 mr-1" />
                                <span className="text-sm max-w-[200px] truncate">{workplace.notes}</span>
                              </>
                            ) : (
                              <span className="text-sm text-slate-400">Žádné poznámky</span>
                            )}
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDialog(workplace)}
                                className="text-slate-500 hover:text-primary"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setWorkplaceToDelete(workplace.id)}
                                className="text-slate-500 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Building2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <h3 className="text-lg font-medium">Žádné pracovní objekty</h3>
                  <p className="mt-1">Zatím nebyly přidány žádné pracovní objekty</p>
                  {isAdmin && (
                    <Button onClick={() => openDialog()} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Přidat první objekt
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Create/Edit Workplace Dialog */}
        <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
          if (!open) closeDialog();
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {workplaceToEdit ? "Upravit pracovní objekt" : "Přidat nový pracovní objekt"}
              </DialogTitle>
              <DialogDescription>
                {workplaceToEdit 
                  ? "Upravte informace o pracovním objektu"
                  : "Vyplňte informace o novém pracovním objektu"}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Název objektu</FormLabel>
                      <FormControl>
                        <Input placeholder="Název pracovního objektu" {...field} className="bg-white border-slate-300 focus:border-primary/70 h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ objektu</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white border-slate-300 h-11">
                            <SelectValue placeholder="Vyberte typ objektu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="warehouse">
                            <div className="flex items-center">
                              <Warehouse className="h-4 w-4 mr-2" />
                              <span>Sklad</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="event">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              <span>Event</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="club">
                            <div className="flex items-center">
                              <Music className="h-4 w-4 mr-2" />
                              <span>Klub</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresa</FormLabel>
                      <FormControl>
                        <Input placeholder="Adresa objektu (nepovinné)" {...field} className="bg-white border-slate-300 focus:border-primary/70 h-11" />
                      </FormControl>
                      <FormDescription>
                        Zadejte adresu objektu pro snazší orientaci
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poznámky</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Doplňující informace o objektu (nepovinné)" 
                          {...field} 
                          rows={3}
                          className="bg-white border-slate-300 focus:border-primary/70 resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {isAdmin && (
                  <FormField
                    control={form.control}
                    name="managerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Správce objektu</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value !== "none" ? Number(value) : null)}
                          value={field.value ? String(field.value) : "none"}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white border-slate-300 h-11">
                              <SelectValue placeholder="Vyberte správce objektu (nepovinné)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">
                              <div className="flex items-center">
                                <UserCircle className="h-4 w-4 mr-2 text-slate-400" />
                                <span>Žádný správce</span>
                              </div>
                            </SelectItem>
                            {users?.map((user) => (
                              <SelectItem key={user.id} value={String(user.id)}>
                                <div className="flex items-center">
                                  <UserCircle className="h-4 w-4 mr-2" />
                                  <span>{user.firstName} {user.lastName}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Správce objektu má speciální oprávnění pro správu tohoto objektu
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={closeDialog}>
                    Zrušit
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={form.formState.isSubmitting || createWorkplaceMutation.isPending || updateWorkplaceMutation.isPending}
                  >
                    {form.formState.isSubmitting || createWorkplaceMutation.isPending || updateWorkplaceMutation.isPending
                      ? "Ukládám..."
                      : workplaceToEdit
                        ? "Uložit změny"
                        : "Vytvořit objekt"
                    }
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Workplace Alert Dialog */}
        <AlertDialog open={workplaceToDelete !== null} onOpenChange={(open) => {
          if (!open) setWorkplaceToDelete(null);
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Opravdu chcete smazat tento objekt?</AlertDialogTitle>
              <AlertDialogDescription>
                Tato akce je nevratná. Objekt bude trvale smazán spolu se všemi přiřazenými směnami.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-red-500 hover:bg-red-600"
                onClick={() => {
                  if (workplaceToDelete) {
                    deleteWorkplaceMutation.mutate(workplaceToDelete);
                  }
                }}
                disabled={deleteWorkplaceMutation.isPending}
              >
                {deleteWorkplaceMutation.isPending ? "Mazání..." : "Smazat"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <MobileNavigation />
      </main>
    </div>
  );
}
