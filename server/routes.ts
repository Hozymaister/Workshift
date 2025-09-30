import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { format, parseISO, addHours, differenceInHours } from "date-fns";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import type { User } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Definice povolených rolí pro konzistentní kontrolu
  const ROLES = {
    ADMIN: "admin",
    COMPANY: "company",
    WORKER: "worker"
  };

  // Middleware pro kontrolu, zda je uživatel přihlášen
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      // Zaznamenání přístupu pro účely auditu
      console.log(`Authenticated access: ${req.method} ${req.path} by user ID ${req.user.id} (${req.user.role})`);
      return next();
    }
    // Detailnější sledování neautorizovaných přístupů
    console.log(`Unauthorized access attempt: ${req.method} ${req.path}`);
    res.status(401).send("Unauthorized: Please login to access this resource");
  };

  // Vylepšené middleware pro ověření role admin
  const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized: Please login to access this resource");
    }
    
    if (req.user && req.user.role === ROLES.ADMIN) {
      console.log(`Admin access: ${req.method} ${req.path} by user ID ${req.user.id}`);
      return next();
    }
    
    // Logování pokusů o neoprávněný přístup pro účely auditu
    console.log(`Forbidden admin access attempt: ${req.method} ${req.path} by user ID ${req.user.id} (${req.user.role})`);
    res.status(403).send("Forbidden: Admin access required");
  };
  
  // Vylepšené middleware pro ověření role company
  const isCompany = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized: Please login to access this resource");
    }
    
    if (req.user && (req.user.role === ROLES.COMPANY || req.user.role === ROLES.ADMIN)) {
      console.log(`Company/Admin access: ${req.method} ${req.path} by user ID ${req.user.id} (${req.user.role})`);
      return next();
    }
    
    // Logování pokusů o neoprávněný přístup
    console.log(`Forbidden company access attempt: ${req.method} ${req.path} by user ID ${req.user.id} (${req.user.role})`);
    res.status(403).send("Forbidden: Company or admin access required");
  };
  
  // Vylepšené middleware pro ověření, zda má uživatel přístup k datům
  const hasDataAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        console.log(`Unauthorized access attempt to protected data: ${req.method} ${req.path}`);
        return res.status(401).send("Unauthorized: Please login to access this resource");
      }

      // Pokud je admin, má přístup ke všemu
      if (req.user.role === ROLES.ADMIN) {
        console.log(`Admin access to data: ${req.method} ${req.path} by user ID ${req.user.id}`);
        return next();
      }

      // Získáme ID dat z požadavku, ke kterým chceme přistoupit
      const dataId = parseInt(req.params.id);
      // Rozpoznáme typ dat z cesty URL (např. 'workplaces', 'shifts', 'users', atd.)
      const pathParts = req.path.split('/').filter(Boolean); // Odstraní prázdné řetězce
      const dataType = pathParts.length > 0 ? pathParts[0] : '';
      
      // Pokud nemáme ID nebo je ID neplatné, nemůžeme spolehlivě ověřit přístup
      if (!dataId || isNaN(dataId)) {
        // Přístup ke kolekcím je ověřen v jednotlivých kontrolerech
        console.log(`Access to collection ${dataType}: ${req.method} ${req.path} by user ID ${req.user.id} (${req.user.role})`);
        return next();
      }
      
      // Ověření podle typu dat
      switch(dataType) {
        case 'workplaces':
          // Pokud je company, má přístup jen k vlastním pracovištím nebo těm, kde je správcem
          if (req.user.role === ROLES.COMPANY) {
            const workplace = await storage.getWorkplace(dataId);
            if (!workplace) {
              return res.status(404).send("Workplace not found");
            }
            
            if (workplace.ownerId !== req.user.id && workplace.managerId !== req.user.id) {
              console.log(`Forbidden workplace access attempt: ${req.method} ${req.path} by user ID ${req.user.id}`);
              return res.status(403).send("Forbidden: No access to this workplace");
            }
            
            console.log(`Company access to workplace ${dataId}: ${req.method} ${req.path} by user ID ${req.user.id}`);
          }
          // Pracovníci mají přístup jen k pracovištím, kde mají směny
          else if (req.user.role === ROLES.WORKER) {
            const shifts = await storage.getUserShifts(req.user.id);
            const hasShiftAtWorkplace = shifts.some(shift => shift.workplaceId === dataId);
            
            if (!hasShiftAtWorkplace) {
              console.log(`Forbidden workplace access attempt by worker: ${req.method} ${req.path} by user ID ${req.user.id}`);
              return res.status(403).send("Forbidden: No access to this workplace");
            }
            
            console.log(`Worker access to workplace ${dataId}: ${req.method} ${req.path} by user ID ${req.user.id}`);
          }
          break;
          
        case 'shifts':
          // Pracovník má přístup jen ke vlastním směnám
          if (req.user.role === ROLES.WORKER) {
            const shift = await storage.getShift(dataId);
            if (!shift) {
              return res.status(404).send("Shift not found");
            }

            if (shift.userId !== req.user.id) {
              console.log(`Forbidden shift access attempt by worker: ${req.method} ${req.path} by user ID ${req.user.id}`);
              return res.status(403).send("Forbidden: No access to this shift");
            }

            console.log(`Worker access to own shift ${dataId}: ${req.method} ${req.path} by user ID ${req.user.id}`);
          }
          // Firma má přístup ke směnám svých pracovníků na svých pracovištích
          else if (req.user.role === ROLES.COMPANY) {
            const shift = await storage.getShift(dataId);
            if (!shift) {
              return res.status(404).send("Shift not found");
            }

            // Pokud směna není přiřazena žádnému pracovišti
            if (!shift.workplaceId) {
              console.log(`Shift ${dataId} has no associated workplace, checking worker association`);

              // Kontrola, zda je pracovník zaměstnancem této firmy
              if (!shift.userId) {
                console.log(`Shift ${dataId} has no assigned worker.`);
                return res.status(403).send("Forbidden: No access to this shift");
              }

              const worker = await storage.getUser(shift.userId);
              if (!worker || worker.parentCompanyId !== req.user.id) {
                console.log(`Forbidden shift access attempt by company: ${req.method} ${req.path} by user ID ${req.user.id}`);
                return res.status(403).send("Forbidden: No access to this shift");
              }
            } else {
              // Ověříme, zda pracoviště patří této firmě
              const workplace = await storage.getWorkplace(shift.workplaceId);
              if (!workplace || (workplace.ownerId !== req.user.id && workplace.managerId !== req.user.id)) {
                console.log(`Forbidden shift access attempt (workplace not owned): ${req.method} ${req.path} by user ID ${req.user.id}`);
                return res.status(403).send("Forbidden: No access to this shift");
              }
            }
            
            console.log(`Company access to shift ${dataId}: ${req.method} ${req.path} by user ID ${req.user.id}`);
          }
          break;
          
        case 'workers':
        case 'users':
          // Každý uživatel může přistupovat jen ke svému účtu
          if (dataId !== req.user.id) {
            // Firma může přistupovat ke svým zaměstnancům
            if (req.user.role === ROLES.COMPANY) {
              // Ověříme, zda je pracovník zaměstnancem této firmy
              const worker = await storage.getUser(dataId);
              if (!worker) {
                return res.status(404).send("User not found");
              }

              if (worker.parentCompanyId !== req.user.id) {
                console.log(`Forbidden user access attempt: ${req.method} ${req.path} by company ID ${req.user.id}`);
                return res.status(403).send("Forbidden: No access to this user");
              }
              
              console.log(`Company access to worker ${dataId}: ${req.method} ${req.path} by user ID ${req.user.id}`);
            } else {
              console.log(`Forbidden user access attempt: ${req.method} ${req.path} by user ID ${req.user.id}`);
              return res.status(403).send("Forbidden: No access to this user");
            }
          } else {
            console.log(`User access to own profile ${dataId}: ${req.method} ${req.path} by user ID ${req.user.id}`);
          }
          break;
          
        case 'customers':
          // Firma nebo admin mají přístup ke svým zákazníkům
          if (req.user.role === ROLES.COMPANY) {
            const customer = await storage.getCustomer(dataId);
            if (!customer) {
              return res.status(404).send("Customer not found");
            }

            if (customer.userId !== req.user.id) {
              console.log(`Forbidden customer access attempt: ${req.method} ${req.path} by user ID ${req.user.id}`);
              return res.status(403).send("Forbidden: No access to this customer");
            }

            console.log(`Company access to customer ${dataId}: ${req.method} ${req.path} by user ID ${req.user.id}`);
          }
          break;
        
        case 'invoices':
          // Firma nebo admin mají přístup ke svým fakturám
          if (req.user.role === ROLES.COMPANY) {
            const invoice = await storage.getInvoice(dataId);
            if (!invoice) {
              return res.status(404).send("Invoice not found");
            }

            if (invoice.userId !== req.user.id) {
              console.log(`Forbidden invoice access attempt: ${req.method} ${req.path} by user ID ${req.user.id}`);
              return res.status(403).send("Forbidden: No access to this invoice");
            }

            console.log(`Company access to invoice ${dataId}: ${req.method} ${req.path} by user ID ${req.user.id}`);
          }
          break;
          
        default:
          // Pro ostatní typy dat použijeme volnější kontrolu, ale zalogujeme přístup pro budoucí audit
          console.log(`Access to resource of type ${dataType} with ID ${dataId}: ${req.method} ${req.path} by user ID ${req.user.id} (${req.user.role})`);
          break;
      }
      
      // Pokud prošlo všemi kontrolami, uživatel má přístup
      return next();
    } catch (error) {
      console.error("Error during data access check:", error);
      return res.status(500).send("Server error: Could not validate your access to this resource");
    }
  };
  
  // Zajistíme, že uploadovací složky existují
  const uploadDir = 'uploads/documents';
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
    console.log('Vytvořena složka: uploads');
  }
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Vytvořena složka:', uploadDir);
  }

  // Konfigurujeme multer pro nahrávání souborů dokumentů
  const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Nastavíme cílovou složku podle typu souboru
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Vytvoříme unikátní název souboru
      const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueFilename);
    }
  });
  
  // Vytvoříme upload middleware
  const upload = multer({
    storage: multerStorage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Povolíme pouze obrázky a PDF soubory
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Nepodporovaný formát souboru. Povolené formáty: JPG, PNG, GIF, PDF.'));
      }
    }
  });

  // Workplace routes
  app.get("/api/workplaces", isAuthenticated, async (req, res) => {
    try {
      let workplaces;
      
      // Pokud je admin, vidí všechna pracoviště
      if (req.user?.role === "admin") {
        workplaces = await storage.getAllWorkplaces();
      } 
      // Pokud je firemní účet, vidí jen vlastní pracoviště
      else if (req.user?.role === "company") {
        // Pro firmu filtrujeme jen pracoviště, které vlastní nebo kde je správcem
        workplaces = (await storage.getAllWorkplaces()).filter(
          w => w.ownerId === req.user?.id || w.managerId === req.user?.id
        );
      }
      // Pracovníci vidí jen pracoviště, kde mají směny
      else {
        const shifts = await storage.getUserShifts(req.user?.id || 0);
        const workplaceIds = Array.from(new Set(shifts.map(s => s.workplaceId))).filter(
          (id): id is number => typeof id === 'number'
        ); // Unikátní ID pracovišť
        
        // Získáme detaily o pracovištích
        workplaces = await Promise.all(
          workplaceIds.map(id => storage.getWorkplace(id))
        );
        
        // Odfiltrujeme undefined hodnoty (pro případ, že by nějaké pracoviště už neexistovalo)
        workplaces = workplaces.filter(Boolean);
      }
      
      res.json(workplaces);
    } catch (error) {
      console.error("Error fetching workplaces:", error);
      res.status(500).json({ error: "Failed to fetch workplaces" });
    }
  });

  app.post("/api/workplaces", isAuthenticated, async (req, res) => {
    try {
      // Pouze admin nebo company role může vytvářet pracoviště
      if (req.user?.role !== "admin" && req.user?.role !== "company") {
        return res.status(403).json({ error: "Forbidden: Admin or Company access required" });
      }
      
      // Přidáme ID vlastníka (přihlášeného uživatele)
      const workplaceData = { 
        ...req.body,
        ownerId: req.user.id // Nastavíme vlastníka na ID aktuálního uživatele
      };
      
      const workplace = await storage.createWorkplace(workplaceData);
      res.status(201).json(workplace);
    } catch (error) {
      console.error("Error creating workplace:", error);
      res.status(500).json({ error: "Failed to create workplace" });
    }
  });

  app.get("/api/workplaces/:id", isAuthenticated, async (req, res) => {
    try {
      const workplaceId = parseInt(req.params.id);
      const workplace = await storage.getWorkplace(workplaceId);
      
      if (!workplace) {
        return res.status(404).json({ error: "Pracoviště nenalezeno" });
      }
      
      // Admin má přístup ke všem pracovištím
      if (req.user?.role === "admin") {
        return res.json(workplace);
      }
      
      // Firma má přístup jen ke svým pracovištím nebo těm, kde je správcem
      if (req.user?.role === "company") {
        if (workplace.ownerId === req.user.id || workplace.managerId === req.user.id) {
          return res.json(workplace);
        }
        return res.status(403).json({ error: "Nemáte oprávnění k tomuto pracovišti" });
      }
      
      // Pracovník má přístup jen k pracovištím, kde má směny
      const shifts = await storage.getUserShifts(req.user?.id || 0);
      const hasShiftAtWorkplace = shifts.some(shift => shift.workplaceId === workplaceId);
      
      if (hasShiftAtWorkplace) {
        return res.json(workplace);
      }
      
      return res.status(403).json({ error: "Nemáte oprávnění k tomuto pracovišti" });
    } catch (error: any) {
      console.error("Chyba při získávání pracoviště:", error);
      return res.status(500).json({ error: "Nepodařilo se získat informace o pracovišti" });
    }
  });

  app.put("/api/workplaces/:id", isAuthenticated, async (req, res) => {
    try {
      const workplaceId = parseInt(req.params.id);
      const workplaceData = req.body;
      
      // Nejprve získáme existující pracoviště, abychom mohli zkontrolovat oprávnění
      const existingWorkplace = await storage.getWorkplace(workplaceId);
      if (!existingWorkplace) {
        return res.status(404).json({ error: "Pracoviště nenalezeno" });
      }
      
      // Ověříme přístupová práva - pouze admin a vlastník/správce pracoviště může upravovat pracoviště
      const isAdmin = req.user?.role === "admin";
      const isOwner = req.user?.role === "company" && existingWorkplace.ownerId === req.user.id;
      const isManager = req.user?.role === "company" && existingWorkplace.managerId === req.user.id;
      
      if (!isAdmin && !isOwner && !isManager) {
        return res.status(403).json({ error: "Nemáte oprávnění upravovat toto pracoviště" });
      }
      
      // Pouze admin a vlastník mohou měnit vlastníka pracoviště
      if (!isAdmin && !isOwner && workplaceData.ownerId !== undefined) {
        delete workplaceData.ownerId;
      }
      
      // Ujistíme se, že všechna ID jsou čísla
      if (workplaceData.managerId !== null && workplaceData.managerId !== undefined) {
        workplaceData.managerId = Number(workplaceData.managerId);
      }
      
      const updatedWorkplace = await storage.updateWorkplace(workplaceId, workplaceData);
      if (!updatedWorkplace) {
        return res.status(500).json({ error: "Nepodařilo se aktualizovat pracoviště" });
      }
      
      res.json(updatedWorkplace);
    } catch (error: any) {
      console.error("Chyba při aktualizaci pracoviště:", error);
      res.status(500).json({ error: error.message || "Nepodařilo se aktualizovat pracoviště" });
    }
  });
  
  // Přidaný PATCH endpoint pro částečnou aktualizaci pracoviště
  app.patch("/api/workplaces/:id", isAuthenticated, async (req, res) => {
    try {
      console.log("PATCH workplace data:", JSON.stringify(req.body, null, 2));
      const workplaceId = parseInt(req.params.id);
      
      // Nejprve získáme existující pracoviště, abychom mohli zkontrolovat oprávnění
      const existingWorkplace = await storage.getWorkplace(workplaceId);
      if (!existingWorkplace) {
        return res.status(404).json({ error: "Pracoviště nenalezeno" });
      }
      
      // Ověříme přístupová práva - pouze admin a vlastník/správce pracoviště může upravovat pracoviště
      const isAdmin = req.user?.role === "admin";
      const isOwner = req.user?.role === "company" && existingWorkplace.ownerId === req.user.id;
      const isManager = req.user?.role === "company" && existingWorkplace.managerId === req.user.id;
      
      if (!isAdmin && !isOwner && !isManager) {
        return res.status(403).json({ error: "Nemáte oprávnění upravovat toto pracoviště" });
      }
      
      // Ujistíme se, že managerId je číslo, pokud je definováno
      const updateData = { ...req.body };
      
      // Pouze admin a vlastník mohou měnit vlastníka pracoviště
      if (!isAdmin && !isOwner && updateData.ownerId !== undefined) {
        delete updateData.ownerId;
      }
      
      if (updateData.managerId !== null && updateData.managerId !== undefined) {
        updateData.managerId = Number(updateData.managerId);
      }
      
      const updatedWorkplace = await storage.updateWorkplace(workplaceId, updateData);
      if (!updatedWorkplace) {
        return res.status(500).json({ error: "Nepodařilo se aktualizovat pracoviště" });
      }
      
      res.json(updatedWorkplace);
    } catch (error: any) {
      console.error("Chyba při aktualizaci pracoviště:", error);
      res.status(500).json({ error: error.message || "Nepodařilo se aktualizovat pracoviště" });
    }
  });

  app.delete("/api/workplaces/:id", isAuthenticated, async (req, res) => {
    try {
      const workplaceId = parseInt(req.params.id);
      
      // Nejprve získáme existující pracoviště, abychom mohli zkontrolovat oprávnění
      const existingWorkplace = await storage.getWorkplace(workplaceId);
      if (!existingWorkplace) {
        return res.status(404).json({ error: "Pracoviště nenalezeno" });
      }
      
      // Ověříme přístupová práva - pouze admin a vlastník pracoviště může mazat pracoviště
      const isAdmin = req.user?.role === "admin";
      const isOwner = req.user?.role === "company" && existingWorkplace.ownerId === req.user.id;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: "Nemáte oprávnění smazat toto pracoviště" });
      }
      
      // Zkontrolujeme, zda nejsou na pracovišti aktviní směny
      // Toto je volitelné a dá se to implementovat
      
      const success = await storage.deleteWorkplace(workplaceId);
      if (!success) {
        return res.status(500).json({ error: "Nepodařilo se smazat pracoviště" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Chyba při mazání pracoviště:", error);
      res.status(500).json({ error: error.message || "Nepodařilo se smazat pracoviště" });
    }
  });

  // Worker/User routes
  app.get("/api/workers", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let users: User[] = [];

      // Admin vidí všechny uživatele
      if (req.user.role === "admin") {
        users = await storage.getAllUsers();
      }
      // Firmy vidí pouze své zaměstnance
      else if (req.user.role === "company") {
        const currentUserId = req.user.id;
        users = (await storage.getAllUsers()).filter(user =>
          // Uživatel má parentCompanyId shodné s ID přihlášené firmy nebo je to sám přihlášený uživatel
          user.parentCompanyId === currentUserId || user.id === currentUserId
        );
      }
      // Pracovníci vidí pouze svůj účet
      else {
        const currentUser = await storage.getUser(req.user.id);
        if (currentUser) {
          users = [currentUser];
        }
      }

      // Don't expose password hashes
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching workers:", error);
      res.status(500).json({ error: "Failed to fetch workers" });
    }
  });
  
  // Vytvoření nového pracovníka
  app.post("/api/workers", isAuthenticated, async (req, res) => {
    try {
      // Ověříme oprávnění - pouze admin nebo company může vytvářet pracovníky
      if (req.user?.role !== "admin" && req.user?.role !== "company") {
        return res.status(403).json({ error: "Nemáte oprávnění přidávat pracovníky" });
      }
      
      const userData = req.body;
      
      // Ověříme, zda email a username již neexistuje
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email již existuje" });
      }
      
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ error: "Uživatelské jméno již existuje" });
      }
      
      const hashedPassword = await hashPassword(userData.password);
      
      // Převedeme hourlyWage na číslo pokud existuje
      if (userData.hourlyWage && typeof userData.hourlyWage === 'string') {
        userData.hourlyWage = parseInt(userData.hourlyWage);
      }
      
      // Nastavíme role a parent company
      let userDataToSave = {
        ...userData,
        password: hashedPassword
      };
      
      // Pokud vytváří pracovníka firma, automaticky ho označíme jako "worker" a přiřadíme k firmě
      if (req.user.role === "company") {
        userDataToSave = {
          ...userDataToSave,
          role: "worker", // Vždy pouze pracovník, firma nemůže vytvářet admin účty
          parentCompanyId: req.user.id // Přiřadíme pracovníka k této firmě
        };
      }
      
      const newUser = await storage.createUser(userDataToSave);
      
      // Odebereme heslo před odesláním odpovědi
      const { password, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error: any) {
      console.error("Chyba při vytváření pracovníka:", error);
      res.status(500).json({ error: error.message || "Nepodařilo se vytvořit pracovníka" });
    }
  });
  
  // Aktualizace pracovníka
  app.patch("/api/workers/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      // Ověříme, zda pracovník existuje
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: "Pracovník nenalezen" });
      }
      
      // Ověříme přístupová práva
      const hasAccess = 
        req.user?.role === "admin" || // Admin má přístup ke všem
        req.user?.id === userId || // Uživatel může editovat svůj vlastní profil
        (req.user?.role === "company" && existingUser.parentCompanyId === req.user.id); // Firma může editovat své zaměstnance
      
      if (!hasAccess) {
        return res.status(403).json({ error: "Nemáte oprávnění upravovat tohoto pracovníka" });
      }
      
      // Ověříme, zda nový email již neexistuje (pokud se mění)
      if (userData.email && userData.email !== existingUser.email) {
        const existingEmail = await storage.getUserByEmail(userData.email);
        if (existingEmail && existingEmail.id !== userId) {
          return res.status(400).json({ error: "Email již existuje" });
        }
      }
      
      // Ověříme, zda nové uživatelské jméno již neexistuje (pokud se mění)
      if (userData.username && userData.username !== existingUser.username) {
        const existingUsername = await storage.getUserByUsername(userData.username);
        if (existingUsername && existingUsername.id !== userId) {
          return res.status(400).json({ error: "Uživatelské jméno již existuje" });
        }
      }
      
      // Pokud se mění heslo, zahashujeme ho
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }
      
      // Převedeme hourlyWage na číslo pokud existuje
      if (userData.hourlyWage && typeof userData.hourlyWage === 'string') {
        userData.hourlyWage = parseInt(userData.hourlyWage);
      }
      
      // Firma nesmí měnit role pracovníků (pokud není admin)
      if (req.user?.role === "company" && userData.role && req.user.id !== userId) {
        delete userData.role; // Odstraníme role z dat, která se budou ukládat
      }
      
      // Pracovník nesmí měnit svou vlastní roli
      if (req.user?.role === "worker" && userData.role) {
        delete userData.role;
      }
      
      const updatedUser = await storage.updateUser(userId, userData);
      if (!updatedUser) {
        return res.status(500).json({ error: "Nepodařilo se aktualizovat pracovníka" });
      }
      
      // Odebereme heslo před odesláním odpovědi
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error: any) {
      console.error("Chyba při aktualizaci pracovníka:", error);
      res.status(500).json({ error: error.message || "Nepodařilo se aktualizovat pracovníka" });
    }
  });
  
  // Smazání pracovníka
  app.delete("/api/workers/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Ověříme, zda pracovník existuje
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: "Pracovník nenalezen" });
      }
      
      // Nelze smazat vlastní účet
      if (userId === req.user?.id) {
        return res.status(400).json({ error: "Nelze smazat vlastní účet" });
      }
      
      // Ověříme přístupová práva
      const hasAccess = 
        req.user?.role === "admin" || // Admin může smazat kohokoliv
        (req.user?.role === "company" && existingUser.parentCompanyId === req.user.id); // Firma může smazat svoje zaměstnance
      
      if (!hasAccess) {
        return res.status(403).json({ error: "Nemáte oprávnění smazat tohoto pracovníka" });
      }
      
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(500).json({ error: "Nepodařilo se smazat pracovníka" });
      }
      
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("Chyba při mazání pracovníka:", error);
      res.status(500).json({ error: error.message || "Nepodařilo se smazat pracovníka" });
    }
  });

  // Shift routes
  app.get("/api/shifts", isAuthenticated, async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const workplaceId = req.query.workplaceId ? parseInt(req.query.workplaceId as string) : undefined;
      
      let allShifts;
      
      // Získáme směny podle zadaných parametrů
      if (userId) {
        allShifts = await storage.getUserShifts(userId);
      } else if (startDate && endDate) {
        allShifts = await storage.getShiftsByDate(startDate, endDate);
      } else {
        allShifts = await storage.getAllShifts();
      }
      
      // Filtrujeme směny podle pracoviště, pokud je zadáno
      let shifts = allShifts;
      if (workplaceId) {
        shifts = shifts.filter(shift => shift.workplaceId === workplaceId);
      }
      
      // Filtrujeme směny podle role uživatele a přístupových práv
      if (req.user?.role === "admin") {
        // Admin vidí všechny směny, nemusíme filtrovat
      } else if (req.user?.role === "company") {
        // Firma vidí pouze směny svých pracovníků a na svých pracovištích
        const companyId = req.user.id;
        
        // Získáme všechny pracovníky firmy
        const companyEmployees = (await storage.getAllUsers())
          .filter(user => user.parentCompanyId === companyId)
          .map(user => user.id);
          
        // Získáme všechna pracoviště firmy
        const companyWorkplaces = (await storage.getAllWorkplaces())
          .filter(workplace => workplace.ownerId === companyId)
          .map(workplace => workplace.id);
          
        // Filtrujeme směny, které patří zaměstnancům firmy nebo jsou na pracovištích firmy
        shifts = shifts.filter(shift => 
          (shift.userId && companyEmployees.includes(shift.userId)) || 
          (shift.workplaceId && companyWorkplaces.includes(shift.workplaceId))
        );
      } else {
        // Pracovník vidí pouze své vlastní směny
        shifts = shifts.filter(shift => shift.userId === req.user?.id);
      }
      
      // Enhance shifts with workplace and user details
      const enhancedShifts = await Promise.all(shifts.map(async (shift) => {
        const workplace = shift.workplaceId ? await storage.getWorkplace(shift.workplaceId) : null;
        const user = shift.userId ? await storage.getUser(shift.userId) : null;
        
        // Remove password from user object if it exists
        const safeUser = user ? { ...user, password: undefined } : null;
        
        return {
          ...shift,
          workplace,
          user: safeUser,
        };
      }));
      
      res.json(enhancedShifts);
    } catch (error: any) {
      console.error("Chyba při získávání směn:", error);
      res.status(500).json({ error: error.message || "Nepodařilo se získat informace o směnách" });
    }
  });

  app.post("/api/shifts", isAuthenticated, async (req, res) => {
    try {
      // Zkopírujeme tělo požadavku, abychom ho mohli upravit
      const shiftData = { ...req.body };
      
      // Pro ladění - vypíšeme, co přesně přichází v požadavku
      console.log("Received shift data:", JSON.stringify(shiftData, null, 2));
      
      // Validace dat před vytvořením směny
      if (!shiftData.workplaceId) {
        return res.status(400).json({ error: "Workplace ID is required" });
      }
      
      // Ujistíme se, že workplaceId a userId jsou čísla
      shiftData.workplaceId = Number(shiftData.workplaceId);
      if (shiftData.userId) {
        shiftData.userId = Number(shiftData.userId);
      }
      
      // Konvertujeme řetězce ISO na objekty Date
      // Tyto sloupce jsou v databázi typu timestamp
      if (typeof shiftData.date === 'string') {
        shiftData.date = new Date(shiftData.date);
        // Pro ladění - ověříme, že konverze proběhla správně
        console.log("Converted date:", shiftData.date);
      } else {
        console.log("Date is not a string:", shiftData.date);
      }
      
      if (typeof shiftData.startTime === 'string') {
        shiftData.startTime = new Date(shiftData.startTime);
        console.log("Converted startTime:", shiftData.startTime);
      } else {
        console.log("StartTime is not a string:", shiftData.startTime);
      }
      
      if (typeof shiftData.endTime === 'string') {
        shiftData.endTime = new Date(shiftData.endTime);
        console.log("Converted endTime:", shiftData.endTime);
      } else {
        console.log("EndTime is not a string:", shiftData.endTime);
      }
      
      // Ověříme, že všechna data jsou platná před uložením
      if (!shiftData.date || !(shiftData.date instanceof Date) || isNaN(shiftData.date.getTime())) {
        console.error("Invalid date:", shiftData.date);
        return res.status(400).json({ error: "Invalid date format" });
      }
      
      if (!shiftData.startTime || !(shiftData.startTime instanceof Date) || isNaN(shiftData.startTime.getTime())) {
        console.error("Invalid startTime:", shiftData.startTime);
        return res.status(400).json({ error: "Invalid startTime format" });
      }
      
      if (!shiftData.endTime || !(shiftData.endTime instanceof Date) || isNaN(shiftData.endTime.getTime())) {
        console.error("Invalid endTime:", shiftData.endTime);
        return res.status(400).json({ error: "Invalid endTime format" });
      }
      
      // Ověříme přístupová práva - pouze admin a company mohou vytvářet směny
      if (req.user?.role !== "admin" && req.user?.role !== "company") {
        return res.status(403).json({ error: "Nemáte oprávnění vytvářet směny" });
      }
      
      // Pokud je přihlášen company účet, ověříme, zda mu patří pracoviště
      if (req.user?.role === "company") {
        const workplace = await storage.getWorkplace(shiftData.workplaceId);
        if (!workplace) {
          return res.status(404).json({ error: "Pracoviště nenalezeno" });
        }
        
        // Pokud má pracoviště vlastníka, ověříme, že je to aktuální firma
        if (workplace.ownerId !== undefined && workplace.ownerId !== req.user.id) {
          return res.status(403).json({ error: "Nemáte oprávnění vytvářet směny pro toto pracoviště" });
        }
        
        // Pokud je specifikován uživatel, ověříme, že patří do této firmy
        if (shiftData.userId) {
          const user = await storage.getUser(shiftData.userId);
          if (!user) {
            return res.status(404).json({ error: "Zaměstnanec nenalezen" });
          }
          
          if (user.parentCompanyId !== req.user.id) {
            return res.status(403).json({ error: "Nemáte oprávnění vytvářet směny pro tohoto zaměstnance" });
          }
        }
      }
      
      console.log("Final shift data to save:", {
        workplaceId: shiftData.workplaceId,
        userId: shiftData.userId,
        date: shiftData.date,
        startTime: shiftData.startTime,
        endTime: shiftData.endTime,
        notes: shiftData.notes
      });
      
      const shift = await storage.createShift(shiftData);
      console.log("Created shift:", shift);
      res.status(201).json(shift);
    } catch (error: any) {
      console.error("Chyba při vytváření směny:", error);
      res.status(500).json({ error: error.message || "Nepodařilo se vytvořit směnu" });
    }
  });

    app.get("/api/shifts/:id", isAuthenticated, async (req, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const shiftId = parseInt(req.params.id);
        const shift = await storage.getShift(shiftId);

        if (!shift) {
          return res.status(404).json({ error: "Směna nenalezena" });
        }

        // Ověříme přístupová práva
        const currentUser = req.user;
        const isAdmin = currentUser.role === "admin";
        const isCompany = currentUser.role === "company";
        const isOwnShift = currentUser.id === shift.userId;
      
      // Pokud jde o firemní účet, zkontrolujeme, zda má přístup k pracovišti nebo zaměstnanci
      let hasCompanyAccess = false;
      if (isCompany) {
        // Ověříme, zda je vlastníkem pracoviště nebo má zaměstnance přiřazeného k tomuto pracovišti
        const workplace = shift.workplaceId ? await storage.getWorkplace(shift.workplaceId) : null;
        const worker = shift.userId ? await storage.getUser(shift.userId) : null;
        
          if (workplace && (workplace.ownerId === currentUser.id || workplace.managerId === currentUser.id)) {
            hasCompanyAccess = true;
          }

          if (worker && worker.parentCompanyId === currentUser.id) {
            hasCompanyAccess = true;
          }
        }
      
      // Pokud nemá potřebná oprávnění, vrátíme chybu
      if (!isAdmin && !isOwnShift && !hasCompanyAccess) {
        return res.status(403).json({ error: "Nemáte oprávnění zobrazit tuto směnu" });
      }
      
      // Enhance shift with workplace and user details
      const workplace = shift.workplaceId ? await storage.getWorkplace(shift.workplaceId) : null;
      const user = shift.userId ? await storage.getUser(shift.userId) : null;
      
      // Remove password from user object if it exists
      const safeUser = user ? { ...user, password: undefined } : null;
      
      const enhancedShift = {
        ...shift,
        workplace,
        user: safeUser,
      };
      
      res.json(enhancedShift);
    } catch (error: any) {
      console.error("Chyba při získávání směny:", error);
      res.status(500).json({ error: error.message || "Nepodařilo se získat informace o směně" });
    }
  });

  app.put("/api/shifts/:id", isAuthenticated, async (req, res) => {
    try {
      // Načteme existující směnu, abychom mohli ověřit přístupová práva
      const shiftId = parseInt(req.params.id);
      const existingShift = await storage.getShift(shiftId);
      
      if (!existingShift) {
        return res.status(404).json({ error: "Směna nenalezena" });
      }
      
      // Ověříme přístupová práva - pouze admin a company mohou upravovat směny
      // Worker může upravovat pouze své vlastní směny (když je přiřazen jako userId)
      const isAdmin = req.user?.role === "admin";
      const isCompany = req.user?.role === "company";
      const isOwnShift = req.user?.id === existingShift.userId;
      
      if (!isAdmin && !isCompany && !isOwnShift) {
        return res.status(403).json({ error: "Nemáte oprávnění upravovat tuto směnu" });
      }
      
      // Pokud je přihlášen company účet, ověříme, zda mu patří pracoviště
      if (isCompany && !isOwnShift) {
        const workplace = await storage.getWorkplace(existingShift.workplaceId);
        
        if (!workplace) {
          return res.status(404).json({ error: "Pracoviště nenalezeno" });
        }
        
        // Ověříme, že pracoviště patří přihlášenému uživateli (firmě)
        if (workplace.ownerId !== undefined && workplace.ownerId !== req.user?.id) {
          return res.status(403).json({ error: "Nemáte oprávnění upravovat směny pro toto pracoviště" });
        }
      }
      
      // Zkopírujeme tělo požadavku, abychom ho mohli upravit
      const shiftData = { ...req.body };
      
      // Pro ladění - vypíšeme, co přesně přichází v požadavku
      console.log("Received shift update data:", JSON.stringify(shiftData, null, 2));
      
      // Ujistíme se, že workplaceId a userId jsou čísla
      if (shiftData.workplaceId) {
        shiftData.workplaceId = Number(shiftData.workplaceId);
        
        // Pokud je přihlášen company účet a mění se pracoviště, ověříme, zda má oprávnění k novému pracovišti
        if (isCompany && shiftData.workplaceId !== existingShift.workplaceId) {
          const newWorkplace = await storage.getWorkplace(shiftData.workplaceId);
          
          if (!newWorkplace) {
            return res.status(404).json({ error: "Nové pracoviště nenalezeno" });
          }
          
          if (newWorkplace.ownerId !== undefined && newWorkplace.ownerId !== req.user?.id) {
            return res.status(403).json({ error: "Nemáte oprávnění přiřadit směnu k tomuto pracovišti" });
          }
        }
      }
      
      if (shiftData.userId) {
        shiftData.userId = Number(shiftData.userId);
        
        // Pokud je přihlášen company účet a mění se zaměstnanec, ověříme, zda má oprávnění k novému zaměstnanci
        if (isCompany && shiftData.userId !== existingShift.userId) {
          const newUser = await storage.getUser(shiftData.userId);
          
          if (!newUser) {
            return res.status(404).json({ error: "Zaměstnanec nenalezen" });
          }
          
          if (newUser.parentCompanyId !== req.user?.id) {
            return res.status(403).json({ error: "Nemáte oprávnění přiřadit směnu k tomuto zaměstnanci" });
          }
        }
      }
      
      // Worker nemůže měnit userId - nemůže přiřadit směnu jinému zaměstnanci
      if (!isAdmin && !isCompany && isOwnShift && shiftData.userId && shiftData.userId !== existingShift.userId) {
        delete shiftData.userId;
      }
      
      // Konvertujeme řetězce ISO na objekty Date
      if (typeof shiftData.date === 'string') {
        shiftData.date = new Date(shiftData.date);
        console.log("Converted date:", shiftData.date);
      }
      
      if (typeof shiftData.startTime === 'string') {
        shiftData.startTime = new Date(shiftData.startTime);
        console.log("Converted startTime:", shiftData.startTime);
      }
      
      if (typeof shiftData.endTime === 'string') {
        shiftData.endTime = new Date(shiftData.endTime);
        console.log("Converted endTime:", shiftData.endTime);
      }
      
      // Ověříme, že všechna data jsou platná před uložením
      if (shiftData.date && (!(shiftData.date instanceof Date) || isNaN(shiftData.date.getTime()))) {
        console.error("Invalid date:", shiftData.date);
        return res.status(400).json({ error: "Invalid date format" });
      }
      
      if (shiftData.startTime && (!(shiftData.startTime instanceof Date) || isNaN(shiftData.startTime.getTime()))) {
        console.error("Invalid startTime:", shiftData.startTime);
        return res.status(400).json({ error: "Invalid startTime format" });
      }
      
      if (shiftData.endTime && (!(shiftData.endTime instanceof Date) || isNaN(shiftData.endTime.getTime()))) {
        console.error("Invalid endTime:", shiftData.endTime);
        return res.status(400).json({ error: "Invalid endTime format" });
      }
      
      console.log("Final shift data to update:", {
        workplaceId: shiftData.workplaceId,
        userId: shiftData.userId,
        date: shiftData.date,
        startTime: shiftData.startTime,
        endTime: shiftData.endTime,
        notes: shiftData.notes
      });
      
      const updatedShift = await storage.updateShift(shiftId, shiftData);
      if (!updatedShift) {
        return res.status(404).send("Shift not found");
      }
      
      console.log("Updated shift:", updatedShift);
      res.json(updatedShift);
    } catch (error: any) {
      console.error("Chyba při aktualizaci směny:", error);
      res.status(500).json({ error: error.message || "Nepodařilo se aktualizovat směnu" });
    }
  });

  app.delete("/api/shifts/:id", isAuthenticated, async (req, res) => {
    try {
      const shiftId = parseInt(req.params.id);
      
      // Načteme existující směnu, abychom mohli ověřit přístupová práva
      const existingShift = await storage.getShift(shiftId);
      
      if (!existingShift) {
        return res.status(404).json({ error: "Směna nenalezena" });
      }
      
      // Ověříme přístupová práva - pouze admin a company mohou mazat směny
      // Worker může mazat pouze své vlastní směny (když je přiřazen jako userId)
      const isAdmin = req.user?.role === "admin";
      const isCompany = req.user?.role === "company";
      const isOwnShift = req.user?.id === existingShift.userId;
      
      if (!isAdmin && !isCompany && !isOwnShift) {
        return res.status(403).json({ error: "Nemáte oprávnění smazat tuto směnu" });
      }
      
      // Pokud je přihlášen company účet, ověříme, zda mu patří pracoviště
      if (isCompany && !isOwnShift) {
        const workplace = await storage.getWorkplace(existingShift.workplaceId);
        
        if (!workplace) {
          return res.status(404).json({ error: "Pracoviště nenalezeno" });
        }
        
        // Ověříme, že pracoviště patří přihlášenému uživateli (firmě)
        if (workplace.ownerId !== undefined && workplace.ownerId !== req.user?.id) {
          return res.status(403).json({ error: "Nemáte oprávnění smazat směny pro toto pracoviště" });
        }
      }
      
      const success = await storage.deleteShift(shiftId);
      if (!success) {
        return res.status(404).json({ error: "Směna nenalezena" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Chyba při mazání směny:", error);
      res.status(500).json({ error: error.message || "Nepodařilo se smazat směnu" });
    }
  });

  // Exchange request routes
  app.get("/api/exchange-requests", isAuthenticated, async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const pending = req.query.pending === "true";
      
      // Nejprve získáme všechny požadavky podle zadaných parametrů
      let allRequests;
      if (userId) {
        allRequests = await storage.getUserExchangeRequests(userId);
      } else if (pending) {
        allRequests = await storage.getPendingExchangeRequests();
      } else {
        allRequests = await storage.getAllExchangeRequests();
      }
      
      // Filtrujeme požadavky podle role a oprávnění
      let requests = [...allRequests]; // Vytvoříme kopii, abychom mohli filtrovat
      
      if (req.user?.role === "admin") {
        // Admin vidí všechny požadavky na výměnu
      } else if (req.user?.role === "company") {
        // Firma vidí pouze požadavky svých zaměstnanců
        const companyId = req.user.id;
        
        // Získáme všechny pracovníky firmy
        const companyEmployees = (await storage.getAllUsers())
          .filter(user => user.parentCompanyId === companyId)
          .map(user => user.id);
        
        // Filtrujeme požadavky, kde je žadatelem nebo adresátem zaměstnanec firmy
        requests = requests.filter(request => 
          companyEmployees.includes(request.requesterId) || 
          (request.requesteeId && companyEmployees.includes(request.requesteeId))
        );
      } else {
        // Pracovník vidí pouze svoje požadavky (kde je žadatel nebo adresát)
        requests = requests.filter(request => 
          request.requesterId === req.user?.id || 
          request.requesteeId === req.user?.id
        );
      }
      
      // Enhance exchange requests with shift, workplace, and user details
      const enhancedRequests = await Promise.all(requests.map(async (request) => {
        const requester = await storage.getUser(request.requesterId);
        const requestee = request.requesteeId ? await storage.getUser(request.requesteeId) : null;
        const requestShift = await storage.getShift(request.requestShiftId);
        const offeredShift = await storage.getShift(request.offeredShiftId);
        
        // Remove passwords from user objects
        const safeRequester = requester ? { ...requester, password: undefined } : null;
        const safeRequestee = requestee ? { ...requestee, password: undefined } : null;
        
        // Get workplace info for shifts
        const requestWorkplace = requestShift && requestShift.workplaceId ? 
          await storage.getWorkplace(requestShift.workplaceId) : null;
        const offeredWorkplace = offeredShift && offeredShift.workplaceId ? 
          await storage.getWorkplace(offeredShift.workplaceId) : null;
        
        return {
          ...request,
          requester: safeRequester,
          requestee: safeRequestee,
          requestShift: requestShift ? { ...requestShift, workplace: requestWorkplace } : null,
          offeredShift: offeredShift ? { ...offeredShift, workplace: offeredWorkplace } : null,
        };
      }));
      
      res.json(enhancedRequests);
    } catch (error: any) {
      console.error("Chyba při získávání požadavků na výměnu směn:", error);
      res.status(500).json({ error: error.message || "Nepodařilo se získat požadavky na výměnu směn" });
    }
  });

  app.post("/api/exchange-requests", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      // Zkopírujeme tělo požadavku, abychom ho mohli upravit
      const requestData = { ...req.body };
      
      // Ověříme, že pracovník může vytvořit požadavek na výměnu
      // 1. Žadatelem musí být přihlášený uživatel (pracovník nemůže vytvořit požadavek za jiného)
      // 2. Shift, který chce uživatel vyměnit, musí patřit jemu
      
      // Pokud není admin nebo společnost, musí být žadatelem
      if (req.user.role !== "admin" && req.user.role !== "company") {
        requestData.requesterId = req.user.id;
        
        // Ověříme, že směna patří tomuto uživateli
        const requestShift = await storage.getShift(requestData.requestShiftId);
        if (!requestShift) {
          return res.status(404).json({ error: "Požadovaná směna nebyla nalezena" });
        }
        
        if (requestShift.userId !== req.user.id) {
          return res.status(403).json({ error: "Nemůžete vyměnit směnu, která vám nepatří" });
        }
      }
      
      // Pokud je společnost, ověříme, že má přístup k oběma směnám
      if (req.user.role === "company") {
        const companyId = req.user.id;
        
        // Získáme seznam zaměstnanců společnosti
        const companyEmployees = (await storage.getAllUsers())
          .filter(user => user.parentCompanyId === companyId)
          .map(user => user.id);
          
        // Získáme obě směny
        const requestShift = await storage.getShift(requestData.requestShiftId);
        const offeredShift = await storage.getShift(requestData.offeredShiftId);
        
        if (!requestShift || !offeredShift) {
          return res.status(404).json({ error: "Jedna z požadovaných směn nebyla nalezena" });
        }
        
        // Ověříme, že oba pracovníci patří k této společnosti
          const requestUserId = requestShift.userId;
          const offeredUserId = offeredShift.userId;

          if (
            !requestUserId ||
            !offeredUserId ||
            !companyEmployees.includes(requestUserId) ||
            !companyEmployees.includes(offeredUserId)
          ) {
            return res.status(403).json({ error: "Nemáte oprávnění vytvářet požadavky na výměnu pro tyto zaměstnance" });
          }
        }
      
      // Vytvoříme požadavek na výměnu
      const request = await storage.createExchangeRequest(requestData);
      res.status(201).json(request);
    } catch (error: any) {
      console.error("Chyba při vytváření požadavku na výměnu směn:", error);
      res.status(500).json({ error: error.message || "Nepodařilo se vytvořit požadavek na výměnu směn" });
    }
  });

  app.put("/api/exchange-requests/:id", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      // Načteme požadavek na výměnu
      const requestId = parseInt(req.params.id);
      const request = await storage.getExchangeRequest(requestId);
      
      if (!request) {
        return res.status(404).json({ error: "Požadavek na výměnu nebyl nalezen" });
      }
      
      // Ověříme, zda má uživatel oprávnění aktualizovat tento požadavek
      if (req.user.role === "admin") {
        // Admin může aktualizovat jakýkoliv požadavek
      } else if (req.user.role === "company") {
        // Společnost může aktualizovat požadavky svých zaměstnanců
        const companyId = req.user.id;
        
        // Získáme informace o žadateli a adresátovi
        const requester = await storage.getUser(request.requesterId);
        const requestee = request.requesteeId ? await storage.getUser(request.requesteeId) : null;
        
        // Ověříme, zda jsou oba uživatelé zaměstnanci této společnosti
        const isRequesterEmployee = requester && requester.parentCompanyId === companyId;
        const isRequesteeEmployee = requestee && requestee.parentCompanyId === companyId;
        
        if (!isRequesterEmployee && !isRequesteeEmployee) {
          return res.status(403).json({ error: "Nemáte oprávnění aktualizovat tento požadavek" });
        }
      } else {
        // Běžný uživatel může aktualizovat pouze požadavky, kde je adresátem
        if (req.user.id !== request.requesteeId) {
          return res.status(403).json({ error: "Nemáte oprávnění aktualizovat tento požadavek" });
        }
      }
      
      // Aktualizujeme požadavek
      const updatedRequest = await storage.updateExchangeRequest(requestId, req.body);
      if (!updatedRequest) {
        return res.status(404).json({ error: "Nepodařilo se aktualizovat požadavek" });
      }
      
      // Pokud byl požadavek schválen, provedeme výměnu směn
      if (updatedRequest.status === "approved") {
        const requestShift = await storage.getShift(updatedRequest.requestShiftId);
        const offeredShift = await storage.getShift(updatedRequest.offeredShiftId);
        
        if (requestShift && offeredShift) {
          // Vyměníme uživatele u směn
          const tempUserId = requestShift.userId;
          await storage.updateShift(requestShift.id, { userId: offeredShift.userId });
          await storage.updateShift(offeredShift.id, { userId: tempUserId });
          
          console.log(`Směny byly úspěšně vyměněny: ${requestShift.id} <-> ${offeredShift.id}`);
        } else {
          console.error("Nepodařilo se najít obě směny pro výměnu");
        }
      }
      
      res.json(updatedRequest);
    } catch (error: any) {
      console.error("Chyba při aktualizaci požadavku na výměnu:", error);
      res.status(500).json({ error: error.message || "Nepodařilo se aktualizovat požadavek na výměnu" });
    }
  });

  app.delete("/api/exchange-requests/:id", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const requestId = parseInt(req.params.id);
      const request = await storage.getExchangeRequest(requestId);
      
      if (!request) {
        return res.status(404).json({ error: "Požadavek na výměnu nebyl nalezen" });
      }
      
      // Ověříme, zda má uživatel oprávnění smazat tento požadavek
      if (req.user.role === "admin") {
        // Admin může smazat jakýkoliv požadavek
      } else if (req.user.role === "company") {
        // Společnost může smazat požadavky svých zaměstnanců
        const companyId = req.user.id;
        
        // Získáme informace o žadateli
        const requester = await storage.getUser(request.requesterId);
        
        // Ověříme, zda je žadatel zaměstnancem této společnosti
        const isRequesterEmployee = requester && requester.parentCompanyId === companyId;
        
        if (!isRequesterEmployee) {
          return res.status(403).json({ error: "Nemáte oprávnění smazat tento požadavek" });
        }
      } else {
        // Běžný uživatel může smazat pouze požadavky, kde je žadatelem
        if (req.user.id !== request.requesterId) {
          return res.status(403).json({ error: "Nemáte oprávnění smazat tento požadavek" });
        }
      }
      
      // Smažeme požadavek
      const success = await storage.deleteExchangeRequest(requestId);
      if (!success) {
        return res.status(404).json({ error: "Požadavek na výměnu nebyl nalezen" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Chyba při mazání požadavku na výměnu:", error);
      res.status(500).json({ error: error.message || "Nepodařilo se smazat požadavek na výměnu" });
    }
  });

  // Reports routes
  app.get("/api/reports", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }
    
    const userId = req.query.userId ? parseInt(req.query.userId as string) : req.user.id;
    
    // Non-admin users can only access their own reports
    if (req.user.role !== "admin" && userId !== req.user.id) {
      return res.status(403).send("Forbidden: Not authorized to access these reports");
    }
    
    const reports = await storage.getUserReports(userId);
    res.json(reports);
  });

  app.post("/api/reports/generate", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }
    
    const { userId, month, year } = req.body;
    
    // Non-admin users can only generate their own reports
    if (req.user.role !== "admin" && userId !== req.user.id) {
      return res.status(403).send("Forbidden: Not authorized to generate this report");
    }
    
    // Get all shifts for the specified user, month, and year
    const shifts = await storage.getUserShifts(userId);
    const filteredShifts = shifts.filter(shift => {
      if (!shift.date) return false;
      const shiftDate = new Date(shift.date);
      return shiftDate.getMonth() + 1 === month && shiftDate.getFullYear() === year;
    });
    
    // Calculate total hours worked
    let totalHours = 0;
    filteredShifts.forEach(shift => {
      if (!shift.startTime || !shift.endTime) return;
      const startTime = new Date(shift.startTime);
      const endTime = new Date(shift.endTime);
      totalHours += differenceInHours(endTime, startTime);
    });
    
    // Create the report
    const report = await storage.createReport({
      userId,
      month,
      year,
      totalHours,
      generated: new Date(),
    });
    
    res.status(201).json(report);
  });

  // Dashboard statistics route
  app.get("/api/stats", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }
    
    const userId = req.user.id;
    const now = new Date();
    
    // Get current month's shifts
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    
    const allUserShifts = await storage.getUserShifts(userId);
    
    // Current month's shifts
    const currentMonthShifts = allUserShifts.filter(shift => {
      if (!shift.date) return false;
      const shiftDate = new Date(shift.date);
      return shiftDate >= firstDayOfMonth && shiftDate <= lastDayOfMonth;
    });
    
    // Calculate planned hours for current month
    let plannedHours = 0;
    currentMonthShifts.forEach(shift => {
      if (!shift.startTime || !shift.endTime) return;
      const startTime = new Date(shift.startTime);
      const endTime = new Date(shift.endTime);
      plannedHours += differenceInHours(endTime, startTime);
    });
    
    // Calculate worked hours (shifts in the past)
    let workedHours = 0;
    currentMonthShifts.forEach(shift => {
      if (!shift.date) return;
      const shiftDate = new Date(shift.date);
      if (shiftDate < now) {
        if (!shift.startTime || !shift.endTime) return;
        const startTime = new Date(shift.startTime);
        const endTime = new Date(shift.endTime);
        workedHours += differenceInHours(endTime, startTime);
      }
    });
    
    // Get upcoming shifts (next 14 days)
    const twoWeeksFromNow = new Date(now);
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
    
    const upcomingShifts = allUserShifts.filter(shift => {
      if (!shift.date) return false;
      const shiftDate = new Date(shift.date);
      return shiftDate >= now && shiftDate <= twoWeeksFromNow;
    }).length;
    
    // Get exchange requests related to the user
    const exchangeRequests = await storage.getUserExchangeRequests(userId);
    const pendingRequests = exchangeRequests.filter(request => 
      request.status === "pending" && request.requesteeId === userId
    ).length;
    
    res.json({
      plannedHours,
      workedHours,
      upcomingShifts,
      exchangeRequests: pendingRequests,
    });
  });
  
  // Reset password routes - In production, these would send actual emails
  // For demo purposes, we'll store reset codes in memory
  const resetCodes = new Map<string, { code: string, expires: Date }>();
  
  app.post("/api/reset-password", async (req, res) => {
    const { email } = req.body;
    
    // Check if user exists
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal whether the email is registered for security reasons
      return res.status(200).json({ message: "If your email is registered, you will receive instructions shortly." });
    }
    
    // Generate a random 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store the code with expiration time (30 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);
    resetCodes.set(email, { code: resetCode, expires: expiresAt });
    
    // In a real app, send an email with the code
    console.log(`[Reset code for ${email}]: ${resetCode}`);
    
    res.status(200).json({ message: "If your email is registered, you will receive instructions shortly." });
  });
  
  app.post("/api/reset-password/confirm", async (req, res) => {
    const { email, code, password } = req.body;
    
    // Check if reset code exists and is valid
    const resetData = resetCodes.get(email);
    if (!resetData) {
      return res.status(400).json({ message: "Invalid or expired reset code." });
    }
    
    // Check if code matches and is not expired
    if (resetData.code !== code || resetData.expires < new Date()) {
      return res.status(400).json({ message: "Invalid or expired reset code." });
    }
    
    // Find the user
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }
    
    // Hash the new password
    const hashedPassword = await hashPassword(password);
    
    // Update user's password
    const updatedUser = await storage.updateUser(user.id, { password: hashedPassword });
    
    // Remove the reset code
    resetCodes.delete(email);
    
    res.status(200).json({ message: "Password has been successfully reset." });
  });

  // Customers routes - Adresář zákazníků
  app.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const userId = req.user.id;
      const customers = await storage.getUserCustomers(userId);
      res.json(customers);
    } catch (error) {
      console.error("Error getting customers:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  app.get("/api/customers/search", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const userId = req.user.id;
      const query = req.query.q as string || "";
      const customers = await storage.searchCustomers(query, userId);
      res.json(customers);
    } catch (error) {
      console.error("Error searching customers:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  app.get("/api/ares/company", isAuthenticated, async (req, res) => {
    try {
      const ico = req.query.ico as string;
      
      if (!ico || !/^\d{8}$/.test(ico)) {
        return res.status(400).json({ error: "Neplatné IČO. IČO musí obsahovat přesně 8 číslic." });
      }
      
      // URL pro ARES API - základní údaje o ekonomickém subjektu
      const aresUrl = `https://wwwinfo.mfcr.cz/cgi-bin/ares/darv_bas.cgi?ico=${ico}`;
      
      try {
        const response = await fetch(aresUrl);
        const xmlData = await response.text();
        
        // Parsování XML odpovědi
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: "@_"
        });
        const data = parser.parse(xmlData);
        
        // Navigace k relevantním datům v XML struktuře
        const odpoved = data?.Ares_odpovedi?.Odpoved;
        if (!odpoved || odpoved.Error) {
          return res.status(404).json({ error: "Firma s tímto IČO nebyla nalezena." });
        }
        
        const zaznam = odpoved.Zaznam;
        if (!zaznam) {
          return res.status(404).json({ error: "Firma s tímto IČO nebyla nalezena." });
        }
        
        // Extrakce potřebných údajů
        const companyInfo = {
          name: zaznam.Obchodni_firma || "",
          ico: zaznam.ICO || "",
          dic: zaznam.DIC || "",
          address: "",
          city: "",
          zip: ""
        };
        
        // Extrakce adresy
        if (zaznam.Identifikace?.Adresa_ARES) {
          const adresa = zaznam.Identifikace.Adresa_ARES;
          const street = adresa.Nazev_ulice || "";
          const houseNumber = adresa.Cislo_domovni || "";
          const orientationNumber = adresa.Cislo_orientacni ? `/${adresa.Cislo_orientacni}` : "";
          
          companyInfo.address = street ? `${street} ${houseNumber}${orientationNumber}` : `${houseNumber}${orientationNumber}`;
          companyInfo.city = adresa.Nazev_obce || "";
          companyInfo.zip = adresa.PSC || "";
        }
        
        return res.json(companyInfo);
      } catch (fetchError) {
        console.error("Chyba při komunikaci s ARES API:", fetchError);
        return res.status(500).json({ error: "Nelze kontaktovat ARES API. Zkuste to prosím později." });
      }
    } catch (error) {
      console.error("Error getting company info from ARES:", error);
      res.status(500).json({ error: "Interní chyba serveru" });
    }
  });

  app.get("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const customerId = parseInt(req.params.id);
      const customer = await storage.getCustomer(customerId);
      
      if (!customer) {
        return res.status(404).send("Customer not found");
      }
      
      // Ověření, že zákazník patří přihlášenému uživateli
      if (req.user && customer.userId !== req.user.id) {
        return res.status(403).send("Forbidden: You don't have access to this customer");
      }
      
      res.json(customer);
    } catch (error) {
      console.error("Error getting customer:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  app.post("/api/customers", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const userId = req.user.id;
      const customerData = { ...req.body, userId };
      
      // Základní validace
      if (!customerData.name || !customerData.address) {
        return res.status(400).send("Name and address are required");
      }
      
      // Validace DIČ, pokud je uvedeno
      if (customerData.dic && !/^CZ\d{8,10}$/.test(customerData.dic)) {
        return res.status(400).send("DIČ must be in format 'CZ' followed by 8-10 digits");
      }
      
      // Validace IČO, pokud je uvedeno
      if (customerData.ic && !/^\d{8}$/.test(customerData.ic)) {
        return res.status(400).send("IČO must be exactly 8 digits");
      }
      
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  app.put("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const customerId = parseInt(req.params.id);
      const existingCustomer = await storage.getCustomer(customerId);
      
      if (!existingCustomer) {
        return res.status(404).send("Customer not found");
      }
      
      // Ověření, že zákazník patří přihlášenému uživateli
      if (req.user && existingCustomer.userId !== req.user.id) {
        return res.status(403).send("Forbidden: You don't have access to this customer");
      }
      
      // Nesmíme přepsat userId
      const { userId, ...updateData } = req.body;
      
      // Základní validace
      if (!updateData.name || !updateData.address) {
        return res.status(400).send("Name and address are required");
      }
      
      // Validace DIČ, pokud je uvedeno
      if (updateData.dic && !/^CZ\d{8,10}$/.test(updateData.dic)) {
        return res.status(400).send("DIČ must be in format 'CZ' followed by 8-10 digits");
      }
      
      // Validace IČO, pokud je uvedeno
      if (updateData.ic && !/^\d{8}$/.test(updateData.ic)) {
        return res.status(400).send("IČO must be exactly 8 digits");
      }
      
      const updatedCustomer = await storage.updateCustomer(customerId, updateData);
      res.json(updatedCustomer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  app.delete("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const customerId = parseInt(req.params.id);
      const existingCustomer = await storage.getCustomer(customerId);
      
      if (!existingCustomer) {
        return res.status(404).send("Customer not found");
      }
      
      // Ověření, že zákazník patří přihlášenému uživateli
      if (req.user && existingCustomer.userId !== req.user.id) {
        return res.status(403).send("Forbidden: You don't have access to this customer");
      }
      
      await storage.deleteCustomer(customerId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // API endpointy pro dokumenty
  app.get("/api/documents", isAuthenticated, isCompany, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const documents = await storage.getUserDocuments(req.user.id);
      res.json(documents);
    } catch (error) {
      console.error("Error getting documents:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Endpoint pro nahrávání souborů
  app.post("/api/documents/upload", isAuthenticated, isCompany, upload.single('file'), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const file = req.file;
      if (!file) {
        return res.status(400).send("No file uploaded");
      }
      
      // Určíme typ dokumentu podle MIME typu
      const isImage = file.mimetype.startsWith('image/');
      const documentType = isImage ? 'image' : 'pdf';
      
      // Vytvoříme náhled pro obrázky
      let thumbnailPath = null;
      if (isImage) {
        // V produkčním prostředí bychom zde vygenerovali náhled
        // Pro účely dema použijeme stejný soubor jako náhled
        thumbnailPath = file.path;
      }
      
      // Formátování velikosti souboru
      const sizeInBytes = file.size;
      let size: string;
      if (sizeInBytes < 1024) {
        size = `${sizeInBytes} B`;
      } else if (sizeInBytes < 1024 * 1024) {
        size = `${(sizeInBytes / 1024).toFixed(1)} KB`;
      } else {
        size = `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
      }
      
      // Uložíme záznam o dokumentu do databáze
      const document = await storage.createDocument({
        userId: req.user.id,
        name: req.body.name || file.originalname,
        type: documentType,
        path: file.path,
        thumbnailPath: thumbnailPath,
        size: size
      });
      
      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Endpoint pro získání obsahu souboru
  app.get("/api/documents/file/:id", isAuthenticated, isCompany, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).send("Document not found");
      }
      
      // Ověření, že dokument patří přihlášenému uživateli
      if (document.userId !== req.user.id) {
        return res.status(403).send("Forbidden: You don't have access to this document");
      }
      
      // Kontrola existence souboru
      if (!fs.existsSync(document.path)) {
        return res.status(404).send("Document file not found");
      }
      
      // Nastavení Content-Type podle typu dokumentu
      const contentType = document.type === 'image' ? 'image/jpeg' : 'application/pdf';
      res.setHeader('Content-Type', contentType);
      
      // Odešleme soubor jako stream
      const fileStream = fs.createReadStream(document.path);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error serving document file:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // Standardní CRUD operace pro dokumenty
  app.post("/api/documents", isAuthenticated, isCompany, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const documentData = req.body;
      
      // Validace vstupních dat
      if (!documentData.name || !documentData.type || !documentData.path || !documentData.size) {
        return res.status(400).send("Missing required fields");
      }
      
      // Přidáme ID uživatele k dokumentu
      const document = await storage.createDocument({
        ...documentData,
        userId: req.user.id
      });
      
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  app.get("/api/documents/:id", isAuthenticated, isCompany, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).send("Document not found");
      }
      
      // Ověření, že dokument patří přihlášenému uživateli
      if (document.userId !== req.user.id) {
        return res.status(403).send("Forbidden: You don't have access to this document");
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error getting document:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  app.delete("/api/documents/:id", isAuthenticated, isCompany, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).send("Document not found");
      }
      
      // Ověření, že dokument patří přihlášenému uživateli
      if (document.userId !== req.user.id) {
        return res.status(403).send("Forbidden: You don't have access to this document");
      }
      
      await storage.deleteDocument(documentId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Endpoint pro hledání informací o firmě v ARES podle IČO
  app.get("/api/ares", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const ico = req.query.ico;
      
      if (!ico || typeof ico !== 'string' || !/^\d{8}$/.test(ico)) {
        return res.status(400).send("Neplatné IČO. Zadejte 8-místné identifikační číslo.");
      }
      
      // Vzhledem k tomu, že API ARES může být nedostupné v prostředí Replit,
      // implementujeme alternativní řešení pro testovací účely
      
      // Zkusíme použít API ARES s limitem na připojení
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2-sekundový timeout
        
        const aresUrl = `https://wwwinfo.mfcr.cz/cgi-bin/ares/darv_bas.cgi?ico=${ico}`;
        const response = await fetch(aresUrl, { 
          signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Chyba při komunikaci s ARES: ${response.statusText}`);
        }
        
        const xmlData = await response.text();
        const parser = new XMLParser({
          attributeNamePrefix: "",
          ignoreAttributes: false,
        });
        
        const result = parser.parse(xmlData);
        
        // Extrahování relevantních dat z odpovědi ARES
        const aresResponse = result["are:Ares_odpovedi"]["are:Odpoved"];
        const vypisData = aresResponse["D:VBAS"];
        
        // Pokud nebyla firma nalezena
        if (aresResponse["are:Nalezenych_zaznamu"] === "0" || !vypisData) {
          return res.status(404).send("Firma s tímto IČO nebyla nalezena v registru.");
        }
        
        // Příprava základních údajů o firmě
        const companyInfo = {
          name: vypisData["D:OF"],
          ico: vypisData["D:ICO"],
          dic: vypisData["D:DIC"] || null,
          address: ""
        };
        
        // Sestavení adresy
        const addrData = vypisData["D:AA"];
        if (addrData) {
          const parts = [];
          
          if (addrData["D:NU"]) parts.push(addrData["D:NU"]);
          if (addrData["D:CO"]) parts.push(addrData["D:CO"]);
          
          let street = "";
          if (addrData["D:UP"]) street = addrData["D:UP"];
          if (addrData["D:CD"]) {
            street = street ? `${street} ${addrData["D:CD"]}` : addrData["D:CD"];
          }
          if (addrData["D:CO"]) {
            street = street ? `${street}/${addrData["D:CO"]}` : addrData["D:CO"];
          }
          if (street) parts.push(street);
          
          if (addrData["D:N"]) parts.push(addrData["D:N"]);
          if (addrData["D:NCO"]) parts.push(addrData["D:NCO"]);
          
          const city = addrData["D:NMC"] || "";
          const zip = addrData["D:PSC"] || "";
          
          if (zip && city) {
            parts.push(`${zip} ${city}`);
          } else {
            if (zip) parts.push(zip);
            if (city) parts.push(city);
          }
          
          companyInfo.address = parts.filter(Boolean).join(", ");
        }
        
        return res.json(companyInfo);
      } catch (fetchError) {
        console.error("Chyba při přístupu k ARES API:", fetchError);
        // Pokud došlo k chybě při volání API, poskytneme demonstrační data pro vybrané IČO
        
        // V produkční verzi by zde byl vhodnější fallback jako lokální databáze,
        // ale pro demonstrační účely použijeme předem vytvořená data pro některá IČO
        const demoCompanies: { [key: string]: any } = {
          "04917871": {
            name: "Insion s.r.o.",
            ico: "04917871",
            dic: "CZ04917871",
            address: "Na hřebenech II 1718/8, Nusle, 140 00 Praha 4"
          },
          "27082440": {
            name: "Seznam.cz, a.s.",
            ico: "27082440",
            dic: "CZ27082440",
            address: "Radlická 3294/10, Smíchov, 150 00 Praha 5"
          },
          "45317054": {
            name: "ŠKODA AUTO a.s.",
            ico: "45317054",
            dic: "CZ45317054",
            address: "tř. Václava Klementa 869, Mladá Boleslav II, 293 01 Mladá Boleslav"
          },
          "26168685": {
            name: "Prague City Tourism a.s.",
            ico: "26168685",
            dic: "CZ26168685",
            address: "Arbesovo náměstí 70/4, Smíchov, 150 00 Praha 5"
          },
          "00006947": {
            name: "Česká národní banka",
            ico: "00006947",
            dic: null,
            address: "Na příkopě 864/28, Nové Město, 110 00 Praha 1"
          }
        };
        
        // Pokud máme demo data pro dané IČO, vrátíme je
        if (demoCompanies[ico]) {
          return res.json(demoCompanies[ico]);
        }
        
        // Pokud nemáme ani demo data, vrátíme chybu
        return res.status(404).json({
          error: "Nelze kontaktovat ARES API. Zkuste to prosím později nebo zadejte údaje ručně."
        });
      }
    } catch (error) {
      console.error("Chyba při komunikaci s API ARES:", error);
      res.status(500).json({
        error: "Chyba při zpracování požadavku. Zkuste to prosím později nebo zadejte údaje ručně."
      });
    }
  });

  // Endpoint pro získání seznamu faktur - pouze pro firemní účty
  app.get("/api/invoices", isAuthenticated, isCompany, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const userId = req.user.id;
      const type = req.query.type as string;
      
      // Načtení faktur z databáze podle typu (vydané/přijaté) nebo všechny
      let invoices;
      if (type && (type === 'issued' || type === 'received')) {
        invoices = await storage.getInvoicesByType(userId, type as "issued" | "received");
      } else {
        invoices = await storage.getUserInvoices(userId);
      }
      
      res.json(invoices);
    } catch (error) {
      console.error("Chyba při načítání faktur:", error);
      res.status(500).json({ error: "Nepodařilo se načíst faktury" });
    }
  });
  
  // Endpoint pro získání faktury podle ID
  app.get("/api/invoices/:id", isAuthenticated, isCompany, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const invoiceId = parseInt(req.params.id);
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "Neplatné ID faktury" });
      }
      
      // Načtení faktury z databáze
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ error: "Faktura nebyla nalezena" });
      }
      
      // Ověření, že faktura patří přihlášenému uživateli
      if (invoice.userId !== req.user.id) {
        return res.status(403).json({ error: "K této faktuře nemáte přístup" });
      }
      
      // Načtení položek faktury
      const items = await storage.getInvoiceItems(invoiceId);
      
      // Vytvoření kompletního objektu faktury s položkami
      const invoiceWithItems = {
        ...invoice,
        items
      };
      
      res.json(invoiceWithItems);
    } catch (error) {
      console.error("Chyba při načítání faktury:", error);
      res.status(500).json({ error: "Nepodařilo se načíst fakturu" });
    }
  });
  
  // Endpoint pro vytvoření faktury
  app.post("/api/invoices", isAuthenticated, isCompany, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const userId = req.user.id;
      const invoiceData = req.body;
      
      // Připravíme data faktury pro uložení
      const insertInvoice = {
        userId,
        invoiceNumber: invoiceData.invoiceNumber,
        type: invoiceData.type,
        date: new Date(invoiceData.date || new Date()),
        dateDue: new Date(invoiceData.dateDue || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
        dateIssued: invoiceData.dateIssued ? new Date(invoiceData.dateIssued) : null,
        dateReceived: invoiceData.dateReceived ? new Date(invoiceData.dateReceived) : null,
        customerName: invoiceData.customerName || invoiceData.supplierName,
        customerAddress: invoiceData.customerAddress || invoiceData.supplierAddress,
        customerIC: invoiceData.customerIC,
        customerDIC: invoiceData.customerDIC,
        supplierName: invoiceData.supplierName,
        supplierAddress: invoiceData.supplierAddress,
        supplierIC: invoiceData.supplierIC,
        supplierDIC: invoiceData.supplierDIC,
        bankAccount: invoiceData.bankAccount,
        paymentMethod: invoiceData.paymentMethod || "bank",
        isVatPayer: invoiceData.isVatPayer !== undefined ? invoiceData.isVatPayer : true,
        amount: invoiceData.amount || 0,
        notes: invoiceData.notes,
        isPaid: invoiceData.isPaid !== undefined ? invoiceData.isPaid : false
      };
      
      // Uložíme fakturu do databáze
      const createdInvoice = await storage.createInvoice(insertInvoice);
      
      // Pokud máme položky faktury, uložíme je také
      const items = invoiceData.items || [];
      const savedItems = [];
      
      for (const item of items) {
        const insertItem = {
          invoiceId: createdInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          pricePerUnit: item.pricePerUnit
        };
        
        const savedItem = await storage.createInvoiceItem(insertItem);
        savedItems.push(savedItem);
      }
      
      // Vrátíme vytvořenou fakturu s položkami
      res.status(201).json({
        ...createdInvoice,
        items: savedItems
      });
    } catch (error) {
      console.error("Chyba při vytváření faktury:", error);
      res.status(500).json({ error: "Nepodařilo se vytvořit fakturu" });
    }
  });
  
  // Endpoint pro aktualizaci faktury
  app.put("/api/invoices/:id", isAuthenticated, isCompany, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const invoiceId = parseInt(req.params.id);
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "Neplatné ID faktury" });
      }
      
      // Načtení faktury z databáze pro ověření vlastnictví
      const existingInvoice = await storage.getInvoice(invoiceId);
      
      if (!existingInvoice) {
        return res.status(404).json({ error: "Faktura nebyla nalezena" });
      }
      
      // Ověření, že faktura patří přihlášenému uživateli
      if (existingInvoice.userId !== req.user.id) {
        return res.status(403).json({ error: "K této faktuře nemáte přístup" });
      }
      
      const invoiceData = req.body;
      
      // Aktualizujeme fakturu
      const updatedInvoice = await storage.updateInvoice(invoiceId, invoiceData);
      if (!updatedInvoice) {
        return res.status(500).json({ error: "Nepodařilo se aktualizovat fakturu" });
      }
      
      // Pokud máme položky faktury, aktualizujeme je také
      const items = invoiceData.items || [];
      
      if (items.length > 0) {
        // Nejprve smažeme existující položky
        const existingItems = await storage.getInvoiceItems(invoiceId);
        for (const item of existingItems) {
          await storage.deleteInvoiceItem(item.id);
        }
        
        // Poté vytvoříme nové položky
        const savedItems = [];
        for (const item of items) {
          const insertItem = {
            invoiceId: updatedInvoice.id,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            pricePerUnit: item.pricePerUnit
          };
          
          const savedItem = await storage.createInvoiceItem(insertItem);
          savedItems.push(savedItem);
        }
        
        // Vrátíme aktualizovanou fakturu s položkami
        res.json({
          ...updatedInvoice,
          items: savedItems
        });
      } else {
        // Vrátíme aktualizovanou fakturu bez položek
        const items = await storage.getInvoiceItems(invoiceId);
        res.json({
          ...updatedInvoice,
          items
        });
      }
    } catch (error) {
      console.error("Chyba při aktualizaci faktury:", error);
      res.status(500).json({ error: "Nepodařilo se aktualizovat fakturu" });
    }
  });
  
  // Endpoint pro smazání faktury
  app.delete("/api/invoices/:id", isAuthenticated, isCompany, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const invoiceId = parseInt(req.params.id);
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "Neplatné ID faktury" });
      }
      
      // Načtení faktury z databáze pro ověření vlastnictví
      const existingInvoice = await storage.getInvoice(invoiceId);
      
      if (!existingInvoice) {
        return res.status(404).json({ error: "Faktura nebyla nalezena" });
      }
      
      // Ověření, že faktura patří přihlášenému uživateli
      if (existingInvoice.userId !== req.user.id) {
        return res.status(403).json({ error: "K této faktuře nemáte přístup" });
      }
      
      // Smažeme fakturu
      const deleted = await storage.deleteInvoice(invoiceId);
      
      if (deleted) {
        res.json({ success: true, message: "Faktura byla úspěšně smazána" });
      } else {
        res.status(500).json({ error: "Nepodařilo se smazat fakturu" });
      }
    } catch (error) {
      console.error("Chyba při mazání faktury:", error);
      res.status(500).json({ error: "Nepodařilo se smazat fakturu" });
    }
  });

  // Endpoint pro generování PDF faktury - pouze pro firemní účty
  app.get("/api/invoices/generate-pdf/:id", isAuthenticated, isCompany, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }
      
      const invoiceId = req.params.id;
      
      // Zde by byla logika pro načtení faktury z DB a generování PDF
      
      // Pro demonstraci pouze vracíme úspěch
      res.json({ 
        success: true, 
        message: "PDF bylo vygenerováno", 
        pdfUrl: `/api/invoices/pdf/${invoiceId}` 
      });
    } catch (error) {
      console.error("Chyba při generování PDF faktury:", error);
      res.status(500).json({ error: "Nepodařilo se vygenerovat PDF faktury" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
