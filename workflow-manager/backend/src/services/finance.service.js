import { Invoice, Payroll } from '../models/index.js';

export const getFinanceOverview = async () => {
  const [totalInvoiced, totalPaid, overdueTotal, totalPayroll] = await Promise.all([
    Invoice.sum('amount'),
    Invoice.sum('amount', { where: { status: 'paid' } }),
    Invoice.sum('amount', { where: { status: 'overdue' } }),
    Payroll.sum('netPay'),
  ]);

  const invoicesByStatus = await Invoice.findAll({
    attributes: ['status', 'amount'],
  });

  const breakdown = invoicesByStatus.reduce((acc, invoice) => {
    acc[invoice.status] = (acc[invoice.status] || 0) + invoice.amount;
    return acc;
  }, {});

  return {
    totals: {
      invoiced: totalInvoiced || 0,
      paid: totalPaid || 0,
      overdue: overdueTotal || 0,
      payroll: totalPayroll || 0,
    },
    invoicesByStatus: breakdown,
  };
};
