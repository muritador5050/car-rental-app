require('dotenv/config');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const userRouter = require('./config/auth.config');
//Intialize app
const app = express();
const PORT = process.env.PORT || 5000;

//Middleware
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

//Routes
app.use('/', userRouter);

app.get('/', (req, res) => {
  res.send({ message: 'API is working!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
