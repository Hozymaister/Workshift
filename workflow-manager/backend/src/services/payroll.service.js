import { startOfMonth, endOfMonth } from 'date-fns';
import { Op } from 'sequelize';
import { Payroll, Employee, Attendance } from '../models/index.js';

export const generatePayroll = async ({ employeeId, month, year }) => {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }

  const periodStart = startOfMonth(new Date(year, month - 1, 1));
  const periodEnd = endOfMonth(periodStart);

  const attendanceRecords = await Attendance.findAll({
    where: {
      employeeId,
      checkIn: {
        [Op.between]: [periodStart, periodEnd],
      },
    },
  });

  const totalHours = attendanceRecords.reduce((sum, record) => sum + (record.hoursWorked || 0), 0);
  const grossPay = Number((totalHours * employee.hourlyRate).toFixed(2));
  const taxes = Number((grossPay * 0.2).toFixed(2));
  const netPay = Number((grossPay - taxes).toFixed(2));

  const payroll = await Payroll.create({
    employeeId,
    month,
    year,
    grossPay,
    taxes,
    netPay,
  });

  return payroll;
};

export const listPayrolls = () =>
  Payroll.findAll({
    include: [{ model: Employee, as: 'employee' }],
    order: [['year', 'DESC'], ['month', 'DESC']],
  });

export const updatePayrollStatus = async (id, status) => {
  const payroll = await Payroll.findByPk(id);
  if (!payroll) {
    return null;
  }
  await payroll.update({ status });
  return payroll;
};

export const deletePayroll = async (id) => {
  const payroll = await Payroll.findByPk(id);
  if (!payroll) {
    return false;
  }
  await payroll.destroy();
  return true;
};
