import { Router } from "express";
import { storage } from "../storage";
import { hasDataAccess, requireAuth, requireRole } from "./common";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    if (req.user?.role === "admin") {
      const workplaces = await storage.getAllWorkplaces();
      return res.json(workplaces);
    }

    if (req.user?.role === "company") {
      const workplaces = (await storage.getAllWorkplaces()).filter(
        (workplace) => workplace.ownerId === req.user?.id || workplace.managerId === req.user?.id,
      );

      return res.json(workplaces);
    }

    const shifts = await storage.getUserShifts(req.user?.id ?? 0);
    const uniqueIds = Array.from(new Set(shifts.map((shift) => shift.workplaceId))).filter(
      (id): id is number => Boolean(id),
    );

    const workplaces = await Promise.all(uniqueIds.map((id) => storage.getWorkplace(id)));
    return res.json(workplaces.filter(Boolean));
  } catch (error) {
    console.error("Error fetching workplaces:", error);
    return res.status(500).json({ error: "Failed to fetch workplaces" });
  }
});

router.post("/", requireRole("admin", "company"), async (req, res) => {
  try {
    const workplace = await storage.createWorkplace({
      ...req.body,
      ownerId: req.user!.id,
    });

    return res.status(201).json(workplace);
  } catch (error) {
    console.error("Error creating workplace:", error);
    return res.status(500).json({ error: "Failed to create workplace" });
  }
});

router.get("/:id", requireAuth, hasDataAccess("workplace"), async (req, res) => {
  try {
    const workplaceId = Number(req.params.id);
    const workplace = await storage.getWorkplace(workplaceId);

    if (!workplace) {
      return res.status(404).json({ error: "Workplace not found" });
    }

    return res.json(workplace);
  } catch (error) {
    console.error("Error fetching workplace:", error);
    return res.status(500).json({ error: "Failed to fetch workplace" });
  }
});

router.put("/:id", requireAuth, hasDataAccess("workplace"), async (req, res) => {
  try {
    if (req.user?.role === "worker") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const workplaceId = Number(req.params.id);
    const existingWorkplace = await storage.getWorkplace(workplaceId);
    if (!existingWorkplace) {
      return res.status(404).json({ error: "Workplace not found" });
    }

    const isAdmin = req.user?.role === "admin";
    const isOwner = req.user?.role === "company" && existingWorkplace.ownerId === req.user?.id;
    const isManager = req.user?.role === "company" && existingWorkplace.managerId === req.user?.id;

    if (!isAdmin && !isOwner && !isManager) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const payload = { ...req.body };
    if (!isAdmin && !isOwner && "ownerId" in payload) {
      delete payload.ownerId;
    }

    if (payload.managerId !== undefined && payload.managerId !== null) {
      payload.managerId = Number(payload.managerId);
    }

    const updated = await storage.updateWorkplace(workplaceId, payload);
    if (!updated) {
      return res.status(500).json({ error: "Failed to update workplace" });
    }

    return res.json(updated);
  } catch (error) {
    console.error("Error updating workplace:", error);
    return res.status(500).json({ error: "Failed to update workplace" });
  }
});

router.patch("/:id", requireAuth, hasDataAccess("workplace"), async (req, res) => {
  try {
    if (req.user?.role === "worker") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const workplaceId = Number(req.params.id);
    const existingWorkplace = await storage.getWorkplace(workplaceId);
    if (!existingWorkplace) {
      return res.status(404).json({ error: "Workplace not found" });
    }

    const isAdmin = req.user?.role === "admin";
    const isOwner = req.user?.role === "company" && existingWorkplace.ownerId === req.user?.id;
    const isManager = req.user?.role === "company" && existingWorkplace.managerId === req.user?.id;

    if (!isAdmin && !isOwner && !isManager) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const payload = { ...req.body };
    if (!isAdmin && !isOwner && "ownerId" in payload) {
      delete payload.ownerId;
    }

    if (payload.managerId !== undefined && payload.managerId !== null) {
      payload.managerId = Number(payload.managerId);
    }

    const updated = await storage.updateWorkplace(workplaceId, payload);
    if (!updated) {
      return res.status(500).json({ error: "Failed to update workplace" });
    }

    return res.json(updated);
  } catch (error) {
    console.error("Error updating workplace:", error);
    return res.status(500).json({ error: "Failed to update workplace" });
  }
});

router.delete("/:id", requireAuth, hasDataAccess("workplace"), async (req, res) => {
  try {
    if (req.user?.role === "worker") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const workplaceId = Number(req.params.id);
    const existingWorkplace = await storage.getWorkplace(workplaceId);
    if (!existingWorkplace) {
      return res.status(404).json({ error: "Workplace not found" });
    }

    const isAdmin = req.user?.role === "admin";
    const isOwner = req.user?.role === "company" && existingWorkplace.ownerId === req.user?.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const success = await storage.deleteWorkplace(workplaceId);
    if (!success) {
      return res.status(500).json({ error: "Failed to delete workplace" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting workplace:", error);
    return res.status(500).json({ error: "Failed to delete workplace" });
  }
});

export default router;
