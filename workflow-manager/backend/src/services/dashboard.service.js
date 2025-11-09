import { Op } from 'sequelize';
import { startOfWeek, endOfWeek } from 'date-fns';
import {
  Employee,
  Shift,
  Project,
  Client,
  Invoice,
  Payroll,
  Attendance,
} from '../models/index.js';

export const getDashboardSummary = async () => {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [employeeCount, activeProjects, upcomingShifts, overdueInvoices, weeklyAttendance] = await Promise.all([
    Employee.count(),
    Project.count({ where: { status: { [Op.ne]: 'completed' } } }),
    Shift.count({
      where: {
        startTime: {
          [Op.between]: [weekStart, weekEnd],
        },
      },
    }),
    Invoice.count({ where: { status: 'overdue' } }),
    Attendance.count({
      where: {
        checkIn: {
          [Op.between]: [weekStart, weekEnd],
        },
      },
    }),
  ]);

  const revenue = await Invoice.sum('amount', { where: { status: 'paid' } });
  const payrollCost = await Payroll.sum('netPay');

  const clients = await Client.findAll({ limit: 5, order: [['createdAt', 'DESC']] });
  const recentShifts = await Shift.findAll({
    limit: 5,
    order: [['startTime', 'DESC']],
  });

  return {
    stats: {
      employees: employeeCount,
      projects: activeProjects,
      shiftsThisWeek: upcomingShifts,
      overdueInvoices,
      attendanceRecordsThisWeek: weeklyAttendance,
      revenue: revenue || 0,
      payrollCost: payrollCost || 0,
    },
    highlights: {
      recentClients: clients,
      recentShifts,
    },
  };
};
