import type { RequestHandler } from "express";
import { storage } from "../storage";

type Role = "admin" | "company" | "worker";

type Resource = "workplace" | "shift" | "customer" | "invoice" | "document";

type ResourceAccessOptions = {
  /** Name of the route param containing the identifier. Defaults to `id`. */
  param?: string;
};

export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }

  return res.status(401).json({ error: "Unauthorized" });
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, res, next) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!roles.includes(req.user.role as Role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return next();
  };
}

export function hasDataAccess(resource: Resource, options?: ResourceAccessOptions): RequestHandler {
  const paramName = options?.param ?? "id";

  return async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (req.user.role === "admin") {
        return next();
      }

      const rawId = req.params[paramName];
      if (!rawId) {
        // No specific entity is targeted (e.g. collection routes). Allow the handler to apply scoping.
        return next();
      }

      const entityId = Number(rawId);
      if (!Number.isFinite(entityId)) {
        return res.status(400).json({ error: "Invalid identifier" });
      }

      switch (resource) {
        case "workplace": {
          const workplace = await storage.getWorkplace(entityId);
          if (!workplace) {
            return res.status(404).json({ error: "Workplace not found" });
          }

          const hasCompanyAccess =
            req.user.role === "company" &&
            (workplace.ownerId === req.user.id || workplace.managerId === req.user.id);

          if (req.user.role === "company" && !hasCompanyAccess) {
            return res.status(403).json({ error: "Forbidden" });
          }

          if (req.user.role === "worker") {
            const userShifts = await storage.getUserShifts(req.user.id);
            const canAccess = userShifts.some((shift) => shift.workplaceId === workplace.id);
            if (!canAccess) {
              return res.status(403).json({ error: "Forbidden" });
            }
          }

          return next();
        }
        case "shift": {
          const shift = await storage.getShift(entityId);
          if (!shift) {
            return res.status(404).json({ error: "Shift not found" });
          }

          if (req.user.role === "worker") {
            if (shift.userId !== req.user.id) {
              return res.status(403).json({ error: "Forbidden" });
            }
            return next();
          }

          if (req.user.role === "company") {
            if (shift.workplaceId) {
              const workplace = await storage.getWorkplace(shift.workplaceId);
              if (workplace && (workplace.ownerId === req.user.id || workplace.managerId === req.user.id)) {
                return next();
              }
            }

            if (shift.userId) {
              const worker = await storage.getUser(shift.userId);
              if (worker && worker.parentCompanyId === req.user.id) {
                return next();
              }
            }

            return res.status(403).json({ error: "Forbidden" });
          }

          return next();
        }
        case "customer": {
          const customer = await storage.getCustomer(entityId);
          return handleOwnership(customer, req.user.role, req.user.id, res, next, "Customer not found");
        }
        case "invoice": {
          const invoice = await storage.getInvoice(entityId);
          return handleOwnership(invoice, req.user.role, req.user.id, res, next, "Invoice not found");
        }
        case "document": {
          const document = await storage.getDocument(entityId);
          return handleOwnership(document, req.user.role, req.user.id, res, next, "Document not found");
        }
      }
    } catch (error) {
      console.error("Authorization error:", error);
      return res.status(500).json({ error: "Authorization error" });
    }
  };
}

function handleOwnership<T extends { userId: number | null }>(
  entity: T | undefined,
  role: Role,
  userId: number,
  res: Parameters<RequestHandler>[1],
  next: Parameters<RequestHandler>[2],
  notFoundMessage: string,
) {
  if (!entity) {
    return res.status(404).json({ error: notFoundMessage });
  }

  if (role === "worker") {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (role === "company" && entity.userId !== userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return next();
}
