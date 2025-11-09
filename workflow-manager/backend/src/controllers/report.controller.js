import { validationResult } from 'express-validator';
import { generateReport } from '../services/report.service.js';

export const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const report = await generateReport(req.body);
  res.json(report);
};
