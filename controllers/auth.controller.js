import { initDB } from '../database/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function signupController(req, res) {
  const { first_name, last_name, email, password, promo_code } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const db = await initDB();

    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    if (promo_code) {
      const promo = await db.get(
        'SELECT * FROM promo_codes WHERE code = ? AND active = 1',
        [promo_code]
      );

      if (!promo) {
        return res.status(400).json({ message: "Invalid promo code" });
      }

      if (promo.usage_limit !== null && promo.usage_count >= promo.usage_limit) {
        return res.status(400).json({ message: "Promo code usage limit reached" });
      }
    }

    const result = await db.run(
      'INSERT INTO users (first_name, last_name, email, password, promo_code) VALUES (?, ?, ?, ?, ?)',
      [first_name, last_name, email, password, promo_code || null]
    );

    const userId = result.lastID;

    if (promo_code) {
      await db.run(
        'UPDATE promo_codes SET usage_count = usage_count + 1 WHERE code = ?',
        [promo_code]
      );
    }

    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'User signed up successfully',
      token,
      user: {
        id: userId,
        first_name,
        last_name,
        email,
        promo_code
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
}


export async function loginController(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const db = await initDB();

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        promo_code: user.promo_code
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Database error", error: err.message });
  }
}
