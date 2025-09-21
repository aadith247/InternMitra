const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { generateToken, generateRefreshToken } = require('../middleware/auth');

const router = express.Router();

const registerValidation = [
  body('companyName').trim().isLength({ min: 2 }).withMessage('Company name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('website').optional().isString(),
  body('contactName').optional().isString(),
  body('phone').optional().isString(),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

// POST /api/employer-auth/register
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const { companyName, email, password, website, contactName, phone } = req.body;

    const exist = await pool.query('SELECT id FROM companies WHERE email = $1', [email]);
    if (exist.rows.length > 0) return res.status(400).json({ success: false, message: 'Company already exists with this email' });

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO companies (name, email, password_hash, website, contact_name, phone, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       RETURNING id, name, email, website, contact_name, phone, created_at`,
      [companyName, email, passwordHash, website || null, contactName || null, phone || null]
    );
    const company = result.rows[0];
    const token = generateToken(company.id);
    const refreshToken = generateRefreshToken(company.id);
    return res.status(201).json({ success: true, message: 'Company registered', data: { company, token, refreshToken } });
  } catch (e) {
    console.error('Employer register error:', e);
    return res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// POST /api/employer-auth/login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const { email, password } = req.body;
    const result = await pool.query(
      `SELECT id, name, email, password_hash, website, contact_name, phone, is_active FROM companies WHERE email = $1`,
      [email]
    );
    if (result.rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const company = result.rows[0];
    if (!company.is_active) return res.status(403).json({ success: false, message: 'Company account is deactivated' });
    const ok = await bcrypt.compare(password, company.password_hash);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = generateToken(company.id);
    const refreshToken = generateRefreshToken(company.id);
    return res.json({ success: true, message: 'Login successful', data: { company: { id: company.id, name: company.name, email: company.email, website: company.website, contactName: company.contact_name, phone: company.phone }, token, refreshToken } });
  } catch (e) {
    console.error('Employer login error:', e);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
});

module.exports = router;
