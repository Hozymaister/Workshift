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
    return null;
  }

  return (
    <Layout title="Adresář zákazníků">
      <div className="container mx-auto py-6 space-y-6">
        <CustomersTable />
      </div>
    </Layout>
  );
}