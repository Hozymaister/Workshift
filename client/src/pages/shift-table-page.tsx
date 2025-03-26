import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { cs } from 'date-fns/locale';
import { Calendar, Download, Printer, Loader2 } from "lucide-react";
import { Shift, User, Workplace } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout } from "@/components/layout/layout";

interface ShiftWithDetails extends Shift {
  user?: User;
  workplace?: Workplace;
}

export default function ShiftTablePage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterWorkplace, setFilterWorkplace] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));

  // Získání dat směn
  const { data: shifts = [], isLoading: isLoadingShifts } = useQuery<ShiftWithDetails[]>({
    queryKey: ['/api/shifts'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Získání dat pracovníků
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/workers'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Získání dat pracovišť
  const { data: workplaces = [] } = useQuery<Workplace[]>({
    queryKey: ['/api/workplaces'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Spojení dat pro kompletní informace o směnách
  const [enhancedShifts, setEnhancedShifts] = useState<ShiftWithDetails[]>([]);

  useEffect(() => {
    // Odstranili jsme podmínku, která mohla způsobovat, že se data nezobrazovala
    const enhanced = shifts.map(shift => {
      const user = users.find(u => u.id === shift.userId);
      const workplace = workplaces.find(w => w.id === shift.workplaceId);
      
      return {
        ...shift,
        user,
        workplace
      };
    });
    
    setEnhancedShifts(enhanced);
    
    // Log pro diagnostiku
    console.log("Data pro tabulku:", { shifts, users, workplaces, enhanced });
  }, [shifts, users, workplaces]);

  // Filtrování směn na základě vyhledávacího dotazu a filtru pracoviště
  const filteredShifts = enhancedShifts.filter(shift => {
    const matchesSearch = searchTerm === "" || 
      (shift.user && 
        (shift.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
         shift.user.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
       shift.workplace?.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesWorkplace = filterWorkplace === "all" || 
      shift.workplaceId.toString() === filterWorkplace;
    
    const shiftDate = new Date(shift.date);
    const filterStartDate = new Date(startDate);
    const filterEndDate = new Date(endDate);
    const matchesDate = shiftDate >= filterStartDate && shiftDate <= filterEndDate;
    
    return matchesSearch && matchesWorkplace && matchesDate;
  });

  // Seřazení směn podle data a času
  const sortedShifts = [...filteredShifts].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    
    const startTimeA = new Date(a.startTime);
    const startTimeB = new Date(b.startTime);
    return startTimeA.getTime() - startTimeB.getTime();
  });

  // Export do CSV
  const exportToCSV = () => {
    if (sortedShifts.length === 0) {
      toast({
        title: "Nelze exportovat prázdnou tabulku",
        description: "Nejsou k dispozici žádné směny k exportu.",
        variant: "destructive",
      });
      return;
    }
    
    const headers = ["Datum", "Čas od", "Čas do", "Pracoviště", "Pracovník", "Poznámky"];
    const csvRows = [headers.join(",")];
    
    sortedShifts.forEach(shift => {
      const row = [
        format(new Date(shift.date), "dd.MM.yyyy"),
        format(new Date(shift.startTime), "HH:mm"),
        format(new Date(shift.endTime), "HH:mm"),
        shift.workplace ? shift.workplace.name : "Neznámé pracoviště",
        shift.user ? `${shift.user.firstName} ${shift.user.lastName}` : "Neobsazeno",
        shift.notes || ""
      ];
      
      // Escapování hodnot pro CSV
      const escapedRow = row.map(value => {
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      
      csvRows.push(escapedRow.join(","));
    });
    
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `plán_směn_${format(new Date(), "dd-MM-yyyy")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tisk tabulky
  const printTable = () => {
    window.print();
  };

  return (
    <Layout title="Plán směn">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Plán směn</h1>
            <p className="text-muted-foreground">Tabulkový přehled všech naplánovaných směn</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={exportToCSV}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={printTable}
              className="flex items-center gap-2 print:hidden"
            >
              <Printer className="h-4 w-4" />
              Tisk
            </Button>
          </div>
        </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtry</CardTitle>
          <CardDescription>Upravte zobrazení plánu směn</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Vyhledávání</Label>
              <Input 
                id="search"
                placeholder="Hledat podle jména nebo pracoviště..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workplace">Pracoviště</Label>
              <Select
                value={filterWorkplace}
                onValueChange={setFilterWorkplace}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte pracoviště" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechna pracoviště</SelectItem>
                  {workplaces?.map(workplace => (
                    <SelectItem key={workplace.id} value={workplace.id.toString()}>
                      {workplace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Datum od</Label>
              <div className="relative">
                <Input 
                  id="startDate"
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Calendar className="h-4 w-4 absolute right-3 top-3 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Datum do</Label>
              <div className="relative">
                <Input 
                  id="endDate"
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <Calendar className="h-4 w-4 absolute right-3 top-3 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tabulka směn</CardTitle>
          <CardDescription>
            Celkem nalezeno {sortedShifts.length} směn
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingShifts ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : sortedShifts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p>Nebyly nalezeny žádné směny odpovídající zadaným filtrům.</p>
              <p>Zkuste změnit filtry nebo přidat nové směny.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-sm">Datum</th>
                    <th className="px-4 py-3 text-left font-medium text-sm">Čas</th>
                    <th className="px-4 py-3 text-left font-medium text-sm">Pracoviště</th>
                    <th className="px-4 py-3 text-left font-medium text-sm">Typ</th>
                    <th className="px-4 py-3 text-left font-medium text-sm">Pracovník</th>
                    <th className="px-4 py-3 text-left font-medium text-sm">Poznámky</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedShifts.map((shift, index) => (
                    <tr 
                      key={shift.id} 
                      className={index % 2 === 0 ? "bg-white" : "bg-muted/20"}
                    >
                      <td className="px-4 py-3 border-t text-sm">
                        {format(new Date(shift.date), "EEEE d. MMMM yyyy", { locale: cs })}
                      </td>
                      <td className="px-4 py-3 border-t text-sm">
                        {format(new Date(shift.startTime), "HH:mm")} - {format(new Date(shift.endTime), "HH:mm")}
                      </td>
                      <td className="px-4 py-3 border-t text-sm">
                        {shift.workplace ? shift.workplace.name : "Neznámé pracoviště"}
                      </td>
                      <td className="px-4 py-3 border-t text-sm">
                        {shift.workplace ? (
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            shift.workplace.type === "warehouse" ? "bg-blue-100 text-blue-800" : 
                            shift.workplace.type === "event" ? "bg-purple-100 text-purple-800" : 
                            "bg-green-100 text-green-800"
                          }`}>
                            {shift.workplace.type === "warehouse" ? "Sklad" : 
                             shift.workplace.type === "event" ? "Akce" : "Klub"}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3 border-t text-sm">
                        {shift.user ? `${shift.user.firstName} ${shift.user.lastName}` : "Neobsazeno"}
                      </td>
                      <td className="px-4 py-3 border-t text-sm">
                        {shift.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Styly pro tisk - inline aby nedocházelo k LSP chybám */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .p-6, .p-6 * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          .p-6 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}} />
      </div>
    </Layout>
  );
}