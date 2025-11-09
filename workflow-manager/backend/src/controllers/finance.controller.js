import { getFinanceOverview } from '../services/finance.service.js';

export const overview = async (_req, res) => {
  const data = await getFinanceOverview();
  res.json(data);
};
