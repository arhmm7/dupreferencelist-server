import express from 'express';
import { signupController, loginController } from '../controllers/auth.controller.js';
import { validateLogin, validateSignUp } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/signup',validateSignUp ,signupController);
router.post('/login', validateLogin ,loginController);

export default router;
