/**
 * scripts/seed.js – Database schema migration + seed data
 * Run with:  npm run seed
 * Idempotent – safe to run multiple times.
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

async function seed() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
  });

  console.log('Connected to database. Running seed…\n');

  // ── USERS (create or extend) ───────────────────────────────────────────────

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      username      VARCHAR(100) NOT NULL UNIQUE,
      full_name     VARCHAR(200) DEFAULT NULL,
      email         VARCHAR(150) NOT NULL UNIQUE,
      password      VARCHAR(255) NOT NULL,
      role          ENUM('STUDENT','ADMIN','SUPER_ADMIN') DEFAULT 'STUDENT',
      phone_number  VARCHAR(30) DEFAULT NULL,
      is_active     TINYINT(1) DEFAULT 1,
      refresh_token TEXT DEFAULT NULL,
      otp_code      VARCHAR(10) DEFAULT NULL,
      otp_expires   DATETIME DEFAULT NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Idempotently add new columns to existing tables (MySQL 8 supports IF NOT EXISTS)
  const userAlters = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name     VARCHAR(200) DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS role          ENUM('STUDENT','ADMIN','SUPER_ADMIN') DEFAULT 'STUDENT'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number  VARCHAR(30) DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active     TINYINT(1) DEFAULT 1",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code      VARCHAR(10) DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires   DATETIME DEFAULT NULL",
  ];
  for (const cmd of userAlters) { await db.execute(cmd).catch(() => { }); }
  console.log('✔  Table: users');

  // ── COUNTERS ───────────────────────────────────────────────────────────────

  await db.execute(`
    CREATE TABLE IF NOT EXISTS counters (
      counter_id   INT AUTO_INCREMENT PRIMARY KEY,
      counter_name VARCHAR(150) NOT NULL,
      service_type VARCHAR(100) DEFAULT 'accounts',
      is_active    TINYINT(1) DEFAULT 1,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✔  Table: counters');

  // ── TIME SLOTS ─────────────────────────────────────────────────────────────

  await db.execute(`
    CREATE TABLE IF NOT EXISTS time_slots (
      slot_id      INT AUTO_INCREMENT PRIMARY KEY,
      admin_id     INT DEFAULT NULL,
      counter_id   INT DEFAULT NULL,
      slot_date    DATE NOT NULL,
      start_time   TIME NOT NULL,
      end_time     TIME NOT NULL,
      max_capacity INT NOT NULL DEFAULT 10,
      booked_count INT NOT NULL DEFAULT 0,
      is_active    TINYINT(1) DEFAULT 1,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id)   REFERENCES users(id)             ON DELETE SET NULL,
      FOREIGN KEY (counter_id) REFERENCES counters(counter_id)  ON DELETE SET NULL
    )
  `);
  console.log('✔  Table: time_slots');

  // ── APPOINTMENTS ───────────────────────────────────────────────────────────

  await db.execute(`
    CREATE TABLE IF NOT EXISTS appointments (
      appointment_id INT AUTO_INCREMENT PRIMARY KEY,
      student_id     INT NOT NULL,
      slot_id        INT NOT NULL,
      counter_id     INT DEFAULT NULL,
      queue_number   VARCHAR(20) NOT NULL,
      reason         ENUM('general','billing','transcript','other') DEFAULT 'general',
      status         ENUM('PENDING','SERVING','SERVED','CANCELLED','NO_SHOW') DEFAULT 'PENDING',
      booked_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      served_at      TIMESTAMP NULL DEFAULT NULL,
      cancelled_at   TIMESTAMP NULL DEFAULT NULL,
      is_deleted     TINYINT(1) DEFAULT 0,
      FOREIGN KEY (student_id) REFERENCES users(id)            ON DELETE CASCADE,
      FOREIGN KEY (slot_id)    REFERENCES time_slots(slot_id)  ON DELETE CASCADE,
      FOREIGN KEY (counter_id) REFERENCES counters(counter_id) ON DELETE SET NULL,
      INDEX idx_slot(slot_id),
      INDEX idx_student(student_id)
    )
  `);
  console.log('✔  Table: appointments');

  // ── NOTIFICATIONS ──────────────────────────────────────────────────────────

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id         INT NOT NULL,
      appointment_id  INT DEFAULT NULL,
      type            VARCHAR(50) DEFAULT 'info',
      channel         ENUM('EMAIL','SMS','IN_APP') DEFAULT 'IN_APP',
      message         TEXT,
      is_read         TINYINT(1) DEFAULT 0,
      status          ENUM('PENDING','SENT','FAILED') DEFAULT 'PENDING',
      sent_at         TIMESTAMP NULL DEFAULT NULL,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id)        REFERENCES users(id)                     ON DELETE CASCADE,
      FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id)  ON DELETE SET NULL
    )
  `);
  console.log('✔  Table: notifications\n');

  // ── SEED USERS ─────────────────────────────────────────────────────────────

  const seedUsers = [
    { username: 'superadmin', full_name: 'Super Admin', email: 'superadmin@ucu.ac.ug', pw: 'Admin@1234', role: 'SUPER_ADMIN' },
    { username: 'admin1', full_name: 'Office Admin', email: 'admin1@ucu.ac.ug', pw: 'Admin@1234', role: 'ADMIN' },
    { username: 'alice', full_name: 'Alice Nakamya', email: 'alice@ucu.ac.ug', pw: 'Student@123', role: 'STUDENT' },
    { username: 'bob', full_name: 'Bob Mukasa', email: 'bob@ucu.ac.ug', pw: 'Student@123', role: 'STUDENT' },
    { username: 'charlie', full_name: 'Charlie Okello', email: 'charlie@ucu.ac.ug', pw: 'Student@123', role: 'STUDENT' },
  ];
  for (const u of seedUsers) {
    const hash = await bcrypt.hash(u.pw, 10);
    await db.execute(
      `INSERT INTO users (username, full_name, email, password, role) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email),
                               password = VALUES(password), role = VALUES(role)`,
      [u.username, u.full_name, u.email, hash, u.role]
    );
  }
  console.log(`✔  Seeded ${seedUsers.length} users`);

  // ── SEED COUNTERS ──────────────────────────────────────────────────────────

  await db.execute(`
    INSERT IGNORE INTO counters (counter_name, service_type, is_active) VALUES
      ('Counter A', 'accounts',    1),
      ('Counter B', 'accounts',    1),
      ('Counter C', 'transcripts', 1)
  `);
  console.log('✔  Seeded 3 counters');

  // ── SEED EXAMPLE TIME SLOT ─────────────────────────────────────────────────

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const slotDate = tomorrow.toISOString().split('T')[0];

  const [adminRow] = await db.execute(
    `SELECT id FROM users WHERE role IN ('ADMIN','SUPER_ADMIN') ORDER BY id LIMIT 1`
  );
  const adminId = adminRow[0]?.id ?? 1;
  const [ctrRow] = await db.execute('SELECT counter_id FROM counters ORDER BY counter_id LIMIT 1');
  const counterId = ctrRow[0]?.counter_id ?? 1;

  await db.execute(
    `INSERT IGNORE INTO time_slots
       (admin_id, counter_id, slot_date, start_time, end_time, max_capacity, booked_count, is_active)
     VALUES (?, ?, ?, '09:00:00', '12:00:00', 20, 0, 1)`,
    [adminId, counterId, slotDate]
  );
  console.log(`✔  Seeded example time_slot for ${slotDate} (09:00–12:00, capacity 20)\n`);

  console.log('Seed complete!');
  console.log('  Admin:      username=admin1      password=Admin@1234');
  console.log('  SuperAdmin: username=superadmin  password=Admin@1234');
  console.log('  Students:   username=alice/bob/charlie  password=Student@123');

  await db.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
