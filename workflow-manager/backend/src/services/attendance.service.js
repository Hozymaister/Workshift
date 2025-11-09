import { differenceInMinutes } from 'date-fns';
import { Attendance, Employee, Shift } from '../models/index.js';

const calculateHours = (checkIn, checkOut) => {
  if (!checkOut) {
    return 0;
  }
  const minutes = differenceInMinutes(new Date(checkOut), new Date(checkIn));
  return Number((minutes / 60).toFixed(2));
};

export const createAttendance = async (payload) => {
  const record = await Attendance.create({
    ...payload,
    hoursWorked: calculateHours(payload.checkIn, payload.checkOut),
  });
  return record;
};

export const listAttendance = () =>
  Attendance.findAll({
    include: [
      { model: Employee, as: 'employee' },
      { model: Shift, as: 'shift' },
    ],
    order: [['checkIn', 'DESC']],
  });

export const updateAttendance = async (id, data) => {
  const record = await Attendance.findByPk(id);
  if (!record) {
    return null;
  }
  const updates = { ...data };
  if (data.checkIn && data.checkOut) {
    updates.hoursWorked = calculateHours(data.checkIn, data.checkOut);
  }
  await record.update(updates);
  return record;
};

export const deleteAttendance = async (id) => {
  const record = await Attendance.findByPk(id);
  if (!record) {
    return false;
  }
  await record.destroy();
  return true;
};
