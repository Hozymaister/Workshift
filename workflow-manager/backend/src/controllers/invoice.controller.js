import { validationResult } from 'express-validator';
import {
  createInvoice,
  listInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
} from '../services/invoice.service.js';

export const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const invoice = await createInvoice(req.body);
    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const list = async (_req, res) => {
  const invoices = await listInvoices();
  res.json(invoices);
};

export const get = async (req, res) => {
  const invoice = await getInvoice(req.params.id);
  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }
  res.json(invoice);
};

export const update = async (req, res) => {
  const invoice = await updateInvoice(req.params.id, req.body);
  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }
  res.json(invoice);
};

export const remove = async (req, res) => {
  const deleted = await deleteInvoice(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: 'Invoice not found' });
  }
  res.status(204).send();
};
