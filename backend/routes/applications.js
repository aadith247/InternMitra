const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// @route   GET /api/applications
// @desc    Get student's applications
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, i.title as internship_title, i.description as internship_description,
              i.sector, i.location, i.duration_weeks, i.stipend_amount, i.stipend_currency,
              c.name as company_name, c.logo_url as company_logo
       FROM applications a
       JOIN internships i ON a.internship_id = i.id
       JOIN companies c ON i.company_id = c.id
       WHERE a.student_id = $1
       ORDER BY a.applied_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications'
    });
  }
});

// @route   POST /api/applications
// @desc    Apply to an internship
// @access  Private
router.post('/', authenticateToken, [
  body('internshipId')
    .isUUID()
    .withMessage('Valid internship ID is required'),
  body('coverLetter')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Cover letter cannot exceed 2000 characters')
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

    const { internshipId, coverLetter } = req.body;

    // Check if internship exists and is active
    const internshipResult = await pool.query(
      'SELECT id, title, job_parsed_data FROM internships WHERE id = $1 AND is_active = true',
      [internshipId]
    );

    if (internshipResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found or not available'
      });
    }

    // Eligibility check: company-set requirements vs. student category
    const reqs = (internshipResult.rows[0].job_parsed_data && internshipResult.rows[0].job_parsed_data.employerRequirements) || null;
    if (reqs) {
      const profRes = await pool.query(
        'SELECT resume_parsed_data FROM student_profiles WHERE student_id = $1',
        [req.user.id]
      );
      const rpd = profRes.rows[0]?.resume_parsed_data || {};
      const cat = rpd.profileCategory || {};
      const gender = String(cat.gender || '').toLowerCase();
      const residence = String(cat.residenceType || '').toLowerCase();
      const social = String(cat.socialBg || '').toLowerCase();

      const wantGender = String(reqs.gender || '').toLowerCase(); // male|female|both
      const wantResidence = String(reqs.residence || '').toLowerCase(); // rural|urban|any
      const wantSocial = String(reqs.social || '').toLowerCase(); // any or specific text

      // Gender rule: must match unless 'both'
      if (wantGender && wantGender !== 'both' && gender && gender !== wantGender) {
        return res.status(403).json({ success: false, message: 'You are not eligible to apply (gender requirement)' });
      }
      // Residence rule: must match unless 'any'
      if (wantResidence && wantResidence !== 'any' && residence && residence !== wantResidence) {
        return res.status(403).json({ success: false, message: 'You are not eligible to apply (residence requirement)' });
      }
      // Social bg: if company specified not 'any', require exact case-insensitive match
      if (wantSocial && wantSocial !== 'any' && social && social !== wantSocial) {
        return res.status(403).json({ success: false, message: 'You are not eligible to apply (social background requirement)' });
      }
    }

    // Check if already applied
    const existingApplication = await pool.query(
      'SELECT id FROM applications WHERE student_id = $1 AND internship_id = $2',
      [req.user.id, internshipId]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied to this internship'
      });
    }

    // Create application
    const result = await pool.query(
      `INSERT INTO applications (student_id, internship_id, cover_letter)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, internshipId, coverLetter]
    );

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/applications/:id/withdraw
// @desc    Withdraw an application
// @access  Private
router.put('/:id/withdraw', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE applications 
       SET status = 'withdrawn', updated_at = NOW()
       WHERE id = $1 AND student_id = $2 AND status = 'pending'
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or cannot be withdrawn'
      });
    }

    res.json({
      success: true,
      message: 'Application withdrawn successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Withdraw application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to withdraw application'
    });
  }
});

// @route   GET /api/applications/:id
// @desc    Get application details
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT a.*, i.title as internship_title, i.description as internship_description,
              i.sector, i.location, i.duration_weeks, i.stipend_amount, i.stipend_currency,
              c.name as company_name, c.logo_url as company_logo
       FROM applications a
       JOIN internships i ON a.internship_id = i.id
       JOIN companies c ON i.company_id = c.id
       WHERE a.id = $1 AND a.student_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application'
    });
  }
});

module.exports = router;
