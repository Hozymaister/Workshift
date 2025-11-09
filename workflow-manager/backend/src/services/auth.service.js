import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Employee } from '../models/index.js';

const signToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || 'super-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );

export const registerUser = async ({ name, email, password, role, employeeProfile }) => {
  const existing = await User.findOne({ where: { email } });

  if (existing) {
    throw new Error('User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: role || 'manager',
  });

  if (employeeProfile) {
    await Employee.create({ ...employeeProfile, userId: user.id });
  }

  return {
    user,
    token: signToken(user),
  };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  return {
    user,
    token: signToken(user),
  };
};

export const getProfile = async (id) => {
  const user = await User.findByPk(id, {
    include: [{ model: Employee, as: 'employeeProfile' }],
  });
  return user;
};
