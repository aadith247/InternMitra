const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// @route   POST /api/parsing/parse-resume
// @desc    Parse resume file (proxy to Python service)
// @access  Private
router.post('/parse-resume', authenticateToken, async (req, res) => {
  try {
    // This endpoint is a proxy to the Python parsing service
    // The actual file upload is handled in the students route
    res.status(400).json({
      success: false,
      message: 'Please use /api/students/resume endpoint for resume upload'
    });
  } catch (error) {
    console.error('Parse resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to parse resume'
    });
  }
});

// @route   POST /api/parsing/parse-job
// @desc    Parse job description text (proxy to Python service)
// @access  Private
router.post('/parse-job', authenticateToken, [
  body('jobDescription')
    .trim()
    .isLength({ min: 20, max: 10000 })
    .withMessage('Job description must be between 20 and 10000 characters')
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

    const { jobDescription } = req.body;

    // Call Python parsing service
    const parseResponse = await axios.post(
      `${process.env.PARSING_SERVICE_URL}/parse-job`,
      { jobDescription }
    );

    res.json({
      success: true,
      data: parseResponse.data.data
    });
  } catch (error) {
    console.error('Parse job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to parse job description',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/parsing/health
// @desc    Check parsing service health
// @access  Public
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${process.env.PARSING_SERVICE_URL}/health`);
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Parsing service unavailable',
      error: error.message
    });
  }
});

// @route   GET /api/parsing/health
// @desc    Check connectivity to the Python parsing service
// @access  Public (no sensitive data; useful for diagnostics)
router.get('/health', async (req, res) => {
  try {
    const url = `${process.env.PARSING_SERVICE_URL}/health`;
    const out = await axios.get(url, { timeout: 3000 });
    return res.json({ success: true, upstream: out.data || null });
  } catch (error) {
    console.error('Parsing health check failed:', error?.message || error);
    return res.status(503).json({ success: false, message: 'Parsing service unreachable' });
  }
});

module.exports = router;
