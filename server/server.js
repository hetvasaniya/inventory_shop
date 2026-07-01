const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { initSocket } = require('./socket/stockSocket');
const errorHandler = require('./middleware/errorHandler');

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);
app.set('io', io);

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500 // limit each IP to 500 requests per windowMs
});
app.use('/api', limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/bills', require('./routes/billRoutes'));
app.use('/api/barcode', require('./routes/barcodeRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// Root endpoint
app.get('/', (req, res) => {
  res.send('H-Mart API is running...');
});

// Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
