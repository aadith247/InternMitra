const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');
const axios = require('axios');
const { getCoords, haversineKm, scoreByDistance } = require('../utils/geo');

const router = express.Router();

// Helper to compute and optionally persist matches for a student
// options: {
//   weights: { skills: number, location: number, sector: number }, // sums to <= 1
//   persist: boolean // whether to upsert into match_scores
// }
async function computeAndPersistMatches(studentId, options = {}) {
  const defaultWeights = { skills: 0.6, location: 0.2, sector: 0.2 }
  const weights = options.weights || defaultWeights
  const priorityOrder = Array.isArray(options.priority) ? options.priority : null
  const shouldPersist = options.persist === undefined ? true : !!options.persist
  // Get student profile
  const profileResult = await pool.query(
    'SELECT skills, sector_preference, location_preference, resume_parsed_data FROM student_profiles WHERE student_id = $1',
    [studentId]
  );

  let profile = profileResult.rows[0] || {};
  const studentSkills = profile.skills || [];
  const sectorPreference = profile.sector_preference || null;
  const locationPreference = profile.location_preference || null;
  const parsed = profile.resume_parsed_data || {};
  const resumeText = [
    parsed.summary,
    Array.isArray(studentSkills) ? studentSkills.join(' ') : ''
  ].filter(Boolean).join(' \n ');

  // Get all active internships
  const internshipsResult = await pool.query(
    `SELECT i.*, c.name as company_name, c.logo_url as company_logo
     FROM internships i
     JOIN companies c ON i.company_id = c.id
     WHERE i.is_active = true
     ORDER BY i.created_at DESC`
  );
  const internships = internshipsResult.rows;

  // Prepare embeddings request payload (job documents)
  const jobsPayload = internships.map((it) => ({
    id: String(it.id),
    text: [it.title, it.description, it.requirements].filter(Boolean).join(' \n ')
  }));

  let tfidfScoresMap = new Map();
  try {
    if (process.env.PARSING_SERVICE_URL && resumeText) {
      // Try SBERT first
      try {
        const sbertRes = await axios.post(
          `${process.env.PARSING_SERVICE_URL}/embeddings/sentence`,
          { resumeText, jobs: jobsPayload },
          { timeout: 8000 }
        );
        const scores = (sbertRes.data && sbertRes.data.data && sbertRes.data.data.scores) || [];
        for (const s of scores) tfidfScoresMap.set(String(s.id), Number(s.similarity) || 0);
      } catch (e1) {
        // Fallback to TF-IDF
        const tfidfRes = await axios.post(
          `${process.env.PARSING_SERVICE_URL}/embeddings/tfidf`,
          { resumeText, jobs: jobsPayload },
          { timeout: 8000 }
        );
        const scores = (tfidfRes.data && tfidfRes.data.data && tfidfRes.data.data.scores) || [];
        for (const s of scores) tfidfScoresMap.set(String(s.id), Number(s.similarity) || 0);
      }
    }
  } catch (err) {
    console.warn('TF-IDF service error, proceeding with heuristic only:', err.message);
  }

  const matches = [];
  // Calculate match scores for each internship
  for (const internship of internships) {
    const matchScore = await calculateMatchScore(
      studentSkills,
      sectorPreference,
      locationPreference,
      internship.required_skills || [],
      internship.sector,
      internship.location,
      internship.is_remote,
      weights
    );

    // Blend TF-IDF similarity with heuristic total
    const tfidf = tfidfScoresMap.get(String(internship.id)) || 0;
    const blended = Math.min(1, (matchScore.totalScore * 0.6) + (tfidf * 0.4));

    if (blended > 0) {
      matches.push({
        ...internship,
        matchScore: Math.round(blended * 100) / 100,
        skillMatch: matchScore.skillMatch,
        locationMatch: matchScore.locationMatch,
        sectorMatch: matchScore.sectorMatch,
        matchedSkills: matchScore.matchedSkills
      });

      if (shouldPersist) try {
        await pool.query(
          `INSERT INTO match_scores 
           (student_id, internship_id, skill_match_score, location_match_score, 
            sector_match_score, total_score, skills_matched)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (student_id, internship_id)
           DO UPDATE SET 
             skill_match_score = EXCLUDED.skill_match_score,
             location_match_score = EXCLUDED.location_match_score,
             sector_match_score = EXCLUDED.sector_match_score,
             total_score = EXCLUDED.total_score,
             skills_matched = EXCLUDED.skills_matched,
             updated_at = NOW()`,
          [
            studentId,
            internship.id,
            matchScore.skillMatch,
            matchScore.locationMatch,
            matchScore.sectorMatch,
            Math.round(blended * 100) / 100,
            matchScore.matchedSkills
          ]
        );
      } catch (e) {
        // 42P10: no unique/exclusion constraint for ON CONFLICT. Log once and continue.
        if (e && e.code === '42P10') {
          console.warn('match_scores upsert skipped: add unique index on (student_id, internship_id)');
        } else {
          throw e;
        }
      }
    }
  }

  // Sort respecting user-selected priority if provided
  if (priorityOrder && priorityOrder.length === 3) {
    const keyMap = {
      skills: 'skillMatch',
      location: 'locationMatch',
      sector: 'sectorMatch',
    };
    const [k1, k2, k3] = priorityOrder.map(k => keyMap[k] || 'matchScore');
    matches.sort((a, b) => (
      (b[k1] || 0) - (a[k1] || 0) ||
      (b[k2] || 0) - (a[k2] || 0) ||
      (b[k3] || 0) - (a[k3] || 0) ||
      (b.matchScore || 0) - (a.matchScore || 0)
    ));
  } else {
    // Default: sort by blended match score
    matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  // Ensure a minimum number of suggestions by supplementing with recent internships
  const MIN_SUGGESTIONS = 10;
  if (matches.length < MIN_SUGGESTIONS) {
    const haveIds = new Set(matches.map(m => m.id))
    for (const internship of internships) {
      if (matches.length >= MIN_SUGGESTIONS) break;
      if (haveIds.has(internship.id)) continue;
      matches.push({
        ...internship,
        matchScore: 0.3, // mark as related/low match
        skillMatch: 0,
        locationMatch: 0,
        sectorMatch: 0,
        matchedSkills: []
      })
    }
  }

  return matches;
}

// @route   GET /api/matches
// @desc    Get student's internship matches with scores
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Parse priority from query (comma-separated): e.g., 'skills,location,sector'
    const priority = typeof req.query.priority === 'string' ? req.query.priority.split(',').map(s => s.trim().toLowerCase()) : [];
    let weights = { skills: 0.6, location: 0.2, sector: 0.2 };
    let persist = true;
    let priorityArr = null;
    if (priority.length === 3) {
      const order = ['skills', 'location', 'sector'];
      const isValid = priority.every(p => order.includes(p)) && new Set(priority).size === 3;
      if (isValid) {
        // Apply 50/30/20 according to user priority
        const weightMap = { [priority[0]]: 0.5, [priority[1]]: 0.3, [priority[2]]: 0.2 };
        weights = { skills: weightMap.skills || 0, location: weightMap.location || 0, sector: weightMap.sector || 0 };
        persist = false; // don't persist non-default weight calculations
        priorityArr = priority;
      }
    }

    const matches = await computeAndPersistMatches(req.user.id, { weights, persist, priority: priorityArr });
    res.json({ success: true, data: matches, count: matches.length });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch matches' });
  }
});

// @route   GET /api/matches/stats
// @desc    Get matching statistics for student
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // If there are no match_scores in DB yet for this user, compute and persist them first
    const countRes = await pool.query(
      'SELECT COUNT(*)::int as cnt FROM match_scores WHERE student_id = $1',
      [req.user.id]
    );
    if ((countRes.rows[0]?.cnt || 0) === 0) {
      await computeAndPersistMatches(req.user.id, { weights: { skills: 0.6, location: 0.2, sector: 0.2 }, persist: true });
    }

    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_matches,
         AVG(total_score) as average_score,
         MAX(total_score) as highest_score,
         COUNT(CASE WHEN total_score >= 0.8 THEN 1 END) as high_matches,
         COUNT(CASE WHEN total_score >= 0.6 AND total_score < 0.8 THEN 1 END) as medium_matches,
         COUNT(CASE WHEN total_score < 0.6 THEN 1 END) as low_matches
       FROM match_scores 
       WHERE student_id = $1`,
      [req.user.id]
    );

    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        totalMatches: parseInt(stats.total_matches),
        averageScore: parseFloat(stats.average_score || 0),
        highestScore: parseFloat(stats.highest_score || 0),
        highMatches: parseInt(stats.high_matches),
        mediumMatches: parseInt(stats.medium_matches),
        lowMatches: parseInt(stats.low_matches)
      }
    });
  } catch (error) {
    console.error('Get match stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch match statistics'
    });
  }
});

// Helper function to calculate match score
async function calculateMatchScore(
  studentSkills,
  studentSectorPreference,
  studentLocationPreference,
  requiredSkills,
  internshipSector,
  internshipLocation,
  isRemote,
  weights
) {
  // Normalize + canonicalize skills for strict equality
  const norm = (s) => String(s || '').trim().toLowerCase();
  const canonical = (s) => {
    const raw = norm(s);
    // Special cases before stripping
    if (/^(c\+\+|cpp)$/.test(raw)) return 'cplusplus';
    if (/^c#$/.test(raw)) return 'csharp';
    if (/^(py|py3)$/.test(raw)) return 'python';
    if (/^node(\.js)?$/.test(raw) || /^nodejs$/.test(raw)) return 'nodejs';
    if (/^reactjs$/.test(raw)) return 'react';
    if (/^js$/.test(raw)) return 'javascript';
    if (/^ts$/.test(raw)) return 'typescript';
    if (/^postgres$/.test(raw)) return 'postgresql';
    // Remove common separators/spaces/dots/underscores/hyphens
    const stripped = raw.replace(/[\s._-]+/g, '');
    return stripped;
  };
  const reqCanon = (requiredSkills || []).map(canonical);
  const studentSet = new Set((studentSkills || []).map(canonical));
  // Return matched required skills (original strings) whose canonical form exists in student's skills
  const matchedSkills = (requiredSkills || []).filter((req, idx) => studentSet.has(reqCanon[idx]));

  const skillMatch = requiredSkills && requiredSkills.length > 0 
    ? matchedSkills.length / requiredSkills.length 
    : 0;

  // Location match with distance scoring (fallback to heuristics)
  let locationMatch = 0;
  const cityCoords = {
    'san francisco': [37.7749, -122.4194],
    'new york': [40.7128, -74.0060],
    'london': [51.5074, -0.1278],
    'singapore': [1.3521, 103.8198],
    'bengaluru': [12.9716, 77.5946],
    'bangalore': [12.9716, 77.5946],
    'mumbai': [19.0760, 72.8777],
    'delhi': [28.6139, 77.2090],
    'hyderabad': [17.3850, 78.4867],
    'chennai': [13.0827, 80.2707],
    'pune': [18.5204, 73.8567],
    'kolkata': [22.5726, 88.3639]
  };
  // haversine and scoring now imported from utils/geo
  function parseLocs(locs) {
    if (!locs) return [];
    if (Array.isArray(locs)) return locs.map(v => String(v || '').trim().toLowerCase()).filter(Boolean);
    return String(locs)
      .split(/[,/]|\n|\||;/)
      .map(v => v.trim().toLowerCase())
      .filter(Boolean);
  }
  async function scoreBetween(aLoc, internshipLoc) {
    const a = cityCoords[aLoc] || await getCoords(aLoc);
    const b = cityCoords[internshipLoc] || await getCoords(internshipLoc);
    if (a && b) {
      const km = haversineKm(a, b);
      return scoreByDistance(km);
    }
    if (aLoc === internshipLoc) return 1;
    if (aLoc.includes(internshipLoc) || internshipLoc.includes(aLoc)) return 0.7;
    if (aLoc.includes('remote') || internshipLoc.includes('remote')) return 0.5;
    return 0;
  }
  if (isRemote) {
    locationMatch = 1; // Remote is universally accessible
  } else if (studentLocationPreference && internshipLocation) {
    const internshipLoc = String(internshipLocation || '').trim().toLowerCase();
    const studentLocs = parseLocs(studentLocationPreference);
    // pick the best (max) score across all preferred locations
    let best = 0;
    for (const sLoc of studentLocs) {
      if (sLoc === internshipLoc) { best = 1; break; }
      const sc = await scoreBetween(sLoc, internshipLoc);
      best = Math.max(best, sc);
    }
    locationMatch = best;
  }

  // Sector match
  const sectorMatch = studentSectorPreference && internshipSector
    ? studentSectorPreference.toLowerCase() === internshipSector.toLowerCase() ? 1 : 0
    : 0;

  // Calculate total weighted score according to provided weights
  const w = weights || { skills: 0.6, location: 0.2, sector: 0.2 };
  const totalScore = (skillMatch * w.skills) + (locationMatch * w.location) + (sectorMatch * w.sector);

  return {
    skillMatch: Math.round(skillMatch * 100) / 100,
    locationMatch: Math.round(locationMatch * 100) / 100,
    sectorMatch: Math.round(sectorMatch * 100) / 100,
    totalScore: Math.round(totalScore * 100) / 100,
    matchedSkills
  };
}

module.exports = router;
