import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Customer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CustomerForm } from "./customer-form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Search, Plus, Pencil, Trash2 } from "lucide-react";

export function CustomersTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | undefined>(undefined);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | undefined>(undefined);

  // Načtení seznamu zákazníků
  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 1000 * 60, // 1 minuta
  });

  // Mutace pro smazání zákazníka
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/customers/${id}`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Zákazník smazán",
        description: "Zákazník byl úspěšně odstraněn z adresáře",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při mazání zákazníka",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filtrování zákazníků podle vyhledávacího dotazu
  const filteredCustomers = customers
    ? customers.filter((customer) => {
        const searchableText = [
          customer.name,
          customer.address,
          customer.city,
          customer.email,
          customer.phone,
          customer.ic,
          customer.dic,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchableText.includes(searchTerm.toLowerCase());
      })
    : [];

  // Otevření formuláře pro editaci zákazníka
  const openEditForm = (customer: Customer) => {
    setCustomerToEdit(customer);
    setIsFormOpen(true);
  };

  // Otevření formuláře pro přidání nového zákazníka
  const openAddForm = () => {
    setCustomerToEdit(undefined);
    setIsFormOpen(true);
  };

  // Zavření formuláře
  const closeForm = () => {
    setIsFormOpen(false);
  };

  // Potvrzení a provedení smazání zákazníka
  const confirmDelete = () => {
    if (customerToDelete) {
      deleteCustomerMutation.mutate(customerToDelete.id);
      setCustomerToDelete(undefined);
    }
  };

  // Zrušení smazání zákazníka
  const cancelDelete = () => {
    setCustomerToDelete(undefined);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Adresář zákazníků</CardTitle>
            <CardDescription>
              Spravujte seznam vašich zákazníků a jejich kontaktní údaje
            </CardDescription>
          </div>
          <Button onClick={openAddForm}>
            <Plus className="mr-2 h-4 w-4" />
            Přidat zákazníka
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Vyhledat zákazníka..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? "Žádní zákazníci neodpovídají vašemu vyhledávání"
                : "Zatím nemáte žádné zákazníky. Přidejte prvního kliknutím na tlačítko výše."}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto max-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Název</TableHead>
                    <TableHead className="min-w-[120px]">IČO / DIČ</TableHead>
                    <TableHead className="hidden sm:table-cell min-w-[200px]">Adresa</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[150px]">Kontakt</TableHead>
                    <TableHead className="text-right min-w-[100px]">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>
                        {customer.ic && (
                          <div className="mb-1">
                            <Badge variant="outline">IČO: {customer.ic}</Badge>
                          </div>
                        )}
                        {customer.dic && (
                          <div>
                            <Badge variant="outline">DIČ: {customer.dic}</Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div>{customer.address}</div>
                        {customer.city && customer.zip && (
                          <div className="text-muted-foreground text-sm">
                            {customer.city}, {customer.zip}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {customer.email && (
                          <div className="text-sm">{customer.email}</div>
                        )}
                        {customer.phone && (
                          <div className="text-sm text-muted-foreground">
                            {customer.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditForm(customer)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Upravit zákazníka</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setCustomerToDelete(customer)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Smazat zákazníka</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulář pro přidání/editaci zákazníka */}
      <CustomerForm
        isOpen={isFormOpen}
        onClose={closeForm}
        customerToEdit={customerToEdit}
      />

      {/* Dialog pro potvrzení smazání zákazníka */}
      <AlertDialog open={!!customerToDelete} onOpenChange={cancelDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu chcete smazat tohoto zákazníka?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Zákazník "{customerToDelete?.name}" bude trvale odstraněn
              z vašeho adresáře.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCustomerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mažu...
                </>
              ) : (
                <>Smazat</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}