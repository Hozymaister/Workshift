import { CustomersTable } from "@/components/customers/customers-table";
import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

export default function CustomersPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Pouze správci mají přístup k adresáři zákazníků
  if (user?.role !== "admin") {
    setLocation("/");
    return <div></div>; // Vracíme prázdný element místo null
  }

  return (
    <Layout title="Adresář zákazníků">
      <div className="container mx-auto">
        <CustomersTable />
      </div>
    </Layout>
  );
}