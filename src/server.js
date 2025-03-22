import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import supabase from './config/db.js';
import userRouter from './routes/userRouter.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/users', userRouter);

app.get('/', (req, res) => {
  supabase.from('users').select().then(({ data: users, error }) => {
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({ users });
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});