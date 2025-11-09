import sequelize from '../config/database.js';
import User from './User.js';
import Employee from './Employee.js';
import Shift from './Shift.js';
import Project from './Project.js';
import Client from './Client.js';
import Attendance from './Attendance.js';
import Payroll from './Payroll.js';
import Invoice from './Invoice.js';
import Approval from './Approval.js';
import Notification from './Notification.js';

// Associations
User.hasOne(Employee, { foreignKey: 'userId', as: 'employeeProfile' });
Employee.belongsTo(User, { foreignKey: 'userId', as: 'account' });

Employee.hasMany(Shift, { foreignKey: 'employeeId', as: 'shifts' });
Shift.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Project.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
Client.hasMany(Project, { foreignKey: 'clientId', as: 'projects' });

Project.hasMany(Shift, { foreignKey: 'projectId', as: 'projectShifts' });
Shift.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

Employee.hasMany(Attendance, { foreignKey: 'employeeId', as: 'attendanceRecords' });
Attendance.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Shift.hasMany(Attendance, { foreignKey: 'shiftId', as: 'attendanceRecords' });
Attendance.belongsTo(Shift, { foreignKey: 'shiftId', as: 'shift' });

Employee.hasMany(Payroll, { foreignKey: 'employeeId', as: 'payrolls' });
Payroll.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Client.hasMany(Invoice, { foreignKey: 'clientId', as: 'invoices' });
Invoice.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

Project.hasMany(Invoice, { foreignKey: 'projectId', as: 'invoices' });
Invoice.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'recipient' });

User.hasMany(Approval, { foreignKey: 'requesterId', as: 'approvalsRequested' });
Approval.belongsTo(User, { foreignKey: 'requesterId', as: 'requester' });
User.hasMany(Approval, { foreignKey: 'approverId', as: 'approvalsToProcess' });
Approval.belongsTo(User, { foreignKey: 'approverId', as: 'approver' });

export {
  sequelize,
  User,
  Employee,
  Shift,
  Project,
  Client,
  Attendance,
  Payroll,
  Invoice,
  Approval,
  Notification,
};
