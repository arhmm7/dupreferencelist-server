import { initDB } from '../database/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function signupController(req, res) {
  const { firstName, lastName, email, password, referCode } = req.body;

  if (!firstName || !lastName || !email || !password || !referCode) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const db = await initDB();

    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', email);

    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const result = await db.run(
      'INSERT INTO users (firstName, lastName, email, password, referCode) VALUES (?, ?, ?, ?, ?)',
      firstName, lastName, email, password, referCode
    );

    const token = jwt.sign(
      { id: result.lastID, email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      message: 'User signed up successfully',
      token,
      user: {
        id: result.lastID,
        firstName,
        lastName,
        email,
        referCode
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

    const user = await db.get('SELECT * FROM users WHERE email = ?', email);

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        referCode: user.referCode
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Database error", error: err.message });
  }
}
