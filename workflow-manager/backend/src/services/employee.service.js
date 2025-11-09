import { Employee, Shift, Attendance, Payroll } from '../models/index.js';

export const createEmployee = (payload) => Employee.create(payload);

export const listEmployees = () =>
  Employee.findAll({
    order: [['createdAt', 'DESC']],
  });

export const getEmployee = (id) =>
  Employee.findByPk(id, {
    include: [
      { model: Shift, as: 'shifts' },
      { model: Attendance, as: 'attendanceRecords' },
      { model: Payroll, as: 'payrolls' },
    ],
  });

export const updateEmployee = async (id, data) => {
  const employee = await Employee.findByPk(id);
  if (!employee) {
    return null;
  }
  await employee.update(data);
  return employee;
};

export const deleteEmployee = async (id) => {
  const employee = await Employee.findByPk(id);
  if (!employee) {
    return false;
  }
  await employee.destroy();
  return true;
};
