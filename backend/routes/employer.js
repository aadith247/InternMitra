const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const axios = require('axios');

const router = express.Router();

// Disable caching for employer routes to avoid stale 304 responses
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
const { getCoords, haversineKm, scoreByDistance } = require('../utils/geo');

// Helper: set-based match score (align with student-side logic)
function normalize(s) { return String(s || '').trim().toLowerCase(); }
async function calcMatch(student, internship) {
  const studentSkills = Array.isArray(student.skills) ? student.skills : [];
  const studentSector = student.sector_preference || null;
  const studentLocation = student.location_preference || null;
  const reqSkills = Array.isArray(internship.required_skills) ? internship.required_skills : [];

  const canonical = (s) => {
    const raw = normalize(s);
    if (/^(c\+\+|cpp)$/.test(raw)) return 'cplusplus';
    if (/^c#$/.test(raw)) return 'csharp';
    if (/^(py|py3)$/.test(raw)) return 'python';
    if (/^node(\.js)?$/.test(raw) || /^nodejs$/.test(raw)) return 'nodejs';
    if (/^reactjs$/.test(raw)) return 'react';
    if (/^js$/.test(raw)) return 'javascript';
    if (/^ts$/.test(raw)) return 'typescript';
    if (/^postgres$/.test(raw)) return 'postgresql';
    return raw.replace(/[\s._-]+/g, '');
  };
  const toSet = (arr) => new Set((arr || []).map(canonical).filter(Boolean));
  const jaccard = (setA, setB) => {
    const a = new Set(setA);
    const b = new Set(setB);
    const inter = new Set([...a].filter(x => b.has(x)));
    const union = new Set([...a, ...b]);
    return union.size === 0 ? 0 : inter.size / union.size;
  };
  const cosineFromSets = (setA, setB) => {
    const a = new Set(setA);
    const b = new Set(setB);
    const inter = [...a].filter(x => b.has(x)).length;
    const denom = Math.sqrt(a.size || 1) * Math.sqrt(b.size || 1);
    return denom === 0 ? 0 : inter / denom;
  };

  // Skills similarity: max(Jaccard, Cosine)
  const setStudentSkills = toSet(studentSkills);
  const setReqSkills = toSet(reqSkills);
  const jSkill = jaccard(setStudentSkills, setReqSkills);
  const cSkill = cosineFromSets(setStudentSkills, setReqSkills);
  const skillMatch = Math.max(jSkill, cSkill);
  const matchedSkills = reqSkills.filter(s => setStudentSkills.has(canonical(s)));

  // Location similarity: Jaccard over tokenized locations
  const parseLocs = (locs) => {
    if (!locs) return [];
    if (Array.isArray(locs)) return locs.map(normalize).filter(Boolean);
    return String(locs).split(/[\n,|/;]+/).map(normalize).filter(Boolean);
  };
  let locationMatch = 0;
  if (internship.is_remote) {
    locationMatch = 1;
  } else {
    const studentLocSet = new Set(parseLocs(studentLocation));
    const internshipLocSet = new Set(parseLocs(internship.location));
    locationMatch = jaccard(studentLocSet, internshipLocSet);
  }

  // Sector similarity: Jaccard over singleton sets
  const secA = new Set([normalize(studentSector)].filter(Boolean));
  const secB = new Set([normalize(internship.sector)].filter(Boolean));
  const sectorMatch = jaccard(secA, secB);

  const total = (skillMatch * 0.6) + (locationMatch * 0.2) + (sectorMatch * 0.2);
  return {
    skillMatch: Math.round(skillMatch * 100) / 100,
    locationMatch: Math.round(locationMatch * 100) / 100,
    sectorMatch: Math.round(sectorMatch * 100) / 100,
    totalScore: Math.round(total * 100) / 100,
    matchedSkills
  };
}

// @route   GET /api/employer/internships
// @desc    List internships for a company
// @access  Public (MVP) — in real app, protect with employer auth
router.get('/internships', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ success: false, message: 'companyId is required' });
    const result = await pool.query(
      `SELECT i.*, c.name as company_name, c.logo_url as company_logo
       FROM internships i JOIN companies c ON i.company_id = c.id
       WHERE i.company_id = $1 AND i.is_active = true
       ORDER BY i.created_at DESC`,
      [companyId]
    );
    return res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error('Employer list internships error:', e);
    return res.status(500).json({ success: false, message: 'Failed to list internships' });
  }
});

// @route   DELETE /api/employer/applications/:id
// @desc    Employer deletes an application record
// @access  Public (MVP) — secure in real app
router.delete('/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM applications WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Application not found' });
    return res.json({ success: true, message: 'Application deleted', data: result.rows[0] });
  } catch (e) {
    console.error('Employer delete application error:', e);
    return res.status(500).json({ success: false, message: 'Failed to delete application' });
  }
});

// @route   PUT /api/employer/internships/:id/cancel
// @desc    Close/cancel an internship posting (mark is_active=false)
// @access  Public (MVP) — secure in real app
router.put('/internships/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE internships SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Internship not found' });
    }
    return res.json({ success: true, message: 'Internship closed', data: result.rows[0] });
  } catch (e) {
    console.error('Employer cancel internship error:', e);
    return res.status(500).json({ success: false, message: 'Failed to cancel internship' });
  }
});

// @route   PUT /api/employer/applications/:id/status
// @desc    Employer updates application status (accepted/rejected/pending/withdrawn)
// @access  Public (MVP) — secure in real app
router.put('/applications/:id/status', [
  body('status').isIn(['pending','accepted','rejected','withdrawn']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const { id } = req.params;
    const { status } = req.body;
    const result = await pool.query(
      `UPDATE applications SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, status]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Application not found' });
    return res.json({ success: true, message: 'Status updated', data: result.rows[0] });
  } catch (e) {
    console.error('Employer update application status error:', e);
    return res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// @route   POST /api/employer/internships
// @desc    Create a new internship for a company (best-effort parse requirements)
// @access  Public (MVP) — in real app, protect with employer auth
router.post('/internships', [
  body('companyId').isUUID().withMessage('companyId is required'),
  body('title').isLength({ min: 5 }).withMessage('title too short'),
  body('description').isLength({ min: 20 }).withMessage('description too short'),
  body('requirements').isLength({ min: 10 }).withMessage('requirements too short'),
  body('sector').isString().notEmpty(),
  body('location').isString().notEmpty(),
  body('genderRequirement').isIn(['male','female','both']).withMessage('genderRequirement must be male, female or both'),
  body('residenceRequirement').isIn(['rural','urban','any']).withMessage('residenceRequirement must be rural, urban or any'),
  body('socialRequirement').isString().notEmpty().withMessage('socialRequirement is required'),
  body('requiredSkills').optional().custom((v) => Array.isArray(v) ? v.every(s => typeof s === 'string') : typeof v === 'string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const {
      companyId, title, description, requirements, sector, location,
      /* durationWeeks, stipendAmount, stipendCurrency = 'USD', */ isRemote = false, applicationDeadline,
      genderRequirement, residenceRequirement, socialRequirement,
      requiredSkills
    } = req.body;

    // Employer-provided required skills (preferred if present)
    const providedSkills = (() => {
      if (!requiredSkills) return [];
      if (Array.isArray(requiredSkills)) return requiredSkills;
      // string => split on commas / pipes / newlines
      return String(requiredSkills).split(/[\n,|]/).map(s => s.trim()).filter(Boolean);
    })();

    // Parse/normalize required skills
    let extractedSkills = [];
    let parsedData = {};
    try {
      if (process.env.PARSING_SERVICE_URL) {
        // 1) Normalize employer-provided skills if any
        if (providedSkills.length > 0) {
          try {
            const normUrl = `${process.env.PARSING_SERVICE_URL}/nlp/normalize-skills`;
            const norm = await axios.post(normUrl, { skills: providedSkills }, { timeout: 6000 });
            extractedSkills = (norm.data && norm.data.data && Array.isArray(norm.data.data.skills)) ? norm.data.data.skills : providedSkills;
          } catch (e) {
            // fallback to simple canonicalization
            const canonical = (s) => {
              const n = String(s || '').trim().toLowerCase();
              const map = new Map([
                ['js', 'javascript'], ['javascript', 'javascript'], ['ts', 'typescript'], ['typescript', 'typescript'],
                ['reactjs', 'react'], ['react', 'react'], ['node', 'node.js'], ['nodejs', 'node.js'], ['node.js', 'node.js'],
                ['py', 'python'], ['py3', 'python'], ['postgres', 'postgresql'], ['postgresql', 'postgresql'], ['cpp', 'c++']
              ]);
              return map.get(n) || n.replace(/\bnode\b/i, 'node.js');
            };
            extractedSkills = providedSkills.map(canonical);
          }
        }
        // 2) Parse JD as fallback or to enrich
        if (extractedSkills.length === 0) {
          const url = `${process.env.PARSING_SERVICE_URL}/parse-job`;
          const out = await axios.post(url, { jobDescription: requirements }, { timeout: 8000 });
          parsedData = (out.data && out.data.data) || {};
          extractedSkills = parsedData.skills || [];
        }
      }
    } catch (e) {
      console.warn('Employer job parse failed, continuing without parsed skills:', e.message);
    }

    // If both provided and parsed exist, prefer provided but include unique union (optional)
    if (providedSkills.length > 0 && extractedSkills.length > 0) {
      const set = new Set([ ...extractedSkills.map(String), ...providedSkills.map(String) ]);
      extractedSkills = Array.from(set);
    } else if (providedSkills.length > 0) {
      extractedSkills = providedSkills;
    }

    // Attach employer eligibility requirements (mandatory)
    parsedData.employerRequirements = {
      gender: genderRequirement,
      residence: residenceRequirement,
      social: socialRequirement
    };

    // Enforce fixed stipend and duration so company cannot change them
    const FIXED_DURATION_WEEKS = 52; // 12 months
    const FIXED_STIPEND_AMOUNT = 4000;
    const FIXED_CURRENCY = 'INR';

    const result = await pool.query(
      `INSERT INTO internships 
       (company_id, title, description, requirements, required_skills, sector, location,
        duration_weeks, stipend_amount, stipend_currency, is_remote, application_deadline, job_parsed_data, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true)
       RETURNING *`,
      [companyId, title, description, requirements, extractedSkills, sector, location,
       FIXED_DURATION_WEEKS, FIXED_STIPEND_AMOUNT, FIXED_CURRENCY, !!isRemote, applicationDeadline || null, parsedData]
    );

    return res.status(201).json({ success: true, message: 'Internship created', data: result.rows[0] });
  } catch (e) {
    console.error('Employer create internship error:', e);
    return res.status(500).json({ success: false, message: 'Failed to create internship' });
  }
});

// @route   GET /api/employer/internships/:id/matches
// @desc    For a given internship, list top matching students with whether they applied
// @access  Public (MVP)
router.get('/internships/:id/matches', async (req, res) => {
  try {
    const { id } = req.params;
    // Load internship
    const ir = await pool.query(
      `SELECT i.* FROM internships i WHERE i.id = $1 AND i.is_active = true`,
      [id]
    );
    if (ir.rows.length === 0) return res.status(404).json({ success: false, message: 'Internship not found' });
    const internship = ir.rows[0];

    // Load student profiles
    const pr = await pool.query(
      `SELECT sp.*, s.first_name, s.last_name, s.email
       FROM student_profiles sp JOIN students s ON sp.student_id = s.id`
    );
    const profiles = pr.rows || [];

    // Load applications for this internship
    const ap = await pool.query(
      `SELECT id, student_id, status FROM applications WHERE internship_id = $1`,
      [id]
    );
    const appliedByStudent = new Map(ap.rows.map(r => [r.student_id, { id: r.id, status: r.status }]));

    // Score
    const scored = (await Promise.all(profiles.map(async (p) => {
      const m = await calcMatch(p, internship);
      let gender = null, residence = null, social = null;
      try {
        const cat = (p.resume_parsed_data && p.resume_parsed_data.profileCategory) || {};
        gender = cat.gender || null;
        residence = cat.residenceType || null;
        social = cat.socialBg || null;
      } catch (_) {}
      return {
        studentId: p.student_id,
        name: `${p.first_name} ${p.last_name}`.trim(),
        email: p.email,
        sectorPreference: p.sector_preference,
        locationPreference: p.location_preference,
        skills: p.skills || [],
        applied: appliedByStudent.has(p.student_id),
        applicationId: appliedByStudent.get(p.student_id)?.id || null,
        applicationStatus: appliedByStudent.get(p.student_id)?.status || null,
        matchScore: m.totalScore,
        skillMatch: m.skillMatch,
        locationMatch: m.locationMatch,
        sectorMatch: m.sectorMatch,
        matchedSkills: m.matchedSkills,
        diversity: { gender, residence, social }
      };
    }))).sort((a, b) => b.matchScore - a.matchScore);

    return res.json({ success: true, data: scored });
  } catch (e) {
    console.error('Employer internship matches error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch matches' });
  }
});

// @route   GET /api/employer/internships/:id/applicants
// @desc    List applicants for an internship with basic profile
// @access  Public (MVP)
router.get('/internships/:id/applicants', async (req, res) => {
  try {
    const { id } = req.params;

    // Load internship for scoring context
    const ir = await pool.query(`SELECT * FROM internships WHERE id = $1 AND is_active = true`, [id]);
    if (ir.rows.length === 0) return res.status(404).json({ success: false, message: 'Internship not found' });
    const internship = ir.rows[0];

    // Load applicants + basic profile
    const result = await pool.query(
      `SELECT a.*, s.first_name, s.last_name, s.email,
              sp.skills, sp.sector_preference, sp.location_preference, sp.bio,
              sp.linkedin_url, sp.github_url, sp.resume_parsed_data
       FROM applications a
       JOIN students s ON a.student_id = s.id
       LEFT JOIN student_profiles sp ON sp.student_id = s.id
       WHERE a.internship_id = $1
       ORDER BY a.applied_at DESC`,
      [id]
    );

    // Decorate with diversity + match scores
    const rows = await Promise.all((result.rows || []).map(async r => {
      let gender = null, residence = null, social = null;
      try {
        const cat = (r.resume_parsed_data && r.resume_parsed_data.profileCategory) || {};
        gender = cat.gender || null;
        residence = cat.residenceType || null;
        social = cat.socialBg || null;
      } catch (_) {}

      // calc match
      let ms = { skillMatch: 0, locationMatch: 0, sectorMatch: 0, totalScore: 0, matchedSkills: [] };
      try {
        ms = await calcMatch({
          skills: r.skills || [],
          sector_preference: r.sector_preference,
          location_preference: r.location_preference
        }, internship);
      } catch (_) {}

      return {
        ...r,
        diversity: { gender, residence, social },
        matchScore: ms.totalScore,
        skillMatch: ms.skillMatch,
        locationMatch: ms.locationMatch,
        sectorMatch: ms.sectorMatch,
        matchedSkills: ms.matchedSkills
      }
    }));

    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error('Employer internship applicants error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch applicants' });
  }
});

// Employer view of a student's profile (basic details + resume_parsed_data)
router.get('/students/:studentId/profile', async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await pool.query(
      `SELECT s.id, s.first_name, s.last_name, s.email,
              sp.sector_preference, sp.location_preference, sp.skills, sp.bio,
              sp.linkedin_url, sp.github_url, sp.resume_parsed_data
       FROM students s
       LEFT JOIN student_profiles sp ON sp.student_id = s.id
       WHERE s.id = $1`,
      [studentId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });

    const r = result.rows[0];
    let gender = null, residence = null, social = null;
    try {
      const cat = (r.resume_parsed_data && r.resume_parsed_data.profileCategory) || {};
      gender = cat.gender || null;
      residence = cat.residenceType || null;
      social = cat.socialBg || null;
    } catch (_) {}

    return res.json({ success: true, data: { ...r, diversity: { gender, residence, social } } });
  } catch (e) {
    console.error('Employer view student profile error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch student profile' });
  }
});

module.exports = router;
