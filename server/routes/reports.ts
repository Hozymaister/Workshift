import { Router } from "express";
import { differenceInHours } from "date-fns";
import { storage } from "../storage";
import { requireAuth } from "./common";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : req.user!.id;
    if (req.user!.role !== "admin" && userId !== req.user!.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const reports = await storage.getUserReports(userId);
    return res.json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    return res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.post("/generate", requireAuth, async (req, res) => {
  try {
    const { userId, month, year } = req.body;
    if (req.user!.role !== "admin" && userId !== req.user!.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const shifts = await storage.getUserShifts(userId);
    const filtered = shifts.filter((shift) => {
      if (!shift.date) return false;
      const date = new Date(shift.date);
      return date.getMonth() + 1 === month && date.getFullYear() === year;
    });

    const totalHours = filtered.reduce((hours, shift) => {
      if (!shift.startTime || !shift.endTime) return hours;
      return hours + differenceInHours(new Date(shift.endTime), new Date(shift.startTime));
    }, 0);

    const report = await storage.createReport({
      userId,
      month,
      year,
      totalHours,
      generated: new Date(),
    });

    return res.status(201).json(report);
  } catch (error) {
    console.error("Error generating report:", error);
    return res.status(500).json({ error: "Failed to generate report" });
  }
});

export default router;
