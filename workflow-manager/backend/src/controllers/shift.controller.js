import { validationResult } from 'express-validator';
import {
  createShift,
  listShifts,
  getShift,
  updateShift,
  deleteShift,
} from '../services/shift.service.js';

export const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const shift = await createShift(req.body);
    res.status(201).json(shift);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const list = async (_req, res) => {
  const shifts = await listShifts();
  res.json(shifts);
};

export const get = async (req, res) => {
  const shift = await getShift(req.params.id);
  if (!shift) {
    return res.status(404).json({ message: 'Shift not found' });
  }
  res.json(shift);
};

export const update = async (req, res) => {
  const shift = await updateShift(req.params.id, req.body);
  if (!shift) {
    return res.status(404).json({ message: 'Shift not found' });
  }
  res.json(shift);
};

export const remove = async (req, res) => {
  const deleted = await deleteShift(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: 'Shift not found' });
  }
  res.status(204).send();
};
