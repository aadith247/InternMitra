const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');
const axios = require('axios');

const router = express.Router();

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// @route   GET /api/students/profile
// @desc    Get student profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sp.*, s.email, s.first_name, s.last_name, s.phone 
       FROM student_profiles sp 
       JOIN students s ON sp.student_id = s.id 
       WHERE sp.student_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const row = result.rows[0]
    let category = null
    try {
      const parsed = row.resume_parsed_data || {}
      category = parsed.profileCategory || null
    } catch (_) { /* ignore */ }
    res.json({
      success: true,
      data: {
        ...row,
        gender: category?.gender || null,
        residence_type: category?.residenceType || null,
        social_bg: category?.socialBg || null,
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

// @route   POST /api/students/profile
// @desc    Create or update student profile
// @access  Private
router.post('/profile', authenticateToken, [
  body('sectorPreference')
    .optional()
    .isIn(['Technology', 'Finance', 'Healthcare', 'Education', 'Environmental', 'Marketing', 'Other'])
    .withMessage('Invalid sector preference'),
  body('locationPreference')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location preference must be between 2 and 100 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio cannot exceed 1000 characters')
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
      sectorPreference, 
      locationPreference, 
      bio, 
      linkedinUrl, 
      githubUrl,
      // new optional category fields
      gender,            // 'male' | 'female' | 'other' (kept free-form but UI limits)
      residenceType,     // 'rural' | 'urban'
      socialBg           // string (e.g., category or 'any')
    } = req.body;

    // Check if profile exists
    const existingProfile = await pool.query(
      'SELECT id FROM student_profiles WHERE student_id = $1',
      [req.user.id]
    );

    if (existingProfile.rows.length === 0) {
      // Create new profile
      const result = await pool.query(
        `INSERT INTO student_profiles 
         (student_id, sector_preference, location_preference, bio, linkedin_url, github_url, resume_parsed_data) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [
          req.user.id, sectorPreference, locationPreference, bio, linkedinUrl, githubUrl,
          { profileCategory: { gender: gender || null, residenceType: residenceType || null, socialBg: socialBg || null } }
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Profile created successfully',
        data: result.rows[0]
      });
    } else {
      // Update existing profile
      // Merge profileCategory into existing resume_parsed_data JSON
      const current = await pool.query('SELECT resume_parsed_data FROM student_profiles WHERE student_id = $1', [req.user.id]);
      const rpd = (current.rows[0]?.resume_parsed_data) || {};
      rpd.profileCategory = {
        ...(rpd.profileCategory || {}),
        ...(gender !== undefined ? { gender } : {}),
        ...(residenceType !== undefined ? { residenceType } : {}),
        ...(socialBg !== undefined ? { socialBg } : {}),
      };

      const result = await pool.query(
        `UPDATE student_profiles 
         SET sector_preference = $2, location_preference = $3, bio = $4, 
             linkedin_url = $5, github_url = $6, resume_parsed_data = $7, updated_at = NOW()
         WHERE student_id = $1 
         RETURNING *`,
        [req.user.id, sectorPreference, locationPreference, bio, linkedinUrl, githubUrl, rpd]
      );

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// @route   POST /api/students/resume
// @desc    Upload and parse resume
// @access  Private
router.post('/resume', authenticateToken, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Resume file is required'
      });
    }

    // Send file to Python parsing service
    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer]), req.file.originalname);

    const parseResponse = await axios.post(
      `${process.env.PARSING_SERVICE_URL}/parse-resume`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    const parsedData = parseResponse.data.data;
    const extractedSkills = parsedData.skills || [];

    // Update student profile with parsed data
    const result = await pool.query(
      `UPDATE student_profiles 
       SET skills = $2, resume_parsed_data = $3, updated_at = NOW()
       WHERE student_id = $1 
       RETURNING *`,
      [req.user.id, extractedSkills, parsedData]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found. Please create a profile first.'
      });
    }

    res.json({
      success: true,
      message: 'Resume uploaded and parsed successfully',
      data: {
        skills: extractedSkills,
        parsedData: parsedData,
        profile: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload and parse resume',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/students/skills
// @desc    Update student skills manually
// @access  Private
router.put('/skills', authenticateToken, [
  body('skills')
    .isArray({ min: 1 })
    .withMessage('Skills must be a non-empty array'),
  body('skills.*')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each skill must be between 1 and 50 characters')
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

    const { skills } = req.body;

    const result = await pool.query(
      `UPDATE student_profiles 
       SET skills = $2, updated_at = NOW()
       WHERE student_id = $1 
       RETURNING *`,
      [req.user.id, skills]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found. Please create a profile first.'
      });
    }

    res.json({
      success: true,
      message: 'Skills updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Skills update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update skills'
    });
  }
});

module.exports = router;
 
// ---------------- Sector-specific forms ----------------
// Helper: canonicalize skills (simple mapping; extend as needed)
function canonicalizeSkills(skills) {
  if (!Array.isArray(skills)) return [];
  const map = new Map([
    ['js', 'JavaScript'],
    ['javascript', 'JavaScript'],
    ['ts', 'TypeScript'],
    ['reactjs', 'React'],
    ['react', 'React'],
    ['node', 'Node.js'],
    ['nodejs', 'Node.js'],
    ['sql', 'SQL'],
    ['ml', 'Machine Learning'],
  ]);
  return [...new Set(
    skills
      .map(s => String(s || '').trim().toLowerCase())
      .filter(Boolean)
      .map(s => map.get(s) || s.replace(/\bjs\b/, 'JavaScript'))
      .map(s => s.replace(/\bnode\b/i, 'Node.js'))
      .map(s => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
  )];
}

// @route   POST /api/students/profile/:sector
// @desc    Upsert sector-specific structured profile (engineering/finance/etc.)
// @access  Private
router.post('/profile/:sector', authenticateToken, async (req, res) => {
  try {
    const sector = String(req.params.sector || '').toLowerCase();
    const allowed = ['engineering', 'finance', 'healthcare', 'education', 'environmental', 'marketing', 'other'];
    if (!allowed.includes(sector)) {
      return res.status(400).json({ success: false, message: 'Unsupported sector' });
    }

    const payload = req.body || {};

    // Canonicalize and dedupe skills for matching
    const canonicalSkills = canonicalizeSkills(payload.skills || []);
    const sectorCap = sector.charAt(0).toUpperCase() + sector.slice(1);

    // Ensure student profile exists
    const existing = await pool.query('SELECT id FROM student_profiles WHERE student_id = $1', [req.user.id]);
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO student_profiles (student_id, sector_preference, skills, resume_parsed_data)
         VALUES ($1, $2, $3, $4)`,
        [req.user.id, sectorCap, canonicalSkills, payload]
      );
    } else {
      await pool.query(
        `UPDATE student_profiles
         SET sector_preference = $2,
             skills = $3,
             resume_parsed_data = $4,
             updated_at = NOW()
         WHERE student_id = $1`,
        [req.user.id, sectorCap, canonicalSkills, payload]
      );
    }

    return res.json({ success: true, message: 'Sector profile saved', data: { sector: sectorCap, skills: canonicalSkills } });
  } catch (error) {
    console.error('Sector profile save error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save sector profile' });
  }
});
