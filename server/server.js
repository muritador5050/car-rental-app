require('dotenv/config');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');

//Import routes
const authRoutes = require('./routes/authRoute');
const carRoutes = require('./routes/carRoute');
const bookingRoutes = require('./routes/bookingRoute');
const reviewRoutes = require('./routes/reviewRoute');
const paymentRoutes = require('./routes/paymentRoute');
const locationRoutes = require('./routes/locationRoute');

// Create Express app
const app = express();

//Middleware
app.use(helmet());
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/locations', locationRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('API is running');
});

//Error 404
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
