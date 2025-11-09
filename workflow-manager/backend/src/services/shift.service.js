import { differenceInMinutes } from 'date-fns';
import { Shift, Employee, Project } from '../models/index.js';

const calculateHours = (startTime, endTime) => {
  const minutes = differenceInMinutes(new Date(endTime), new Date(startTime));
  return Number((minutes / 60).toFixed(2));
};

export const createShift = async (payload) => {
  const shift = await Shift.create({
    ...payload,
    hoursWorked: calculateHours(payload.startTime, payload.endTime),
  });
  return shift;
};

export const listShifts = () =>
  Shift.findAll({
    include: [
      { model: Employee, as: 'employee' },
      { model: Project, as: 'project' },
    ],
    order: [['startTime', 'DESC']],
  });

export const getShift = (id) =>
  Shift.findByPk(id, {
    include: [
      { model: Employee, as: 'employee' },
      { model: Project, as: 'project' },
    ],
  });

export const updateShift = async (id, data) => {
  const shift = await Shift.findByPk(id);
  if (!shift) {
    return null;
  }
  const updates = {
    ...data,
  };
  if (data.startTime && data.endTime) {
    updates.hoursWorked = calculateHours(data.startTime, data.endTime);
  }
  await shift.update(updates);
  return shift;
};

export const deleteShift = async (id) => {
  const shift = await Shift.findByPk(id);
  if (!shift) {
    return false;
  }
  await shift.destroy();
  return true;
};
