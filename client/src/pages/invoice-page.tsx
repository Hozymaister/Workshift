import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Trash2, Plus, CalendarIcon, Save, FileDown, Printer } from "lucide-react";

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Číslo faktury je povinné"),
  dateIssued: z.date(),
  dateDue: z.date(),
  customerName: z.string().min(1, "Jméno zákazníka je povinné"),
  customerAddress: z.string().min(1, "Adresa zákazníka je povinná"),
  customerIC: z.string().optional(),
  customerDIC: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(["bank", "cash", "card"]),
  bankAccount: z.string().optional(),
});

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Popis položky je povinný"),
  quantity: z.number().min(0.01, "Množství musí být větší než 0"),
  unit: z.string().min(1, "Jednotka je povinná"),
  pricePerUnit: z.number().min(0, "Cena za jednotku nemůže být záporná"),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;
type InvoiceItemFormValues = z.infer<typeof invoiceItemSchema>;

export default function InvoicePage() {
  const { user } = useAuth();
  const [invoiceItems, setInvoiceItems] = useState<(InvoiceItemFormValues & { id: string })[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Pokud uživatel není správce, přesměrujeme na dashboard
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  if (user.role !== "admin") {
    return <Redirect to="/" />;
  }

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-001`,
      dateIssued: new Date(),
      dateDue: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 dní
      customerName: "",
      customerAddress: "",
      customerIC: "",
      customerDIC: "",
      notes: "",
      paymentMethod: "bank",
      bankAccount: "",
    },
  });

  const itemForm = useForm<InvoiceItemFormValues>({
    resolver: zodResolver(invoiceItemSchema),
    defaultValues: {
      description: "",
      quantity: 1,
      unit: "ks",
      pricePerUnit: 0,
    },
  });

  const addItem = () => {
    setEditingItem(null);
    itemForm.reset({
      description: "",
      quantity: 1,
      unit: "ks",
      pricePerUnit: 0,
    });
    setIsItemDialogOpen(true);
  };

  const editItem = (id: string) => {
    const item = invoiceItems.find(item => item.id === id);
    if (item) {
      setEditingItem(id);
      itemForm.reset({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        pricePerUnit: item.pricePerUnit,
      });
      setIsItemDialogOpen(true);
    }
  };

  const removeItem = (id: string) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== id));
  };

  const onItemSubmit = (data: InvoiceItemFormValues) => {
    if (editingItem) {
      // Aktualizace existující položky
      setInvoiceItems(
        invoiceItems.map(item => 
          item.id === editingItem ? { ...data, id: editingItem } : item
        )
      );
    } else {
      // Přidání nové položky
      setInvoiceItems([
        ...invoiceItems,
        { 
          ...data, 
          id: Math.random().toString(36).substring(2, 9) 
        }
      ]);
    }
    setIsItemDialogOpen(false);
  };

  const onSubmit = (data: InvoiceFormValues) => {
    // V reálné aplikaci bychom poslali data na server
    console.log("Faktura:", { ...data, items: invoiceItems });
    setIsPreviewOpen(true);
  };

  const totalAmount = invoiceItems.reduce(
    (sum, item) => sum + item.quantity * item.pricePerUnit, 
    0
  );

  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-100">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 pb-16 md:pb-0">
        <Header title="Vytvořit fakturu" />
        
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Vytvořit fakturu</h2>
              <p className="mt-1 text-sm text-slate-500">Vytvořte novou fakturu pro zákazníka</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <Card>
                <CardHeader>
                  <CardTitle>Informace o faktuře</CardTitle>
                  <CardDescription>Zadejte základní informace o faktuře a zákazníkovi</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="invoiceNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Číslo faktury</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="dateIssued"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Datum vystavení</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={
                                        "w-full pl-3 text-left font-normal"
                                      }
                                    >
                                      {field.value ? (
                                        format(field.value, "P", { locale: cs })
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
                          name="dateDue"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Datum splatnosti</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={
                                        "w-full pl-3 text-left font-normal"
                                      }
                                    >
                                      {field.value ? (
                                        format(field.value, "P", { locale: cs })
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
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <FormField
                            control={form.control}
                            name="customerName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Jméno zákazníka</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="customerAddress"
                            render={({ field }) => (
                              <FormItem className="mt-4">
                                <FormLabel>Adresa zákazníka</FormLabel>
                                <FormControl>
                                  <Textarea rows={3} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div>
                          <FormField
                            control={form.control}
                            name="customerIC"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>IČ</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="customerDIC"
                            render={({ field }) => (
                              <FormItem className="mt-4">
                                <FormLabel>DIČ</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="paymentMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Způsob platby</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Vyberte způsob platby" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="bank">Bankovním převodem</SelectItem>
                                  <SelectItem value="cash">Hotově</SelectItem>
                                  <SelectItem value="card">Kartou</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {form.watch("paymentMethod") === "bank" && (
                          <FormField
                            control={form.control}
                            name="bankAccount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Číslo účtu</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Poznámky</FormLabel>
                            <FormControl>
                              <Textarea rows={3} {...field} />
                            </FormControl>
                            <FormDescription>
                              Poznámky k faktuře, které se objeví na výstupu
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="border-t pt-4">
                        <CardTitle className="mb-4">Položky faktury</CardTitle>
                        
                        {invoiceItems.length === 0 ? (
                          <div className="text-center py-10 border border-dashed rounded-md">
                            <p className="text-slate-500">Zatím nebyly přidány žádné položky</p>
                            <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={addItem}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Přidat položku
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr className="bg-slate-50">
                                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-500">Popis</th>
                                    <th className="px-4 py-2 text-right text-sm font-medium text-slate-500">Množství</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-500">Jednotka</th>
                                    <th className="px-4 py-2 text-right text-sm font-medium text-slate-500">Cena/ks</th>
                                    <th className="px-4 py-2 text-right text-sm font-medium text-slate-500">Celkem</th>
                                    <th className="px-4 py-2 text-right text-sm font-medium text-slate-500">Akce</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {invoiceItems.map((item) => (
                                    <tr key={item.id} className="border-b">
                                      <td className="px-4 py-3 text-left">{item.description}</td>
                                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                                      <td className="px-4 py-3 text-left">{item.unit}</td>
                                      <td className="px-4 py-3 text-right">
                                        {new Intl.NumberFormat('cs-CZ', { 
                                          style: 'currency', 
                                          currency: 'CZK',
                                          minimumFractionDigits: 2 
                                        }).format(item.pricePerUnit)}
                                      </td>
                                      <td className="px-4 py-3 text-right font-medium">
                                        {new Intl.NumberFormat('cs-CZ', { 
                                          style: 'currency', 
                                          currency: 'CZK',
                                          minimumFractionDigits: 2
                                        }).format(item.quantity * item.pricePerUnit)}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end space-x-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            type="button"
                                            onClick={() => editItem(item.id)}
                                          >
                                            <Printer className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            type="button"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => removeItem(item.id)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="bg-slate-50">
                                    <td colSpan={4} className="px-4 py-3 text-right font-bold">Celková částka:</td>
                                    <td className="px-4 py-3 text-right font-bold">
                                      {new Intl.NumberFormat('cs-CZ', { 
                                        style: 'currency', 
                                        currency: 'CZK', 
                                        minimumFractionDigits: 2 
                                      }).format(totalAmount)}
                                    </td>
                                    <td></td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            <div className="mt-4">
                              <Button 
                                variant="outline" 
                                type="button"
                                onClick={addItem}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Přidat další položku
                              </Button>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex justify-end space-x-4 pt-4 border-t">
                        <Button 
                          type="submit" 
                          className="bg-primary text-white"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Vytvořit fakturu
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle>Náhled faktury</CardTitle>
                  <CardDescription>Souhrn informací o faktuře</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-slate-700">Číslo faktury</h3>
                      <p>{form.watch("invoiceNumber") || "Neuvedeno"}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-700">Datum vystavení</h3>
                      <p>
                        {form.watch("dateIssued") 
                          ? format(form.watch("dateIssued"), "P", { locale: cs })
                          : "Neuvedeno"}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-700">Datum splatnosti</h3>
                      <p>
                        {form.watch("dateDue")
                          ? format(form.watch("dateDue"), "P", { locale: cs })
                          : "Neuvedeno"}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-700">Zákazník</h3>
                      <p>{form.watch("customerName") || "Neuvedeno"}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-700">Počet položek</h3>
                      <p>{invoiceItems.length}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-700">Celková částka</h3>
                      <p className="text-primary font-bold">
                        {new Intl.NumberFormat('cs-CZ', { 
                          style: 'currency', 
                          currency: 'CZK',
                          minimumFractionDigits: 2 
                        }).format(totalAmount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col items-stretch space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    type="button"
                    onClick={() => setIsPreviewOpen(true)}
                    disabled={invoiceItems.length === 0}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Náhled faktury
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    type="button"
                    disabled={invoiceItems.length === 0}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Stáhnout PDF
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
        
        <MobileNavigation />
      </main>
      
      {/* Dialog pro přidání/úpravu položky */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Upravit položku" : "Přidat položku"}</DialogTitle>
            <DialogDescription>
              {editingItem 
                ? "Upravte detaily položky faktury" 
                : "Vyplňte detaily nové položky faktury"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit(onItemSubmit)} className="space-y-4">
              <FormField
                control={itemForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Popis položky</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={itemForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Množství</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={itemForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jednotka</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Jednotka" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ks">kus</SelectItem>
                          <SelectItem value="hod">hodina</SelectItem>
                          <SelectItem value="den">den</SelectItem>
                          <SelectItem value="měsíc">měsíc</SelectItem>
                          <SelectItem value="kg">kilogram</SelectItem>
                          <SelectItem value="m">metr</SelectItem>
                          <SelectItem value="m2">m²</SelectItem>
                          <SelectItem value="m3">m³</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={itemForm.control}
                name="pricePerUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cena za jednotku (Kč)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit">
                  {editingItem ? "Uložit změny" : "Přidat položku"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog s náhledem faktury */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Náhled faktury</DialogTitle>
          </DialogHeader>
          
          <div className="invoice-preview p-6 bg-white">
            <div className="flex justify-between">
              <div>
                <h1 className="text-2xl font-bold">FAKTURA</h1>
                <p className="text-lg">Číslo: {form.watch("invoiceNumber")}</p>
              </div>
              <div className="text-right">
                <p>Datum vystavení: {form.watch("dateIssued") ? format(form.watch("dateIssued"), "P", { locale: cs }) : ""}</p>
                <p>Datum splatnosti: {form.watch("dateDue") ? format(form.watch("dateDue"), "P", { locale: cs }) : ""}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 mt-8">
              <div>
                <h2 className="font-bold text-slate-700 mb-2">Dodavatel:</h2>
                <p className="font-bold">ShiftManager s.r.o.</p>
                <p>Ulice 123</p>
                <p>110 00 Praha 1</p>
                <p>IČ: 12345678</p>
                <p>DIČ: CZ12345678</p>
              </div>
              <div>
                <h2 className="font-bold text-slate-700 mb-2">Odběratel:</h2>
                <p className="font-bold">{form.watch("customerName")}</p>
                <p>{form.watch("customerAddress")}</p>
                {form.watch("customerIC") && <p>IČ: {form.watch("customerIC")}</p>}
                {form.watch("customerDIC") && <p>DIČ: {form.watch("customerDIC")}</p>}
              </div>
            </div>
            
            <div className="mt-8">
              <h2 className="font-bold text-slate-700 mb-4">Položky faktury:</h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border py-2 px-3 text-left">Popis</th>
                    <th className="border py-2 px-3 text-right">Množství</th>
                    <th className="border py-2 px-3 text-left">Jednotka</th>
                    <th className="border py-2 px-3 text-right">Cena/ks</th>
                    <th className="border py-2 px-3 text-right">Celkem</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="border py-2 px-3 text-left">{item.description}</td>
                      <td className="border py-2 px-3 text-right">{item.quantity}</td>
                      <td className="border py-2 px-3 text-left">{item.unit}</td>
                      <td className="border py-2 px-3 text-right">
                        {new Intl.NumberFormat('cs-CZ', { 
                          style: 'currency', 
                          currency: 'CZK',
                          minimumFractionDigits: 2 
                        }).format(item.pricePerUnit)}
                      </td>
                      <td className="border py-2 px-3 text-right">
                        {new Intl.NumberFormat('cs-CZ', { 
                          style: 'currency', 
                          currency: 'CZK',
                          minimumFractionDigits: 2 
                        }).format(item.quantity * item.pricePerUnit)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={4} className="border py-2 px-3 text-right">Celková částka:</td>
                    <td className="border py-2 px-3 text-right">
                      {new Intl.NumberFormat('cs-CZ', { 
                        style: 'currency', 
                        currency: 'CZK',
                        minimumFractionDigits: 2 
                      }).format(totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-8">
              <h2 className="font-bold text-slate-700 mb-2">Platební údaje:</h2>
              <p>Způsob platby: {
                form.watch("paymentMethod") === "bank" ? "Bankovním převodem" : 
                form.watch("paymentMethod") === "cash" ? "Hotově" : "Kartou"
              }</p>
              {form.watch("paymentMethod") === "bank" && (
                <p>Číslo účtu: {form.watch("bankAccount")}</p>
              )}
            </div>
            
            {form.watch("notes") && (
              <div className="mt-8">
                <h2 className="font-bold text-slate-700 mb-2">Poznámky:</h2>
                <p>{form.watch("notes")}</p>
              </div>
            )}
            
            <div className="mt-12 pt-8 border-t">
              <p className="text-center text-sm text-slate-500">
                Faktura byla vygenerována v systému ShiftManager.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button"
              onClick={printInvoice}
            >
              <Printer className="mr-2 h-4 w-4" />
              Vytisknout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}