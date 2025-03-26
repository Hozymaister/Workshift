import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout/layout";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScanLine, Upload, FolderOpen, Trash2, Download, Image as ImageIcon, FileText, Check, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Document } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type DocumentWithUrl = Document & {
  thumbnailUrl: string;
};

export default function ScanPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("camera");
  const [isScanning, setIsScanning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithUrl | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDocumentOpen, setIsDocumentOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);

  // Načtení seznamu dokumentů
  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents");
      if (!res.ok) {
        throw new Error("Nepodařilo se načíst dokumenty");
      }
      const docsData: Document[] = await res.json();
      
      // Přidáme URL pro náhled ke každému dokumentu
      return docsData.map(doc => ({
        ...doc,
        thumbnailUrl: doc.thumbnailPath 
          ? `/api/documents/file/${doc.id}` 
          : doc.type === 'image' 
            ? `/api/documents/file/${doc.id}` 
            : "https://via.placeholder.com/100x150",
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minut
  });

  // Přístup ke kameře
  useEffect(() => {
    if (activeTab === "camera" && videoRef.current) {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error("Nelze přistupovat ke kameře:", error);
          toast({
            title: "Chyba kamery",
            description: "Nelze přistupovat ke kameře zařízení. Zkontrolujte, zda má prohlížeč oprávnění.",
            variant: "destructive",
          });
        }
      };
      
      startCamera();
      
      // Cleanup
      return () => {
        const stream = videoRef.current?.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [activeTab, toast]);

  // Simulovaná funkce skenování dokumentu
  const handleScan = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsScanning(true);
    
    // Simulace detekce hran a skenování
    setTimeout(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video && canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Nakreslíme aktuální snímek z kamery na canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // V reálné aplikaci by zde bylo rozpoznávání okrajů dokumentu
          // a následná transformace perspektivy, filtrace atd.
          
          // Ukázková "transformace" - obkreslení okrajů
          ctx.strokeStyle = "#0284c7";
          ctx.lineWidth = 4;
          
          // Simulace detekce obdélníkového dokumentu (mírně zešikmeno)
          const margin = 50;
          ctx.beginPath();
          ctx.moveTo(margin, margin + 20);
          ctx.lineTo(canvas.width - margin - 20, margin);
          ctx.lineTo(canvas.width - margin, canvas.height - margin);
          ctx.lineTo(margin + 20, canvas.height - margin - 20);
          ctx.closePath();
          ctx.stroke();
          
          // Nastavíme náhled naskenovaného dokumentu
          const previewUrl = canvas.toDataURL('image/png');
          setScanPreviewUrl(previewUrl);
          setShowPreview(true);
        }
      }
      
      setIsScanning(false);
    }, 1500); // Simulujeme čas na zpracování
  };

  // Mutace pro nahrávání naskenovaného dokumentu
  const uploadScanMutation = useMutation({
    mutationFn: async (dataUrl: string) => {
      // Převedeme data URL na Blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Vytvoříme FormData a přidáme soubor
      const formData = new FormData();
      formData.append('file', blob, `scan_${format(new Date(), "yyyyMMdd_HHmmss")}.png`);
      formData.append('name', `Naskenovaný dokument ${format(new Date(), "d.M.yyyy HH:mm")}`);
      
      // Pošleme soubor na server
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Nahrávání se nezdařilo');
      }
      
      return res.json();
    },
    onSuccess: () => {
      // Obnovíme seznam dokumentů
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      
      // Zavřeme náhled a vyčistíme
      setShowPreview(false);
      setScanPreviewUrl(null);
      
      toast({
        title: "Dokument naskenován",
        description: "Dokument byl úspěšně naskenován a uložen.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při nahrávání",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  // Funkce pro potvrzení a uložení naskenovaného dokumentu
  const handleSaveScan = () => {
    if (!scanPreviewUrl) return;
    
    setIsUploading(true);
    uploadScanMutation.mutate(scanPreviewUrl);
  };

  // Mutace pro nahrání souboru
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Nahrávání se nezdařilo');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      
      toast({
        title: "Soubor nahrán",
        description: "Dokument byl úspěšně nahrán.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při nahrávání",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  // Funkce pro upload souboru
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    uploadFileMutation.mutate(file);
    
    // Vyčistíme input pro opakované nahrání stejného souboru
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Mutace pro smazání dokumentu
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const res = await apiRequest('DELETE', `/api/documents/${documentId}`);
      if (!res.ok) {
        throw new Error('Smazání dokumentu se nezdařilo');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      
      toast({
        title: "Dokument smazán",
        description: "Dokument byl úspěšně smazán.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při mazání",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setDocumentToDelete(null);
      setShowDeleteDialog(false);
    }
  });

  // Funkce pro smazání dokumentu
  const handleDeleteDocument = () => {
    if (!documentToDelete) return;
    deleteDocumentMutation.mutate(documentToDelete);
  };
  
  // Funkce pro otevření dokumentu v novém okně
  const openDocumentInNewTab = (documentId: number) => {
    window.open(`/api/documents/file/${documentId}`, '_blank');
  };

  // Pomocná funkce pro formátování velikosti souboru
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    const mb = kb / 1024;
    return mb.toFixed(1) + ' MB';
  };

  // Funkce pro formátování data
  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return "";
    return format(date, "d. MMMM yyyy, HH:mm", { locale: cs });
  };

  // Pokud není uživatel admin, přesměrujeme
  if (user && user.role !== "admin") {
    return <Redirect to="/" />;
  }

  return (
    <Layout title="Skenování dokumentů">
      <div className="container py-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Skenování dokumentů</h2>
          <p className="mt-1 text-sm text-slate-500">
            Naskenujte nový dokument pomocí kamery nebo nahrajte existující soubor.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader className="border-b bg-slate-50">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="camera" className="flex items-center">
                      <ScanLine className="h-4 w-4 mr-2" />
                      Kamera
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="flex items-center">
                      <Upload className="h-4 w-4 mr-2" />
                      Nahrání souboru
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              
              <CardContent className="p-6">
                <TabsContent value="camera" className="mt-0">
                  <div className="flex flex-col items-center">
                    <div className="relative w-full aspect-[4/3] bg-slate-100 rounded-md overflow-hidden border mb-4">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      {isScanning && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="bg-white rounded-md p-4 flex flex-col items-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                            <p className="text-slate-800">Detekce dokumentu...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-500 mb-6 text-center max-w-md">
                      Zamiřte kameru na dokument, který chcete naskenovat. Systém automaticky rozpozná okraje dokumentu.
                    </p>
                    
                    <div className="flex gap-4">
                      <Button 
                        onClick={handleScan} 
                        disabled={isScanning}
                        size="lg"
                        className="bg-gradient-to-r from-primary to-primary/80"
                      >
                        {isScanning ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Skenování...
                          </>
                        ) : (
                          <>
                            <ScanLine className="mr-2 h-5 w-5" />
                            Naskenovat dokument
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="upload" className="mt-0">
                  <div className="flex flex-col items-center">
                    <div 
                      className="border-2 border-dashed border-slate-300 rounded-lg p-10 w-full max-w-xl mx-auto text-center mb-6 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                      />
                      <Upload className="mx-auto h-12 w-12 text-slate-400" />
                      <h3 className="mt-4 text-lg font-medium text-slate-900">
                        Nahrajte dokument
                      </h3>
                      <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
                        Klikněte nebo přetáhněte soubor do oblasti. Podporované formáty: PDF, JPG, PNG.
                      </p>
                      {isUploading && (
                        <div className="mt-4 flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span className="text-slate-700">Nahrávání...</span>
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      Vybrat soubor
                    </Button>
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="h-full">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center text-lg">
                  <FolderOpen className="h-5 w-5 mr-2 text-primary" />
                  Dokumenty
                </CardTitle>
                <CardDescription>
                  Naskenované a nahrané dokumenty
                </CardDescription>
              </CardHeader>
              
              <ScrollArea className="h-[500px]">
                <CardContent className="p-4">
                  {documents.length > 0 ? (
                    <ul className="divide-y">
                      {documents.map((doc) => (
                        <li key={doc.id} className="py-3">
                          <div className="flex items-start gap-3">
                            <div className="bg-slate-100 rounded overflow-hidden flex-shrink-0">
                              <img 
                                src={doc.thumbnailUrl} 
                                alt={doc.name} 
                                className="h-12 w-12 object-cover" 
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-slate-900 truncate">{doc.name}</h4>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                <span>{formatDate(doc.createdAt)}</span>
                                <span>•</span>
                                <span>{doc.size}</span>
                              </div>
                            </div>
                            <div className="flex gap-1 mt-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-500 hover:text-primary"
                                onClick={() => {
                                  setSelectedDocument(doc);
                                  setIsDocumentOpen(true);
                                }}
                              >
                                {doc.type === "pdf" ? (
                                  <FileText className="h-4 w-4" />
                                ) : (
                                  <ImageIcon className="h-4 w-4" />
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-500 hover:text-red-500"
                                onClick={() => {
                                  setDocumentToDelete(doc.id);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="py-8 text-center text-slate-500">
                      <FolderOpen className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                      <p>Zatím nemáte žádné naskenované dokumenty</p>
                    </div>
                  )}
                </CardContent>
              </ScrollArea>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Náhled naskenovaného dokumentu */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Náhled naskenovaného dokumentu</DialogTitle>
            <DialogDescription>
              Zkontrolujte, zda je dokument správně zachycen a je dobře čitelný.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 bg-slate-100 rounded-md overflow-hidden">
            <canvas ref={canvasRef} className="max-w-full h-auto" />
          </div>
          
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowPreview(false);
                setScanPreviewUrl(null);
              }}
            >
              Skenovat znovu
            </Button>
            <Button
              onClick={handleSaveScan}
              disabled={isUploading}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ukládání...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Uložit dokument
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Náhled uloženého dokumentu */}
      <Dialog open={isDocumentOpen} onOpenChange={setIsDocumentOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.name}</DialogTitle>
            <DialogDescription>
              {selectedDocument && formatDate(selectedDocument.createdAt)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 bg-slate-100 rounded-md p-4 flex flex-col items-center">
            {selectedDocument?.type === "image" ? (
              <img 
                src={selectedDocument.thumbnailUrl} 
                alt={selectedDocument.name} 
                className="max-w-full h-auto max-h-[70vh] object-contain rounded"
              />
            ) : (
              <div className="text-center py-8">
                <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">Náhled PDF dokumentu</p>
                <p className="text-sm text-slate-500">
                  Pro zobrazení stáhněte dokument nebo otevřete v prohlížeči PDF.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline">
                Zavřít
              </Button>
            </DialogClose>
            <Button 
              className="bg-gradient-to-r from-primary to-primary/80"
              onClick={() => selectedDocument && openDocumentInNewTab(selectedDocument.id)}
            >
              <Download className="mr-2 h-4 w-4" />
              {selectedDocument?.type === "pdf" ? "Otevřít PDF" : "Zobrazit v plné velikosti"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog pro potvrzení smazání */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat dokument</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat tento dokument? Tato akce je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>
              Zrušit
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteDocument}
              className="bg-red-500 hover:bg-red-600"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}