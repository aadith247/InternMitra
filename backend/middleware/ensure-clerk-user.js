const { requireAuth, clerkClient } = require('@clerk/express')
const pool = require('../config/database')

// Combines Clerk auth with our local user provisioning.
// Usage: app/route -> ensureClerkUser (array) to both require auth and attach req.user
async function ensureStudent(req, res, next) {
  try {
    const { userId } = req.auth || {}
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

    // Load Clerk user to get email & names
    const cu = await clerkClient.users.getUser(userId)
    const email = cu?.emailAddresses?.[0]?.emailAddress || null
    const firstName = cu?.firstName || 'User'
    const lastName = cu?.lastName || 'Clerk'

    // Ensure a student row exists for this Clerk user
    const existing = await pool.query('SELECT id, email, first_name, last_name FROM students WHERE clerk_user_id = $1', [userId])
    let student
    if (existing.rows.length === 0) {
      const ins = await pool.query(
        `INSERT INTO students (email, first_name, last_name, auth_provider, clerk_user_id)
         VALUES ($1, $2, $3, 'clerk', $4)
         RETURNING id, email, first_name, last_name`,
        [email, firstName, lastName, userId]
      )
      student = ins.rows[0]
    } else {
      student = existing.rows[0]
    }

    req.user = student
    return next()
  } catch (err) {
    console.error('ensureClerkUser error:', err?.message || err)
    return res.status(401).json({ success: false, message: 'Clerk authentication failed' })
  }
}

// Export as an array so it can be used directly in route definitions
const ensureClerkUser = [requireAuth(), ensureStudent]

module.exports = { ensureClerkUser }
