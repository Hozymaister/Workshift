import { Op } from 'sequelize';
import { formatISO } from 'date-fns';
import { Shift, Attendance, Payroll, Invoice, Project } from '../models/index.js';

export const generateReport = async ({ startDate, endDate }) => {
  const range = startDate && endDate
    ? {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      }
    : undefined;

  const [shifts, attendance, payrolls, invoices, projects] = await Promise.all([
    Shift.findAll({
      where: range ? { startTime: range } : undefined,
    }),
    Attendance.findAll({
      where: range ? { checkIn: range } : undefined,
    }),
    Payroll.findAll({
      where: range ? { createdAt: range } : undefined,
    }),
    Invoice.findAll({
      where: range ? { issueDate: range } : undefined,
    }),
    Project.findAll({
      where: range ? { startDate: range } : undefined,
    }),
  ]);

  const totalShiftHours = shifts.reduce((sum, shift) => sum + (shift.hoursWorked || 0), 0);
  const totalAttendanceHours = attendance.reduce((sum, record) => sum + (record.hoursWorked || 0), 0);
  const payrollTotals = payrolls.reduce(
    (acc, payroll) => {
      acc.gross += payroll.grossPay;
      acc.net += payroll.netPay;
      acc.taxes += payroll.taxes;
      return acc;
    },
    { gross: 0, net: 0, taxes: 0 }
  );

  const invoiceTotals = invoices.reduce(
    (acc, invoice) => {
      acc.total += invoice.amount;
      if (invoice.status === 'paid') {
        acc.paid += invoice.amount;
      }
      if (invoice.status === 'overdue') {
        acc.overdue += invoice.amount;
      }
      return acc;
    },
    { total: 0, paid: 0, overdue: 0 }
  );

  return {
    generatedAt: formatISO(new Date()),
    filters: { startDate, endDate },
    metrics: {
      shifts: {
        count: shifts.length,
        totalHours: totalShiftHours,
      },
      attendance: {
        count: attendance.length,
        totalHours: totalAttendanceHours,
      },
      payroll: payrollTotals,
      invoices: invoiceTotals,
      projects: projects.length,
    },
  };
};
