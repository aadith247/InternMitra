const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { pool } = require('./db');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Postgres connection warm-up (optional)
pool.connect()
  .then(client => {
    return client.query('select 1').then(() => {
      client.release();
      console.log('PostgreSQL pool is ready');
    });
  })
  .catch(err => console.error('PostgreSQL connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/meme', require('./routes/meme'));
app.use('/api/instagram', require('./routes/instagram'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/config', require('./routes/config'));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbOk = await pool.query('select 1 as ok');
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      db: dbOk.rows?.[0]?.ok === 1 ? 'up' : 'unknown'
    });
  } catch (e) {
    res.status(500).json({ status: 'ERROR', message: 'DB check failed', error: e.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
