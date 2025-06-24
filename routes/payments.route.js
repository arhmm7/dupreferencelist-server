import express from 'express';
import { createOrder, verifyPayment } from '../controllers/payments.controller.js';
import { ensureAuthenticated } from '../middlewares/auth.middleware.js';

const router = express.Router();

// @route   POST /payment/createOrder
// @desc    Create a Razorpay order (with optional promo_code)
// @access  Authenticated
router.post('/createOrder', ensureAuthenticated, createOrder);

// @route   POST /payment/verifyPayment
// @desc    Verify Razorpay signature and update order status
// @access  Authenticated (if called from client)
// Note: If you move to webhooks, this should be public and signature-based
router.post('/verifyPayment', ensureAuthenticated, verifyPayment);

export default router;
