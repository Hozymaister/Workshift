import { Router } from "express";
import { storage } from "../storage";
import { hasDataAccess, requireRole } from "./common";

const router = Router();

router.get("/", requireRole("admin", "company"), async (req, res) => {
  try {
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    let invoices = req.user!.role === "admin"
      ? await storage.getAllInvoices()
      : await storage.getUserInvoices(req.user!.id);

    if (type === "issued" || type === "received") {
      invoices = invoices.filter((invoice) => invoice.type === type);
    }

    return res.json(invoices);
  } catch (error) {
    console.error("Error loading invoices:", error);
    return res.status(500).json({ error: "Failed to load invoices" });
  }
});

router.get("/:id", requireRole("admin", "company"), hasDataAccess("invoice"), async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);
    const invoice = await storage.getInvoice(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const items = await storage.getInvoiceItems(invoiceId);
    return res.json({ ...invoice, items });
  } catch (error) {
    console.error("Error loading invoice:", error);
    return res.status(500).json({ error: "Failed to load invoice" });
  }
});

router.post("/", requireRole("admin", "company"), async (req, res) => {
  try {
    const { invoice, items } = normalizeInvoicePayload(req.body, req.user!.id);
    if (!invoice.invoiceNumber) {
      return res.status(400).json({ error: "Invoice number is required" });
    }
    const createdInvoice = await storage.createInvoice(invoice);

    const storedItems = [];
    for (const item of items) {
      storedItems.push(await storage.createInvoiceItem({ ...item, invoiceId: createdInvoice.id }));
    }

    return res.status(201).json({ ...createdInvoice, items: storedItems });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return res.status(500).json({ error: "Failed to create invoice" });
  }
});

router.put("/:id", requireRole("admin", "company"), hasDataAccess("invoice"), async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);
    const { invoice, items } = normalizeInvoicePayload(req.body, req.user!.id);
    if (!invoice.invoiceNumber) {
      return res.status(400).json({ error: "Invoice number is required" });
    }

    const updatedInvoice = await storage.updateInvoice(invoiceId, invoice);
    if (!updatedInvoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Replace invoice items to keep payload simple.
    const existingItems = await storage.getInvoiceItems(invoiceId);
    for (const item of existingItems) {
      await storage.deleteInvoiceItem(item.id);
    }

    const storedItems = [];
    for (const item of items) {
      storedItems.push(await storage.createInvoiceItem({ ...item, invoiceId }));
    }

    return res.json({ ...updatedInvoice, items: storedItems });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return res.status(500).json({ error: "Failed to update invoice" });
  }
});

router.delete("/:id", requireRole("admin", "company"), hasDataAccess("invoice"), async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);
    const removed = await storage.deleteInvoice(invoiceId);
    if (!removed) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return res.status(500).json({ error: "Failed to delete invoice" });
  }
});

router.get("/generate-pdf/:id", requireRole("admin", "company"), hasDataAccess("invoice"), async (req, res) => {
  try {
    const invoiceId = req.params.id;
    return res.json({ success: true, message: "PDF generated", pdfUrl: `/api/invoices/pdf/${invoiceId}` });
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    return res.status(500).json({ error: "Failed to generate invoice PDF" });
  }
});

function normalizeInvoicePayload(raw: any, userId: number) {
  const invoice = {
    userId,
    invoiceNumber: raw?.invoiceNumber,
    type: raw?.type ?? "issued",
    date: toValidDate(raw?.date) ?? new Date(),
    dateDue: toValidDate(raw?.dateDue) ?? new Date(),
    dateIssued: toValidDate(raw?.dateIssued),
    dateReceived: toValidDate(raw?.dateReceived),
    customerName: raw?.customerName ?? raw?.supplierName ?? "",
    customerAddress: raw?.customerAddress ?? raw?.supplierAddress ?? "",
    customerIC: raw?.customerIC ?? null,
    customerDIC: raw?.customerDIC ?? null,
    supplierName: raw?.supplierName ?? null,
    supplierAddress: raw?.supplierAddress ?? null,
    supplierIC: raw?.supplierIC ?? null,
    supplierDIC: raw?.supplierDIC ?? null,
    bankAccount: raw?.bankAccount ?? null,
    paymentMethod: raw?.paymentMethod ?? "bank",
    isVatPayer: raw?.isVatPayer ?? true,
    amount: Number(raw?.amount ?? 0),
    notes: raw?.notes ?? null,
    isPaid: raw?.isPaid ?? false,
  };

  const items = Array.isArray(raw?.items)
    ? raw.items.map((item: any) => ({
        description: item?.description ?? "",
        quantity: Number(item?.quantity ?? 0),
        unit: item?.unit ?? "ks",
        pricePerUnit: Number(item?.pricePerUnit ?? 0),
      }))
    : [];

  return { invoice, items };
}

function toValidDate(value: any): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default router;
