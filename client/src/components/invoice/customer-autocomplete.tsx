import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiRequest } from "@/lib/queryClient";
import { Customer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface CustomerAutocompleteProps {
  onSelect: (customer: Customer | CompanyInfo) => void;
  placeholder?: string;
}

interface CompanyInfo {
  name: string;
  ico: string;
  dic: string;
  address: string;
  city: string;
  zip: string;
}

export function CustomerAutocomplete({
  onSelect,
  placeholder = "Vyberte zákazníka...",
}: CustomerAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [icoSearch, setIcoSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const { toast } = useToast();

  const searchCustomers = async (searchQuery: string) => {
    if (!searchQuery) {
      setCustomers([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiRequest("GET", `/api/customers/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error("Chyba při vyhledávání zákazníků:", error);
      toast({
        title: "Chyba při vyhledávání",
        description: "Nepodařilo se načíst seznam zákazníků.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchCompanyByIco = async (ico: string) => {
    if (!ico || !/^\d{8}$/.test(ico)) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiRequest("GET", `/api/ares/company?ico=${ico}`);
      const data = await response.json();
      
      if (response.ok) {
        setCompanyInfo(data);
      } else {
        toast({
          title: "Firma nenalezena",
          description: data.error || "Nepodařilo se najít firmu s tímto IČO.",
          variant: "destructive",
        });
        setCompanyInfo(null);
      }
    } catch (error) {
      console.error("Chyba při vyhledávání firmy:", error);
      toast({
        title: "Chyba při vyhledávání",
        description: "Nepodařilo se získat údaje o firmě z ARES.",
        variant: "destructive",
      });
      setCompanyInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (query.trim() && !/^\d{8}$/.test(query)) {
        searchCustomers(query);
      }
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [query]);

  useEffect(() => {
    if (icoSearch.trim() && /^\d{8}$/.test(icoSearch)) {
      searchCompanyByIco(icoSearch);
    } else {
      setCompanyInfo(null);
    }
  }, [icoSearch]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Vyhledejte zákazníka nebo zadejte IČO..."
            value={query}
            onValueChange={(value) => {
              setQuery(value);
              if (/^\d+$/.test(value)) {
                setIcoSearch(value);
              } else {
                setIcoSearch("");
              }
            }}
          />
          {isLoading && (
            <div className="py-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Načítání...</p>
            </div>
          )}
          {!isLoading && (
            <>
              <CommandEmpty>
                {query ? "Žádný zákazník nenalezen." : "Začněte psát pro vyhledání zákazníka."}
              </CommandEmpty>
              
              {companyInfo && (
                <CommandGroup heading="Informace z ARES:">
                  <CommandItem
                    onSelect={() => {
                      onSelect(companyInfo);
                      setOpen(false);
                    }}
                    className="flex flex-col items-start"
                  >
                    <div className="font-medium">{companyInfo.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {companyInfo.address}, {companyInfo.city} {companyInfo.zip}
                    </div>
                    <div className="text-xs mt-1">
                      <span className="mr-2">IČO: {companyInfo.ico}</span>
                      {companyInfo.dic && <span>DIČ: {companyInfo.dic}</span>}
                    </div>
                  </CommandItem>
                </CommandGroup>
              )}
              
              {customers.length > 0 && (
                <CommandGroup heading="Vaši zákazníci:">
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      onSelect={() => {
                        onSelect(customer);
                        setOpen(false);
                      }}
                      className="flex flex-col items-start"
                    >
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {customer.address}, {customer.city} {customer.zip}
                      </div>
                      {customer.ic && (
                        <div className="text-xs mt-1">
                          <span className="mr-2">IČO: {customer.ic}</span>
                          {customer.dic && <span>DIČ: {customer.dic}</span>}
                        </div>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {query.length === 0 && customers.length === 0 && !companyInfo && (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Zadejte název zákazníka pro vyhledání, nebo IČO pro ověření v ARES.
                  </p>
                </div>
              )}
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}