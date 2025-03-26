import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Customer } from "@shared/schema";

import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2 } from "lucide-react";

const customerFormSchema = z.object({
  name: z.string().min(1, "Název zákazníka je povinný"),
  address: z.string().min(1, "Adresa je povinná"),
  city: z.string().optional(),
  zip: z.string().optional(),
  ic: z.string()
    .optional()
    .refine(val => !val || /^\d{8}$/.test(val), {
      message: "IČO musí obsahovat přesně 8 číslic"
    }),
  dic: z.string()
    .optional()
    .refine(val => !val || /^CZ\d{8,10}$/.test(val), {
      message: "DIČ musí být ve formátu 'CZ' následovaný 8-10 číslicemi"
    }),
  email: z.string().email("Neplatný email").optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer;
}

export function CustomerForm({ isOpen, onClose, customerToEdit }: CustomerFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vytvoření formuláře
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      zip: "",
      ic: "",
      dic: "",
      email: "",
      phone: "",
      notes: "",
    },
  });

  // Reset formuláře při otevření/zavření nebo změně editovaného zákazníka
  useEffect(() => {
    if (isOpen) {
      if (customerToEdit) {
        // Předvyplnění formuláře daty zákazníka
        form.reset({
          name: customerToEdit.name,
          address: customerToEdit.address,
          city: customerToEdit.city || "",
          zip: customerToEdit.zip || "",
          ic: customerToEdit.ic || "",
          dic: customerToEdit.dic || "",
          email: customerToEdit.email || "",
          phone: customerToEdit.phone || "",
          notes: customerToEdit.notes || "",
        });
      } else {
        // Reset formuláře pro nového zákazníka
        form.reset({
          name: "",
          address: "",
          city: "",
          zip: "",
          ic: "",
          dic: "",
          email: "",
          phone: "",
          notes: "",
        });
      }
    }
  }, [isOpen, customerToEdit, form]);

  // Mutace pro vytvoření zákazníka
  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      const res = await apiRequest("POST", "/api/customers", data);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Zákazník vytvořen",
        description: "Zákazník byl úspěšně přidán do adresáře",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při vytváření zákazníka",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Mutace pro aktualizaci zákazníka
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CustomerFormValues }) => {
      const res = await apiRequest("PUT", `/api/customers/${id}`, data);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Zákazník aktualizován",
        description: "Údaje zákazníka byly úspěšně aktualizovány",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při aktualizaci zákazníka",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Odeslání formuláře
  const onSubmit = (values: CustomerFormValues) => {
    setIsSubmitting(true);
    
    if (customerToEdit) {
      updateCustomerMutation.mutate({ id: customerToEdit.id, data: values });
    } else {
      createCustomerMutation.mutate(values);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {customerToEdit ? "Upravit zákazníka" : "Přidat nového zákazníka"}
          </DialogTitle>
          <DialogDescription>
            {customerToEdit
              ? "Upravte údaje zákazníka ve formuláři níže."
              : "Vyplňte údaje o novém zákazníkovi."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Název zákazníka / společnosti*</FormLabel>
                  <FormControl>
                    <Input placeholder="Zadejte název" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IČO</FormLabel>
                    <FormControl>
                      <Input placeholder="12345678" {...field} />
                    </FormControl>
                    <FormDescription>8 číslic</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DIČ</FormLabel>
                    <FormControl>
                      <Input placeholder="CZ12345678" {...field} />
                    </FormControl>
                    <FormDescription>Formát: CZ + 8-10 číslic</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresa*</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Zadejte adresu"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Město</FormLabel>
                    <FormControl>
                      <Input placeholder="Město" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PSČ</FormLabel>
                    <FormControl>
                      <Input placeholder="PSČ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input placeholder="+420..." {...field} />
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
                    <Textarea
                      placeholder="Případné poznámky k zákazníkovi"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Zrušit
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ukládám...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {customerToEdit ? "Aktualizovat" : "Vytvořit"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}