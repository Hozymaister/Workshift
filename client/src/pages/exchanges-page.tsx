import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ExchangeRequest, Shift } from "@shared/schema";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getInitials, cn } from "@/lib/utils";

interface EnhancedExchangeRequest extends ExchangeRequest {
  requester?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  requestee?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  requestShift?: Shift & {
    workplace?: {
      id: number;
      name: string;
      type: string;
    };
  };
  offeredShift?: Shift & {
    workplace?: {
      id: number;
      name: string;
      type: string;
    };
  };
}

interface ShiftWithDetails extends Shift {
  workplace?: {
    id: number;
    name: string;
    type: string;
  };
}

export default function ExchangesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [targetShiftId, setTargetShiftId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("incoming");

  // Fetch exchange requests
  const { data: exchangeRequests, isLoading: isExchangeLoading } = useQuery<EnhancedExchangeRequest[]>({
    queryKey: ["/api/exchange-requests", { userId: user?.id }],
  });

  // Fetch user's shifts for creating exchange requests
  const { data: userShifts, isLoading: isShiftsLoading } = useQuery<ShiftWithDetails[]>({
    queryKey: ["/api/shifts", { userId: user?.id }],
  });

  // Fetch all shifts that could be exchanged
  const { data: allShifts, isLoading: isAllShiftsLoading } = useQuery<ShiftWithDetails[]>({
    queryKey: ["/api/shifts"],
  });

  // Create exchange request mutation
  const createExchangeMutation = useMutation({
    mutationFn: async (requestData: any) => {
      const res = await apiRequest("POST", "/api/exchange-requests", requestData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-requests"] });
      toast({
        title: "Úspěch",
        description: "Žádost o výměnu směny byla úspěšně vytvořena.",
      });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: `Vytvoření žádosti selhalo: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update exchange request mutation
  const updateExchangeMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest("PUT", `/api/exchange-requests/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Úspěch",
        description: "Stav žádosti o výměnu byl úspěšně aktualizován.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: `Aktualizace žádosti selhala: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete exchange request mutation
  const deleteExchangeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/exchange-requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-requests"] });
      toast({
        title: "Úspěch",
        description: "Žádost o výměnu byla úspěšně zrušena.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: `Zrušení žádosti selhalo: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleApprove = (id: number) => {
    updateExchangeMutation.mutate({ id, status: "approved" });
  };

  const handleReject = (id: number) => {
    updateExchangeMutation.mutate({ id, status: "rejected" });
  };

  const handleDelete = (id: number) => {
    deleteExchangeMutation.mutate(id);
  };

  const handleCreateExchange = () => {
    if (!selectedShiftId || !targetShiftId) {
      toast({
        title: "Chyba",
        description: "Vyberte obě směny pro výměnu.",
        variant: "destructive",
      });
      return;
    }

    const targetShift = allShifts?.find(shift => shift.id === targetShiftId);
    if (!targetShift || !targetShift.userId) {
      toast({
        title: "Chyba",
        description: "Vybraná směna nemá přiřazeného pracovníka.",
        variant: "destructive",
      });
      return;
    }

    createExchangeMutation.mutate({
      requesterId: user?.id,
      requesteeId: targetShift.userId,
      requestShiftId: selectedShiftId,
      offeredShiftId: targetShiftId,
      notes: notes,
      status: "pending"
    });
  };

  const resetForm = () => {
    setIsCreateDialogOpen(false);
    setSelectedShiftId(null);
    setTargetShiftId(null);
    setNotes("");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d. MMMM yyyy", { locale: cs });
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm");
  };

  const formatDayName = (dateString: string) => {
    return format(new Date(dateString), "EEEE", { locale: cs });
  };

  // Filter exchange requests by user role
  const incomingRequests = exchangeRequests?.filter(request => 
    request.requesteeId === user?.id && request.status === "pending"
  ) || [];

  const outgoingRequests = exchangeRequests?.filter(request => 
    request.requesterId === user?.id
  ) || [];

  const historyRequests = exchangeRequests?.filter(request => 
    (request.requesteeId === user?.id || request.requesterId === user?.id) && 
    (request.status === "approved" || request.status === "rejected")
  ) || [];

  // Filter shifts for the target shift selection
  const availableTargetShifts = allShifts?.filter(shift => 
    shift.userId !== user?.id && shift.userId !== null
  ) || [];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-100">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 pb-16 md:pb-0">
        <Header title="Výměny směn" />
        
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Výměny směn</h2>
              <p className="mt-1 text-sm text-slate-500">Správa žádostí o výměnu směn</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button onClick={() => setIsCreateDialogOpen(true)} className="inline-flex items-center">
                <RefreshCw className="mr-2 h-4 w-4" />
                Nová žádost o výměnu
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Žádosti o výměnu směn</CardTitle>
              <CardDescription>Spravujte příchozí i odchozí žádosti o výměnu směn</CardDescription>
            </CardHeader>
            <CardContent>
              {isExchangeLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="incoming" className="relative">
                      Příchozí žádosti
                      {incomingRequests.length > 0 && (
                        <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                          {incomingRequests.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="outgoing">Odchozí žádosti</TabsTrigger>
                    <TabsTrigger value="history">Historie</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="incoming">
                    {incomingRequests.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Žadatel</TableHead>
                            <TableHead>Žádaná směna</TableHead>
                            <TableHead>Nabízená směna</TableHead>
                            <TableHead>Poznámka</TableHead>
                            <TableHead className="text-right">Akce</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {incomingRequests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Avatar className="h-8 w-8 bg-slate-200">
                                    <AvatarFallback className="text-slate-600 text-xs">
                                      {request.requester && getInitials(request.requester.firstName, request.requester.lastName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-sm">
                                    {request.requester ? `${request.requester.firstName} ${request.requester.lastName}` : "Neznámý uživatel"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{request.requestShift?.workplace?.name || "Neznámý objekt"}</div>
                                  <div className="text-slate-500">
                                    {request.requestShift?.date && formatDayName(request.requestShift.date)}, {request.requestShift?.date && formatDate(request.requestShift.date)}
                                    <br />
                                    {request.requestShift?.startTime && formatTime(request.requestShift.startTime)} - {request.requestShift?.endTime && formatTime(request.requestShift.endTime)}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{request.offeredShift?.workplace?.name || "Neznámý objekt"}</div>
                                  <div className="text-slate-500">
                                    {request.offeredShift?.date && formatDayName(request.offeredShift.date)}, {request.offeredShift?.date && formatDate(request.offeredShift.date)}
                                    <br />
                                    {request.offeredShift?.startTime && formatTime(request.offeredShift.startTime)} - {request.offeredShift?.endTime && formatTime(request.offeredShift.endTime)}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-slate-500 max-w-[200px] truncate">
                                  {request.notes || "Bez poznámky"}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                    onClick={() => handleApprove(request.id)}
                                    disabled={updateExchangeMutation.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Schválit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                    onClick={() => handleReject(request.id)}
                                    disabled={updateExchangeMutation.isPending}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Odmítnout
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-10 text-slate-500">
                        <div className="flex justify-center mb-4">
                          <AlertCircle className="h-12 w-12 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium mb-1">Žádné příchozí žádosti</h3>
                        <p className="text-sm">Momentálně nemáte žádné příchozí žádosti o výměnu směn</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="outgoing">
                    {outgoingRequests.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pro koho</TableHead>
                            <TableHead>Žádaná směna</TableHead>
                            <TableHead>Nabízená směna</TableHead>
                            <TableHead>Stav</TableHead>
                            <TableHead className="text-right">Akce</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {outgoingRequests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Avatar className="h-8 w-8 bg-slate-200">
                                    <AvatarFallback className="text-slate-600 text-xs">
                                      {request.requestee && getInitials(request.requestee.firstName, request.requestee.lastName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-sm">
                                    {request.requestee ? `${request.requestee.firstName} ${request.requestee.lastName}` : "Neznámý uživatel"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{request.offeredShift?.workplace?.name || "Neznámý objekt"}</div>
                                  <div className="text-slate-500">
                                    {request.offeredShift?.date && formatDayName(request.offeredShift.date)}, {request.offeredShift?.date && formatDate(request.offeredShift.date)}
                                    <br />
                                    {request.offeredShift?.startTime && formatTime(request.offeredShift.startTime)} - {request.offeredShift?.endTime && formatTime(request.offeredShift.endTime)}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{request.requestShift?.workplace?.name || "Neznámý objekt"}</div>
                                  <div className="text-slate-500">
                                    {request.requestShift?.date && formatDayName(request.requestShift.date)}, {request.requestShift?.date && formatDate(request.requestShift.date)}
                                    <br />
                                    {request.requestShift?.startTime && formatTime(request.requestShift.startTime)} - {request.requestShift?.endTime && formatTime(request.requestShift.endTime)}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={cn(
                                  "font-normal",
                                  request.status === "pending" ? "bg-amber-100 text-amber-700" : 
                                  request.status === "approved" ? "bg-green-100 text-green-700" : 
                                  "bg-red-100 text-red-700"
                                )}>
                                  {request.status === "pending" ? "Čeká na schválení" : 
                                   request.status === "approved" ? "Schváleno" : "Odmítnuto"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {request.status === "pending" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDelete(request.id)}
                                    disabled={deleteExchangeMutation.isPending}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Zrušit
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-10 text-slate-500">
                        <div className="flex justify-center mb-4">
                          <AlertCircle className="h-12 w-12 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium mb-1">Žádné odchozí žádosti</h3>
                        <p className="text-sm">Momentálně nemáte žádné odchozí žádosti o výměnu směn</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="history">
                    {historyRequests.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Protistrana</TableHead>
                            <TableHead>Směna 1</TableHead>
                            <TableHead>Směna 2</TableHead>
                            <TableHead>Výsledek</TableHead>
                            <TableHead>Datum</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {historyRequests.map((request) => {
                            const isRequester = request.requesterId === user?.id;
                            const counterparty = isRequester ? request.requestee : request.requester;
                            
                            return (
                              <TableRow key={request.id}>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Avatar className="h-8 w-8 bg-slate-200">
                                      <AvatarFallback className="text-slate-600 text-xs">
                                        {counterparty && getInitials(counterparty.firstName, counterparty.lastName)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium text-sm">
                                      {counterparty ? `${counterparty.firstName} ${counterparty.lastName}` : "Neznámý uživatel"}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <div className="font-medium">{request.requestShift?.workplace?.name || "Neznámý objekt"}</div>
                                    <div className="text-slate-500">
                                      {request.requestShift?.date && formatDate(request.requestShift.date)}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <div className="font-medium">{request.offeredShift?.workplace?.name || "Neznámý objekt"}</div>
                                    <div className="text-slate-500">
                                      {request.offeredShift?.date && formatDate(request.offeredShift.date)}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={cn(
                                    "font-normal",
                                    request.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                  )}>
                                    {request.status === "approved" ? "Schváleno" : "Odmítnuto"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-slate-500 text-sm">
                                  {/* This is the timestamp, but we don't have it in the schema so displaying "N/A" */}
                                  N/A
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-10 text-slate-500">
                        <div className="flex justify-center mb-4">
                          <AlertCircle className="h-12 w-12 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium mb-1">Žádná historie</h3>
                        <p className="text-sm">Nemáte žádnou historii výměn směn</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Create Exchange Request Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Vytvořit žádost o výměnu směny</DialogTitle>
              <DialogDescription>
                Vyberte směnu, kterou chcete vyměnit, a směnu, za kterou ji chcete vyměnit.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Vaše směna k výměně</h4>
                <Select value={selectedShiftId?.toString()} onValueChange={(value) => setSelectedShiftId(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte vaši směnu" />
                  </SelectTrigger>
                  <SelectContent>
                    {isShiftsLoading ? (
                      <div className="flex justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : userShifts && userShifts.length > 0 ? (
                      userShifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id.toString()}>
                          {shift.workplace?.name} - {shift.date && formatDate(shift.date)} ({shift.startTime && formatTime(shift.startTime)}-{shift.endTime && formatTime(shift.endTime)})
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-slate-500 text-sm">Nemáte žádné směny k výměně</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Směna, za kterou chcete vyměnit</h4>
                <Select value={targetShiftId?.toString()} onValueChange={(value) => setTargetShiftId(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte cílovou směnu" />
                  </SelectTrigger>
                  <SelectContent>
                    {isAllShiftsLoading ? (
                      <div className="flex justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : availableTargetShifts && availableTargetShifts.length > 0 ? (
                      availableTargetShifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id.toString()}>
                          {shift.workplace?.name} - {shift.date && formatDate(shift.date)} ({shift.startTime && formatTime(shift.startTime)}-{shift.endTime && formatTime(shift.endTime)})
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-slate-500 text-sm">Žádné dostupné směny k výměně</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Poznámka (nepovinné)</h4>
                <Textarea 
                  placeholder="Napište poznámku k výměně..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Zrušit</Button>
              <Button 
                onClick={handleCreateExchange} 
                disabled={!selectedShiftId || !targetShiftId || createExchangeMutation.isPending}
              >
                {createExchangeMutation.isPending ? "Odesílám..." : "Odeslat žádost"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <MobileNavigation />
      </main>
    </div>
  );
}
