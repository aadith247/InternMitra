const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');
const axios = require('axios');

const router = express.Router();

// @route   GET /api/internships
// @desc    Get all active internships with optional filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { sector, location, search, limit = 20, offset = 0, remote, minDuration, stipendMin } = req.query;
    
    let query = `
      SELECT i.*, c.name as company_name, c.description as company_description, 
             c.website as company_website, c.logo_url as company_logo
      FROM internships i
      JOIN companies c ON i.company_id = c.id
      WHERE i.is_active = true
    `;
    
    const queryParams = [];
    let paramCount = 0;

    if (sector) {
      paramCount++;
      query += ` AND i.sector = $${paramCount}`;
      queryParams.push(sector);
    }

    if (location) {
      paramCount++;
      query += ` AND (i.location ILIKE $${paramCount} OR i.is_remote = true)`;
      queryParams.push(`%${location}%`);
    }

    if (search) {
      paramCount++;
      query += ` AND (i.title ILIKE $${paramCount} OR i.description ILIKE $${paramCount} OR c.name ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (typeof remote !== 'undefined') {
      // Accept true/false strings
      const isRemote = String(remote).toLowerCase() === 'true';
      paramCount++;
      query += ` AND i.is_remote = $${paramCount}`;
      queryParams.push(isRemote);
    }

    if (minDuration) {
      paramCount++;
      query += ` AND COALESCE(i.duration_weeks, 0) >= $${paramCount}`;
      queryParams.push(parseInt(minDuration));
    }

    if (stipendMin) {
      paramCount++;
      query += ` AND COALESCE(i.stipend_amount, 0) >= $${paramCount}`;
      queryParams.push(parseInt(stipendMin));
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get internships error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch internships'
    });
  }
});

// @route   GET /api/internships/:id
// @desc    Get internship by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT i.*, c.name as company_name, c.description as company_description, 
              c.website as company_website, c.logo_url as company_logo
       FROM internships i
       JOIN companies c ON i.company_id = c.id
       WHERE i.id = $1 AND i.is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get internship error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch internship'
    });
  }
});

// @route   POST /api/internships
// @desc    Create new internship (admin only - for testing)
// @access  Private
router.post('/', authenticateToken, [
  body('title')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('description')
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage('Description must be between 50 and 5000 characters'),
  body('requirements')
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage('Requirements must be between 20 and 5000 characters'),
  body('sector')
    .isIn(['Technology', 'Finance', 'Healthcare', 'Education', 'Environmental', 'Marketing', 'Other'])
    .withMessage('Invalid sector'),
  body('location')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),
  body('companyId')
    .isUUID()
    .withMessage('Valid company ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      requirements,
      sector,
      location,
      companyId,
      durationWeeks,
      stipendAmount,
      stipendCurrency = 'USD',
      isRemote = false,
      applicationDeadline
    } = req.body;

    // Parse job requirements to extract skills
    const parseResponse = await axios.post(
      `${process.env.PARSING_SERVICE_URL}/parse-job`,
      { jobDescription: requirements }
    );

    const parsedData = parseResponse.data.data;
    const extractedSkills = parsedData.skills || [];

    // Create internship
    const result = await pool.query(
      `INSERT INTO internships 
       (company_id, title, description, requirements, required_skills, sector, location, 
        duration_weeks, stipend_amount, stipend_currency, is_remote, application_deadline, job_parsed_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        companyId, title, description, requirements, extractedSkills, sector, location,
        durationWeeks, stipendAmount, stipendCurrency, isRemote, applicationDeadline, parsedData
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Internship created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create internship error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create internship',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/internships/sectors
// @desc    Get all available sectors
// @access  Public
router.get('/sectors', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT sector FROM internships WHERE is_active = true ORDER BY sector'
    );

    res.json({
      success: true,
      data: result.rows.map(row => row.sector)
    });
  } catch (error) {
    console.error('Get sectors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sectors'
    });
  }
});

// @route   GET /api/internships/locations
// @desc    Get all available locations
// @access  Public
router.get('/locations', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT location FROM internships WHERE is_active = true ORDER BY location'
    );

    res.json({
      success: true,
      data: result.rows.map(row => row.location)
    });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch locations'
    });
  }
});

module.exports = router;

// ------------------ Open route (no auth) to create internships ------------------
// @route   POST /api/internships/public
// @desc    Create new internship without authorization (for quick testing/demo)
// @access  Public (Do NOT enable in production)
router.post('/public', [
  body('title')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage('Description must be between 20 and 5000 characters'),
  body('requirements')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Requirements must be between 10 and 5000 characters'),
  body('sector')
    .isIn(['Technology', 'Finance', 'Healthcare', 'Education', 'Environmental', 'Marketing', 'Other'])
    .withMessage('Invalid sector'),
  body('location')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),
  body('companyId')
    .optional()
    .isUUID()
    .withMessage('companyId must be a valid UUID if provided'),
], async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Public creation disabled in production' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const {
      title, description, requirements, sector, location,
      companyId, durationWeeks, stipendAmount, stipendCurrency = 'USD', isRemote = false, applicationDeadline
    } = req.body;

    // If no companyId provided, create or reuse a default demo company (without relying on unique constraints)
    let company_id = companyId;
    if (!company_id) {
      const existing = await pool.query('SELECT id FROM companies WHERE name = $1 LIMIT 1', ['Demo Company']);
      if (existing.rows.length > 0) {
        company_id = existing.rows[0].id;
      } else {
        const r = await pool.query(
          `INSERT INTO companies (name, website, description)
           VALUES ($1, $2, $3)
           RETURNING id`,
          ['Demo Company', 'https://demo.example', 'Demo company for public internship posting']
        );
        company_id = r.rows[0].id;
      }
    }

    // Parse job requirements to extract skills via Python service (best-effort)
    let extractedSkills = [];
    let parsedData = {};
    try {
      if (process.env.PARSING_SERVICE_URL) {
        const parseResponse = await axios.post(
          `${process.env.PARSING_SERVICE_URL}/parse-job`,
          { jobDescription: requirements },
          { timeout: 8000 }
        );
        parsedData = (parseResponse.data && parseResponse.data.data) || {};
        extractedSkills = parsedData.skills || [];
      }
    } catch (e) {
      console.warn('Public job parse failed, continuing without parsed skills:', e.message);
    }

    const result = await pool.query(
      `INSERT INTO internships 
       (company_id, title, description, requirements, required_skills, sector, location, 
        duration_weeks, stipend_amount, stipend_currency, is_remote, application_deadline, job_parsed_data, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
       RETURNING *`,
      [
        company_id, title, description, requirements, extractedSkills, sector, location,
        durationWeeks || null, stipendAmount || null, stipendCurrency, !!isRemote, applicationDeadline || null, parsedData
      ]
    );

    return res.status(201).json({ success: true, message: 'Internship created', data: result.rows[0] });
  } catch (error) {
    console.error('Public create internship error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create internship' });
  }
});
