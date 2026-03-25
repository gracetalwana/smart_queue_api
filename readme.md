# Smart Queue API

RESTful API backend for the **UCU Smart Queuing System** — a real-time appointment and queue management platform built for Uganda Christian University.

## Tech Stack

- **Runtime**: Node.js + Express 4
- **Database**: MySQL via `mysql2` (connection pool)
- **Auth**: bcryptjs + JWT (access + refresh tokens)
- **Real-time**: Socket.IO
- **Validation**: Joi
- **Scheduling**: node-cron (no-show marking, reminders)

## Features

1. **Authentication** — Register, login, refresh tokens, OTP-ready
2. **User Management** — CRUD with role-based access (STUDENT, ADMIN, SUPER_ADMIN)
3. **Time Slots** — Admins create bookable time windows per counter
4. **Appointments** — Students book slots, get queue numbers, track status
5. **Counters** — Service desks that process queued students
6. **Notifications** — In-app notification system (email/SMS ready)
7. **Real-time Updates** — Socket.IO pushes queue changes to clients
8. **Cron Jobs** — Auto-mark no-shows, send reminders

## Project Structure

```
smart_queue_api/
├── server.js              # Express app, Socket.IO, cron init
├── config/
│   └── db.js              # MySQL connection pool
├── controllers/           # Route handlers
│   ├── authController.js
│   ├── userController.js
│   ├── slotController.js
│   ├── appointmentController.js
│   ├── counterController.js
│   └── notificationController.js
├── models/                # Data access layer
├── routes/                # Express routers
├── middleware/
│   └── authMiddleware.js  # JWT verify, role guard
├── services/              # Business logic (queue, notifications, cron)
├── scripts/
│   └── seed.js            # DB schema + seed data
└── tests/
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Create .env
cp .env.example .env
# Edit DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE, JWT_SECRET, etc.

# 3. Seed the database
npm run seed

# 4. Start the server
npm start          # or: npm run dev (nodemon)
```

**Default credentials (from seed):**

| Role        | Username    | Password     |
|-------------|-------------|--------------|
| SUPER_ADMIN | superadmin  | Admin@1234   |
| ADMIN       | admin1      | Admin@1234   |
| STUDENT     | alice       | Student@123  |
| STUDENT     | bob         | Student@123  |
| STUDENT     | charlie     | Student@123  |

## API Endpoints

### Auth
- `POST /api/register` — Register a new user
- `POST /api/login` — Login, receive access + refresh tokens
- `POST /api/refresh-token` — Refresh access token

### Users
- `GET /api/users` — List all users (admin)
- `GET /api/users/:id` — Get user by ID
- `PUT /api/users/:id` — Update user
- `DELETE /api/users/:id` — Delete user (admin)

### Time Slots
- `GET /api/slots` — List slots
- `POST /api/slots` — Create slot (admin)
- `PUT /api/slots/:id` — Update slot (admin)
- `DELETE /api/slots/:id` — Delete slot (admin)

### Appointments
- `GET /api/appointments` — List all appointments (admin)
- `GET /api/appointments/my` — Student's own appointments
- `GET /api/appointments/stats` — Queue statistics (admin)
- `POST /api/appointments` — Book an appointment
- `PATCH /api/appointments/:id/serve` — Mark as serving
- `PATCH /api/appointments/:id/complete` — Mark as served
- `PATCH /api/appointments/:id/cancel` — Cancel appointment

### Counters
- `GET /api/counters` — List counters
- `POST /api/counters` — Create counter (admin)

### Notifications
- `GET /api/notifications` — User's notifications
- `PATCH /api/notifications/:id/read` — Mark as read

## Environment Variables

| Variable       | Description                  |
|----------------|------------------------------|
| DB_HOST        | MySQL host                   |
| DB_USER        | MySQL username               |
| DB_PASSWORD    | MySQL password               |
| DB_DATABASE    | Database name (smart_queue_db) |
| DB_PORT        | MySQL port (3306)            |
| JWT_SECRET     | Secret for signing JWTs      |
| PORT           | Server port (default 3000)   |
