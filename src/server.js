import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRouter from './routes/userRouter.js';
import bloodReqRouter from './routes/bloodReqRouter.js';
import partnerRouter from './routes/partnerRouter.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/users', userRouter);
app.use('/bloodReq', bloodReqRouter);
app.use('/partners', partnerRouter);

app.get('/', (req, res) => {
  res.send('Welcome to the DarahTanyoe API');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export default app;