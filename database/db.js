import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

sqlite3.verbose();

export const initDB = async () => {
  const db = await open({
    filename: './data/main.db',
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      promo_code TEXT
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      razorpay_order_id TEXT NOT NULL UNIQUE,
      razorpay_payment_id TEXT,
      status TEXT NOT NULL DEFAULT 'created', 
      amount INTEGER NOT NULL,
      preference_list TEXT,
      promo_code TEXT,                                
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await db.exec(`
   CREATE TABLE IF NOT EXISTS promo_codes (
    code TEXT PRIMARY KEY,
    usage_limit INTEGER DEFAULT NULL,
    usage_count INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    discount_percent INTEGER DEFAULT 0 
  );

  `);

  return db;
};
