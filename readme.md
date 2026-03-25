# 🚀 Smart Queue API

> RESTful backend for the **Smart Queuing System** — a real-time appointment and queue management platform.

This project is designed as a **learning resource** for students studying backend web development with **Node.js, Express, and MySQL**.

---

## 📚 What You Will Learn

By studying this codebase you will gain hands-on experience with:

| Concept | Where to look |
|---|---|
| **Express.js** — routing, middleware, error handling | `server.js`, `routes/`, `middleware/` |
| **MySQL** — schema design, foreign keys, indexes | `scripts/seed.js` |
| **Connection Pools** — why we reuse DB connections | `config/db.js` |
| **JWT Authentication** — access tokens + refresh tokens | `controllers/authController.js`, `middleware/authMiddleware.js` |
| **Password Hashing** — bcrypt salting and comparing | `controllers/authController.js` |
| **Role-Based Access Control (RBAC)** | `middleware/authMiddleware.js` |
| **Input Validation** — Joi schemas | Every controller file |
| **MVC Pattern** — Model → Controller → Route | `models/`, `controllers/`, `routes/` |
| **Real-time Communication** — Socket.IO rooms | `server.js`, `services/queueService.js` |
| **Cron Jobs** — scheduled background tasks | `jobs/cronJobs.js` |
| **Environment Variables** — dotenv | `config/db.js`, `server.js` |

---

## 🛠 Tech Stack

| Technology | Purpose |
|---|---|
| [Node.js](https://nodejs.org/) | JavaScript runtime — executes JS outside the browser |
| [Express 4](https://expressjs.com/) | Web framework — handles HTTP requests and routing |
| [MySQL](https://www.mysql.com/) + [mysql2](https://github.com/sidorares/node-mysql2) | Relational database + Node.js driver with connection pooling |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | Password hashing — never store passwords in plain text! |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | JWT creation and verification for stateless authentication |
| [Joi](https://joi.dev/) | Declarative request body validation |
| [Socket.IO](https://socket.io/) | Real-time bidirectional communication (WebSockets) |
| [node-cron](https://github.com/node-cron/node-cron) | Schedule recurring tasks (like marking no-shows) |
| [dotenv](https://github.com/motdotla/dotenv) | Load environment variables from a `.env` file |
| [cors](https://github.com/expressjs/cors) | Cross-Origin Resource Sharing (allows the frontend to talk to the API) |
| [nodemon](https://nodemon.io/) | Auto-restarts the server whenever you save a file (dev only) |

---

## 📂 Project Structure

Understanding the folder structure is key. This project follows the **MVC (Model-View-Controller)** pattern:

```
smart_queue_api/
│
├── server.js                 # 🚪 ENTRY POINT — start here!
│                             #    Sets up Express, Socket.IO, CORS, routes, error handling, cron
│
├── .env                      # 🔐 Environment variables (DB credentials, JWT secret, port)
│                             #    ⚠️ Never commit this file to GitHub!
│
├── package.json              # 📦 Project metadata, dependencies, and npm scripts
│
├── config/
│   └── db.js                 # 🗄️  Creates a MySQL connection pool
│                             #    A pool reuses connections instead of opening a new one
│                             #    for every query — much more efficient!
│
├── controllers/              # 🎮 CONTROLLERS — handle incoming requests
│   │                         #    They validate input, call models, and send responses.
│   ├── authController.js     #    Register, Login, Refresh Token
│   ├── userController.js     #    CRUD operations on users
│   ├── slotController.js     #    Create/update/list time slots
│   ├── appointmentController.js  # Book, cancel, serve, complete appointments
│   ├── counterController.js  #    Service counter management
│   └── notificationController.js # In-app notifications
│
├── models/                   # 📊 MODELS — the data access layer
│   │                         #    Each model contains raw SQL queries.
│   │                         #    Controllers never write SQL directly — they call models.
│   ├── userModel.js          #    User table queries (find, create, update, delete)
│   ├── slotModel.js          #    Time slot queries
│   ├── appointmentModel.js   #    Appointment queries (book, serve, cancel, stats)
│   ├── counterModel.js       #    Counter queries
│   └── notificationModel.js  #    Notification queries
│
├── routes/                   # 🛤️  ROUTES — map URL paths to controller functions
│   │                         #    Each file creates an Express Router and defines endpoints.
│   ├── authRoutes.js         #    POST /api/register, /api/login, /api/refresh-token
│   ├── userRoutes.js         #    GET/PUT/DELETE /api/users
│   ├── slotRoutes.js         #    GET/POST/PUT/DELETE /api/slots
│   ├── appointmentRoutes.js  #    GET/POST/PATCH /api/appointments
│   ├── counterRoutes.js      #    GET/POST /api/counters
│   └── notificationRoutes.js #    GET/PATCH /api/notifications
│
├── middleware/               # 🔒 MIDDLEWARE — functions that run BEFORE your route handler
│   └── authMiddleware.js     #    • verifyToken: checks the JWT in the Authorization header
│                             #    • authorizeRoles: checks if the user's role is allowed
│
├── services/                 # ⚙️  SERVICES — complex business logic
│   │                         #    When an operation involves multiple models or side effects
│   │                         #    (like emitting a socket event), it lives in a service.
│   ├── appointmentService.js #    Booking logic, queue number generation
│   ├── queueService.js       #    Queue management + Socket.IO event broadcasting
│   └── notificationService.js #   Create and send notifications
│
├── jobs/
│   └── cronJobs.js           # ⏰ CRON JOBS — tasks that run on a schedule
│                             #    e.g., every 5 min check for stale appointments → mark no-show
│
├── scripts/
│   └── seed.js               # 🌱 SEED SCRIPT — creates all tables + inserts sample data
│                             #    Run this once when setting up the project.
│
└── tests/
    └── hello.test.js         # 🧪 Example test file (Jest)
```

### How a Request Flows Through the App

Here is the journey of a request from the browser to the database and back:

```
Browser                                                              Database
  │                                                                     │
  ├── POST /api/login ──> Express Router ──> authMiddleware (skip) ──>  │
  │                         (authRoutes.js)                             │
  │                                                                     │
  │                        authController.login()                       │
  │                           │                                         │
  │                           ├── Validate body with Joi                │
  │                           ├── userModel.findByUsername(username) ──> │ SELECT * FROM users ...
  │                           ├── bcrypt.compare(password, hash)        │
  │                           ├── jwt.sign(payload, secret)             │
  │                           └── res.json({ token, refreshToken })     │
  │                                                                     │
  │ <── { token: "eyJ..." } ──────────────────────────────────────────  │
```

---

## ⚡ Getting Started — Step by Step

### Prerequisites

Before you begin, install these tools on your computer:

1. **Node.js** (version 18 or later) — [Download here](https://nodejs.org/)

   ```bash
   # Verify installation:
   node --version    # Should show v18.x.x or higher
   npm --version     # Should show 9.x.x or higher
   ```

2. **MySQL** (version 8.0 or later) — [Download here](https://dev.mysql.com/downloads/)

   ```bash
   # Verify installation:
   mysql --version
   ```

   > 💡 **Tip:** You can also use [XAMPP](https://www.apachefriends.org/) which bundles MySQL + phpMyAdmin.

3. **Git** — [Download here](https://git-scm.com/)

4. **A code editor** — [VS Code](https://code.visualstudio.com/) (recommended)

5. **Postman** (optional but highly recommended) — [Download here](https://www.postman.com/)
   Use Postman to test API endpoints without building a frontend first.

---

### Step 1 — Clone the Repository

```bash
git clone <your-repo-url>
cd smart_queue_api
```

---

### Step 2 — Install Dependencies

```bash
npm install
```

> 📖 **What this does:** Reads `package.json`, downloads all required packages, and puts them in a `node_modules/` folder. You never edit `node_modules/` manually.

---

### Step 3 — Create the MySQL Database

Open a MySQL client (MySQL Workbench, phpMyAdmin, or the terminal) and run:

```sql
CREATE DATABASE IF NOT EXISTS smart_queue_db;
```

> 📖 **What is a database?** A database is an organized collection of data. MySQL stores data in *tables* (like spreadsheets). Each table has *columns* (headers) and *rows* (records). This command creates an empty database named `smart_queue_db`.

---

### Step 4 — Configure Environment Variables

Create a file called `.env` in the project root:

```env
# ─── Database Connection ──────────────────────────────────
# These tell Node.js how to connect to your MySQL server.
DB_HOST=localhost        # "localhost" means MySQL is on your own computer
DB_USER=root             # The MySQL username (root is the default superuser)
DB_PASSWORD=root         # Your MySQL password
DB_DATABASE=smart_queue_db
DB_PORT=3306             # Default MySQL port

# ─── Authentication ───────────────────────────────────────
# This secret is used to sign and verify JWT tokens.
# In production, use a long random string (32+ characters).
JWT_SECRET=pick_a_long_random_string_here

# ─── Server ───────────────────────────────────────────────
PORT=3000                # The port your API will listen on
```

> ⚠️ **Security note:** The `.env` file contains sensitive data (passwords, secrets). It must **never** be committed to GitHub. Make sure `.env` is listed in your `.gitignore` file.

> 📖 **Why environment variables?** They keep secrets out of your source code. When you deploy to a real server, you set different values without changing any code.

---

### Step 5 — Seed the Database

```bash
npm run seed
```

This script (`scripts/seed.js`) does two things:

1. **Creates all 5 tables** if they don't already exist:
   - `users` — registered accounts
   - `counters` — service desks (e.g., "Registration Counter")
   - `time_slots` — bookable time windows
   - `appointments` — booked queue entries
   - `notifications` — in-app messages

2. **Inserts sample data** — 5 users, 3 counters, and 1 example time slot

> 📖 **Idempotent:** The seed script uses `IF NOT EXISTS` so you can safely run it multiple times without errors or duplicate data.

---

### Step 6 — Start the Server

```bash
npm start
```

You should see output like:

```
Smart Queue API running on port 3000
MySQL connected ✓
[cron] Scheduled jobs initialised
```

The server is now listening at **http://localhost:3000**.

> 📖 **nodemon:** The `npm start` script uses nodemon, which watches your files and automatically restarts the server when you save changes. No need to stop and restart manually!

---

### Step 7 — Test the API

Open your browser and visit `http://localhost:3000/` — you should see a welcome message.

Now try logging in with Postman or `curl`:

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin1", "password": "Admin@1234"}'
```

The response will include a JWT token:

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

Use that token to access protected endpoints by adding it to the `Authorization` header:

```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## 🔑 Default Login Credentials

These accounts are created by the seed script (`npm run seed`):

| Role | Username | Password | What they can do |
|---|---|---|---|
| **SUPER_ADMIN** | `superadmin` | `Admin@1234` | Full system access — manage everything |
| **ADMIN** | `admin1` | `Admin@1234` | Manage slots, queue, users |
| **STUDENT** | `alice` | `Student@123` | Book slots, view own queue |
| **STUDENT** | `bob` | `Student@123` | Book slots, view own queue |
| **STUDENT** | `charlie` | `Student@123` | Book slots, view own queue |

---

## 📡 API Endpoints Reference

### Authentication (no token required)

| Method | Endpoint | Description | Request Body |
|---|---|---|---|
| POST | `/api/register` | Create a new account | `{ username, email, password, full_name }` |
| POST | `/api/login` | Log in → get tokens | `{ username, password }` |
| POST | `/api/refresh-token` | Get a new access token | `{ refreshToken }` |

### Users (ADMIN required)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get a single user |
| PUT | `/api/users/:id` | Update a user |
| DELETE | `/api/users/:id` | Delete a user |

### Time Slots

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/slots` | Available slots (students) | Token |
| GET | `/api/slots/all` | All slots (admins) | ADMIN |
| POST | `/api/slots` | Create a time slot | ADMIN |
| PUT | `/api/slots/:id` | Update a time slot | ADMIN |
| DELETE | `/api/slots/:id` | Delete a time slot | ADMIN |

### Appointments

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/appointments` | All appointments | ADMIN |
| GET | `/api/appointments/my` | My appointments | Token |
| GET | `/api/appointments/slot/:slotId` | Appointments for a slot | ADMIN |
| GET | `/api/appointments/stats` | Queue analytics | ADMIN |
| POST | `/api/appointments` | Book an appointment | Token |
| PATCH | `/api/appointments/:id/serve` | Mark as SERVING | ADMIN |
| PATCH | `/api/appointments/:id/complete` | Mark as SERVED | ADMIN |
| PATCH | `/api/appointments/:id/no-show` | Mark as NO_SHOW | ADMIN |
| PATCH | `/api/appointments/:id/cancel` | Cancel appointment | Token |

### Counters

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/counters` | List service counters | Token |
| POST | `/api/counters` | Create a counter | ADMIN |

### Notifications

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/notifications` | My notifications | Token |
| PATCH | `/api/notifications/:id/read` | Mark as read | Token |

---

## 🗄️ Database Schema

The database has **5 tables**. Here is how they relate to each other:

```
┌──────────┐         ┌───────────────┐
│  users   │ 1 ──< M │ appointments  │
└──────────┘         └───────────────┘
                           │  M
┌──────────┐         ┌─────┴─────┐
│ counters │ 1 ──< M │           │
└──────────┘         │           │
                     │           │
┌──────────┐         │           │
│time_slots│ 1 ──< M │           │
└──────────┘         └───────────┘

┌──────────┐         ┌───────────────┐
│  users   │ 1 ──< M │ notifications │
└──────────┘         └───────────────┘
```

> 📖 **1 ──< M** means "one-to-many". One user can have many appointments. One time slot can have many appointments. Etc.

### Table Details

**`users`**
| Column | Type | Notes |
|---|---|---|
| id | INT (PK, AUTO_INCREMENT) | Unique identifier |
| username | VARCHAR(50) UNIQUE | Login name |
| email | VARCHAR(100) UNIQUE | Email address |
| password | VARCHAR(255) | bcrypt hash — never plain text! |
| full_name | VARCHAR(100) | Display name |
| role | ENUM('STUDENT','ADMIN','SUPER_ADMIN') | Access level |
| created_at | TIMESTAMP | When the account was created |

**`counters`**
| Column | Type | Notes |
|---|---|---|
| counter_id | INT (PK) | Unique identifier |
| counter_name | VARCHAR(100) | e.g., "Registration Desk A" |
| service_type | VARCHAR(100) | e.g., "Registration" |
| is_active | BOOLEAN | Whether the counter is in use |

**`time_slots`**
| Column | Type | Notes |
|---|---|---|
| slot_id | INT (PK) | Unique identifier |
| counter_id | INT (FK → counters) | Which counter this slot belongs to |
| slot_date | DATE | The date of the slot |
| start_time | TIME | When it opens (e.g., 09:00) |
| end_time | TIME | When it closes (e.g., 12:00) |
| max_capacity | INT | Maximum bookings allowed |
| description | TEXT | Optional notes |
| is_active | BOOLEAN | Whether the slot is available |

**`appointments`**
| Column | Type | Notes |
|---|---|---|
| appointment_id | INT (PK) | Unique identifier |
| student_id | INT (FK → users) | Who booked it |
| slot_id | INT (FK → time_slots) | Which time slot |
| counter_id | INT (FK → counters) | Which service counter |
| queue_number | VARCHAR(10) | e.g., "Q-001" |
| reason | VARCHAR(255) | Why the student is visiting |
| status | ENUM('PENDING','SERVING','SERVED','CANCELLED','NO_SHOW') | Current state |
| booked_at | TIMESTAMP | When the appointment was created |
| served_at | TIMESTAMP | When the student was served |

**`notifications`**
| Column | Type | Notes |
|---|---|---|
| notification_id | INT (PK) | Unique identifier |
| user_id | INT (FK → users) | Who receives it |
| message | TEXT | Notification content |
| type | VARCHAR(50) | Category (e.g., "queue_update") |
| is_read | BOOLEAN | Has the user seen it? |
| created_at | TIMESTAMP | When it was created |

---

## 🔍 Key Concepts Explained

### 1. How Authentication Works

```
1. REGISTER                          2. LOGIN
   ┌─────────────┐                      ┌─────────────┐
   │ password:    │   bcrypt.hash()      │ password:    │   bcrypt.compare()
   │ "Admin@1234" │ ──────────────────>  │ "Admin@1234" │ ───────────────────>
   │              │   stored in DB as:   │              │   compare with hash
   └─────────────┘   "$2b$10$xK..."     └─────────────┘   from DB → match? ✓
                                                           │
                                                   jwt.sign(payload, secret)
                                                           │
                                                   { token: "eyJ...", refreshToken: "eyJ..." }
```

- **Access token** — expires in **15 minutes**. Sent with every API request.
- **Refresh token** — expires in **7 days**. Used only to get a new access token when the current one expires.
- **Why two tokens?** Security! If someone steals an access token, it only works for 15 minutes. The refresh token is stored more securely and used less often.

### 2. How the Queue Works

```
Step 1: Admin creates a time slot        Step 2: Student books an appointment
┌──────────────────────────┐              ┌──────────────────────────┐
│ Date: March 27           │              │ Student: Alice           │
│ Time: 09:00 – 12:00      │    ────>     │ Queue #: Q-001           │
│ Capacity: 20             │              │ Status: PENDING          │
│ Counter: Registration    │              │ Reason: "Transcript"     │
└──────────────────────────┘              └──────────────────────────┘

Step 3: Admin serves students in order
┌────────────────────────────────────────┐
│  Q-001  Alice    SERVING  ←── current  │
│  Q-002  Bob      PENDING               │
│  Q-003  Charlie  PENDING               │
└────────────────────────────────────────┘
```

**Status transitions:** `PENDING` → `SERVING` → `SERVED` (or `CANCELLED` / `NO_SHOW`)

### 3. How Socket.IO Real-Time Works

```
Client (browser)                           Server
    │                                          │
    ├──── join_slot(slotId) ──────────────────>│  Client joins a "room" for that slot
    │                                          │
    │<──── queue_update ──────────────────────>│  Server emits when any appointment
    │                                          │  in that slot changes status
    │                                          │
    ├──── join_user(userId) ──────────────────>│  Client joins personal room
    │                                          │
    │<──── notification ─────────────────────>│  Server pushes personal notifications
```

> 📖 **Rooms:** Socket.IO "rooms" are like chat groups. When the server emits an event to room `slot_42`, only clients who joined that room receive it. This prevents sending unnecessary data to everyone.

### 4. How Cron Jobs Work

The `jobs/cronJobs.js` file schedules automatic tasks:

- **No-show check (every 5 min):** If a slot has ended and an appointment is still `PENDING`, automatically mark it as `NO_SHOW`
- **Reminders:** Send a notification to students 30 minutes before their slot starts

> 📖 **Cron syntax:** `*/5 * * * *` means "every 5 minutes". Read more: [crontab.guru](https://crontab.guru/)

### 5. What Is Middleware?

Middleware is a function that runs **between** the incoming request and your route handler:

```
Request ──> CORS middleware ──> JSON parser ──> authMiddleware ──> your controller
```

In this project, `authMiddleware.js` has two functions:
- **`verifyToken`** — Checks if the request has a valid JWT in the `Authorization` header
- **`authorizeRoles('ADMIN', 'SUPER_ADMIN')`** — Checks if the authenticated user has one of the required roles

---

## 🧪 Running Tests

```bash
npm test
```

This runs the [Jest](https://jestjs.io/) test suite. Look at `tests/hello.test.js` for an example.

---

## 🛠 NPM Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the server with **nodemon** (auto-restarts on file changes) |
| `npm run seed` | Create database tables + insert sample data |
| `npm test` | Run the Jest test suite |

---

## 🌍 Environment Variables Reference

| Variable | Description | Example |
|---|---|---|
| `DB_HOST` | MySQL server hostname | `localhost` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | `root` |
| `DB_DATABASE` | Database name | `smart_queue_db` |
| `DB_PORT` | MySQL port | `3306` |
| `JWT_SECRET` | Secret key for signing JWTs | `my_super_secret_key_123` |
| `PORT` | Port the API server listens on | `3000` |

---

## 🐛 Troubleshooting

| Problem | Solution |
|---|---|
| `ECONNREFUSED` when starting server | MySQL isn't running. Start your MySQL server (or XAMPP). |
| `ER_ACCESS_DENIED_ERROR` | Wrong DB username or password in `.env`. |
| `ER_BAD_DB_ERROR` | The database doesn't exist. Run: `CREATE DATABASE smart_queue_db;` |
| `EADDRINUSE: port 3000` | Another process is using port 3000. Kill it: `lsof -ti:3000 \| xargs kill -9` |
| `Cannot find module '...'` | Run `npm install` to install dependencies. |
| Seed script fails | Make sure the database exists and `.env` credentials are correct. |
| Token expired error | Access tokens last 15 min. Use the refresh token endpoint to get a new one. |

---

## 📝 Tips for Students

1. **Start with `server.js`** — it's the entry point and shows how everything connects.
2. **Trace a request** — pick an endpoint (e.g., `POST /api/login`) and follow it from `routes/` → `controllers/` → `models/`. This is the best way to understand MVC.
3. **Check `.env` first** — if the server won't start, 90% of the time your database credentials are wrong.
4. **Use Postman** — test every endpoint manually before building a frontend.
5. **Read the comments** — every file has explanatory comments.
6. **Break things intentionally** — remove middleware, skip validation, use a wrong SQL query — see what happens and learn from the error messages.
7. **Use `console.log()`** — add logs inside controllers and models to see what data flows through.
8. **Google the error** — copy-paste error messages into Google or Stack Overflow. This is what real developers do every day.

---

## 📄 License

This project is for educational purposes.
