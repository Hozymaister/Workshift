import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { format, subMonths } from "date-fns";
import { cs } from "date-fns/locale";
import jsPDF from "jspdf";
import { Layout } from "@/components/layout/layout";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Loader2, 
  Trash2, 
  Plus, 
  CalendarIcon, 
  Save, 
  FileDown, 
  Printer, 
  Upload, 
  Download,
  PieChart,
  LineChart,
  ArrowDown,
  ArrowUp,
  Pencil,
  FileText,
  ExternalLink,
  Info
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line
} from "recharts";

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Číslo faktury je povinné"),
  dateIssued: z.date(),
  dateDue: z.date(),
  customerName: z.string().min(1, "Jméno zákazníka je povinné"),
  customerAddress: z.string().min(1, "Adresa zákazníka je povinná"),
  customerIC: z.string()
    .optional()
    .refine(val => !val || /^\d{8}$/.test(val), {
      message: "IČO musí obsahovat přesně 8 číslic"
    }),
  customerDIC: z.string()
    .optional()
    .refine(val => !val || /^CZ\d{8,10}$/.test(val), {
      message: "DIČ musí být ve formátu 'CZ' následovaný 8-10 číslicemi"
    }),
  isVatPayer: z.boolean().default(true),
  notes: z.string().optional(),
  paymentMethod: z.enum(["bank", "cash", "card"]),
  bankAccount: z.string()
    .optional()
    .refine(val => !val || /^\d{1,6}-\d{10}\/\d{4}$/.test(val), {
      message: "Číslo účtu musí být ve formátu '123456-1234567890/1234'"
    }),
});

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Popis položky je povinný"),
  quantity: z.number().min(0.01, "Množství musí být větší než 0"),
  unit: z.string().min(1, "Jednotka je povinná"),
  pricePerUnit: z.number().min(0, "Cena za jednotku nemůže být záporná"),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;
type InvoiceItemFormValues = z.infer<typeof invoiceItemSchema>;

// Přidáme nové schéma pro přijaté faktury
const receivedInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Číslo faktury je povinné"),
  dateReceived: z.date(),
  dateDue: z.date(),
  supplierName: z.string().min(1, "Jméno dodavatele je povinné"),
  supplierAddress: z.string().min(1, "Adresa dodavatele je povinná"),
  supplierIC: z.string()
    .optional()
    .refine(val => !val || /^\d{8}$/.test(val), {
      message: "IČO musí obsahovat přesně 8 číslic"
    }),
  supplierDIC: z.string()
    .optional()
    .refine(val => !val || /^CZ\d{8,10}$/.test(val), {
      message: "DIČ musí být ve formátu 'CZ' následovaný 8-10 číslicemi"
    }),
  notes: z.string().optional(),
  amount: z.number().min(0.01, "Částka musí být větší než 0"),
  isPaid: z.boolean().default(false),
});

type ReceivedInvoiceFormValues = z.infer<typeof receivedInvoiceSchema>;

// Typ pro sledování finančních přehledů
type FinancialData = {
  month: string;
  income: number;
  expenses: number;
  profit: number;
};

// Typ pro fakturu v historii
type Invoice = {
  id: string;
  type: "issued" | "received";
  number: string;
  date: Date;
  clientOrSupplier: string;
  amount: number;
  isPaid: boolean;
  dueDate: Date;
};

export default function InvoicePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Stav pro vytváření faktur
  const [invoiceItems, setInvoiceItems] = useState<(InvoiceItemFormValues & { id: string })[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Filtr pro historii faktur
  const [yearFilter, setYearFilter] = useState<string>("current");
  
  // Historie vydaných a přijatých faktur
  const [invoiceHistory, setInvoiceHistory] = useState<Invoice[]>([
    // Demo data pro historii faktur
    {
      id: "1",
      type: "issued",
      number: "2025-03-001",
      date: new Date(2025, 2, 15),
      clientOrSupplier: "ABC s.r.o.",
      amount: 15000,
      isPaid: true,
      dueDate: new Date(2025, 3, 15)
    },
    {
      id: "2",
      type: "received",
      number: "FV-2025-123",
      date: new Date(2025, 2, 10),
      clientOrSupplier: "Dodavatel XYZ",
      amount: 5000,
      isPaid: true,
      dueDate: new Date(2025, 3, 10)
    },
    {
      id: "3",
      type: "issued",
      number: "2025-03-002",
      date: new Date(2025, 2, 20),
      clientOrSupplier: "Odběratel DEF",
      amount: 8000,
      isPaid: false,
      dueDate: new Date(2025, 3, 20)
    },
    {
      id: "4",
      type: "received",
      number: "D-2025-456",
      date: new Date(2025, 2, 5),
      clientOrSupplier: "Služby ABC",
      amount: 3500,
      isPaid: false,
      dueDate: new Date(2025, 3, 5)
    }
  ]);
  
  // Finanční data pro grafy
  const [financialData, setFinancialData] = useState<FinancialData[]>([
    { month: "Leden", income: 25000, expenses: 18000, profit: 7000 },
    { month: "Únor", income: 32000, expenses: 22000, profit: 10000 },
    { month: "Březen", income: 28000, expenses: 19500, profit: 8500 },
    { month: "Duben", income: 35000, expenses: 24000, profit: 11000 },
    { month: "Květen", income: 30000, expenses: 21500, profit: 8500 },
    { month: "Červen", income: 38000, expenses: 25000, profit: 13000 }
  ]);
  
  // Součty pro aktuální období
  const [financialSummary, setFinancialSummary] = useState({
    totalIncome: 123000,
    totalExpenses: 90000,
    totalProfit: 33000,
    unpaidInvoices: 15000,
    unpaidBills: 7500
  });
  
  // Formuláře pro vytváření faktur
  const createInvoiceForm = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-001`,
      dateIssued: new Date(),
      dateDue: new Date(new Date().setDate(new Date().getDate() + 14)),
      customerName: "",
      customerAddress: "",
      customerIC: "",
      customerDIC: "",
      isVatPayer: true,
      notes: "",
      paymentMethod: "bank",
      bankAccount: "",
    }
  });
  
  // Formulář pro položky faktury
  const itemForm = useForm<InvoiceItemFormValues>({
    resolver: zodResolver(invoiceItemSchema),
    defaultValues: {
      description: "",
      quantity: 1,
      unit: "ks",
      pricePerUnit: 0,
    }
  });
  
  // Formulář pro přijaté faktury
  const receivedInvoiceForm = useForm<ReceivedInvoiceFormValues>({
    resolver: zodResolver(receivedInvoiceSchema),
    defaultValues: {
      invoiceNumber: "",
      dateReceived: new Date(),
      dateDue: new Date(new Date().setDate(new Date().getDate() + 14)),
      supplierName: "",
      supplierAddress: "",
      supplierIC: "",
      supplierDIC: "",
      notes: "",
      amount: 0,
      isPaid: false,
    }
  });
  
  // Funkce pro vytváření a editaci položek faktury
  const handleItemSubmit = () => {
    if (itemForm.formState.isValid) {
      const data = itemForm.getValues();
      
      if (editingItem) {
        // Aktualizace existující položky
        setInvoiceItems(items => 
          items.map(item => 
            item.id === editingItem 
              ? { ...data, id: item.id } 
              : item
          )
        );
        toast({
          title: "Položka aktualizována",
          description: "Položka byla úspěšně aktualizována."
        });
      } else {
        // Přidání nové položky
        setInvoiceItems(items => [
          ...items,
          { ...data, id: crypto.randomUUID() }
        ]);
        toast({
          title: "Položka přidána",
          description: "Položka byla úspěšně přidána na fakturu."
        });
      }
      
      // Reset formuláře a zavření dialogu
      itemForm.reset();
      setIsItemDialogOpen(false);
    }
  };
  
  // Funkce pro generování PDF faktury
  const handleGeneratePdf = () => {
    if (!createInvoiceForm.formState.isValid || invoiceItems.length === 0) {
      toast({
        title: "Chyba",
        description: "Zkontrolujte, zda jsou všechna pole správně vyplněna a je přidána alespoň jedna položka.",
        variant: "destructive"
      });
      return;
    }
    
    // Získání dat z formuláře
    const formData = createInvoiceForm.getValues();
    
    // Vytvoření nového PDF dokumentu
    const doc = new jsPDF();
    
    // Přidání nadpisu
    doc.setFontSize(20);
    doc.text("FAKTURA", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Číslo: ${formData.invoiceNumber}`, 105, 30, { align: "center" });
    
    // Informace o dodavateli a odběrateli
    doc.setFontSize(11);
    doc.text("Dodavatel:", 20, 50);
    doc.text(`${user?.firstName} ${user?.lastName}`, 20, 60);
    if (user?.company) doc.text(user.company, 20, 65);
    if (user?.address) doc.text(user.address, 20, 70);
    if (formData.isVatPayer) doc.text("Plátce DPH", 20, 80);
    
    doc.text("Odběratel:", 120, 50);
    doc.text(formData.customerName, 120, 60);
    doc.text(formData.customerAddress, 120, 65);
    if (formData.customerIC) doc.text(`IČO: ${formData.customerIC}`, 120, 75);
    if (formData.customerDIC && formData.isVatPayer) doc.text(`DIČ: ${formData.customerDIC}`, 120, 80);
    
    // Informace o faktuře
    doc.text(`Datum vystavení: ${format(formData.dateIssued, "dd.MM.yyyy", { locale: cs })}`, 20, 95);
    doc.text(`Datum splatnosti: ${format(formData.dateDue, "dd.MM.yyyy", { locale: cs })}`, 20, 100);
    doc.text(`Způsob platby: ${
      formData.paymentMethod === "bank" ? "Bankovním převodem" : 
      formData.paymentMethod === "cash" ? "Hotově" : "Kartou"
    }`, 20, 105);
    
    if (formData.paymentMethod === "bank" && formData.bankAccount) {
      doc.text(`Číslo účtu: ${formData.bankAccount}`, 120, 95);
    }
    
    // Položky faktury
    doc.text("Popis", 20, 125);
    doc.text("Množství", 100, 125);
    doc.text("Jednotka", 120, 125);
    doc.text("Cena/ks", 140, 125);
    doc.text("Celkem", 170, 125);
    
    doc.line(20, 127, 190, 127);
    
    let yPos = 135;
    let totalAmount = 0;
    
    invoiceItems.forEach(item => {
      const itemTotal = item.quantity * item.pricePerUnit;
      totalAmount += itemTotal;
      
      doc.text(item.description, 20, yPos);
      doc.text(String(item.quantity), 100, yPos, { align: "right" });
      doc.text(item.unit, 120, yPos);
      doc.text(`${item.pricePerUnit.toLocaleString()} Kč`, 140, yPos, { align: "right" });
      doc.text(`${itemTotal.toLocaleString()} Kč`, 170, yPos, { align: "right" });
      
      yPos += 10;
    });
    
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    
    doc.setFont(undefined, "bold");
    doc.text("Celkem k úhradě:", 140, yPos);
    doc.text(`${totalAmount.toLocaleString()} Kč`, 170, yPos, { align: "right" });
    doc.setFont(undefined, "normal");
    
    // Poznámka
    if (formData.notes) {
      yPos += 20;
      doc.text("Poznámka:", 20, yPos);
      yPos += 5;
      doc.text(formData.notes, 20, yPos);
    }
    
    // Přímé stažení dokumentu
    doc.save(`faktura_${formData.invoiceNumber.replace(/\//g, "_")}.pdf`);
    
    // Zavření dialogu náhledu, pokud je otevřený
    setIsPreviewOpen(false);
    
    // Oznámení o úspěšném vytvoření faktury
    toast({
      title: "Faktura vytvořena",
      description: "Faktura byla úspěšně vytvořena a stažena ve formátu PDF."
    });
  };
  
  // Pokud uživatel není správce, přesměrujeme na dashboard
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  if (user.role !== "admin") {
    return <Redirect to="/" />;
  }

  return (
    <Layout title="Fakturace">
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Fakturační systém</h2>
            <p className="mt-1 text-sm text-slate-500">Kompletní správa fakturace a finančních přehledů</p>
          </div>
        </div>
        
        <Tabs defaultValue="dashboard" className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="dashboard">Přehled</TabsTrigger>
            <TabsTrigger value="create">Vytvořit fakturu</TabsTrigger>
            <TabsTrigger value="record">Evidovat fakturu</TabsTrigger>
            <TabsTrigger value="history">Historie faktur</TabsTrigger>
          </TabsList>
          
          {/* Obsah záložek */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Celkové příjmy</p>
                      <h3 className="text-2xl font-bold mt-1">{financialSummary.totalIncome.toLocaleString()} Kč</h3>
                    </div>
                    <div className="p-2 bg-green-50 rounded-full">
                      <ArrowUp className="h-6 w-6 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Celkové výdaje</p>
                      <h3 className="text-2xl font-bold mt-1">{financialSummary.totalExpenses.toLocaleString()} Kč</h3>
                    </div>
                    <div className="p-2 bg-red-50 rounded-full">
                      <ArrowDown className="h-6 w-6 text-red-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Celkový zisk</p>
                      <h3 className="text-2xl font-bold mt-1">{financialSummary.totalProfit.toLocaleString()} Kč</h3>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-full">
                      <PieChart className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Nezaplacené faktury</CardTitle>
                  <CardDescription>Celková částka nezaplacených vydaných faktur</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <div className="p-2 bg-amber-50 rounded-full mr-4">
                      <FileText className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{financialSummary.unpaidInvoices.toLocaleString()} Kč</h3>
                      <p className="text-sm text-slate-500">očekávaný příjem</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Nezaplacené účty</CardTitle>
                  <CardDescription>Celková částka nezaplacených přijatých faktur</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-50 rounded-full mr-4">
                      <FileText className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{financialSummary.unpaidBills.toLocaleString()} Kč</h3>
                      <p className="text-sm text-slate-500">budoucí výdaje</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Finanční přehled za posledních 6 měsíců</CardTitle>
                <CardDescription>Měsíční přehled příjmů, výdajů a zisku</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financialData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="income" name="Příjmy" fill="#4ade80" />
                      <Bar dataKey="expenses" name="Výdaje" fill="#f87171" />
                      <Bar dataKey="profit" name="Zisk" fill="#60a5fa" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Vývoj peněžních toků</CardTitle>
                <CardDescription>Trend příjmů a výdajů v čase</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={financialData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="income" name="Příjmy" stroke="#4ade80" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="expenses" name="Výdaje" stroke="#f87171" />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="create">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Informace o faktuře</CardTitle>
                    <CardDescription>Zadejte základní informace o faktuře a zákazníkovi</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...createInvoiceForm}>
                      <form className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={createInvoiceForm.control}
                            name="invoiceNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Číslo faktury</FormLabel>
                                <FormControl>
                                  <Input placeholder="2025-04-001" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={createInvoiceForm.control}
                            name="dateIssued"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Datum vystavení</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                      >
                                        {field.value ? (
                                          format(field.value, "dd.MM.yyyy", { locale: cs })
                                        ) : (
                                          <span className="text-muted-foreground">Vyberte datum</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
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
                            control={createInvoiceForm.control}
                            name="dateDue"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Datum splatnosti</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                      >
                                        {field.value ? (
                                          format(field.value, "dd.MM.yyyy", { locale: cs })
                                        ) : (
                                          <span className="text-muted-foreground">Vyberte datum</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
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
                            control={createInvoiceForm.control}
                            name="paymentMethod"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Způsob platby</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Zvolte způsob platby" />
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
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <FormField
                            control={createInvoiceForm.control}
                            name="customerName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Jméno zákazníka / firma</FormLabel>
                                <FormControl>
                                  <Input placeholder="Zadejte jméno zákazníka nebo firmy" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={createInvoiceForm.control}
                            name="customerAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Adresa</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Zadejte adresu zákazníka"
                                    className="resize-none"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="mb-6">
                          <FormField
                            control={createInvoiceForm.control}
                            name="isVatPayer"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Jste plátcem DPH?</FormLabel>
                                  <FormDescription>
                                    Toto nastavení ovlivní možnost zadání DIČ a zobrazení informací o DPH na faktuře.
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
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={createInvoiceForm.control}
                            name="customerIC"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>IČO</FormLabel>
                                <FormControl>
                                  <Input placeholder="12345678" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Zadejte 8-místné identifikační číslo.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={createInvoiceForm.control}
                            name="customerDIC"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>DIČ</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="CZ12345678" 
                                    {...field} 
                                    disabled={!createInvoiceForm.watch("isVatPayer")} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Formát: CZ následované 8-10 číslicemi.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        {createInvoiceForm.watch("paymentMethod") === "bank" && (
                          <FormField
                            control={createInvoiceForm.control}
                            name="bankAccount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Číslo účtu</FormLabel>
                                <FormControl>
                                  <Input placeholder="123456-1234567890/1234" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Zadejte číslo účtu ve formátu: 123456-1234567890/1234
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        
                        <FormField
                          control={createInvoiceForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Poznámka</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Volitelná poznámka k faktuře"
                                  className="resize-none min-h-[100px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  </CardContent>
                </Card>
                
                <Card className="mt-6">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Položky faktury</CardTitle>
                      <CardDescription>Přidejte položky, které budou fakturovány</CardDescription>
                    </div>
                    <Button onClick={() => {
                      setEditingItem(null);
                      setIsItemDialogOpen(true);
                    }}>
                      <Plus className="mr-2 h-4 w-4" /> Přidat položku
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {invoiceItems.length === 0 ? (
                      <div className="flex items-center justify-center p-6 border border-dashed rounded-md">
                        <p className="text-center text-muted-foreground">
                          Zatím nejsou přidány žádné položky. Klikněte na "Přidat položku" výše.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="py-2 text-left">Popis</th>
                              <th className="py-2 text-right">Množství</th>
                              <th className="py-2 text-left">Jednotka</th>
                              <th className="py-2 text-right">Cena/ks</th>
                              <th className="py-2 text-right">Celkem</th>
                              <th className="py-2 text-center">Akce</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoiceItems.map(item => (
                              <tr key={item.id} className="border-b">
                                <td className="py-3">{item.description}</td>
                                <td className="py-3 text-right">{item.quantity}</td>
                                <td className="py-3">{item.unit}</td>
                                <td className="py-3 text-right">{item.pricePerUnit.toLocaleString()} Kč</td>
                                <td className="py-3 text-right">{(item.quantity * item.pricePerUnit).toLocaleString()} Kč</td>
                                <td className="py-3 text-center">
                                  <div className="flex justify-center space-x-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => {
                                        setEditingItem(item.id);
                                        setIsItemDialogOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => {
                                        setInvoiceItems(items => items.filter(i => i.id !== item.id));
                                        toast({
                                          title: "Položka odstraněna",
                                          description: "Položka byla úspěšně odstraněna z faktury."
                                        });
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 font-bold">
                              <td colSpan={4} className="py-3 text-right">Celkem:</td>
                              <td className="py-3 text-right">
                                {invoiceItems.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0).toLocaleString()} Kč
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsPreviewOpen(true)} disabled={invoiceItems.length === 0}>
                      <FileText className="mr-2 h-4 w-4" /> Náhled faktury
                    </Button>
                    <Button onClick={handleGeneratePdf} disabled={invoiceItems.length === 0 || !createInvoiceForm.formState.isValid}>
                      <FileDown className="mr-2 h-4 w-4" /> Stáhnout PDF
                    </Button>
                  </CardFooter>
                </Card>
              </div>
              
              <div className="lg:col-span-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Návod</CardTitle>
                    <CardDescription>Jak správně vyplnit fakturu</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Číslo faktury</AlertTitle>
                        <AlertDescription>
                          Doporučujeme použít formát RRRR-MM-XXX, kde RRRR je rok, MM je měsíc a XXX je pořadové číslo.
                        </AlertDescription>
                      </Alert>
                      
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Datum splatnosti</AlertTitle>
                        <AlertDescription>
                          Obvyklá doba splatnosti je 14 dní od vystavení faktury, ale můžete ji nastavit podle vašich potřeb.
                        </AlertDescription>
                      </Alert>
                      
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>IČO a DIČ</AlertTitle>
                        <AlertDescription>
                          IČO je 8-místné číslo. DIČ začíná předponou "CZ" následovanou 8-10 číslicemi. DIČ vyplňte pouze pokud jste plátcem DPH.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Dialog pro přidání položky faktury */}
            <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingItem ? "Upravit položku" : "Přidat položku"}</DialogTitle>
                  <DialogDescription>
                    {editingItem ? "Upravte detaily položky faktury." : "Zadejte detaily položky faktury."}
                  </DialogDescription>
                </DialogHeader>
                <Form {...itemForm}>
                  <form className="space-y-4">
                    <FormField
                      control={itemForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Popis položky</FormLabel>
                          <FormControl>
                            <Input placeholder="Zadejte popis položky" {...field} />
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
                                min="0.01" 
                                step="0.01" 
                                placeholder="1"
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
                            <FormControl>
                              <Input placeholder="ks" {...field} />
                            </FormControl>
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
                              min="0" 
                              step="0.01" 
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Zrušit</Button>
                  </DialogClose>
                  <Button 
                    type="submit" 
                    onClick={handleItemSubmit} 
                    disabled={!itemForm.formState.isValid}
                  >
                    {editingItem ? "Uložit změny" : "Přidat položku"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Dialog pro náhled faktury */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Náhled faktury</DialogTitle>
                  <DialogDescription>
                    Prohlédněte si, jak bude vypadat finální faktura před stažením
                  </DialogDescription>
                </DialogHeader>
                <div className="p-4 border rounded-md max-h-[70vh] overflow-y-auto">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-center mb-2">FAKTURA</h2>
                    <p className="text-center text-lg">Číslo: {createInvoiceForm.watch("invoiceNumber") || "N/A"}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <h3 className="font-bold mb-1">Dodavatel:</h3>
                      <p>{user?.firstName} {user?.lastName}</p>
                      <p>{user?.company || ""}</p>
                      <p>{user?.address || ""}</p>
                      {createInvoiceForm.watch("isVatPayer") && 
                        <p className="mt-2">Plátce DPH</p>
                      }
                    </div>
                    <div>
                      <h3 className="font-bold mb-1">Odběratel:</h3>
                      <p>{createInvoiceForm.watch("customerName") || "N/A"}</p>
                      <p>{createInvoiceForm.watch("customerAddress") || "N/A"}</p>
                      {createInvoiceForm.watch("customerIC") && 
                        <p>IČO: {createInvoiceForm.watch("customerIC")}</p>
                      }
                      {createInvoiceForm.watch("customerDIC") && createInvoiceForm.watch("isVatPayer") && 
                        <p>DIČ: {createInvoiceForm.watch("customerDIC")}</p>
                      }
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p><strong>Datum vystavení:</strong> {createInvoiceForm.watch("dateIssued") ? 
                        format(createInvoiceForm.watch("dateIssued"), "dd.MM.yyyy", { locale: cs }) : "N/A"}</p>
                      <p><strong>Datum splatnosti:</strong> {createInvoiceForm.watch("dateDue") ? 
                        format(createInvoiceForm.watch("dateDue"), "dd.MM.yyyy", { locale: cs }) : "N/A"}</p>
                      <p><strong>Způsob platby:</strong> {
                        createInvoiceForm.watch("paymentMethod") === "bank" ? "Bankovním převodem" : 
                        createInvoiceForm.watch("paymentMethod") === "cash" ? "Hotově" : 
                        createInvoiceForm.watch("paymentMethod") === "card" ? "Kartou" : "N/A"
                      }</p>
                    </div>
                    <div>
                      {createInvoiceForm.watch("paymentMethod") === "bank" && createInvoiceForm.watch("bankAccount") && (
                        <p><strong>Číslo účtu:</strong> {createInvoiceForm.watch("bankAccount")}</p>
                      )}
                    </div>
                  </div>
                  
                  <table className="w-full mb-6">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-2">Popis</th>
                        <th className="text-right py-2">Množství</th>
                        <th className="text-left py-2">Jednotka</th>
                        <th className="text-right py-2">Cena/ks</th>
                        <th className="text-right py-2">Celkem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map(item => (
                        <tr key={item.id} className="border-b border-gray-200">
                          <td className="py-3">{item.description}</td>
                          <td className="py-3 text-right">{item.quantity}</td>
                          <td className="py-3">{item.unit}</td>
                          <td className="py-3 text-right">{item.pricePerUnit.toLocaleString()} Kč</td>
                          <td className="py-3 text-right">{(item.quantity * item.pricePerUnit).toLocaleString()} Kč</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 font-bold">
                        <td colSpan={4} className="py-3 text-right">Celkem k úhradě:</td>
                        <td className="py-3 text-right">
                          {invoiceItems.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0).toLocaleString()} Kč
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  
                  {createInvoiceForm.watch("notes") && (
                    <div className="mb-6">
                      <h3 className="font-bold mb-1">Poznámka:</h3>
                      <p>{createInvoiceForm.watch("notes")}</p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={handleGeneratePdf}>
                    <FileDown className="mr-2 h-4 w-4" /> Stáhnout PDF
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
          
          <TabsContent value="record">
            {/* Obsah pro evidenci faktury */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Evidence přijaté faktury</CardTitle>
                    <CardDescription>Zadejte informace o přijaté faktuře</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Formulář pro evidenci přijaté faktury */}
                    <p>Zde by byl formulář pro evidenci faktury</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="record">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Evidence přijaté faktury</CardTitle>
                    <CardDescription>Zadejte informace o přijaté faktuře</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...receivedInvoiceForm}>
                      <form className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={receivedInvoiceForm.control}
                            name="invoiceNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Číslo faktury</FormLabel>
                                <FormControl>
                                  <Input placeholder="FV-2025-001" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={receivedInvoiceForm.control}
                            name="dateReceived"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Datum přijetí</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                      >
                                        {field.value ? (
                                          format(field.value, "dd.MM.yyyy", { locale: cs })
                                        ) : (
                                          <span className="text-muted-foreground">Vyberte datum</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
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
                            control={receivedInvoiceForm.control}
                            name="dateDue"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Datum splatnosti</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                      >
                                        {field.value ? (
                                          format(field.value, "dd.MM.yyyy", { locale: cs })
                                        ) : (
                                          <span className="text-muted-foreground">Vyberte datum</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
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
                            control={receivedInvoiceForm.control}
                            name="amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Částka (Kč)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0.01" 
                                    step="0.01" 
                                    placeholder="0.00"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <FormField
                            control={receivedInvoiceForm.control}
                            name="supplierName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Jméno dodavatele / firma</FormLabel>
                                <FormControl>
                                  <Input placeholder="Zadejte jméno dodavatele nebo firmy" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={receivedInvoiceForm.control}
                            name="supplierAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Adresa</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Zadejte adresu dodavatele"
                                    className="resize-none"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={receivedInvoiceForm.control}
                            name="supplierIC"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>IČO</FormLabel>
                                <FormControl>
                                  <Input placeholder="12345678" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Zadejte 8-místné identifikační číslo.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={receivedInvoiceForm.control}
                            name="supplierDIC"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>DIČ</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="CZ12345678" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Formát: CZ následované 8-10 číslicemi.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={receivedInvoiceForm.control}
                          name="isPaid"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Faktura zaplacena</FormLabel>
                                <FormDescription>
                                  Označte, pokud již byla faktura zaplacena.
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
                          control={receivedInvoiceForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Poznámka</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Volitelná poznámka k faktuře"
                                  className="resize-none min-h-[100px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end">
                          <Button 
                            type="button" 
                            onClick={() => {
                              if (receivedInvoiceForm.formState.isValid) {
                                const data = receivedInvoiceForm.getValues();
                                toast({
                                  title: "Faktura evidována",
                                  description: `Faktura č. ${data.invoiceNumber} byla úspěšně evidována.`
                                });
                                receivedInvoiceForm.reset();
                              } else {
                                receivedInvoiceForm.trigger();
                              }
                            }}
                          >
                            <Save className="mr-2 h-4 w-4" /> Uložit fakturu
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
                    <CardTitle>Nápověda</CardTitle>
                    <CardDescription>Jak správně evidovat přijatou fakturu</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Datum přijetí</AlertTitle>
                        <AlertDescription>
                          Datum přijetí je den, kdy vám byla faktura doručena.
                        </AlertDescription>
                      </Alert>
                      
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Číslo faktury</AlertTitle>
                        <AlertDescription>
                          Zadejte číslo faktury přesně tak, jak je uvedeno na faktuře od dodavatele.
                        </AlertDescription>
                      </Alert>
                      
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Částka</AlertTitle>
                        <AlertDescription>
                          Uveďte celkovou částku faktury včetně DPH, pokud je dodavatel plátcem DPH.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <h3 className="text-lg font-semibold mb-2 sm:mb-0">Historie faktur</h3>
                <div className="flex space-x-2">
                  <Select
                    value={yearFilter}
                    onValueChange={setYearFilter}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Vyberte rok" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Aktuální rok</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left">Typ</th>
                        <th className="py-2 text-left">Číslo</th>
                        <th className="py-2 text-left">Datum</th>
                        <th className="py-2 text-left">Zákazník/Dodavatel</th>
                        <th className="py-2 text-right">Částka</th>
                        <th className="py-2 text-center">Stav</th>
                        <th className="py-2 text-center">Akce</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceHistory.map((invoice) => (
                        <tr key={invoice.id} className="border-b">
                          <td className="py-3">{invoice.type === "issued" ? "Vydaná" : "Přijatá"}</td>
                          <td className="py-3">{invoice.number}</td>
                          <td className="py-3">{format(invoice.date, "dd.MM.yyyy", { locale: cs })}</td>
                          <td className="py-3">{invoice.clientOrSupplier}</td>
                          <td className="py-3 text-right">{invoice.amount.toLocaleString()} Kč</td>
                          <td className="py-3 text-center">
                            <Badge variant={invoice.isPaid ? "success" : "warning"}>
                              {invoice.isPaid ? "Zaplaceno" : "Nezaplaceno"}
                            </Badge>
                          </td>
                          <td className="py-3 text-center">
                            <Button variant="ghost" size="icon">
                              <FileDown className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}