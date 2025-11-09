# WorkFlow Manager

A full-stack application for managing employees, shifts, projects and company finances. The project is split into a Node.js + Express backend and a React frontend. SQLite is used by default for local development, while PostgreSQL can be enabled through environment variables.

## Features

- Authentication with JWT tokens and role-based authorization (admin, manager, employee)
- Employee directory with position, department, status and hourly rate tracking
- Shift planning linked to employees and projects
- Attendance logging with automatic hour calculation
- Payroll generation with automatic gross/net/tax totals
- Client and project management
- Invoicing workflow with status tracking and finance overview
- Dashboard with operational KPIs and quick insights
- Reporting endpoints that summarise activity for a given date range

## Running the backend

```bash
cd workflow-manager/backend
cp .env.example .env
npm install
npm run dev
```

By default the backend listens on port `5000` and stores data in `backend/data/database.sqlite`.

## Running the frontend

```bash
cd workflow-manager/frontend
npm install
npm start
```

The frontend starts on http://localhost:3000 and connects to the backend via `REACT_APP_API_URL` (configured in `.env.local`).

## Environment variables

The backend recognises the following variables:

| Variable | Description |
| --- | --- |
| `PORT` | Port for the API server |
| `DB_DIALECT` | `sqlite` (default) or `postgres` |
| `DB_STORAGE` | SQLite file path when using the sqlite dialect |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection details |
| `JWT_SECRET` | Secret used to sign JWT tokens |
| `CLIENT_URL` | Allowed origin for CORS |

## Database migrations

The project relies on Sequelize's `sync()` for schema creation in this sample implementation. In production you should introduce explicit migrations.
