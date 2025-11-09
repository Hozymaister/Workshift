import { getDashboardSummary } from '../services/dashboard.service.js';

export const summary = async (_req, res) => {
  const data = await getDashboardSummary();
  res.json(data);
};
