import { validationResult } from 'express-validator';
import {
  createAttendance,
  listAttendance,
  updateAttendance,
  deleteAttendance,
} from '../services/attendance.service.js';

export const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const record = await createAttendance(req.body);
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const list = async (_req, res) => {
  const records = await listAttendance();
  res.json(records);
};

export const update = async (req, res) => {
  const record = await updateAttendance(req.params.id, req.body);
  if (!record) {
    return res.status(404).json({ message: 'Attendance record not found' });
  }
  res.json(record);
};

export const remove = async (req, res) => {
  const deleted = await deleteAttendance(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: 'Attendance record not found' });
  }
  res.status(204).send();
};
