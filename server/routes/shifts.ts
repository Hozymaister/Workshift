import { Router } from "express";
import { storage } from "../storage";
import { hasDataAccess, requireAuth, requireRole } from "./common";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
    const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;
    const workplaceId = req.query.workplaceId ? Number(req.query.workplaceId) : undefined;

    let baseShifts;
    if (userId) {
      baseShifts = await storage.getUserShifts(userId);
    } else if (startDate && endDate) {
      baseShifts = await storage.getShiftsByDate(startDate, endDate);
    } else {
      baseShifts = await storage.getAllShifts();
    }

    let filtered = workplaceId ? baseShifts.filter((shift) => shift.workplaceId === workplaceId) : baseShifts;

    if (req.user?.role === "admin") {
      // No additional filtering.
    } else if (req.user?.role === "company") {
      const companyId = req.user.id;
      const employeeIds = (await storage.getAllUsers())
        .filter((user) => user.parentCompanyId === companyId)
        .map((user) => user.id);
      const workplaceIds = (await storage.getAllWorkplaces())
        .filter((workplace) => workplace.ownerId === companyId || workplace.managerId === companyId)
        .map((workplace) => workplace.id);

      filtered = filtered.filter(
        (shift) =>
          (shift.userId !== null && employeeIds.includes(shift.userId)) ||
          (shift.workplaceId !== null && workplaceIds.includes(shift.workplaceId)),
      );
    } else {
      filtered = filtered.filter((shift) => shift.userId === req.user?.id);
    }

    const result = await Promise.all(
      filtered.map(async (shift) => {
        const workplace = shift.workplaceId ? await storage.getWorkplace(shift.workplaceId) : null;
        const user = shift.userId ? await storage.getUser(shift.userId) : null;
        const safeUser = user ? { ...user, password: undefined } : null;

        return {
          ...shift,
          workplace,
          user: safeUser,
        };
      }),
    );

    return res.json(result);
  } catch (error) {
    console.error("Error fetching shifts:", error);
    return res.status(500).json({ error: "Failed to fetch shifts" });
  }
});

router.post("/", requireRole("admin", "company"), async (req, res) => {
  try {
    const payload = normalizeShiftPayload(req.body);

    if (!payload.workplaceId) {
      return res.status(400).json({ error: "Workplace ID is required" });
    }

    if (req.user?.role === "company") {
      const workplace = await storage.getWorkplace(payload.workplaceId);
      if (!workplace) {
        return res.status(404).json({ error: "Workplace not found" });
      }

      if (workplace.ownerId !== req.user.id && workplace.managerId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (payload.userId) {
        const worker = await storage.getUser(payload.userId);
        if (!worker) {
          return res.status(404).json({ error: "Worker not found" });
        }

        if (worker.parentCompanyId !== req.user.id) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }
    }

    const shift = await storage.createShift(payload);
    return res.status(201).json(shift);
  } catch (error) {
    console.error("Error creating shift:", error);
    return res.status(500).json({ error: "Failed to create shift" });
  }
});

router.get("/:id", requireAuth, hasDataAccess("shift"), async (req, res) => {
  try {
    const shiftId = Number(req.params.id);
    const shift = await storage.getShift(shiftId);

    if (!shift) {
      return res.status(404).json({ error: "Shift not found" });
    }

    const workplace = shift.workplaceId ? await storage.getWorkplace(shift.workplaceId) : null;
    const user = shift.userId ? await storage.getUser(shift.userId) : null;
    const safeUser = user ? { ...user, password: undefined } : null;

    return res.json({ ...shift, workplace, user: safeUser });
  } catch (error) {
    console.error("Error fetching shift:", error);
    return res.status(500).json({ error: "Failed to fetch shift" });
  }
});

router.put("/:id", requireAuth, hasDataAccess("shift"), async (req, res) => {
  try {
    const shiftId = Number(req.params.id);
    const existingShift = await storage.getShift(shiftId);

    if (!existingShift) {
      return res.status(404).json({ error: "Shift not found" });
    }

    const payload = normalizeShiftPayload(req.body);

    if (req.user?.role === "worker") {
      // Workers can only update metadata of their own shift.
      delete payload.userId;
      delete payload.workplaceId;
    }

    if (req.user?.role === "company") {
      if (payload.workplaceId && payload.workplaceId !== existingShift.workplaceId) {
        const workplace = await storage.getWorkplace(payload.workplaceId);
        if (!workplace) {
          return res.status(404).json({ error: "Workplace not found" });
        }

        if (workplace.ownerId !== req.user.id && workplace.managerId !== req.user.id) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }

      if (payload.userId && payload.userId !== existingShift.userId) {
        const worker = await storage.getUser(payload.userId);
        if (!worker) {
          return res.status(404).json({ error: "Worker not found" });
        }

        if (worker.parentCompanyId !== req.user.id) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }
    }

    const updated = await storage.updateShift(shiftId, payload);
    if (!updated) {
      return res.status(500).json({ error: "Failed to update shift" });
    }

    return res.json(updated);
  } catch (error) {
    console.error("Error updating shift:", error);
    return res.status(500).json({ error: "Failed to update shift" });
  }
});

router.delete("/:id", requireAuth, hasDataAccess("shift"), async (req, res) => {
  try {
    if (req.user?.role === "worker") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const shiftId = Number(req.params.id);
    const deleted = await storage.deleteShift(shiftId);
    if (!deleted) {
      return res.status(404).json({ error: "Shift not found" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting shift:", error);
    return res.status(500).json({ error: "Failed to delete shift" });
  }
});

function normalizeShiftPayload(input: any) {
  const payload: any = { ...input };

  if (payload.workplaceId !== undefined) {
    payload.workplaceId = Number(payload.workplaceId);
  }

  if (payload.userId !== undefined && payload.userId !== null) {
    payload.userId = Number(payload.userId);
  }

  if (typeof payload.date === "string") {
    payload.date = new Date(payload.date);
  }

  if (typeof payload.startTime === "string") {
    payload.startTime = new Date(payload.startTime);
  }

  if (typeof payload.endTime === "string") {
    payload.endTime = new Date(payload.endTime);
  }

  for (const key of ["date", "startTime", "endTime"] as const) {
    const value = payload[key];
    if (value instanceof Date && Number.isNaN(value.getTime())) {
      delete payload[key];
    }
  }

  return payload;
}

export default router;
