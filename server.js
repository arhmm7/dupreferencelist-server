import "./config/env.js"

import express from 'express'
import authRoutes from './routes/auth.route.js'
import listRoutes from './routes/list.route.js'
import paymentRoutes from './routes/payments.route.js'
import cors from 'cors'
import { ensureAuthenticated } from './middlewares/auth.middleware.js';



const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/api', listRoutes);
app.use('/payment',paymentRoutes);

app.get('/', ensureAuthenticated ,(req, res) => {
  res.json({
    message: "from backend",   
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
