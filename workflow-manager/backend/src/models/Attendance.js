import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Attendance extends Model {}

Attendance.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    checkIn: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    checkOut: {
      type: DataTypes.DATE,
    },
    hoursWorked: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('present', 'absent', 'late', 'excused'),
      defaultValue: 'present',
    },
  },
  {
    sequelize,
    modelName: 'Attendance',
    tableName: 'attendance',
  }
);

export default Attendance;
