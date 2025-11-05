#!/bin/bash

# Vytvoření struktury projektu
set -euo pipefail

echo "🚀 Vytváření projektu WorkFlow Manager..."

# Hlavní složky
mkdir -p workflow-manager/{backend,frontend,docker,docs}

# Backend struktura
mkdir -p workflow-manager/backend/{src,config,migrations,tests}
mkdir -p workflow-manager/backend/src/{controllers,models,routes,middleware,services,utils}

# Frontend struktura
mkdir -p workflow-manager/frontend/{src,public}
mkdir -p workflow-manager/frontend/src/{components,pages,services,store,utils,assets}

cd workflow-manager

# Vytvoření všech souborů
echo "📁 Vytváření backend souborů..."

# Backend package.json
cat > backend/package.json << 'PKGJSON'
{
  "name": "workflow-manager-backend",
  "version": "1.0.0",
  "description": "Backend pro správu směn a zaměstnanců",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest",
    "migrate": "sequelize-cli db:migrate",
    "seed": "sequelize-cli db:seed:all"
  },
  "dependencies": {
    "express": "^4.18.2",
    "sequelize": "^6.35.0",
    "pg": "^8.11.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express-validator": "^7.0.1",
    "multer": "^1.4.5-lts.1",
    "nodemailer": "^6.9.7",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "winston": "^3.11.0",
    "redis": "^4.6.11",
    "moment": "^2.29.4",
    "exceljs": "^4.4.0",
    "pdfkit": "^0.14.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
PKGJSON

# .env soubor
cat > backend/.env << 'ENVFILE'
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=workflow_db
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=30d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Frontend URL
CLIENT_URL=http://localhost:3000
ENVFILE

# Server.js
cat > backend/src/server.js << 'SERVERJS'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const sequelize = require('./config/database');
const logger = require('./utils/logger');

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api', limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/employees', require('./routes/employee.routes'));
app.use('/api/shifts', require('./routes/shift.routes'));
app.use('/api/projects', require('./routes/project.routes'));
app.use('/api/finance', require('./routes/finance.routes'));
app.use('/api/payroll', require('./routes/payroll.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/clients', require('./routes/client.routes'));
app.use('/api/invoices', require('./routes/invoice.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));

// Error handling
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Interní chyba serveru',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

// Database connection and server start
sequelize.authenticate()
  .then(() => {
    logger.info('Databáze připojena');
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Server běží na portu ${PORT}`);
    });
  })
  .catch(err => {
    logger.error('Chyba připojení k databázi:', err);
  });

module.exports = app;
SERVERJS

echo "📁 Vytváření modelů..."

# Všechny modely
cat > backend/src/models/index.js << 'MODELS'
const sequelize = require('../config/database');
const Employee = require('./Employee');
const Shift = require('./Shift');
const Project = require('./Project');
const Client = require('./Client');
const Attendance = require('./Attendance');
const Payroll = require('./Payroll');
const Invoice = require('./Invoice');
const Approval = require('./Approval');
const Notification = require('./Notification');

// Asociace
Employee.hasMany(Shift, { foreignKey: 'employeeId' });
Shift.belongsTo(Employee, { foreignKey: 'employeeId' });

Employee.hasMany(Attendance, { foreignKey: 'employeeId' });
Attendance.belongsTo(Employee, { foreignKey: 'employeeId' });

Employee.hasMany(Payroll, { foreignKey: 'employeeId' });
Payroll.belongsTo(Employee, { foreignKey: 'employeeId' });

Project.belongsTo(Client, { foreignKey: 'clientId' });
Client.hasMany(Project, { foreignKey: 'clientId' });

Project.hasMany(Shift, { foreignKey: 'projectId' });
Shift.belongsTo(Project, { foreignKey: 'projectId' });

Invoice.belongsTo(Client, { foreignKey: 'clientId' });
Client.hasMany(Invoice, { foreignKey: 'clientId' });

module.exports = {
  sequelize,
  Employee,
  Shift,
  Project,
  Client,
  Attendance,
  Payroll,
  Invoice,
  Approval,
  Notification
};
MODELS

echo "📁 Vytváření frontend souborů..."

# Frontend package.json
cat > frontend/package.json << 'FRONTENDPKG'
{
  "name": "workflow-manager-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.2",
    "redux": "^4.2.1",
    "react-redux": "^8.1.3",
    "@reduxjs/toolkit": "^1.9.7",
    "@mui/material": "^5.14.18",
    "@mui/icons-material": "^5.14.18",
    "@mui/x-date-pickers": "^6.18.3",
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "recharts": "^2.9.3",
    "react-big-calendar": "^1.8.5",
    "moment": "^2.29.4",
    "formik": "^2.4.5",
    "yup": "^1.3.3",
    "react-toastify": "^9.1.3",
    "react-query": "^3.39.3",
    "date-fns": "^2.30.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "devDependencies": {
    "react-scripts": "5.0.1",
    "@types/react": "^18.2.42"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
FRONTENDPKG

# Docker files
cat > docker-compose.yml << 'DOCKER'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: workflow_db
    environment:
      POSTGRES_DB: workflow_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - workflow_network

  redis:
    image: redis:7-alpine
    container_name: workflow_redis
    ports:
      - "6379:6379"
    networks:
      - workflow_network

  backend:
    build: ./backend
    container_name: workflow_backend
    ports:
      - "5000:5000"
    environment:
      DB_HOST: postgres
      DB_NAME: workflow_db
      DB_USER: postgres
      DB_PASSWORD: password
      REDIS_HOST: redis
      JWT_SECRET: your-secret-key-here
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules
    networks:
      - workflow_network

  frontend:
    build: ./frontend
    container_name: workflow_frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://localhost:5000/api
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules
    networks:
      - workflow_network

volumes:
  postgres_data:

networks:
  workflow_network:
    driver: bridge
DOCKER

# README.md
cat > README.md << 'README'
# WorkFlow Manager

Komplexní aplikace pro správu zaměstnanců, směn, projektů a financí.

## 🚀 Rychlý start

### Požadavky
- Node.js 18+
- PostgreSQL 15+
- Redis (volitelné)
- Docker & Docker Compose (doporučeno)

### Instalace pomocí Dockeru

```
# Klonování repozitáře
git clone <repository-url>
cd workflow-manager

# Spuštění aplikace
docker-compose up -d

# Aplikace běží na:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:5000
# - Databáze: localhost:5432
README

echo "✅ Projekt WorkFlow Manager byl úspěšně vytvořen."
