import { 
  users, type User, type InsertUser,
  workplaces, type Workplace, type InsertWorkplace,
  shifts, type Shift, type InsertShift,
  exchangeRequests, type ExchangeRequest, type InsertExchangeRequest,
  reports, type Report, type InsertReport 
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
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private workplaces: Map<number, Workplace>;
  private shifts: Map<number, Shift>;
  private exchangeRequests: Map<number, ExchangeRequest>;
  private reports: Map<number, Report>;
  sessionStore: session.SessionStore;
  private userIdCounter: number;
  private workplaceIdCounter: number;
  private shiftIdCounter: number;
  private exchangeRequestIdCounter: number;
  private reportIdCounter: number;

  constructor() {
    this.users = new Map();
    this.workplaces = new Map();
    this.shifts = new Map();
    this.exchangeRequests = new Map();
    this.reports = new Map();
    this.userIdCounter = 1;
    this.workplaceIdCounter = 1;
    this.shiftIdCounter = 1;
    this.exchangeRequestIdCounter = 1;
    this.reportIdCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Workplace methods
  async getWorkplace(id: number): Promise<Workplace | undefined> {
    return this.workplaces.get(id);
  }

  async createWorkplace(insertWorkplace: InsertWorkplace): Promise<Workplace> {
    const id = this.workplaceIdCounter++;
    const workplace: Workplace = { ...insertWorkplace, id };
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
    const shift: Shift = { ...insertShift, id };
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
    const exchangeRequest: ExchangeRequest = { ...insertExchangeRequest, id };
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
}

export const storage = new MemStorage();
