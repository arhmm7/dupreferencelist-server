import jwt from 'jsonwebtoken';
import Joi from 'joi';

const JWT_SECRET = process.env.JWT_SECRET;

export const validateSignUp = (req, res, next) => {
  const schema = Joi.object({
    first_name: Joi.string().min(2).max(100).required(),
    last_name: Joi.string().min(2).max(100).required(),
    email : Joi.string().email().required(),
    password: Joi.string().min(8).max(100).required(),
    promo_code: Joi.string().alphanum().allow("").optional()
  });
  
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      message: 'Validation Error',
      error: error.details[0].message
    });
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(4).max(100).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      message: 'Validation Error',
      error: error.details[0].message
    });
  }

  next();
};

export function ensureAuthenticated(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Unauthorized Access' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Invalid authorization format' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
  });
}
