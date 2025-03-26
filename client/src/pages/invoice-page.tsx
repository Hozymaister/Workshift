import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { format, subMonths } from "date-fns";
import { cs } from "date-fns/locale";
import jsPDF from "jspdf";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Pencil
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
      isVatPayer: true,
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
  
  // Funkce pro generování a stažení faktury jako PDF
  const downloadPdf = () => {
    const doc = new jsPDF();
    const formData = form.getValues();
    
    // Nastavení fontu a barvy
    doc.setFont("helvetica");
    doc.setTextColor(50, 50, 50);
    
    // Hlavička faktury
    doc.setFontSize(22);
    doc.text("FAKTURA", 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.text(`Číslo: ${formData.invoiceNumber}`, 105, 30, { align: "center" });
    
    // Informace o dodavateli a odběrateli
    doc.setFontSize(11);
    doc.text("Dodavatel:", 20, 50);
    doc.setFontSize(10);
    doc.text("ShiftManager s.r.o.", 20, 58);
    doc.text("Václavské náměstí 123", 20, 63);
    doc.text("110 00 Praha 1", 20, 68);
    doc.text("IČ: 12345678", 20, 73);
    doc.text("DIČ: CZ12345678", 20, 78);
    
    // Odběratel
    doc.setFontSize(11);
    doc.text("Odběratel:", 120, 50);
    doc.setFontSize(10);
    doc.text(formData.customerName, 120, 58);
    doc.text(formData.customerAddress, 120, 63);
    if (formData.customerIC) {
      doc.text(`IČ: ${formData.customerIC}`, 120, 68);
    }
    if (formData.customerDIC) {
      doc.text(`DIČ: ${formData.customerDIC}`, 120, 73);
    }
    
    // Informace o faktuře
    doc.setFontSize(10);
    doc.text(`Datum vystavení: ${format(formData.dateIssued, "dd.MM.yyyy")}`, 20, 90);
    doc.text(`Datum splatnosti: ${format(formData.dateDue, "dd.MM.yyyy")}`, 20, 95);
    
    // Způsob platby
    let paymentMethodText = "";
    if (formData.paymentMethod === "bank") {
      paymentMethodText = `Bankovním převodem na účet: ${formData.bankAccount || ""}`;
    } else if (formData.paymentMethod === "cash") {
      paymentMethodText = "Hotově";
    } else {
      paymentMethodText = "Platební kartou";
    }
    doc.text(`Způsob platby: ${paymentMethodText}`, 20, 100);
    
    // DPH status
    doc.text(`Plátce DPH: ${formData.isVatPayer ? "Ano" : "Ne"}`, 20, 105);
    
    // Položky faktury
    doc.setFontSize(11);
    doc.text("Položky faktury:", 20, 120);
    
    // Tabulka položek
    const tableTop = 125;
    const tableHeaders = [
      { title: "Popis", x: 20, width: 80 },
      { title: "Množství", x: 105, width: 20, align: "right" },
      { title: "Jedn.", x: 130, width: 15 },
      { title: "Cena/ks", x: 150, width: 20, align: "right" },
      { title: "Celkem", x: 175, width: 25, align: "right" }
    ];
    
    // Hlavička tabulky
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    tableHeaders.forEach(header => {
      doc.text(header.title, header.x, tableTop);
    });
    
    // Řádky tabulky
    doc.setFont("helvetica", "normal");
    let y = tableTop + 10;
    
    // Horizontální linka pod hlavičkou
    doc.setDrawColor(200, 200, 200);
    doc.line(20, tableTop + 3, 195, tableTop + 3);
    
    // Vypisujeme položky
    invoiceItems.forEach((item, index) => {
      // Zkrácení popisu, pokud je příliš dlouhý
      let description = item.description;
      if (description.length > 40) {
        description = description.substring(0, 37) + "...";
      }
      
      doc.text(description, 20, y);
      doc.text(item.quantity.toString(), 105, y, { align: "right" });
      doc.text(item.unit, 130, y);
      doc.text(`${item.pricePerUnit.toLocaleString()} Kč`, 150, y, { align: "right" });
      doc.text(`${(item.quantity * item.pricePerUnit).toLocaleString()} Kč`, 175, y, { align: "right" });
      
      // Posuneme dolů pro další položku (a přidáme mezeru mezi řádky)
      y += 7;
      
      // Pokud by další položka přesáhla stránku, vytvoříme novou
      if (y > 270 && index < invoiceItems.length - 1) {
        doc.addPage();
        y = 20; // Začínáme znovu od vrchu stránky
      }
    });
    
    // Horizontální linka na konci položek
    doc.line(20, y, 195, y);
    
    // Celková částka
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Celková částka:", 120, y);
    doc.text(`${totalAmount.toLocaleString()} Kč`, 175, y, { align: "right" });
    
    // Poznámky
    if (formData.notes) {
      y += 20;
      doc.setFont("helvetica", "bold");
      doc.text("Poznámky:", 20, y);
      doc.setFont("helvetica", "normal");
      y += 7;
      
      // Rozdělení poznámek na řádky, pokud jsou delší
      const noteLines = doc.splitTextToSize(formData.notes, 170);
      doc.text(noteLines, 20, y);
    }
    
    // Patička
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("Faktura byla vygenerována v systému ShiftManager.", 105, 285, { align: "center" });
    doc.text("Strana 1", 195, 285, { align: "right" });
    
    // Uložení PDF
    doc.save(`faktura_${formData.invoiceNumber.replace(/\//g, "-")}.pdf`);
  };
  
  // Formulář pro přijaté faktury
  const receivedInvoiceForm = useForm<ReceivedInvoiceFormValues>({
    resolver: zodResolver(receivedInvoiceSchema),
    defaultValues: {
      invoiceNumber: "",
      dateReceived: new Date(),
      dateDue: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 dní
      supplierName: "",
      supplierAddress: "",
      supplierIC: "",
      supplierDIC: "",
      notes: "",
      amount: 0,
      isPaid: false,
    },
  });
  
  // Funkce pro zaznamenání přijaté faktury
  const onReceivedInvoiceSubmit = (data: ReceivedInvoiceFormValues) => {
    console.log("Přijatá faktura:", data);
    
    // V reálné aplikaci bychom poslali data na server
    // a aktualizovali stavové proměnné
    
    const newInvoice: Invoice = {
      id: Math.random().toString(36).substring(2, 9),
      type: "received",
      number: data.invoiceNumber,
      date: data.dateReceived,
      clientOrSupplier: data.supplierName,
      amount: data.amount,
      isPaid: data.isPaid,
      dueDate: data.dateDue
    };
    
    setInvoiceHistory([...invoiceHistory, newInvoice]);
    
    // Aktualizace finančních údajů
    if (!data.isPaid) {
      setFinancialSummary({
        ...financialSummary,
        totalExpenses: financialSummary.totalExpenses + data.amount,
        totalProfit: financialSummary.totalProfit - data.amount,
        unpaidBills: financialSummary.unpaidBills + data.amount
      });
    } else {
      setFinancialSummary({
        ...financialSummary,
        totalExpenses: financialSummary.totalExpenses + data.amount,
        totalProfit: financialSummary.totalProfit - data.amount
      });
    }
    
    receivedInvoiceForm.reset();
  };
  
  // Funkce pro označení faktury jako zaplacené/nezaplacené
  const toggleInvoicePaid = (id: string) => {
    const updatedInvoices = invoiceHistory.map(invoice => {
      if (invoice.id === id) {
        const updatedInvoice = { ...invoice, isPaid: !invoice.isPaid };
        
        // Aktualizace finančních údajů
        if (updatedInvoice.type === "issued") {
          if (updatedInvoice.isPaid) {
            setFinancialSummary({
              ...financialSummary,
              unpaidInvoices: financialSummary.unpaidInvoices - updatedInvoice.amount
            });
          } else {
            setFinancialSummary({
              ...financialSummary,
              unpaidInvoices: financialSummary.unpaidInvoices + updatedInvoice.amount
            });
          }
        } else {
          if (updatedInvoice.isPaid) {
            setFinancialSummary({
              ...financialSummary,
              unpaidBills: financialSummary.unpaidBills - updatedInvoice.amount
            });
          } else {
            setFinancialSummary({
              ...financialSummary,
              unpaidBills: financialSummary.unpaidBills + updatedInvoice.amount
            });
          }
        }
        
        return updatedInvoice;
      }
      return invoice;
    });
    
    setInvoiceHistory(updatedInvoices);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-100">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 pb-16 md:pb-0">
        <Header title="Fakturace" />
        
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
            
            {/* Záložka Přehled s finančními informacemi a grafy */}
            <TabsContent value="dashboard">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Celkové příjmy</p>
                        <h3 className="text-2xl font-bold mt-1">{financialSummary.totalIncome.toLocaleString()} Kč</h3>
                      </div>
                      <div className="p-2 bg-green-100 rounded-full">
                        <ArrowUp className="h-6 w-6 text-green-600" />
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
                      <div className="p-2 bg-red-100 rounded-full">
                        <ArrowDown className="h-6 w-6 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Zisk</p>
                        <h3 className="text-2xl font-bold mt-1">{financialSummary.totalProfit.toLocaleString()} Kč</h3>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-full">
                        <PieChart className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Finanční přehled za posledních 6 měsíců</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          width={500}
                          height={300}
                          data={financialData}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => `${value.toLocaleString()} Kč`} />
                          <Legend />
                          <Bar dataKey="income" name="Příjmy" fill="#4ade80" />
                          <Bar dataKey="expenses" name="Výdaje" fill="#f87171" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Vývoj zisku</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart
                          width={500}
                          height={300}
                          data={financialData}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => `${value.toLocaleString()} Kč`} />
                          <Legend />
                          <Line type="monotone" dataKey="profit" name="Zisk" stroke="#60a5fa" strokeWidth={2} />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Neuhrazené faktury</CardTitle>
                    <CardDescription>Celkem: {financialSummary.unpaidInvoices.toLocaleString()} Kč</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {invoiceHistory
                        .filter(invoice => invoice.type === "issued" && !invoice.isPaid)
                        .map(invoice => (
                          <div key={invoice.id} className="flex items-center justify-between border-b pb-2">
                            <div>
                              <p className="font-medium">{invoice.clientOrSupplier}</p>
                              <p className="text-sm text-slate-500">Faktura č. {invoice.number}</p>
                              <p className="text-xs text-slate-400">Splatnost: {format(invoice.dueDate, "P", { locale: cs })}</p>
                            </div>
                            <p className="font-semibold">{invoice.amount.toLocaleString()} Kč</p>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Neuhrazené přijaté faktury</CardTitle>
                    <CardDescription>Celkem: {financialSummary.unpaidBills.toLocaleString()} Kč</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {invoiceHistory
                        .filter(invoice => invoice.type === "received" && !invoice.isPaid)
                        .map(invoice => (
                          <div key={invoice.id} className="flex items-center justify-between border-b pb-2">
                            <div>
                              <p className="font-medium">{invoice.clientOrSupplier}</p>
                              <p className="text-sm text-slate-500">Faktura č. {invoice.number}</p>
                              <p className="text-xs text-slate-400">Splatnost: {format(invoice.dueDate, "P", { locale: cs })}</p>
                            </div>
                            <p className="font-semibold">{invoice.amount.toLocaleString()} Kč</p>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Záložka pro vytvoření nové faktury */}
            <TabsContent value="create">
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
                          
                          <FormField
                            control={form.control}
                            name="isVatPayer"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm mt-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Plátce DPH</FormLabel>
                                  <FormDescription>
                                    Je dodavatel plátcem DPH?
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
                        
                        {/* Přidání položky přímo ve formuláři */}
                        <div className="mb-6 p-4 border rounded-md bg-slate-50">
                          <h4 className="font-semibold mb-3">Přidat novou položku</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <FormItem>
                                <FormLabel>Popis položky</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Popis položky" 
                                    {...itemForm.register("description")}
                                  />
                                </FormControl>
                                {itemForm.formState.errors.description && (
                                  <p className="text-sm text-red-500">{itemForm.formState.errors.description.message}</p>
                                )}
                              </FormItem>
                            </div>
                            
                            <div>
                              <FormItem>
                                <FormLabel>Množství</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0.01" 
                                    step="0.01"
                                    placeholder="Množství"
                                    {...itemForm.register("quantity", { 
                                      valueAsNumber: true,
                                    })}
                                  />
                                </FormControl>
                                {itemForm.formState.errors.quantity && (
                                  <p className="text-sm text-red-500">{itemForm.formState.errors.quantity.message}</p>
                                )}
                              </FormItem>
                            </div>
                            
                            <div>
                              <FormItem>
                                <FormLabel>Jednotka</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="ks, hod, m²"
                                    {...itemForm.register("unit")}
                                  />
                                </FormControl>
                                {itemForm.formState.errors.unit && (
                                  <p className="text-sm text-red-500">{itemForm.formState.errors.unit.message}</p>
                                )}
                              </FormItem>
                            </div>
                            
                            <div>
                              <FormItem>
                                <FormLabel>Cena za jednotku (Kč)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.01"
                                    placeholder="0.00"
                                    {...itemForm.register("pricePerUnit", { 
                                      valueAsNumber: true,
                                    })}
                                  />
                                </FormControl>
                                {itemForm.formState.errors.pricePerUnit && (
                                  <p className="text-sm text-red-500">{itemForm.formState.errors.pricePerUnit.message}</p>
                                )}
                              </FormItem>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex justify-end">
                            <Button 
                              variant="secondary" 
                              type="button"
                              onClick={() => {
                                const data = itemForm.getValues();
                                if (itemForm.formState.isValid) {
                                  onItemSubmit(data);
                                  itemForm.reset({
                                    description: "",
                                    quantity: 1,
                                    unit: "ks",
                                    pricePerUnit: 0,
                                  });
                                } else {
                                  itemForm.trigger();
                                }
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Přidat položku
                            </Button>
                          </div>
                        </div>
                        
                        {invoiceItems.length === 0 ? (
                          <div className="text-center py-6 border border-dashed rounded-md">
                            <p className="text-slate-500">Zatím nebyly přidány žádné položky</p>
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
                                            <Pencil className="h-4 w-4" />
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
                    onClick={downloadPdf}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Stáhnout PDF
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
            </TabsContent>
            
            {/* Záložka pro evidenci přijatých faktur */}
            <TabsContent value="record">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Evidovat přijatou fakturu</CardTitle>
                      <CardDescription>Zadejte detaily přijaté faktury od dodavatele</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...receivedInvoiceForm}>
                        <form onSubmit={receivedInvoiceForm.handleSubmit(onReceivedInvoiceSubmit)} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={receivedInvoiceForm.control}
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
                                control={receivedInvoiceForm.control}
                                name="supplierName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Název dodavatele</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={receivedInvoiceForm.control}
                                name="supplierAddress"
                                render={({ field }) => (
                                  <FormItem className="mt-4">
                                    <FormLabel>Adresa dodavatele</FormLabel>
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
                                control={receivedInvoiceForm.control}
                                name="supplierIC"
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
                                control={receivedInvoiceForm.control}
                                name="supplierDIC"
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
                          
                          <FormField
                            control={receivedInvoiceForm.control}
                            name="amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Celková částka (Kč)</FormLabel>
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
                            control={receivedInvoiceForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Poznámky</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    rows={3} 
                                    placeholder="Další informace o faktuře..." 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={receivedInvoiceForm.control}
                            name="isPaid"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Faktura zaplacena</FormLabel>
                                  <FormDescription>
                                    Označte, pokud již byla faktura uhrazena
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
                          
                          <div className="flex justify-end space-x-4 pt-4 border-t">
                            <Button 
                              type="submit" 
                              className="bg-primary text-white"
                            >
                              <Save className="mr-2 h-4 w-4" />
                              Evidovat fakturu
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
                      <CardTitle>Informace o fakturaci</CardTitle>
                      <CardDescription>Užitečné tipy pro evidenci faktur</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <h3 className="font-medium text-blue-800 mb-2">Proč evidovat faktury?</h3>
                          <p className="text-sm text-blue-700">Evidence přijatých faktur vám pomůže sledovat vaše závazky, plánovat cash-flow a připravit správné podklady pro účetnictví.</p>
                        </div>
                        
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                          <h3 className="font-medium text-amber-800 mb-2">Důležité upozornění</h3>
                          <p className="text-sm text-amber-700">Nezapomeňte, že u přijatých faktur je potřeba zkontrolovat správnost údajů a oprávněnost platby před provedením úhrady.</p>
                        </div>
                        
                        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                          <h3 className="font-medium text-green-800 mb-2">Tip pro efektivitu</h3>
                          <p className="text-sm text-green-700">Doporučujeme zavést systém pro schvalování faktur před platbou, abyste předešli chybným platbám a měli kontrolu nad výdaji.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            {/* Záložka pro historii faktur */}
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Historie faktur</CardTitle>
                  <CardDescription>Přehled všech vystavených a přijatých faktur</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                      </div>
                      <Input 
                        className="pl-10" 
                        placeholder="Hledat faktury..." 
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="year-filter">Filtrovat podle roku:</Label>
                      <Select value={yearFilter} onValueChange={setYearFilter}>
                        <SelectTrigger id="year-filter" className="w-[180px]">
                          <SelectValue placeholder="Vyberte rok" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current">Aktuální rok (2025)</SelectItem>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2023">2023</SelectItem>
                          <SelectItem value="all">Všechny roky</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                        <tr>
                          <th className="px-4 py-3 rounded-tl-lg">Typ</th>
                          <th className="px-4 py-3">Číslo</th>
                          <th className="px-4 py-3">Datum</th>
                          <th className="px-4 py-3">Zákazník/Dodavatel</th>
                          <th className="px-4 py-3">Částka (Kč)</th>
                          <th className="px-4 py-3">Splatnost</th>
                          <th className="px-4 py-3">Stav</th>
                          <th className="px-4 py-3 rounded-tr-lg">Akce</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceHistory.filter(invoice => {
                          // Filtrování podle roku
                          if (yearFilter === "all") return true;
                          if (yearFilter === "current") return invoice.date.getFullYear() === 2025;
                          return invoice.date.getFullYear() === parseInt(yearFilter);
                        }).length === 0 ? (
                          <tr className="bg-white border-b">
                            <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                              Žádné faktury k zobrazení pro vybraný rok
                            </td>
                          </tr>
                        ) : (
                          invoiceHistory.filter(invoice => {
                            // Filtrování podle roku
                            if (yearFilter === "all") return true;
                            if (yearFilter === "current") return invoice.date.getFullYear() === 2025;
                            return invoice.date.getFullYear() === parseInt(yearFilter);
                          }).map((invoice) => (
                            <tr key={invoice.id} className="bg-white border-b hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <Badge variant={invoice.type === "issued" ? "default" : "destructive"} className={invoice.type === "issued" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
                                  {invoice.type === "issued" ? "Vystavená" : "Přijatá"}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 font-medium">{invoice.number}</td>
                              <td className="px-4 py-3">
                                {format(invoice.date, "P", { locale: cs })}
                              </td>
                              <td className="px-4 py-3">{invoice.clientOrSupplier}</td>
                              <td className="px-4 py-3 font-medium">
                                {invoice.amount.toLocaleString()} Kč
                              </td>
                              <td className="px-4 py-3">
                                {format(invoice.dueDate, "P", { locale: cs })}
                              </td>
                              <td className="px-4 py-3">
                                {invoice.isPaid ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    Zaplaceno
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                    Nezaplaceno
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => toggleInvoicePaid(invoice.id)}
                                  >
                                    {invoice.isPaid ? "Označit jako nezaplacené" : "Označit jako zaplacené"}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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