import { validationResult } from 'express-validator';
import {
  generatePayroll,
  listPayrolls,
  updatePayrollStatus,
  deletePayroll,
} from '../services/payroll.service.js';

export const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const payroll = await generatePayroll(req.body);
    res.status(201).json(payroll);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const list = async (_req, res) => {
  const payrolls = await listPayrolls();
  res.json(payrolls);
};

export const updateStatus = async (req, res) => {
  const payroll = await updatePayrollStatus(req.params.id, req.body.status);
  if (!payroll) {
    return res.status(404).json({ message: 'Payroll not found' });
  }
  res.json(payroll);
};

export const remove = async (req, res) => {
  const deleted = await deletePayroll(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: 'Payroll not found' });
  }
  res.status(204).send();
};
