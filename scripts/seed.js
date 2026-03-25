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

  // ── CHAPTERS ───────────────────────────────────────────────────────────────

  await db.execute(`
    CREATE TABLE IF NOT EXISTS chapters (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      name         VARCHAR(150) NOT NULL,
      description  TEXT,
      chapter_type ENUM('lecture','lab','tutorial','seminar','workshop') DEFAULT 'lecture',
      status       ENUM('active','archived') DEFAULT 'active',
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.execute(`
    ALTER TABLE chapters
      ADD COLUMN IF NOT EXISTS chapter_type ENUM('lecture','lab','tutorial','seminar','workshop') DEFAULT 'lecture',
      ADD COLUMN IF NOT EXISTS status       ENUM('active','archived') DEFAULT 'active'
  `).catch(() => { });
  console.log('✔  Table: chapters');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_chapters (
      user_id    INT NOT NULL,
      chapter_id INT NOT NULL,
      PRIMARY KEY (user_id, chapter_id),
      FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    )
  `);
  console.log('✔  Table: user_chapters');

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

  // ── SEED CHAPTERS ──────────────────────────────────────────────────────────

  const chapters = [
    { name: 'Introduction to Node.js', desc: 'Fundamentals of Node.js runtime.', type: 'lecture', st: 'active' },
    { name: 'Express.js Basics', desc: 'Building RESTful APIs with Express.', type: 'lecture', st: 'active' },
    { name: 'MySQL & Relational DBs', desc: 'Database design, SQL queries, and joins.', type: 'lab', st: 'active' },
    { name: 'Authentication & JWT', desc: 'User auth with bcrypt and JWTs.', type: 'tutorial', st: 'active' },
    { name: 'Deployment & DevOps', desc: 'Docker and cloud deployment.', type: 'workshop', st: 'active' },
    { name: 'React Fundamentals', desc: 'Components, props, state, and hooks.', type: 'lecture', st: 'active' },
    { name: 'REST API Design', desc: 'Best practices for clean REST APIs.', type: 'seminar', st: 'active' },
    { name: 'SQL Lab: Joins & Indexes', desc: 'Hands-on SQL with joins and sub-queries.', type: 'lab', st: 'archived' },
  ];
  for (const c of chapters) {
    await db.execute(
      'INSERT IGNORE INTO chapters (name, description, chapter_type, status) VALUES (?, ?, ?, ?)',
      [c.name, c.desc, c.type, c.st]
    );
  }
  console.log(`✔  Seeded ${chapters.length} chapters`);

  const [allUsers] = await db.execute('SELECT id FROM users    ORDER BY id');
  const [allChapters] = await db.execute('SELECT id FROM chapters ORDER BY id');
  const assignments = [[0, 0], [0, 1], [0, 2], [1, 1], [1, 3], [2, 0], [2, 2], [2, 4], [3, 0], [3, 1], [3, 2], [3, 3], [3, 4]];
  let assigned = 0;
  for (const [ui, ci] of assignments) {
    if (allUsers[ui] && allChapters[ci]) {
      await db.execute('INSERT IGNORE INTO user_chapters (user_id, chapter_id) VALUES (?, ?)',
        [allUsers[ui].id, allChapters[ci].id]);
      assigned++;
    }
  }
  console.log(`✔  Assigned users to chapters (${assigned} memberships)`);

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
