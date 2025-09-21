const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { db } = require('../config/database');
const { internships, companies } = require('../config/schema');
const { eq, and, or, ilike, desc, sql } = require('drizzle-orm');
const axios = require('axios');

const router = express.Router();
// @route   GET /api/internships
// @desc    Get all active internships with optional filtering using Drizzle ORM
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { sector, location, search, limit = 20, offset = 0 } = req.query;
    
    // Build conditions array
    const conditions = [eq(internships.isActive, true)];
    
    if (sector) {
      conditions.push(eq(internships.sector, sector));
    }
    
    if (location) {
      conditions.push(
        or(
          ilike(internships.location, `%${location}%`),
          eq(internships.isRemote, true)
        )
      );
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(internships.title, `%${search}%`),
          ilike(internships.description, `%${search}%`),
          ilike(companies.name, `%${search}%`)
        )
      );
    }

    // Query with join using Drizzle
    const result = await db
      .select({
        id: internships.id,
        companyId: internships.companyId,
        title: internships.title,
        description: internships.description,
        requirements: internships.requirements,
        requiredSkills: internships.requiredSkills,
        sector: internships.sector,
        location: internships.location,
        durationWeeks: internships.durationWeeks,
        stipendAmount: internships.stipendAmount,
        stipendCurrency: internships.stipendCurrency,
        isRemote: internships.isRemote,
        isActive: internships.isActive,
        applicationDeadline: internships.applicationDeadline,
        jobParsedData: internships.jobParsedData,
        createdAt: internships.createdAt,
        updatedAt: internships.updatedAt,
        companyName: companies.name,
        companyDescription: companies.description,
        companyWebsite: companies.website,
        companyLogo: companies.logoUrl
      })
      .from(internships)
      .innerJoin(companies, eq(internships.companyId, companies.id))
      .where(and(...conditions))
      .orderBy(desc(internships.createdAt))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json({
      success: true,
      data: result,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: result.length
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
// @desc    Get internship by ID using Drizzle ORM
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db
      .select({
        id: internships.id,
        companyId: internships.companyId,
        title: internships.title,
        description: internships.description,
        requirements: internships.requirements,
        requiredSkills: internships.requiredSkills,
        sector: internships.sector,
        location: internships.location,
        durationWeeks: internships.durationWeeks,
        stipendAmount: internships.stipendAmount,
        stipendCurrency: internships.stipendCurrency,
        isRemote: internships.isRemote,
        isActive: internships.isActive,
        applicationDeadline: internships.applicationDeadline,
        jobParsedData: internships.jobParsedData,
        createdAt: internships.createdAt,
        updatedAt: internships.updatedAt,
        companyName: companies.name,
        companyDescription: companies.description,
        companyWebsite: companies.website,
        companyLogo: companies.logoUrl
      })
      .from(internships)
      .innerJoin(companies, eq(internships.companyId, companies.id))
      .where(and(eq(internships.id, id), eq(internships.isActive, true)))
      .limit(1);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    res.json({
      success: true,
      data: result
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
// @desc    Create new internship using Drizzle ORM (admin only - for testing)
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

    // Create internship using Drizzle
    const [newInternship] = await db
      .insert(internships)
      .values({
        companyId,
        title,
        description,
        requirements,
        requiredSkills: extractedSkills,
        sector,
        location,
        durationWeeks,
        stipendAmount,
        stipendCurrency,
        isRemote,
        applicationDeadline,
        jobParsedData: parsedData
      })
      .returning();

    res.status(201).json({
      success: true,
      message: 'Internship created successfully',
      data: newInternship
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
// @desc    Get all available sectors using Drizzle ORM
// @access  Public
router.get('/sectors', async (req, res) => {
  try {
    const result = await db
      .selectDistinct({ sector: internships.sector })
      .from(internships)
      .where(eq(internships.isActive, true))
      .orderBy(internships.sector);

    res.json({
      success: true,
      data: result.map(row => row.sector)
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
// @desc    Get all available locations using Drizzle ORM
// @access  Public
router.get('/locations', async (req, res) => {
  try {
    const result = await db
      .selectDistinct({ location: internships.location })
      .from(internships)
      .where(eq(internships.isActive, true))
      .orderBy(internships.location);

    res.json({
      success: true,
      data: result.map(row => row.location)
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
