import React, { useState, useRef } from 'react';
import { Layout } from '@/components/layout/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scan, Upload, FileUp, File, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ScanPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startScanning = () => {
    // Simulace skenování - ve skutečné aplikaci by zde byl kód pro práci s kamerou/skenerem
    setIsScanning(true);
    
    setTimeout(() => {
      setIsScanning(false);
      setScanResult('Dokument byl úspěšně naskenován');
      
      // Vytvořit simulovaný File objekt pro naskenovaný dokument
      const date = new Date();
      const fileName = `scan_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}.pdf`;
      
      // Vytvoření prázdných dat pro simulaci
      const emptyPdfBlob = new Blob(['%PDF-1.4 fake PDF content'], { type: 'application/pdf' });
      
      // Přidáme soubor do seznamu
      // @ts-ignore - ignorujeme TypeScript chybu, konstruktor File potřebuje 3 argumenty
      const scannedFile = new File([emptyPdfBlob], fileName, { type: 'application/pdf' });
      setFiles(prev => [...prev, scannedFile]);
      
      toast({
        title: "Dokument naskenován",
        description: "Dokument byl úspěšně naskenován a přidán do seznamu.",
      });
    }, 2000);
  };

  const uploadFiles = () => {
    if (files.length === 0) {
      toast({
        title: "Žádné soubory k nahrání",
        description: "Nejprve prosím naskenujte nebo vyberte soubory k nahrání.",
        variant: "destructive",
      });
      return;
    }
    
    // Simulace nahrávání - ve skutečné aplikaci by zde byl kód pro nahrání na server
    toast({
      title: "Nahrávání souborů",
      description: `Nahrávám ${files.length} souborů...`,
    });
    
    // Simulace úspěšného nahrání po 2 sekundách
    setTimeout(() => {
      toast({
        title: "Dokončeno",
        description: `${files.length} souborů bylo úspěšně nahráno.`,
      });
      setFiles([]);
    }, 2000);
  };

  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Layout title="Skenování dokumentů">
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">Skenování dokumentů</h1>
        
        <Tabs defaultValue="scan" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="scan">Skenování</TabsTrigger>
            <TabsTrigger value="upload">Nahrávání souborů</TabsTrigger>
          </TabsList>
          
          <TabsContent value="scan" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Naskenovat dokument</CardTitle>
                <CardDescription>
                  Použijte kameru zařízení pro naskenování dokumentu nebo účtenky
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <div className="relative w-full max-w-md aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
                    {isScanning ? (
                      <div className="text-center">
                        <Scan className="h-10 w-10 animate-pulse text-primary mx-auto mb-4" />
                        <p className="text-gray-500">Skenování...</p>
                      </div>
                    ) : scanResult ? (
                      <div className="text-center p-4">
                        <File className="h-10 w-10 text-green-500 mx-auto mb-4" />
                        <p className="text-green-600 font-medium">{scanResult}</p>
                        <Button 
                          variant="outline" 
                          onClick={() => setScanResult(null)} 
                          className="mt-4"
                        >
                          Skenovat další
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <Scan className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Připraveno ke skenování</p>
                        <p className="text-xs text-gray-400 mt-1">Klikněte na tlačítko Skenovat pro zahájení</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button 
                  disabled={isScanning} 
                  onClick={startScanning} 
                  className="w-full max-w-md"
                >
                  <Scan className="mr-2 h-4 w-4" />
                  {isScanning ? "Probíhá skenování..." : "Skenovat"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="upload" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Nahrát soubory</CardTitle>
                <CardDescription>
                  Vyberte soubory ze zařízení pro nahrání do systému
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={triggerFileInput}
                >
                  <div className="text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Klikněte pro výběr souborů</p>
                    <p className="text-xs text-gray-400 mt-1">nebo přetáhněte soubory sem</p>
                  </div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={handleFileChange}
                  />
                </div>
                
                {files.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-2">Vybrané soubory ({files.length})</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <File className="h-5 w-5 text-blue-500 mr-3" />
                            <div>
                              <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeFile(index)}
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={uploadFiles} 
                  className="w-full"
                  disabled={files.length === 0}
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  Nahrát {files.length > 0 ? `(${files.length})` : ''}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}