import express from 'express'
import authRoutes from './routes/auth.route.js'
import dotenv from 'dotenv';
import cors from 'cors'
import { ensureAuthenticated } from './middlewares/auth.middleware.js';

dotenv.config();


const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);

app.get('/', ensureAuthenticated ,(req, res) => {
  res.json({
    message: "from backend",   
  });
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
