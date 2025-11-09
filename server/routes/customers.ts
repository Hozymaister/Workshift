import { Router } from "express";
import { storage } from "../storage";
import { hasDataAccess, requireAuth } from "./common";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const customers = await storage.getUserCustomers(req.user!.id);
    return res.json(customers);
  } catch (error) {
    console.error("Error getting customers:", error);
    return res.status(500).json({ error: "Failed to load customers" });
  }
});

router.get("/search", requireAuth, async (req, res) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const customers = await storage.searchCustomers(query, req.user!.id);
    return res.json(customers);
  } catch (error) {
    console.error("Error searching customers:", error);
    return res.status(500).json({ error: "Failed to search customers" });
  }
});

router.get("/:id", requireAuth, hasDataAccess("customer"), async (req, res) => {
  try {
    const customerId = Number(req.params.id);
    const customer = await storage.getCustomer(customerId);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    return res.json(customer);
  } catch (error) {
    console.error("Error getting customer:", error);
    return res.status(500).json({ error: "Failed to load customer" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const payload = { ...req.body, userId: req.user!.id };

    const validationError = validateCustomer(payload);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const customer = await storage.createCustomer(payload);
    return res.status(201).json(customer);
  } catch (error) {
    console.error("Error creating customer:", error);
    return res.status(500).json({ error: "Failed to create customer" });
  }
});

router.put("/:id", requireAuth, hasDataAccess("customer"), async (req, res) => {
  try {
    const customerId = Number(req.params.id);
    const { userId: _ignored, ...payload } = req.body ?? {};

    const validationError = validateCustomer({ ...payload, userId: req.user!.id });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const updated = await storage.updateCustomer(customerId, payload);
    if (!updated) {
      return res.status(404).json({ error: "Customer not found" });
    }

    return res.json(updated);
  } catch (error) {
    console.error("Error updating customer:", error);
    return res.status(500).json({ error: "Failed to update customer" });
  }
});

router.delete("/:id", requireAuth, hasDataAccess("customer"), async (req, res) => {
  try {
    const customerId = Number(req.params.id);
    const removed = await storage.deleteCustomer(customerId);
    if (!removed) {
      return res.status(404).json({ error: "Customer not found" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting customer:", error);
    return res.status(500).json({ error: "Failed to delete customer" });
  }
});

function validateCustomer(customer: any): string | undefined {
  if (!customer?.name || !customer?.address) {
    return "Name and address are required";
  }

  if (customer.dic && !/^CZ\d{8,10}$/.test(customer.dic)) {
    return "DIČ must be in format 'CZ' followed by 8-10 digits";
  }

  if (customer.ic && !/^\d{8}$/.test(customer.ic)) {
    return "IČO must be exactly 8 digits";
  }

  return undefined;
}

export default router;
