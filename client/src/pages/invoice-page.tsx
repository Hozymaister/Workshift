import { useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { format, subMonths, parseISO } from "date-fns";
import { cs } from "date-fns/locale";
import jsPDF from "jspdf";
import { Layout } from "@/components/layout/layout";
import { CustomerAutocomplete } from "@/components/invoice/customer-autocomplete";
import { Customer } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  Info,
  Search
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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filtr pro historii faktur
  const [yearFilter, setYearFilter] = useState<string>("current");
  
  // Použijeme React Query pro načtení seznamu faktur
  const queryClient = useQueryClient();
  
  // Query pro načtení seznamu všech faktur
  const { data: invoiceHistory = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['/api/invoices'],
    queryFn: async () => {
      const response = await fetch('/api/invoices');
      if (!response.ok) {
        throw new Error('Nepodařilo se načíst faktury');
      }
      const data = await response.json();
      return data.map((invoice: any) => ({
        id: invoice.id.toString(),
        type: invoice.type,
        number: invoice.invoiceNumber,
        date: new Date(invoice.date),
        clientOrSupplier: invoice.type === 'issued' ? invoice.customerName : invoice.supplierName,
        amount: invoice.amount,
        isPaid: invoice.isPaid,
        dueDate: new Date(invoice.dateDue)
      }));
    }
  });
  
  // Finanční data pro grafy - inicializujeme jako prázdné pole, které bude naplněno po načtení faktur
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  
  // Součty pro aktuální období - inicializujeme nulovými hodnotami
  const [financialSummary, setFinancialSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalProfit: 0,
    unpaidInvoices: 0,
    unpaidBills: 0
  });
  
  // Efekt pro výpočet finančních dat z faktur
  useEffect(() => {
    if (invoiceHistory && invoiceHistory.length > 0) {
      // Vypočteme finanční přehledy
      let totalIncome = 0;
      let totalExpenses = 0;
      let unpaidInvoices = 0;
      let unpaidBills = 0;
      
      // Vytvoříme mapu pro měsíční přehledy
      const monthlyData = new Map<string, { income: number, expenses: number }>();
      
      // Projdeme všechny faktury
      invoiceHistory.forEach(invoice => {
        const amount = invoice.amount || 0;
        const month = format(new Date(invoice.date), 'MMMM', { locale: cs });
        
        // Aktualizujeme celkové hodnoty
        if (invoice.type === 'issued') {
          totalIncome += amount;
          if (!invoice.isPaid) {
            unpaidInvoices += amount;
          }
        } else {
          totalExpenses += amount;
          if (!invoice.isPaid) {
            unpaidBills += amount;
          }
        }
        
        // Aktualizujeme měsíční data
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { income: 0, expenses: 0 });
        }
        const monthData = monthlyData.get(month)!;
        
        if (invoice.type === 'issued') {
          monthData.income += amount;
        } else {
          monthData.expenses += amount;
        }
      });
      
      // Nastavíme souhrnné údaje
      setFinancialSummary({
        totalIncome,
        totalExpenses,
        totalProfit: totalIncome - totalExpenses,
        unpaidInvoices,
        unpaidBills
      });
      
      // Převedeme měsíční data na pole pro grafy
      const graphData: FinancialData[] = Array.from(monthlyData.entries())
        .map(([month, data]) => ({
          month,
          income: data.income,
          expenses: data.expenses,
          profit: data.income - data.expenses
        }));
      
      setFinancialData(graphData);
    }
  }, [invoiceHistory]);
  
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
  
  // Mutace pro vytvoření faktury
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      const response = await apiRequest('/api/invoices', 'POST', invoiceData);
      return response;
    },
    onSuccess: () => {
      // Po úspěšném vytvoření faktury invalidujeme cache pro seznam faktur
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      
      // Resetujeme formulář
      createInvoiceForm.reset({
        invoiceNumber: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${(invoiceHistory.length + 1).toString().padStart(3, '0')}`,
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
      });
      
      // Resetujeme položky faktury
      setInvoiceItems([]);
      
      toast({
        title: "Faktura uložena",
        description: "Faktura byla úspěšně uložena do databáze."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba při ukládání faktury",
        description: error.message || "Při ukládání faktury došlo k chybě.",
        variant: "destructive"
      });
    }
  });
  
  // Mutace pro evidenci přijaté faktury
  const recordInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      const response = await apiRequest('/api/invoices', 'POST', invoiceData);
      return response;
    },
    onSuccess: () => {
      // Po úspěšném vytvoření faktury invalidujeme cache pro seznam faktur
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      
      // Resetujeme formulář
      receivedInvoiceForm.reset({
        invoiceNumber: "",
        dateReceived: new Date(),
        dateDue: new Date(new Date().setDate(new Date().getDate() + 14)),
        supplierName: "",
        supplierAddress: "",
        supplierIC: "",
        supplierDIC: "",
        notes: "",
        amount: 0,
        isPaid: false
      });
      
      toast({
        title: "Faktura evidována",
        description: "Přijatá faktura byla úspěšně evidována v systému."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba při evidování faktury",
        description: error.message || "Při evidování faktury došlo k chybě.",
        variant: "destructive"
      });
    }
  });
  
  // Funkce pro uložení vydané faktury do databáze
  const handleSaveInvoice = () => {
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
    
    // Výpočet celkové částky
    let totalAmount = 0;
    invoiceItems.forEach(item => {
      totalAmount += item.quantity * item.pricePerUnit;
    });
    
    // Příprava dat pro odeslání na server
    const invoiceData = {
      invoiceNumber: formData.invoiceNumber,
      type: "issued",
      dateIssued: formData.dateIssued,
      date: formData.dateIssued,
      dateDue: formData.dateDue,
      customerName: formData.customerName,
      customerAddress: formData.customerAddress,
      customerIC: formData.customerIC,
      customerDIC: formData.customerDIC,
      bankAccount: formData.bankAccount,
      paymentMethod: formData.paymentMethod,
      isVatPayer: formData.isVatPayer,
      amount: totalAmount,
      notes: formData.notes,
      isPaid: false,
      items: invoiceItems
    };
    
    // Odeslání dat na server
    createInvoiceMutation.mutate(invoiceData);
  };
  
  // Funkce pro uložení přijaté faktury do databáze
  const handleSaveReceivedInvoice = () => {
    if (!receivedInvoiceForm.formState.isValid) {
      receivedInvoiceForm.trigger();
      toast({
        title: "Chyba",
        description: "Zkontrolujte, zda jsou všechna pole správně vyplněna.",
        variant: "destructive"
      });
      return;
    }
    
    // Získání dat z formuláře
    const formData = receivedInvoiceForm.getValues();
    
    // Příprava dat pro odeslání na server
    const invoiceData = {
      invoiceNumber: formData.invoiceNumber,
      type: "received",
      dateReceived: formData.dateReceived,
      date: formData.dateReceived,
      dateDue: formData.dateDue,
      supplierName: formData.supplierName,
      supplierAddress: formData.supplierAddress,
      supplierIC: formData.supplierIC,
      supplierDIC: formData.supplierDIC,
      amount: formData.amount,
      notes: formData.notes,
      isPaid: formData.isPaid
    };
    
    // Odeslání dat na server
    recordInvoiceMutation.mutate(invoiceData);
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
    
    // Vytvoření nového PDF dokumentu (A4 formát, orientace na výšku)
    const doc = new jsPDF();
    
    // Definice barev a stylů
    const primaryColor = "#505050";
    const secondaryColor = "#eeeeee";
    const accentColor = "#303030";
    
    // Základní nastavení stránky
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, "F");
    
    // Horní pruh pro číslo faktury a název
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 40, "F");
    
    // Šedý pruh pro celkovou částku
    doc.setFillColor(240, 240, 240);
    doc.rect(10, 40, 190, 20, "F");
    
    // Nadpis a číslo faktury - moderní, jednoduchý design
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(24);
    doc.setFont("helvetica", "normal");
    doc.text("FAKTURA", 20, 20);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(formData.invoiceNumber, 190, 20, { align: "right" });
    
    // Celková částka k zaplacení
    let totalAmount = 0;
    invoiceItems.forEach(item => {
      totalAmount += item.quantity * item.pricePerUnit;
    });
    
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text("Prosím o zaplacení", 20, 52);
    
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`${totalAmount.toLocaleString()} Kč`, 190, 52, { align: "right" });
    
    // Údaje formuláře faktury
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    const leftColumnX = 20;
    const rightColumnX = 110;
    let yPos = 80;
    
    // Levý sloupec - informace o faktuře
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("Forma úhrady:", leftColumnX, yPos);
    doc.setTextColor(0, 0, 0);
    doc.text(formData.paymentMethod === "bank" ? "bankovním převodem" : 
             formData.paymentMethod === "cash" ? "hotově" : "kartou", 
             leftColumnX + 30, yPos);
    
    yPos += 5;
    doc.setTextColor(120, 120, 120);
    doc.text("Číslo účtu:", leftColumnX, yPos);
    doc.setTextColor(0, 0, 0);
    doc.text(formData.bankAccount || "Neuvedeno", leftColumnX + 30, yPos);
    
    yPos += 5;
    doc.setTextColor(120, 120, 120);
    doc.text("Variabilní symbol:", leftColumnX, yPos);
    doc.setTextColor(0, 0, 0);
    doc.text(formData.invoiceNumber.replace(/\//g, ""), leftColumnX + 30, yPos);
    
    yPos += 5;
    doc.setTextColor(120, 120, 120);
    doc.text("Datum vystavení:", leftColumnX, yPos);
    doc.setTextColor(0, 0, 0);
    doc.text(format(formData.dateIssued, "dd.MM.yyyy", { locale: cs }), leftColumnX + 30, yPos);
    
    yPos += 5;
    doc.setTextColor(120, 120, 120);
    doc.text("Datum splatnosti:", leftColumnX, yPos);
    doc.setTextColor(0, 0, 0);
    doc.text(format(formData.dateDue, "dd.MM.yyyy", { locale: cs }), leftColumnX + 30, yPos);
    
    // Banka
    yPos += 10;
    doc.setTextColor(120, 120, 120);
    doc.text("Banka dodavatele:", leftColumnX, yPos);
    doc.setTextColor(0, 0, 0);
    doc.text("Air Bank a.s.", leftColumnX, yPos + 5);
    doc.text("IBAN: CZ123456789", leftColumnX, yPos + 10);
    
    // Dodavatel a odběratel
    yPos = 80;
    
    // Dodavatel
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("Dodavatel:", rightColumnX, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    
    yPos += 5;
    // Jméno dodavatele
    doc.text(`${user?.firstName || ""} ${user?.lastName || ""}`, rightColumnX, yPos);
    doc.setFont("helvetica", "normal");
    
    yPos += 5;
    // Adresa dodavatele - ukázková adresa
    doc.text("Technická 123/45", rightColumnX, yPos);
    yPos += 5;
    doc.text("60200 Brno", rightColumnX, yPos);
    yPos += 5;
    doc.text("Česká republika", rightColumnX, yPos);
    
    yPos += 7;
    doc.setTextColor(120, 120, 120);
    doc.text("IČO:", rightColumnX, yPos);
    doc.setTextColor(0, 0, 0);
    doc.text("04817871", rightColumnX + 15, yPos);
    
    yPos += 5;
    if (formData.isVatPayer) {
      doc.setTextColor(120, 120, 120);
      doc.text("DIČ:", rightColumnX, yPos);
      doc.setTextColor(0, 0, 0);
      doc.text("CZ04817871", rightColumnX + 15, yPos);
    }
    
    // Odběratel
    yPos += 15;
    doc.setTextColor(120, 120, 120);
    doc.text("Odběratel:", rightColumnX, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    
    yPos += 5;
    // Jméno odběratele
    doc.text(formData.customerName, rightColumnX, yPos);
    doc.setFont("helvetica", "normal");
    
    yPos += 5;
    // Adresa odběratele
    const addressLines = formData.customerAddress.split(',');
    addressLines.forEach(line => {
      doc.text(line.trim(), rightColumnX, yPos);
      yPos += 5;
    });
    
    if (formData.customerIC) {
      doc.setTextColor(120, 120, 120);
      doc.text("IČO:", rightColumnX, yPos);
      doc.setTextColor(0, 0, 0);
      doc.text(formData.customerIC, rightColumnX + 15, yPos);
      yPos += 5;
    }
    
    if (formData.customerDIC && formData.isVatPayer) {
      doc.setTextColor(120, 120, 120);
      doc.text("DIČ:", rightColumnX, yPos);
      doc.setTextColor(0, 0, 0);
      doc.text(formData.customerDIC, rightColumnX + 15, yPos);
    }
    
    // Generování QR kódu pro platbu
    // (Poznámka: V reálné implementaci bychom museli zahrnout generování QR kódu pro platbu)
    
    // Tabulka s položkami faktury
    yPos = 170;
    
    // Hlavička tabulky - šedý pruh
    doc.setFillColor(240, 240, 240);
    doc.rect(10, yPos, 190, 10, "F");
    
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.text("Popis", 15, yPos + 7);
    doc.text("Množství", 110, yPos + 7, { align: "right" });
    doc.text("Jednotka", 130, yPos + 7, { align: "center" });
    doc.text("Cena/ks", 160, yPos + 7, { align: "right" });
    doc.text("Celkem", 195, yPos + 7, { align: "right" });
    
    // Položky faktury
    yPos += 15;
    let currentItem = 1;
    
    invoiceItems.forEach(item => {
      const itemTotal = item.quantity * item.pricePerUnit;
      
      // Přidání stínování pro sudé řádky
      if (currentItem % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(10, yPos - 5, 190, 10, "F");
      }
      
      doc.setTextColor(0, 0, 0);
      doc.text(item.description, 15, yPos);
      doc.text(String(item.quantity), 110, yPos, { align: "right" });
      doc.text(item.unit, 130, yPos, { align: "center" });
      doc.text(`${item.pricePerUnit.toLocaleString()} Kč`, 160, yPos, { align: "right" });
      doc.text(`${itemTotal.toLocaleString()} Kč`, 195, yPos, { align: "right" });
      
      yPos += 10;
      currentItem++;
    });
    
    // Součet - šedý pruh
    doc.setFillColor(240, 240, 240);
    doc.rect(10, yPos, 190, 10, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Celkem k úhradě:", 130, yPos + 7);
    doc.text(`${totalAmount.toLocaleString()} Kč`, 195, yPos + 7, { align: "right" });
    
    // Poznámka a dodatečné informace
    yPos += 20;
    if (formData.notes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text("Poznámka:", 15, yPos);
      yPos += 5;
      doc.setTextColor(0, 0, 0);
      
      // Rozdělení poznámky na řádky, pokud je dlouhá
      const noteLines = doc.splitTextToSize(formData.notes, 180);
      doc.text(noteLines, 15, yPos);
      yPos += noteLines.length * 5;
    }
    
    // Patička
    doc.setFillColor(248, 248, 248);
    doc.rect(0, 270, 210, 27, "F");
    
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    
    // Levá část patičky
    doc.text("Strana 1 / 1", 15, 280);
    
    // Střední část patičky
    const contactInfo = "hozak.tomas@mail.cz | +420 704 247 855";
    doc.text(contactInfo, 105, 280, { align: "center" });
    
    // Pravá část patičky
    const digitallySignedText = "Daňová schránka: mojedan@";
    doc.text(digitallySignedText, 195, 280, { align: "right" });
    
    // Přímé stažení dokumentu s vhodným názvem
    doc.save(`faktura_${formData.invoiceNumber.replace(/\//g, "_")}.pdf`);
    
    // Zavření dialogu náhledu, pokud je otevřený
    setIsPreviewOpen(false);
    
    // Oznámení o úspěšném vytvoření faktury
    toast({
      title: "Faktura vytvořena",
      description: "Faktura byla úspěšně vytvořena a stažena ve formátu PDF."
    });
  };
  
  // Funkce pro načtení informací o firmě z ARES pomocí IČO
  const fetchCompanyInfo = async (ico: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ares?ico=${ico}`);
      
      const data = await response.json();
      
      // Kontrola na chybovou odpověď
      if (!response.ok) {
        if (data && data.error) {
          throw new Error(data.error);
        } else {
          throw new Error(`Chyba při načítání dat: ${response.statusText}`);
        }
      }
      
      // Předvyplnění formuláře daty z ARES
      createInvoiceForm.setValue("customerName", data.name);
      createInvoiceForm.setValue("customerAddress", data.address);
      createInvoiceForm.setValue("customerIC", data.ico);
      
      if (data.dic) {
        createInvoiceForm.setValue("customerDIC", data.dic);
      }
      
      toast({
        title: "Data načtena",
        description: `Informace o firmě ${data.name} byly úspěšně načteny.`
      });
    } catch (error) {
      toast({
        title: "Chyba při vyhledávání",
        description: error instanceof Error ? error.message : "Nastala neznámá chyba při načítání dat",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Funkce pro zpracování výběru zákazníka z našeptávače
  const handleCustomerSelect = (customerData: Customer | any) => {
    // Předvyplnění formuláře dle vybraného zákazníka
    createInvoiceForm.setValue("customerName", customerData.name);
    createInvoiceForm.setValue("customerAddress", customerData.address);
    
    if (customerData.ic) {
      createInvoiceForm.setValue("customerIC", customerData.ic);
    }
    
    if (customerData.dic) {
      createInvoiceForm.setValue("customerDIC", customerData.dic);
    }
    
    if (customerData.id) {
      // Jedná se o existujícího zákazníka z databáze
      setSelectedCustomer(customerData);
      toast({
        title: "Zákazník vybrán",
        description: `Zákazník ${customerData.name} byl úspěšně vybrán.`
      });
    } else {
      // Jedná se o data z ARES
      toast({
        title: "Data z ARES načtena",
        description: "Informace o firmě byly úspěšně načteny z ARES."
      });
    }
  };
  
  // Pokud uživatel není správce, přesměrujeme na dashboard
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  if (user.role !== "admin" && user.role !== "company") {
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
                          <div className="mb-2">
                            <Label>Najít zákazníka nebo firmu</Label>
                            <div className="mt-1">
                              <CustomerAutocomplete onSelect={handleCustomerSelect} placeholder="Vyhledat zákazníka nebo podle IČO" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Vyhledávejte podle názvu nebo zadejte 8-místné IČO pro načtení údajů z ARES
                            </p>
                          </div>
                          
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
                                <div className="flex space-x-2">
                                  <FormControl>
                                    <Input placeholder="12345678" {...field} />
                                  </FormControl>
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => {
                                      const ico = createInvoiceForm.getValues("customerIC");
                                      if (ico && /^\d{8}$/.test(ico)) {
                                        fetchCompanyInfo(ico);
                                      } else {
                                        toast({
                                          title: "Neplatné IČO",
                                          description: "Zadejte platné 8-místné IČO",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                    disabled={isLoading}
                                  >
                                    {isLoading ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Search className="mr-2 h-4 w-4" />
                                    )}
                                    Ověřit
                                  </Button>
                                </div>
                                <FormDescription>
                                  Zadejte 8-místné identifikační číslo a klikněte na "Ověřit" pro načtení údajů z ARES.
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
                    <Button 
                      onClick={handleSaveInvoice}
                      disabled={invoiceItems.length === 0 || !createInvoiceForm.formState.isValid || createInvoiceMutation.isPending}
                    >
                      {createInvoiceMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Uložit do systému
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
                            onClick={handleSaveReceivedInvoice}
                            disabled={recordInvoiceMutation.isPending}
                          >
                            {recordInvoiceMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="mr-2 h-4 w-4" />
                            )}
                            Uložit fakturu
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
              
              <div className="bg-white rounded-lg shadow">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="p-3 text-left">Typ</th>
                        <th className="p-3 text-left">Číslo</th>
                        <th className="p-3 text-left">Datum</th>
                        <th className="p-3 text-left">Zákazník/Dodavatel</th>
                        <th className="p-3 text-right">Částka</th>
                        <th className="p-3 text-center">Stav</th>
                        <th className="p-3 text-center">Akce</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceHistory.map((invoice) => (
                        <tr key={invoice.id} className="border-b hover:bg-slate-50">
                          <td className="p-3 whitespace-nowrap">{invoice.type === "issued" ? "Vydaná" : "Přijatá"}</td>
                          <td className="p-3 whitespace-nowrap">{invoice.number}</td>
                          <td className="p-3 whitespace-nowrap">{format(invoice.date, "dd.MM.yyyy", { locale: cs })}</td>
                          <td className="p-3 max-w-[200px] truncate">{invoice.clientOrSupplier}</td>
                          <td className="p-3 text-right whitespace-nowrap">{invoice.amount.toLocaleString()} Kč</td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <Badge variant={invoice.isPaid ? "success" : "warning"}>
                              {invoice.isPaid ? "Zaplaceno" : "Nezaplaceno"}
                            </Badge>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <Button variant="ghost" size="icon" title="Stáhnout fakturu">
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