import { Router } from "express";
import { differenceInHours } from "date-fns";
import { storage } from "../storage";
import { requireAuth } from "./common";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    const shifts = await storage.getUserShifts(userId);
    const currentMonthShifts = shifts.filter((shift) => {
      if (!shift.date) return false;
      const shiftDate = new Date(shift.date);
      return shiftDate >= firstDay && shiftDate <= lastDay;
    });

    const plannedHours = currentMonthShifts.reduce((sum, shift) => {
      if (!shift.startTime || !shift.endTime) return sum;
      return sum + differenceInHours(new Date(shift.endTime), new Date(shift.startTime));
    }, 0);

    const workedHours = currentMonthShifts.reduce((sum, shift) => {
      if (!shift.date || !shift.startTime || !shift.endTime) return sum;
      const shiftDate = new Date(shift.date);
      if (shiftDate >= now) return sum;
      return sum + differenceInHours(new Date(shift.endTime), new Date(shift.startTime));
    }, 0);

    const twoWeeks = new Date(now);
    twoWeeks.setDate(twoWeeks.getDate() + 14);

    const upcomingShifts = shifts.filter((shift) => {
      if (!shift.date) return false;
      const shiftDate = new Date(shift.date);
      return shiftDate >= now && shiftDate <= twoWeeks;
    }).length;

    const exchangeRequests = await storage.getUserExchangeRequests(userId);
    const pendingRequests = exchangeRequests.filter(
      (request) => request.status === "pending" && request.requesteeId === userId,
    ).length;

    return res.json({ plannedHours, workedHours, upcomingShifts, exchangeRequests: pendingRequests });
  } catch (error) {
    console.error("Error computing stats:", error);
    return res.status(500).json({ error: "Failed to compute stats" });
  }
});

export default router;
