import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Payroll extends Model {}

Payroll.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    grossPay: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    taxes: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    netPay: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid'),
      defaultValue: 'pending',
    },
  },
  {
    sequelize,
    modelName: 'Payroll',
    tableName: 'payroll',
  }
);

export default Payroll;
