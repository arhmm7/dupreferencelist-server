import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

sqlite3.verbose();

export const initDB = async () => {
  const db = await open({
    filename: './data/users.db',
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      referCode TEXT NOT NULL
    )
  `);

  return db;
};
