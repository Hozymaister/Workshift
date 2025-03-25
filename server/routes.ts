import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { format, parseISO, addHours, differenceInHours } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  // Sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Middleware to check if user is authenticated
  const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).send("Unauthorized");
  };

  // Middleware to check if user is admin
  const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === "admin") {
      return next();
    }
    res.status(403).send("Forbidden: Admin access required");
  };

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
    
    if (req.user.role !== "admin" && req.user.id !== request.requesteeId) {
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
    if (req.user.role !== "admin" && req.user.id !== request.requesterId) {
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
    const userId = req.query.userId ? parseInt(req.query.userId as string) : req.user.id;
    
    // Non-admin users can only access their own reports
    if (req.user.role !== "admin" && userId !== req.user.id) {
      return res.status(403).send("Forbidden: Not authorized to access these reports");
    }
    
    const reports = await storage.getUserReports(userId);
    res.json(reports);
  });

  app.post("/api/reports/generate", isAuthenticated, async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
