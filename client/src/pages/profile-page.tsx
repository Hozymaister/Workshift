import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CalendarDays, Mail, Building, User, Clock } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Shift } from "@shared/schema";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

export default function ProfilePage() {
  const { user } = useAuth();
  
  // Získání směn uživatele
  const { data: userShifts = [] } = useQuery<Shift[]>({
    queryKey: ['/api/shifts', 'user'],
    enabled: !!user,
  });
  
  // Seřazení směn podle data (nejnovější první)
  const sortedShifts = [...userShifts].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Posledních 5 směn
  const recentShifts = sortedShifts.slice(0, 5);
  
  // Odpracované hodiny za poslední měsíc
  const currentDate = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  const shiftsLastMonth = userShifts.filter(shift => {
    const shiftDate = new Date(shift.date);
    return shiftDate >= oneMonthAgo && shiftDate <= currentDate;
  });
  
  // Výpočet odpracovaných hodin
  const totalHoursWorked = shiftsLastMonth.reduce((total, shift) => {
    const startTime = new Date(shift.startTime);
    const endTime = new Date(shift.endTime);
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    return total + hours;
  }, 0);

  if (!user) {
    return <div>Načítání profilu...</div>;
  }

  return (
    <Layout title="Profil">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Profil uživatele</h1>
          <p className="text-slate-500">Přehled vašeho profilu a pracovních statistik</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="pb-4 flex flex-col items-center">
                <Avatar className="h-24 w-24 bg-primary text-white mb-3">
                  <AvatarFallback className="text-xl">
                    {getInitials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-center text-xl">{user.firstName} {user.lastName}</CardTitle>
                <p className="text-center text-sm text-slate-500">{user.role === "admin" ? "Správce" : "Pracovník"}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-3 text-slate-400" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-3 text-slate-400" />
                    <span className="text-sm">Uživatelské jméno: {user.username}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-3 text-slate-400" />
                    <span className="text-sm">Odpracováno tento měsíc: {totalHoursWorked.toFixed(1)} hodin</span>
                  </div>
                  
                  <Button variant="outline" className="mt-4 w-full">
                    Upravit profil
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CalendarDays className="h-5 w-5 mr-2 text-primary" />
                  Poslední směny
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentShifts.length === 0 ? (
                  <p className="text-center py-6 text-slate-500">Nemáte žádné nedávné směny.</p>
                ) : (
                  <div className="space-y-4">
                    {recentShifts.map((shift) => (
                      <div key={shift.id} className="border-b pb-3 last:border-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{format(new Date(shift.date), "EEEE d. MMMM yyyy", { locale: cs })}</p>
                            <p className="text-sm text-slate-500">
                              {format(new Date(shift.startTime), "HH:mm")} - {format(new Date(shift.endTime), "HH:mm")}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                              {shift.workplaceId}
                            </span>
                          </div>
                        </div>
                        {shift.notes && (
                          <p className="text-sm text-slate-500 mt-2">{shift.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <Button variant="link" className="mt-4 p-0 text-primary">
                  Zobrazit všechny směny
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Building className="h-5 w-5 mr-2 text-primary" />
                  Pracovní statistiky
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-sm text-slate-500">Odpracováno celkem</p>
                    <p className="text-2xl font-bold">{(totalHoursWorked * 3).toFixed(1)} h</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-sm text-slate-500">Tento měsíc</p>
                    <p className="text-2xl font-bold">{totalHoursWorked.toFixed(1)} h</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-sm text-slate-500">Naplánované směny</p>
                    <p className="text-2xl font-bold">{userShifts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}