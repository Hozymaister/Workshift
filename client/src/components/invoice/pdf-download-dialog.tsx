import { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { FileText, Download, ExternalLink, Info } from "lucide-react";

interface PdfDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string | null;
  fileName: string;
}

export function PdfDownloadDialog({ 
  open, 
  onOpenChange, 
  pdfUrl, 
  fileName 
}: PdfDownloadDialogProps) {
  
  const handleDownload = () => {
    if (pdfUrl) {
      // Vytvoření neviditelného odkazu pro automatické stažení
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      // Otevření PDF v novém okně/záložce
      window.open(pdfUrl, '_blank');
    }
  };
  
  const handleClose = () => {
    onOpenChange(false);
    // Uvolnění URL objektu, když už dialog není potřeba
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Faktura PDF připravena ke stažení</DialogTitle>
          <DialogDescription>
            Vaše faktura byla vytvořena a je připravena ke stažení.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 my-6">
          {pdfUrl && (
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-red-100 p-3 rounded-full mr-3">
                    <FileText className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium">{fileName}</p>
                    <p className="text-sm text-slate-500">PDF dokument</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                <Button 
                  variant="default" 
                  className="flex-1"
                  onClick={handleDownload}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Stáhnout
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleOpenInNewTab}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Otevřít
                </Button>
              </div>
            </div>
          )}
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Informace</AlertTitle>
            <AlertDescription>
              Soubor se stáhne do složky stažených souborů vašeho zařízení.
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
          >
            Zavřít
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}