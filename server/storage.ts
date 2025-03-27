import { 
  users, type User, type InsertUser,
  workplaces, type Workplace, type InsertWorkplace,
  shifts, type Shift, type InsertShift,
  exchangeRequests, type ExchangeRequest, type InsertExchangeRequest,
  reports, type Report, type InsertReport,
  customers, type Customer, type InsertCustomer,
  documents, type Document, type InsertDocument
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and, between, like, or, sql } from 'drizzle-orm';
import PgSession from 'connect-pg-simple';

const MemoryStore = createMemoryStore(session);

// Interface with methods for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Workplace operations
  getWorkplace(id: number): Promise<Workplace | undefined>;
  createWorkplace(workplace: InsertWorkplace): Promise<Workplace>;
  updateWorkplace(id: number, workplace: Partial<InsertWorkplace>): Promise<Workplace | undefined>;
  deleteWorkplace(id: number): Promise<boolean>;
  getAllWorkplaces(): Promise<Workplace[]>;
  
  // Shift operations
  getShift(id: number): Promise<Shift | undefined>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift | undefined>;
  deleteShift(id: number): Promise<boolean>;
  getAllShifts(): Promise<Shift[]>;
  getUserShifts(userId: number): Promise<Shift[]>;
  getShiftsByDate(startDate: Date | string, endDate: Date | string): Promise<Shift[]>;
  
  // Exchange request operations
  getExchangeRequest(id: number): Promise<ExchangeRequest | undefined>;
  createExchangeRequest(request: InsertExchangeRequest): Promise<ExchangeRequest>;
  updateExchangeRequest(id: number, request: Partial<InsertExchangeRequest>): Promise<ExchangeRequest | undefined>;
  deleteExchangeRequest(id: number): Promise<boolean>;
  getAllExchangeRequests(): Promise<ExchangeRequest[]>;
  getUserExchangeRequests(userId: number): Promise<ExchangeRequest[]>;
  getPendingExchangeRequests(): Promise<ExchangeRequest[]>;
  
  // Report operations
  getReport(id: number): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  getUserReports(userId: number): Promise<Report[]>;
  
  // Customer operations
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;
  getAllCustomers(): Promise<Customer[]>;
  getUserCustomers(userId: number): Promise<Customer[]>;
  searchCustomers(query: string, userId: number): Promise<Customer[]>;
  
  // Document operations
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  getAllDocuments(): Promise<Document[]>;
  getUserDocuments(userId: number): Promise<Document[]>;
  
  // Session store
  sessionStore: any; // Using any to avoid SessionStore type issues
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private workplaces: Map<number, Workplace>;
  private shifts: Map<number, Shift>;
  private exchangeRequests: Map<number, ExchangeRequest>;
  private reports: Map<number, Report>;
  private customers: Map<number, Customer>;
  private documents: Map<number, Document>;
  sessionStore: any; // Using any to avoid SessionStore type issues
  private userIdCounter: number;
  private workplaceIdCounter: number;
  private shiftIdCounter: number;
  private exchangeRequestIdCounter: number;
  private reportIdCounter: number;
  private customerIdCounter: number;
  private documentIdCounter: number;

  constructor() {
    this.users = new Map();
    this.workplaces = new Map();
    this.shifts = new Map();
    this.exchangeRequests = new Map();
    this.reports = new Map();
    this.customers = new Map();
    this.documents = new Map();
    this.userIdCounter = 1;
    this.workplaceIdCounter = 1;
    this.shiftIdCounter = 1;
    this.exchangeRequestIdCounter = 1;
    this.reportIdCounter = 1;
    this.customerIdCounter = 1;
    this.documentIdCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
    
    // Initialize some demo data
    this.initDemoData();
  }
  
  // Inicializace ukázkových dat
  private async initDemoData() {
    try {
      // Importujeme funkci pro hashování hesla
      const { hashPassword } = await import('./auth');
      
      // Inicializace správce
      if (!(await this.getUserByEmail("hozak.tomas@email.cz"))) {
        const hashedPassword = await hashPassword("123456");
        await this.createUser({
          firstName: "Hozak",
          lastName: "T",
          username: "hozak.t",
          email: "hozak.tomas@email.cz",
          password: hashedPassword,
          role: "admin"
        });
        console.log("Demo správce vytvořen: hozak.tomas@email.cz / 123456");
      }
    } catch (error) {
      console.error("Chyba při vytváření demo dat:", error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    // Zajistíme, že role je vždy definovaná a ostatní pole jsou null pokud nejsou definované
    const role = insertUser.role || "worker";
    const user: User = { 
      ...insertUser, 
      id, 
      role,
      dateOfBirth: insertUser.dateOfBirth ?? null,
      personalId: insertUser.personalId ?? null,
      phone: insertUser.phone ?? null,
      hourlyWage: insertUser.hourlyWage ?? null,
      notes: insertUser.notes ?? null,
      // Firemní údaje
      companyName: insertUser.companyName ?? null,
      companyId: insertUser.companyId ?? null,
      companyVatId: insertUser.companyVatId ?? null,
      companyAddress: insertUser.companyAddress ?? null,
      companyCity: insertUser.companyCity ?? null,
      companyZip: insertUser.companyZip ?? null,
      companyVerified: insertUser.companyVerified ?? false,
      parentCompanyId: insertUser.parentCompanyId ?? null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Workplace methods
  async getWorkplace(id: number): Promise<Workplace | undefined> {
    return this.workplaces.get(id);
  }

  async createWorkplace(insertWorkplace: InsertWorkplace): Promise<Workplace> {
    const id = this.workplaceIdCounter++;
    // Zajistíme, že všechny povinné atributy jsou nastaveny
    const workplace: Workplace = { 
      ...insertWorkplace, 
      id,
      address: insertWorkplace.address ?? null,
      notes: insertWorkplace.notes ?? null,
      // Firemní údaje
      companyName: insertWorkplace.companyName ?? null,
      companyId: insertWorkplace.companyId ?? null,
      companyVatId: insertWorkplace.companyVatId ?? null,
      companyAddress: insertWorkplace.companyAddress ?? null,
      managerId: insertWorkplace.managerId ?? null
    };
    this.workplaces.set(id, workplace);
    return workplace;
  }

  async updateWorkplace(id: number, workplace: Partial<InsertWorkplace>): Promise<Workplace | undefined> {
    const existingWorkplace = this.workplaces.get(id);
    if (!existingWorkplace) return undefined;
    
    const updatedWorkplace = { ...existingWorkplace, ...workplace };
    this.workplaces.set(id, updatedWorkplace);
    return updatedWorkplace;
  }

  async deleteWorkplace(id: number): Promise<boolean> {
    return this.workplaces.delete(id);
  }

  async getAllWorkplaces(): Promise<Workplace[]> {
    return Array.from(this.workplaces.values());
  }

  // Shift methods
  async getShift(id: number): Promise<Shift | undefined> {
    return this.shifts.get(id);
  }

  async createShift(insertShift: InsertShift): Promise<Shift> {
    const id = this.shiftIdCounter++;
    const shift: Shift = { 
      ...insertShift, 
      id,
      date: insertShift.date ?? null,
      startTime: insertShift.startTime ?? null,
      endTime: insertShift.endTime ?? null,
      notes: insertShift.notes ?? null,
      userId: insertShift.userId ?? null
    };
    this.shifts.set(id, shift);
    return shift;
  }

  async updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift | undefined> {
    const existingShift = this.shifts.get(id);
    if (!existingShift) return undefined;
    
    const updatedShift = { ...existingShift, ...shift };
    this.shifts.set(id, updatedShift);
    return updatedShift;
  }

  async deleteShift(id: number): Promise<boolean> {
    return this.shifts.delete(id);
  }

  async getAllShifts(): Promise<Shift[]> {
    return Array.from(this.shifts.values());
  }

  async getUserShifts(userId: number): Promise<Shift[]> {
    return Array.from(this.shifts.values()).filter(shift => shift.userId === userId);
  }

  async getShiftsByDate(startDate: Date | string, endDate: Date | string): Promise<Shift[]> {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    return Array.from(this.shifts.values()).filter(shift => {
      if (!shift.date) return false;
      const shiftDate = new Date(shift.date);
      return shiftDate >= start && shiftDate <= end;
    });
  }

  // Exchange request methods
  async getExchangeRequest(id: number): Promise<ExchangeRequest | undefined> {
    return this.exchangeRequests.get(id);
  }

  async createExchangeRequest(insertExchangeRequest: InsertExchangeRequest): Promise<ExchangeRequest> {
    const id = this.exchangeRequestIdCounter++;
    const exchangeRequest: ExchangeRequest = { 
      ...insertExchangeRequest, 
      id,
      status: insertExchangeRequest.status || "pending",
      notes: insertExchangeRequest.notes ?? null,
      requesteeId: insertExchangeRequest.requesteeId ?? null
    };
    this.exchangeRequests.set(id, exchangeRequest);
    return exchangeRequest;
  }

  async updateExchangeRequest(id: number, request: Partial<InsertExchangeRequest>): Promise<ExchangeRequest | undefined> {
    const existingRequest = this.exchangeRequests.get(id);
    if (!existingRequest) return undefined;
    
    const updatedRequest = { ...existingRequest, ...request };
    this.exchangeRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  async deleteExchangeRequest(id: number): Promise<boolean> {
    return this.exchangeRequests.delete(id);
  }

  async getAllExchangeRequests(): Promise<ExchangeRequest[]> {
    return Array.from(this.exchangeRequests.values());
  }

  async getUserExchangeRequests(userId: number): Promise<ExchangeRequest[]> {
    return Array.from(this.exchangeRequests.values()).filter(
      request => request.requesterId === userId || request.requesteeId === userId
    );
  }

  async getPendingExchangeRequests(): Promise<ExchangeRequest[]> {
    return Array.from(this.exchangeRequests.values()).filter(
      request => request.status === "pending"
    );
  }

  // Report methods
  async getReport(id: number): Promise<Report | undefined> {
    return this.reports.get(id);
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const id = this.reportIdCounter++;
    const report: Report = { ...insertReport, id };
    this.reports.set(id, report);
    return report;
  }

  async getUserReports(userId: number): Promise<Report[]> {
    return Array.from(this.reports.values()).filter(report => report.userId === userId);
  }

  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = this.customerIdCounter++;
    const customer: Customer = { 
      ...insertCustomer, 
      id, 
      createdAt: new Date(),
      email: insertCustomer.email ?? null,
      notes: insertCustomer.notes ?? null,
      city: insertCustomer.city ?? null,
      zip: insertCustomer.zip ?? null,
      ic: insertCustomer.ic ?? null,
      dic: insertCustomer.dic ?? null,
      phone: insertCustomer.phone ?? null
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: number, customerData: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const existingCustomer = this.customers.get(id);
    if (!existingCustomer) return undefined;
    
    const updatedCustomer = { ...existingCustomer, ...customerData };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    return this.customers.delete(id);
  }

  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getUserCustomers(userId: number): Promise<Customer[]> {
    return Array.from(this.customers.values()).filter(customer => customer.userId === userId);
  }

  async searchCustomers(query: string, userId: number): Promise<Customer[]> {
    if (!query) return this.getUserCustomers(userId);
    
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.customers.values()).filter(customer => 
      (customer.userId === userId) && (
        customer.name.toLowerCase().includes(lowercaseQuery) ||
        (customer.ic && customer.ic.toLowerCase().includes(lowercaseQuery)) ||
        (customer.dic && customer.dic.toLowerCase().includes(lowercaseQuery)) ||
        (customer.email && customer.email.toLowerCase().includes(lowercaseQuery))
      )
    );
  }

  // Document methods
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentIdCounter++;
    const document: Document = { 
      ...insertDocument, 
      id, 
      createdAt: new Date(),
      thumbnailPath: insertDocument.thumbnailPath ?? null
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: number, documentData: Partial<InsertDocument>): Promise<Document | undefined> {
    const existingDocument = this.documents.get(id);
    if (!existingDocument) return undefined;
    
    const updatedDocument = { ...existingDocument, ...documentData };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async getUserDocuments(userId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(document => document.userId === userId);
  }
}

// PostgreSQL storage implementation
export class PostgreSQLStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  sessionStore: any;

  constructor() {
    const sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(sql);
    
    // Initialize session store with PostgreSQL
    const PgStore = PgSession(session);
    this.sessionStore = new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true,
    });

    // Note: We'll initialize demo data after tables are created
    // The initDemoData method will be called separately after migrations
  }
  
  // Method to initialize the demo data after tables are created
  public async initialize() {
    await this.initDemoData();
  }

  private async initDemoData() {
    try {
      // Import hashPassword function
      const { hashPassword } = await import('./auth');
      
      // Check if admin user already exists
      const adminUser = await this.getUserByEmail("hozak.tomas@email.cz");
      
      if (!adminUser) {
        const hashedPassword = await hashPassword("123456");
        const user = await this.createUser({
          firstName: "Hozak",
          lastName: "T",
          username: "hozak.t",
          email: "hozak.tomas@email.cz",
          password: hashedPassword,
          role: "admin"
        });
        console.log("Demo admin created: hozak.tomas@email.cz / 123456");
        
        // Vytvoření ukázkového pracoviště
        const workplace = await this.createWorkplace({
          name: "Centrála",
          type: "warehouse",
          address: "Pražská 123, Praha",
          notes: "Hlavní sklad"
        });
        
        // Vytvoření ukázkové směny s platným datem
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        await this.createShift({
          workplaceId: workplace.id,
          userId: user.id,
          date: today.toISOString(),
          startTime: new Date(today.setHours(8, 0, 0, 0)).toISOString(),
          endTime: new Date(today.setHours(16, 0, 0, 0)).toISOString(),
          notes: "Ranní směna"
        });
        
        await this.createShift({
          workplaceId: workplace.id,
          userId: user.id,
          date: tomorrow.toISOString(),
          startTime: new Date(tomorrow.setHours(8, 0, 0, 0)).toISOString(),
          endTime: new Date(tomorrow.setHours(16, 0, 0, 0)).toISOString(),
          notes: "Další směna"
        });
        
        console.log("Demo pracovní směny vytvořeny");
      }
    } catch (error) {
      console.error("Error creating demo data:", error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Ensure lowercase email for consistency
    const userData = {
      ...insertUser,
      email: insertUser.email.toLowerCase(),
      role: insertUser.role || "worker"
    };
    
    const result = await this.db.insert(users).values(userData).returning();
    return result[0];
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    // If email is provided, ensure it's lowercase
    if (userData.email) {
      userData.email = userData.email.toLowerCase();
    }
    
    const result = await this.db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    return result[0];
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await this.db.delete(users).where(eq(users.id, id));
    return !!result;
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  // Workplace methods
  async getWorkplace(id: number): Promise<Workplace | undefined> {
    const result = await this.db.select().from(workplaces).where(eq(workplaces.id, id));
    return result[0];
  }

  async createWorkplace(workplace: InsertWorkplace): Promise<Workplace> {
    const result = await this.db.insert(workplaces).values(workplace).returning();
    return result[0];
  }

  async updateWorkplace(id: number, workplace: Partial<InsertWorkplace>): Promise<Workplace | undefined> {
    const result = await this.db
      .update(workplaces)
      .set(workplace)
      .where(eq(workplaces.id, id))
      .returning();
    
    return result[0];
  }

  async deleteWorkplace(id: number): Promise<boolean> {
    const result = await this.db.delete(workplaces).where(eq(workplaces.id, id));
    return !!result;
  }

  async getAllWorkplaces(): Promise<Workplace[]> {
    return await this.db.select().from(workplaces);
  }

  // Shift methods
  async getShift(id: number): Promise<Shift | undefined> {
    const result = await this.db.select().from(shifts).where(eq(shifts.id, id));
    return result[0];
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const result = await this.db.insert(shifts).values(shift).returning();
    return result[0];
  }

  async updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift | undefined> {
    const result = await this.db
      .update(shifts)
      .set(shift)
      .where(eq(shifts.id, id))
      .returning();
    
    return result[0];
  }

  async deleteShift(id: number): Promise<boolean> {
    const result = await this.db.delete(shifts).where(eq(shifts.id, id));
    return !!result;
  }

  async getAllShifts(): Promise<Shift[]> {
    return await this.db.select().from(shifts);
  }

  async getUserShifts(userId: number): Promise<Shift[]> {
    return await this.db.select().from(shifts).where(eq(shifts.userId, userId));
  }

  async getShiftsByDate(startDate: Date | string, endDate: Date | string): Promise<Shift[]> {
    // Převést parametry na string pro PostgreSQL
    const startDateStr = typeof startDate === 'string' ? startDate : startDate.toISOString();
    const endDateStr = typeof endDate === 'string' ? endDate : endDate.toISOString();
    
    // Použijte text pro "between" query místo Date objektů
    return await this.db
      .select()
      .from(shifts)
      .where(sql`${shifts.date} BETWEEN ${startDateStr} AND ${endDateStr}`);
  }

  // Exchange request methods
  async getExchangeRequest(id: number): Promise<ExchangeRequest | undefined> {
    const result = await this.db.select().from(exchangeRequests).where(eq(exchangeRequests.id, id));
    return result[0];
  }

  async createExchangeRequest(request: InsertExchangeRequest): Promise<ExchangeRequest> {
    const result = await this.db.insert(exchangeRequests).values(request).returning();
    return result[0];
  }

  async updateExchangeRequest(id: number, request: Partial<InsertExchangeRequest>): Promise<ExchangeRequest | undefined> {
    const result = await this.db
      .update(exchangeRequests)
      .set(request)
      .where(eq(exchangeRequests.id, id))
      .returning();
    
    return result[0];
  }

  async deleteExchangeRequest(id: number): Promise<boolean> {
    const result = await this.db.delete(exchangeRequests).where(eq(exchangeRequests.id, id));
    return !!result;
  }

  async getAllExchangeRequests(): Promise<ExchangeRequest[]> {
    return await this.db.select().from(exchangeRequests);
  }

  async getUserExchangeRequests(userId: number): Promise<ExchangeRequest[]> {
    return await this.db
      .select()
      .from(exchangeRequests)
      .where(
        or(
          eq(exchangeRequests.requesterId, userId),
          eq(exchangeRequests.requesteeId, userId)
        )
      );
  }

  async getPendingExchangeRequests(): Promise<ExchangeRequest[]> {
    return await this.db
      .select()
      .from(exchangeRequests)
      .where(eq(exchangeRequests.status, "pending"));
  }

  // Report methods
  async getReport(id: number): Promise<Report | undefined> {
    const result = await this.db.select().from(reports).where(eq(reports.id, id));
    return result[0];
  }

  async createReport(report: InsertReport): Promise<Report> {
    const result = await this.db.insert(reports).values(report).returning();
    return result[0];
  }

  async getUserReports(userId: number): Promise<Report[]> {
    return await this.db.select().from(reports).where(eq(reports.userId, userId));
  }

  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    const result = await this.db.select().from(customers).where(eq(customers.id, id));
    return result[0];
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const result = await this.db.insert(customers).values(customer).returning();
    return result[0];
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const result = await this.db
      .update(customers)
      .set(customer)
      .where(eq(customers.id, id))
      .returning();
    
    return result[0];
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const result = await this.db.delete(customers).where(eq(customers.id, id));
    return !!result;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await this.db.select().from(customers);
  }

  async getUserCustomers(userId: number): Promise<Customer[]> {
    return await this.db.select().from(customers).where(eq(customers.userId, userId));
  }

  async searchCustomers(query: string, userId: number): Promise<Customer[]> {
    if (!query) {
      return this.getUserCustomers(userId);
    }
    
    return await this.db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.userId, userId),
          or(
            like(customers.name, `%${query}%`),
            // Odstranili jsme podmínky pro sloupce ic a dic které mohou chybět v databázi
            like(customers.email || '', `%${query}%`)
          )
        )
      );
  }

  // Document methods
  async getDocument(id: number): Promise<Document | undefined> {
    const result = await this.db.select().from(documents).where(eq(documents.id, id));
    return result[0];
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const result = await this.db.insert(documents).values(document).returning();
    return result[0];
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined> {
    const result = await this.db
      .update(documents)
      .set(document)
      .where(eq(documents.id, id))
      .returning();
    
    return result[0];
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await this.db.delete(documents).where(eq(documents.id, id));
    return !!result;
  }

  async getAllDocuments(): Promise<Document[]> {
    return await this.db.select().from(documents);
  }

  async getUserDocuments(userId: number): Promise<Document[]> {
    return await this.db.select().from(documents).where(eq(documents.userId, userId));
  }
}

// Use PostgreSQL storage in production, MemStorage as fallback
export const storage = process.env.DATABASE_URL 
  ? new PostgreSQLStorage() 
  : new MemStorage();
