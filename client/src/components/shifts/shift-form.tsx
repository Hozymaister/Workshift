import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertShiftSchema, Shift } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { format, parse } from "date-fns";

interface ShiftFormProps {
  open: boolean;
  onClose: () => void;
  shiftToEdit?: Shift;
}

const formSchema = insertShiftSchema.extend({
  date: z.string().min(1, "Datum je povinné"),
  startTimeStr: z.string().min(1, "Čas začátku je povinný"),
  endTimeStr: z.string().min(1, "Čas konce je povinný"),
  userId: z.string().nullable().optional(),
  workplaceId: z.string().min(1, "Objekt je povinný"),
}).omit({ startTime: true, endTime: true });

type FormValues = z.infer<typeof formSchema>;

export function ShiftForm({ open, onClose, shiftToEdit }: ShiftFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: workplaces = [] } = useQuery<any[]>({
    queryKey: ["/api/workplaces"],
    enabled: open,
  });
  
  const { data: workers = [] } = useQuery<any[]>({
    queryKey: ["/api/workers"],
    enabled: open,
  });
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workplaceId: undefined,
      userId: undefined,
      date: format(new Date(), "yyyy-MM-dd"),
      startTimeStr: "08:00",
      endTimeStr: "16:30",
      notes: "",
    },
  });

  useEffect(() => {
    if (shiftToEdit && open) {
      form.reset({
        workplaceId: shiftToEdit.workplaceId ? shiftToEdit.workplaceId.toString() : undefined,
        userId: shiftToEdit.userId ? shiftToEdit.userId.toString() : null,
        date: format(new Date(shiftToEdit.date), "yyyy-MM-dd"),
        startTimeStr: format(new Date(shiftToEdit.startTime), "HH:mm"),
        endTimeStr: format(new Date(shiftToEdit.endTime), "HH:mm"),
        notes: shiftToEdit.notes || "",
      });
    } else if (open) {
      form.reset({
        workplaceId: undefined,
        userId: undefined,
        date: format(new Date(), "yyyy-MM-dd"),
        startTimeStr: "08:00",
        endTimeStr: "16:30",
        notes: "",
      });
    }
  }, [shiftToEdit, open, form]);

  const createShiftMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/shifts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Úspěch",
        description: "Směna byla úspěšně vytvořena.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: `Vytvoření směny selhalo: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const updateShiftMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/shifts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Úspěch",
        description: "Směna byla úspěšně aktualizována.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: `Aktualizace směny selhala: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    setIsSubmitting(true);
    
    // Convert form values to API format
    const formDate = parse(values.date, "yyyy-MM-dd", new Date());
    const startTime = parse(values.startTimeStr, "HH:mm", formDate);
    const endTime = parse(values.endTimeStr, "HH:mm", formDate);
    
    const shiftData = {
      workplaceId: values.workplaceId ? Number(values.workplaceId) : null,
      userId: values.userId === "null" ? null : values.userId ? Number(values.userId) : null,
      date: formDate.toISOString(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      notes: values.notes,
    };
    
    if (shiftToEdit) {
      updateShiftMutation.mutate({ id: shiftToEdit.id, data: shiftData });
    } else {
      createShiftMutation.mutate(shiftData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader className="bg-white text-slate-900 pb-4 border-b mb-4">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {shiftToEdit ? "Upravit směnu" : "Přidat novou směnu"}
          </DialogTitle>
          <DialogDescription className="text-slate-600 mt-2">
            {shiftToEdit 
              ? "Upravte detaily směny níže" 
              : "Vyplňte formulář pro vytvoření nové směny"}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="workplaceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pracovní objekt</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white border-slate-300 focus:border-primary/70 h-11">
                        <SelectValue placeholder="Vyberte objekt" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {workplaces?.map((workplace) => (
                        <SelectItem key={workplace.id} value={workplace.id.toString()} className="py-2">
                          {workplace.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datum</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} className="bg-white border-slate-300 focus:border-primary/70 h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTimeStr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Začátek směny</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="bg-white border-slate-300 focus:border-primary/70 h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endTimeStr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konec směny</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="bg-white border-slate-300 focus:border-primary/70 h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Přiřazený pracovník</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white border-slate-300 h-11">
                        <SelectValue placeholder="Vyberte pracovníka" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="null">Neobsazeno</SelectItem>
                      {workers?.map((worker) => (
                        <SelectItem key={worker.id} value={worker.id.toString()}>
                          {worker.firstName} {worker.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Textarea {...field} value={field.value || ''} rows={3} className="bg-white border-slate-300 focus:border-primary/70 resize-none" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4 border-t">
              <Button 
                variant="outline" 
                type="button" 
                onClick={onClose} 
                disabled={isSubmitting}
              >
                Zrušit
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || createShiftMutation.isPending || updateShiftMutation.isPending}
              >
                {isSubmitting ? "Ukládám..." : "Uložit směnu"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
