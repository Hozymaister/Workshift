import { Router, type Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "./common";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const pending = req.query.pending === "true";

    let requests;
    if (userId) {
      requests = await storage.getUserExchangeRequests(userId);
    } else if (pending) {
      requests = await storage.getPendingExchangeRequests();
    } else {
      requests = await storage.getAllExchangeRequests();
    }

    let filtered = [...requests];
    if (req.user?.role === "admin") {
      // keep all
    } else if (req.user?.role === "company") {
      const employees = (await storage.getAllUsers())
        .filter((user) => user.parentCompanyId === req.user!.id)
        .map((user) => user.id);
      filtered = filtered.filter(
        (request) =>
          employees.includes(request.requesterId) ||
          (request.requesteeId !== null && employees.includes(request.requesteeId)),
      );
    } else {
      filtered = filtered.filter(
        (request) => request.requesterId === req.user!.id || request.requesteeId === req.user!.id,
      );
    }

    const result = await Promise.all(
      filtered.map(async (request) => {
        const requester = await storage.getUser(request.requesterId);
        const requestee = request.requesteeId ? await storage.getUser(request.requesteeId) : null;
        const requestShift = await storage.getShift(request.requestShiftId);
        const offeredShift = await storage.getShift(request.offeredShiftId);

        return {
          ...request,
          requester: requester ? { ...requester, password: undefined } : null,
          requestee: requestee ? { ...requestee, password: undefined } : null,
          requestShift,
          offeredShift,
        };
      }),
    );

    return res.json(result);
  } catch (error) {
    console.error("Error fetching exchange requests:", error);
    return res.status(500).json({ error: "Failed to fetch exchange requests" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const data = { ...req.body };

    if (req.user?.role !== "admin" && req.user?.role !== "company") {
      data.requesterId = req.user!.id;
      const shift = await storage.getShift(data.requestShiftId);
      if (!shift || shift.userId !== req.user!.id) {
        return res.status(403).json({ error: "Cannot exchange a shift that is not yours" });
      }
    }

    if (req.user?.role === "company") {
      const employees = (await storage.getAllUsers())
        .filter((user) => user.parentCompanyId === req.user!.id)
        .map((user) => user.id);

      const requestShift = await storage.getShift(data.requestShiftId);
      const offeredShift = await storage.getShift(data.offeredShiftId);

      if (!requestShift || !offeredShift) {
        return res.status(404).json({ error: "Shift not found" });
      }

      if (!employees.includes(requestShift.userId ?? -1) || !employees.includes(offeredShift.userId ?? -1)) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const request = await storage.createExchangeRequest(data);
    return res.status(201).json(request);
  } catch (error) {
    console.error("Error creating exchange request:", error);
    return res.status(500).json({ error: "Failed to create exchange request" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const request = await storage.getExchangeRequest(requestId);
    if (!request) {
      return res.status(404).json({ error: "Exchange request not found" });
    }

    if (!(await canManageRequest(req.user!, request))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updated = await storage.updateExchangeRequest(requestId, req.body);
    if (!updated) {
      return res.status(500).json({ error: "Failed to update exchange request" });
    }

    if (updated.status === "approved") {
      const requestShift = await storage.getShift(updated.requestShiftId);
      const offeredShift = await storage.getShift(updated.offeredShiftId);

      if (requestShift && offeredShift) {
        await storage.updateShift(requestShift.id, { userId: offeredShift.userId });
        await storage.updateShift(offeredShift.id, { userId: requestShift.userId });
      }
    }

    return res.json(updated);
  } catch (error) {
    console.error("Error updating exchange request:", error);
    return res.status(500).json({ error: "Failed to update exchange request" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const request = await storage.getExchangeRequest(requestId);
    if (!request) {
      return res.status(404).json({ error: "Exchange request not found" });
    }

    if (!(await canManageRequest(req.user!, request, { allowRequester: true }))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const removed = await storage.deleteExchangeRequest(requestId);
    if (!removed) {
      return res.status(404).json({ error: "Exchange request not found" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting exchange request:", error);
    return res.status(500).json({ error: "Failed to delete exchange request" });
  }
});

async function canManageRequest(
  user: Express.User,
  request: Awaited<ReturnType<typeof storage.getExchangeRequest>>,
  options: { allowRequester?: boolean } = {},
) {
  if (user.role === "admin") {
    return true;
  }

  if (user.role === "company") {
    const employees = (await storage.getAllUsers())
      .filter((candidate) => candidate.parentCompanyId === user.id)
      .map((candidate) => candidate.id);

    return (
      employees.includes(request!.requesterId) ||
      (request!.requesteeId !== null && employees.includes(request!.requesteeId))
    );
  }

  if (options.allowRequester) {
    return request!.requesterId === user.id;
  }

  return request!.requesteeId === user.id;
}

export default router;
