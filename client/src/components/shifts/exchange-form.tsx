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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Žádost o výměnu směny</DialogTitle>
          <DialogDescription>
            Vytvořte žádost o výměnu vybrané směny. Můžete požádat o převzetí směny jiným pracovníkem nebo nabídnout jednu z vašich směn k výměně.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 p-3 rounded-md mb-4">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Vybraná směna k výměně:</h3>
          <p className="font-medium">
            {shift ? formatShiftDateTime(shift) : ""}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="offeredShiftId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vaše nabízená směna (volitelné)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte směnu k nabídnutí (volitelné)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Žádná - pouze žádám o převzetí</SelectItem>
                      {eligibleShifts.map((userShift) => (
                        <SelectItem key={userShift.id} value={userShift.id.toString()}>
                          {formatShiftDateTime(userShift)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                disabled={isSubmitting || createExchangeRequestMutation.isPending}
              >
                {isSubmitting ? "Odesílám..." : "Vytvořit žádost"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}