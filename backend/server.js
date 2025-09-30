const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config()
require('dotenv').config()

function mask(v) {
  if (!v) return '(missing)'
  return v.slice(0, 10) + '...' + v.slice(-4)
}

console.log('[Clerk env check]',
  'PK:', mask(process.env.CLERK_PUBLISHABLE_KEY),
  'SK:', mask(process.env.CLERK_SECRET_KEY)
)

const app = express();

// Security middleware
app.use(helmet());
// CORS configured via env var CORS_ORIGIN (comma-separated list)
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: function (origin, callback) {
    // Allow non-browser requests or same-origin
    if (!origin) return callback(null, true);
    // If no allowed origins are set, allow all (useful for initial setups)
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
}));

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Clerk auth is applied per-route via ensureClerkUser middleware

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/internships', require('./routes/internships'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/parsing', require('./routes/parsing'));
app.use('/api/employer', require('./routes/employer'));
app.use('/api/employer-auth', require('./routes/employerAuth'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
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