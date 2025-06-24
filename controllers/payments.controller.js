import Razorpay from "razorpay";
import crypto from "crypto";
import { initDB } from "../database/db.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrder = async (req, res) => {
  const { amount, user_id, promo_code } = req.body;

  if (!user_id || !amount) {
    return res.status(400).json({ message: "user_id and amount are required" });
  }

  try {
    const db = await initDB();
    let finalAmount = amount;
    let discountApplied = 0;

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

      discountApplied = Math.floor((promo.discount_percent || 0) * amount / 100);
      finalAmount = amount - discountApplied;
    }

    const options = {
      amount: finalAmount * 100, // in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    await db.run(
      `INSERT INTO orders (user_id, razorpay_order_id, amount, promo_code) VALUES (?, ?, ?, ?)`,
      [user_id, order.id, finalAmount, promo_code || null]
    );

    return res.status(200).json({
      ...order,
      original_amount: amount,
      discount_applied: discountApplied,
      final_amount: finalAmount,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to create order", error: err.message });
  }
};

export const verifyPayment = async (req, res) => {

    const db = await initDB();


  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing payment fields" });
  }

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generated_signature !== razorpay_signature) {
    return res.status(400).json({ message: "Invalid signature" });
  }

    const existingOrder = await db.get(
        `SELECT status, promo_code FROM orders WHERE razorpay_order_id = ?`,[razorpay_order_id]
    );

    if (!existingOrder) {
     return res.status(404).json({ message: "Order not found" });
    }

    if (existingOrder.status === 'paid') {
     return res.status(200).json({ message: "Payment already verified" });
    }

    if (process.env.NODE_ENV === 'development') {
        console.log("Expected signature:", generated_signature);
        console.log("Received signature:", razorpay_signature);
    }



  try {
    const db = await initDB();

    await db.run(
      `UPDATE orders SET razorpay_payment_id = ?, status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE razorpay_order_id = ?`,
      [razorpay_payment_id, razorpay_order_id]
    );

    const order = await db.get('SELECT promo_code FROM orders WHERE razorpay_order_id = ?', [razorpay_order_id]);
    if (order?.promo_code) {
      await db.run(
        `UPDATE promo_codes SET usage_count = usage_count + 1 WHERE code = ?`,
        [order.promo_code]
      );
    }

    return res.status(200).json({ message: "Payment verified and order updated" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to verify payment", error: err.message });
  }
};
