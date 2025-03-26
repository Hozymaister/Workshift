import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shift } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";

interface ExchangeFormProps {
  open: boolean;
  onClose: () => void;
  shift: Shift;
}

// Schéma pro formulář výměny směny
const formSchema = z.object({
  offeredShiftId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function ExchangeForm({ open, onClose, shift }: ExchangeFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Načíst směny přihlášeného uživatele, které může nabídnout k výměně
  const { data: userShifts = [] } = useQuery<any[]>({
    queryKey: ["/api/shifts", "user"],
    enabled: open && !!user,
  });

  // Filtrovat pouze budoucí směny uživatele (kromě aktuální směny)
  const eligibleShifts = userShifts.filter(
    (userShift) => 
      userShift.id !== shift.id && 
      new Date(userShift.date) >= new Date()
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      offeredShiftId: undefined,
    },
  });

  const createExchangeRequestMutation = useMutation({
    mutationFn: async (data: { requestShiftId: number; offeredShiftId?: number }) => {
      const res = await apiRequest("POST", "/api/exchange-requests", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-requests"] });
      toast({
        title: "Žádost o výměnu odeslána",
        description: "Vaše žádost o výměnu směny byla úspěšně vytvořena.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: `Vytvoření žádosti selhalo: ${error.message}`,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = (values: FormValues) => {
    setIsSubmitting(true);

    createExchangeRequestMutation.mutate({
      requestShiftId: shift.id,
      // Může být undefined, pak jde o požadavek na převzetí směny bez nabídky
      offeredShiftId: values.offeredShiftId ? Number(values.offeredShiftId) : undefined
    });
  };

  // Formátování data a času pro zobrazení
  const formatShiftDateTime = (shiftItem: any) => {
    const date = format(new Date(shiftItem.date), "EEEE d. MMMM yyyy", { locale: cs });
    const startTime = format(new Date(shiftItem.startTime), "HH:mm");
    const endTime = format(new Date(shiftItem.endTime), "HH:mm");
    return `${date} (${startTime} - ${endTime})${shiftItem.workplace ? ` - ${shiftItem.workplace.name}` : ''}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader className="bg-white text-slate-900 pb-4 border-b mb-4">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Žádost o výměnu směny
          </DialogTitle>
          <DialogDescription className="text-slate-600 mt-2">
            Vytvořte žádost o výměnu vybrané směny. Můžete požádat o převzetí směny jiným pracovníkem nebo nabídnout jednu z vašich směn k výměně.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 p-4 rounded-md mb-6 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500 mb-2">Vybraná směna k výměně:</h3>
          <p className="font-medium text-slate-800 flex items-center">
            {shift ? formatShiftDateTime(shift) : ""}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="offeredShiftId"
              render={({ field }) => (
                <FormItem className="bg-white">
                  <FormLabel className="text-slate-700 font-medium">Vaše nabízená směna (volitelné)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white border-slate-300 focus:border-primary/70 h-11">
                        <SelectValue placeholder="Vyberte směnu k nabídnutí (volitelné)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      <SelectItem value="none" className="font-medium py-2.5">Žádná - pouze žádám o převzetí</SelectItem>
                      {eligibleShifts.map((userShift) => (
                        <SelectItem key={userShift.id} value={userShift.id.toString()} className="py-2.5">
                          {formatShiftDateTime(userShift)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 border-t flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-1/3"
              >
                Zrušit
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || createExchangeRequestMutation.isPending}
                className="w-2/3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {isSubmitting ? "Odesílám..." : "Vytvořit žádost"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}