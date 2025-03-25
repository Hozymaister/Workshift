import { useQuery } from "@tanstack/react-query";
import { ExchangeRequest } from "@shared/schema";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  requestShift?: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    workplace?: {
      id: number;
      name: string;
    };
  };
  offeredShift?: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    workplace?: {
      id: number;
      name: string;
    };
  };
}

export function ExchangeRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data: exchanges, isLoading } = useQuery<EnhancedExchangeRequest[]>({
    queryKey: ["/api/exchange-requests", { pending: true }],
  });

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
        description: "Stav výměny byl úspěšně aktualizován.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: `Aktualizace výměny selhala: ${error.message}`,
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d.M.yyyy");
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm");
  };

  // Filter requests where the current user is the requestee
  const pendingRequests = exchanges?.filter(
    req => req.status === "pending" && req.requesteeId === user?.id
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-lg font-medium">Žádosti o výměnu směn</CardTitle>
          <Skeleton className="h-4 w-20" />
        </CardHeader>
        <CardContent className="pb-2">
          {[1, 2, 3].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-lg font-medium">Žádosti o výměnu směn</CardTitle>
        <Link href="/exchanges">
          <a className="text-sm font-medium text-primary hover:text-primary-dark">
            Zobrazit vše
          </a>
        </Link>
      </CardHeader>
      <CardContent className="pb-2">
        <ul className="divide-y divide-slate-200">
          {pendingRequests?.length ? (
            pendingRequests.map((request) => (
              <li key={request.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center">
                      <Avatar className="w-8 h-8 bg-slate-200 mr-3">
                        <AvatarFallback className="text-slate-600 text-xs">
                          {request.requester && getInitials(request.requester.firstName, request.requester.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium text-slate-900">
                        {request.requester ? `${request.requester.firstName} ${request.requester.lastName}` : "Neznámý uživatel"}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-xs text-slate-500">
                      <p className="font-medium mr-1">{request.requestShift?.workplace?.name || "Neznámý objekt"}</p>
                      <p>• {request.requestShift?.date ? formatDate(request.requestShift.date) : "N/A"} • {request.requestShift?.startTime ? formatTime(request.requestShift.startTime) : "N/A"} - {request.requestShift?.endTime ? formatTime(request.requestShift.endTime) : "N/A"}</p>
                    </div>
                    <div className="mt-1 flex items-center text-xs">
                      <span className="material-icons text-xs text-slate-400 mr-1">swap_horiz</span>
                      <p className="font-medium text-slate-500 mr-1">{request.offeredShift?.workplace?.name || "Neznámý objekt"}</p>
                      <p className="text-slate-500">• {request.offeredShift?.date ? formatDate(request.offeredShift.date) : "N/A"} • {request.offeredShift?.startTime ? formatTime(request.offeredShift.startTime) : "N/A"} - {request.offeredShift?.endTime ? formatTime(request.offeredShift.endTime) : "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-green-500 hover:text-green-600" 
                      title="Přijmout výměnu"
                      onClick={() => handleApprove(request.id)}
                      disabled={updateExchangeMutation.isPending}
                    >
                      <CheckCircle className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-600" 
                      title="Odmítnout výměnu"
                      onClick={() => handleReject(request.id)}
                      disabled={updateExchangeMutation.isPending}
                    >
                      <XCircle className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="p-4 text-center text-slate-500">
              Nemáte žádné žádosti o výměnu směn
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
