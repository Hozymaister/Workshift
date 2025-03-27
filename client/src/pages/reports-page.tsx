import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Report, Shift } from "@shared/schema";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BarChart3,
  Calendar,
  Clock,
  Download,
  FileText,
  Loader2,
  Plus,
  Printer,
  User,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calculateDuration, formatCurrency, formatDateTime } from "@/lib/utils";

// Form schema for report generation
const formSchema = z.object({
  userId: z.string().min(1, "Vyberte pracovníka"),
  month: z.string().min(1, "Vyberte měsíc"),
  year: z.string().min(1, "Vyberte rok"),
});

type FormValues = z.infer<typeof formSchema>;

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedReportShifts, setSelectedReportShifts] = useState<Shift[]>([]);
  const [isReportDetailsOpen, setIsReportDetailsOpen] = useState(false);
  
  const isAdmin = user?.role === "company";
  
  // Parse userId from URL if present
  const params = new URLSearchParams(location.split("?")[1]);
  const urlUserId = params.get("userId");
  
  // Get current year and month for default form values
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear().toString();
  const currentMonth = (currentDate.getMonth() + 1).toString();
  
  // Get all workers if admin
  const { data: workers } = useQuery({
    queryKey: ["/api/workers"],
    enabled: isAdmin,
  });
  
  // Get reports for user
  const { data: reports, isLoading: isReportsLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports", { userId: urlUserId || user?.id }],
  });
  
  // Get shifts for report details
  const { data: allShifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", { userId: urlUserId || user?.id }],
  });
  
  // Form for generating reports
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: urlUserId || user?.id?.toString() || "",
      month: currentMonth,
      year: currentYear,
    },
  });
  
  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (data: { userId: number; month: number; year: number }) => {
      const res = await apiRequest("POST", "/api/reports/generate", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({
        title: "Úspěch",
        description: "Výkaz byl úspěšně vygenerován.",
      });
      setIsGenerateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: `Generování výkazu selhalo: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: FormValues) => {
    generateReportMutation.mutate({
      userId: parseInt(values.userId),
      month: parseInt(values.month),
      year: parseInt(values.year),
    });
  };
  
  const getMonthName = (month: number) => {
    const monthNames = [
      "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
      "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"
    ];
    return monthNames[month - 1];
  };
  
  const showReportDetails = (report: Report) => {
    setSelectedReport(report);
    
    // Filter shifts for the selected report month and year
    if (allShifts) {
      const filteredShifts = allShifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        return (
          shiftDate.getMonth() + 1 === report.month &&
          shiftDate.getFullYear() === report.year
        );
      });
      
      setSelectedReportShifts(filteredShifts);
    }
    
    setIsReportDetailsOpen(true);
  };
  
  const formatHourlyRate = (hours: number) => {
    const hourlyRate = 150; // Hourly rate in CZK
    return formatCurrency(hours * hourlyRate);
  };
  
  const printReport = () => {
    if (!selectedReport) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Chyba",
        description: "Nelze otevřít okno pro tisk. Povolte vyskakovací okna.",
        variant: "destructive",
      });
      return;
    }
    
    // Generate print content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Výkaz práce - ${getMonthName(selectedReport.month)} ${selectedReport.year}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #1d4ed8; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .header { display: flex; justify-content: space-between; align-items: center; }
          .summary { margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Výkaz práce</h1>
          <div>
            <p><strong>Období:</strong> ${getMonthName(selectedReport.month)} ${selectedReport.year}</p>
            <p><strong>Pracovník:</strong> ${user?.firstName} ${user?.lastName}</p>
            <p><strong>Celkem hodin:</strong> ${selectedReport.totalHours}</p>
            <p><strong>Celkem k výplatě:</strong> ${formatHourlyRate(selectedReport.totalHours)}</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Čas</th>
              <th>Hodiny</th>
              <th>Objekt</th>
            </tr>
          </thead>
          <tbody>
            ${selectedReportShifts.map(shift => `
              <tr>
                <td>${formatDateTime(shift.date).date}</td>
                <td>${formatDateTime(shift.startTime).time} - ${formatDateTime(shift.endTime).time}</td>
                <td>${calculateDuration(shift.startTime, shift.endTime)}</td>
                <td>${shift.workplace?.name || "Neznámý objekt"}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <p><strong>Celkem odpracovaných hodin:</strong> ${selectedReport.totalHours}</p>
          <p><strong>Hodinová sazba:</strong> 150 Kč/h</p>
          <p><strong>Celkem k výplatě:</strong> ${formatHourlyRate(selectedReport.totalHours)}</p>
        </div>
        
        <div style="margin-top: 50px; display: flex; justify-content: space-between;">
          <div>
            <p>Datum: ____________________</p>
          </div>
          <div>
            <p>Podpis zaměstnance: ____________________</p>
          </div>
          <div>
            <p>Podpis zaměstnavatele: ____________________</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Trigger print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-100">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 pb-16 md:pb-0">
        <Header title="Výkazy práce" />
        
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Výkazy práce</h2>
              <p className="mt-1 text-sm text-slate-500">
                {urlUserId && isAdmin 
                  ? "Výkazy práce vybraného pracovníka" 
                  : "Přehled vašich výkazů práce a odpracovaných hodin"}
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button onClick={() => setIsGenerateDialogOpen(true)} className="inline-flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Vygenerovat výkaz
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Seznam výkazů</CardTitle>
              <CardDescription>Přehled všech vygenerovaných výkazů</CardDescription>
            </CardHeader>
            <CardContent>
              {isReportsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : reports && reports.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Období</TableHead>
                      <TableHead>Celkem hodin</TableHead>
                      <TableHead>K výplatě</TableHead>
                      <TableHead>Vygenerováno</TableHead>
                      <TableHead className="text-right">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-slate-500" />
                            <span className="font-medium">
                              {getMonthName(report.month)} {report.year}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-slate-500" />
                            <span>{report.totalHours} hodin</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-700 font-normal text-xs">
                            {formatHourlyRate(report.totalHours)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-500">
                            {formatDateTime(report.generated).date}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-primary"
                              onClick={() => showReportDetails(report)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Detail</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-slate-700"
                              onClick={() => {
                                setSelectedReport(report);
                                printReport();
                              }}
                            >
                              <Printer className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Tisk</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <BarChart3 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <h3 className="text-lg font-medium">Žádné výkazy</h3>
                  <p className="mt-1">Zatím nebyly vygenerovány žádné výkazy práce</p>
                  <Button onClick={() => setIsGenerateDialogOpen(true)} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Vygenerovat první výkaz
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Generate Report Dialog */}
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Vygenerovat výkaz práce</DialogTitle>
              <DialogDescription>
                Vyberte období, pro které chcete vygenerovat výkaz práce.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {isAdmin && (
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pracovník</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vyberte pracovníka" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Měsíc</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vyberte měsíc" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {getMonthName(i + 1)}
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
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rok</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vyberte rok" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {/* Show last 3 years and current year */}
                            {Array.from({ length: 4 }, (_, i) => {
                              const year = currentDate.getFullYear() - 3 + i + 1;
                              return (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    type="button" 
                    onClick={() => setIsGenerateDialogOpen(false)}
                  >
                    Zrušit
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={generateReportMutation.isPending}
                  >
                    {generateReportMutation.isPending ? "Generuji..." : "Vygenerovat výkaz"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Report Details Dialog */}
        <Dialog open={isReportDetailsOpen} onOpenChange={setIsReportDetailsOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>
                Detail výkazu - {selectedReport && getMonthName(selectedReport.month)} {selectedReport?.year}
              </DialogTitle>
              <DialogDescription>
                Přehled odpracovaných směn a hodin za vybrané období
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between gap-4 bg-slate-50 p-4 rounded-md">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-500">Pracovník</p>
                    <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-500">Období</p>
                    <p className="font-medium">
                      {selectedReport && getMonthName(selectedReport.month)} {selectedReport?.year}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-500">Celkem hodin</p>
                    <p className="font-medium">{selectedReport?.totalHours} hodin</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-500">K výplatě</p>
                    <p className="font-medium text-green-600">
                      {selectedReport && formatHourlyRate(selectedReport.totalHours)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Čas</TableHead>
                      <TableHead>Hodiny</TableHead>
                      <TableHead>Objekt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReportShifts.length > 0 ? (
                      selectedReportShifts.map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell>
                            {formatDateTime(shift.date).date}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(shift.startTime).time} - {formatDateTime(shift.endTime).time}
                          </TableCell>
                          <TableCell>
                            {calculateDuration(shift.startTime, shift.endTime)}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {shift.workplace?.name || "Neznámý objekt"}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-slate-500">
                          Žádné odpracované směny za dané období
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex justify-between pt-4 border-t">
                <div>
                  <p className="text-sm text-slate-500">Hodinová sazba: 150 Kč/h</p>
                  <p className="font-medium">
                    Celkem: <span className="text-green-600">{selectedReport && formatHourlyRate(selectedReport.totalHours)}</span>
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => {
                      setIsReportDetailsOpen(false);
                    }}
                  >
                    Zavřít
                  </Button>
                  <Button 
                    variant="default" 
                    className="gap-2"
                    onClick={printReport}
                  >
                    <Printer className="h-4 w-4" />
                    Tisk
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <MobileNavigation />
      </main>
    </div>
  );
}
