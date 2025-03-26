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
  getShiftsByDate(startDate: Date, endDate: Date): Promise<Shift[]>;
  
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
      notes: insertUser.notes ?? null
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
      notes: insertWorkplace.notes ?? null 
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

  async getShiftsByDate(startDate: Date, endDate: Date): Promise<Shift[]> {
    return Array.from(this.shifts.values()).filter(shift => {
      const shiftDate = new Date(shift.date);
      return shiftDate >= startDate && shiftDate <= endDate;
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

export const storage = new MemStorage();
