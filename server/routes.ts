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

export async function registerRoutes(app: Express): Promise<Server> {
  // Sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).send("Unauthorized");
  };

  // Middleware to check if user is admin
  const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && req.user && req.user.role === "admin") {
      return next();
    }
    res.status(403).send("Forbidden: Admin access required");
  };
  
  // Konfigurujeme multer pro nahrávání souborů dokumentů
  const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Nastavíme cílovou složku podle typu souboru
      let uploadDir = 'uploads/documents';
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
    const workplaces = await storage.getAllWorkplaces();
    res.json(workplaces);
  });

  app.post("/api/workplaces", isAdmin, async (req, res) => {
    const workplace = await storage.createWorkplace(req.body);
    res.status(201).json(workplace);
  });

  app.get("/api/workplaces/:id", isAuthenticated, async (req, res) => {
    const workplace = await storage.getWorkplace(parseInt(req.params.id));
    if (!workplace) {
      return res.status(404).send("Workplace not found");
    }
    res.json(workplace);
  });

  app.put("/api/workplaces/:id", isAdmin, async (req, res) => {
    const updatedWorkplace = await storage.updateWorkplace(parseInt(req.params.id), req.body);
    if (!updatedWorkplace) {
      return res.status(404).send("Workplace not found");
    }
    res.json(updatedWorkplace);
  });

  app.delete("/api/workplaces/:id", isAdmin, async (req, res) => {
    const success = await storage.deleteWorkplace(parseInt(req.params.id));
    if (!success) {
      return res.status(404).send("Workplace not found");
    }
    res.status(204).send();
  });

  // Worker/User routes
  app.get("/api/workers", isAuthenticated, async (req, res) => {
    const users = await storage.getAllUsers();
    
    // Don't expose password hashes
    const safeUsers = users.map(({ password, ...user }) => user);
    res.json(safeUsers);
  });
  
  // Vytvoření nového pracovníka
  app.post("/api/workers", isAdmin, async (req, res) => {
    try {
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
      
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Odebereme heslo před odesláním odpovědi
      const { password, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error: any) {
      console.error("Chyba při vytváření pracovníka:", error);
      res.status(500).json({ error: error.message || "Nepodařilo se vytvořit pracovníka" });
    }
  });
  
  // Aktualizace pracovníka
  app.patch("/api/workers/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      // Ověříme, zda pracovník existuje
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: "Pracovník nenalezen" });
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
  app.delete("/api/workers/:id", isAdmin, async (req, res) => {
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
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    let shifts;
    if (userId) {
      shifts = await storage.getUserShifts(userId);
    } else if (startDate && endDate) {
      shifts = await storage.getShiftsByDate(startDate, endDate);
    } else {
      shifts = await storage.getAllShifts();
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
  });

  app.post("/api/shifts", isAdmin, async (req, res) => {
    const shift = await storage.createShift(req.body);
    res.status(201).json(shift);
  });

  app.get("/api/shifts/:id", isAuthenticated, async (req, res) => {
    const shift = await storage.getShift(parseInt(req.params.id));
    if (!shift) {
      return res.status(404).send("Shift not found");
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
  });

  app.put("/api/shifts/:id", isAdmin, async (req, res) => {
    const updatedShift = await storage.updateShift(parseInt(req.params.id), req.body);
    if (!updatedShift) {
      return res.status(404).send("Shift not found");
    }
    res.json(updatedShift);
  });

  app.delete("/api/shifts/:id", isAdmin, async (req, res) => {
    const success = await storage.deleteShift(parseInt(req.params.id));
    if (!success) {
      return res.status(404).send("Shift not found");
    }
    res.status(204).send();
  });

  // Exchange request routes
  app.get("/api/exchange-requests", isAuthenticated, async (req, res) => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const pending = req.query.pending === "true";
    
    let requests;
    if (userId) {
      requests = await storage.getUserExchangeRequests(userId);
    } else if (pending) {
      requests = await storage.getPendingExchangeRequests();
    } else {
      requests = await storage.getAllExchangeRequests();
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
  });

  app.post("/api/exchange-requests", isAuthenticated, async (req, res) => {
    const request = await storage.createExchangeRequest(req.body);
    res.status(201).json(request);
  });

  app.put("/api/exchange-requests/:id", isAuthenticated, async (req, res) => {
    // Only allow the requestee or admin to update the request status
    const request = await storage.getExchangeRequest(parseInt(req.params.id));
    if (!request) {
      return res.status(404).send("Exchange request not found");
    }
    
    if (req.user && req.user.role !== "admin" && req.user.id !== request.requesteeId) {
      return res.status(403).send("Forbidden: Not authorized to update this request");
    }
    
    const updatedRequest = await storage.updateExchangeRequest(parseInt(req.params.id), req.body);
    
    // If approved, swap the shifts' user IDs
    if (updatedRequest && updatedRequest.status === "approved") {
      const requestShift = await storage.getShift(updatedRequest.requestShiftId);
      const offeredShift = await storage.getShift(updatedRequest.offeredShiftId);
      
      if (requestShift && offeredShift) {
        await storage.updateShift(requestShift.id, { userId: offeredShift.userId });
        await storage.updateShift(offeredShift.id, { userId: requestShift.userId });
      }
    }
    
    res.json(updatedRequest);
  });

  app.delete("/api/exchange-requests/:id", isAuthenticated, async (req, res) => {
    const request = await storage.getExchangeRequest(parseInt(req.params.id));
    if (!request) {
      return res.status(404).send("Exchange request not found");
    }
    
    // Only allow the requester or admin to delete the request
    if (req.user && req.user.role !== "admin" && req.user.id !== request.requesterId) {
      return res.status(403).send("Forbidden: Not authorized to delete this request");
    }
    
    const success = await storage.deleteExchangeRequest(parseInt(req.params.id));
    if (!success) {
      return res.status(404).send("Exchange request not found");
    }
    res.status(204).send();
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
      const shiftDate = new Date(shift.date);
      return shiftDate.getMonth() + 1 === month && shiftDate.getFullYear() === year;
    });
    
    // Calculate total hours worked
    let totalHours = 0;
    filteredShifts.forEach(shift => {
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
      const shiftDate = new Date(shift.date);
      return shiftDate >= firstDayOfMonth && shiftDate <= lastDayOfMonth;
    });
    
    // Calculate planned hours for current month
    let plannedHours = 0;
    currentMonthShifts.forEach(shift => {
      const startTime = new Date(shift.startTime);
      const endTime = new Date(shift.endTime);
      plannedHours += differenceInHours(endTime, startTime);
    });
    
    // Calculate worked hours (shifts in the past)
    let workedHours = 0;
    currentMonthShifts.forEach(shift => {
      const shiftDate = new Date(shift.date);
      if (shiftDate < now) {
        const startTime = new Date(shift.startTime);
        const endTime = new Date(shift.endTime);
        workedHours += differenceInHours(endTime, startTime);
      }
    });
    
    // Get upcoming shifts (next 14 days)
    const twoWeeksFromNow = new Date(now);
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
    
    const upcomingShifts = allUserShifts.filter(shift => {
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
  app.get("/api/documents", isAuthenticated, isAdmin, async (req, res) => {
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
  app.post("/api/documents/upload", isAuthenticated, isAdmin, upload.single('file'), async (req, res) => {
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
  app.get("/api/documents/file/:id", isAuthenticated, isAdmin, async (req, res) => {
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
  app.post("/api/documents", isAuthenticated, isAdmin, async (req, res) => {
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

  app.get("/api/documents/:id", isAuthenticated, isAdmin, async (req, res) => {
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

  app.delete("/api/documents/:id", isAuthenticated, isAdmin, async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
