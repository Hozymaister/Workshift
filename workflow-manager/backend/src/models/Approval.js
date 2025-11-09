import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Approval extends Model {}

Approval.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.ENUM('shift', 'time_off', 'expense'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
    comment: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    modelName: 'Approval',
    tableName: 'approvals',
  }
);

export default Approval;
