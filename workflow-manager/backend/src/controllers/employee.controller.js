import { validationResult } from 'express-validator';
import {
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
} from '../services/employee.service.js';

export const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const employee = await createEmployee(req.body);
    res.status(201).json(employee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const list = async (_req, res) => {
  const employees = await listEmployees();
  res.json(employees);
};

export const get = async (req, res) => {
  const employee = await getEmployee(req.params.id);
  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }
  res.json(employee);
};

export const update = async (req, res) => {
  const employee = await updateEmployee(req.params.id, req.body);
  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }
  res.json(employee);
};

export const remove = async (req, res) => {
  const deleted = await deleteEmployee(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: 'Employee not found' });
  }
  res.status(204).send();
};
