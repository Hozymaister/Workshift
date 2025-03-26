import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileNavigation } from "./mobile-navigation";

interface LayoutProps {
  children: ReactNode;
  title: string;
}

export function Layout({ children, title }: LayoutProps) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-100">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 pb-16 md:pb-0 overflow-hidden">
        <Header title={title} />
        
        <div className="py-6 px-4 sm:px-6 lg:px-8 overflow-auto h-[calc(100vh-64px-66px)] md:h-[calc(100vh-64px)]">
          {children}
        </div>
        
        <MobileNavigation />
      </main>
    </div>
  );
}