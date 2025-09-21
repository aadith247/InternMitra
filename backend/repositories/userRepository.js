const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { users } = require('../db/schema');
const { eq } = require('drizzle-orm');

const selectPublicFields = (u) => {
  if (!u) return null;
  const { password, ...rest } = u;
  // scrub instagram tokens if present
  if (rest.instagram) {
    const ig = { ...rest.instagram };
    delete ig.accessToken;
    delete ig.refreshToken;
    rest.instagram = ig;
  }
  return rest;
};

async function findByEmail(email) {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] || null;
}

async function findById(id) {
  const rows = await db.select().from(users).where(eq(users.id, Number(id))).limit(1);
  return rows[0] || null;
}

async function createUser({ name, email, password, role = 'artisan', businessName, phone }) {
  const salt = await bcrypt.genSalt(12);
  const hashed = await bcrypt.hash(password, salt);
  const toInsert = {
    name,
    email,
    password: hashed,
    role,
    businessName: businessName || null,
    phone: phone || null,
    preferences: { notifications: { email: true, sms: false, push: true }, currency: 'INR' },
  };
  const inserted = await db.insert(users).values(toInsert).returning();
  return inserted[0];
}

async function updateById(id, update) {
  if (update.password) {
    const salt = await bcrypt.genSalt(12);
    update.password = await bcrypt.hash(update.password, salt);
  }
  const updated = await db.update(users).set({ ...update, updatedAt: new Date() }).where(eq(users.id, Number(id))).returning();
  return updated[0];
}

async function comparePassword(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

async function updateLastLogin(id) {
  await db.update(users).set({ lastLogin: new Date(), updatedAt: new Date() }).where(eq(users.id, Number(id)));
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  updateById,
  comparePassword,
  updateLastLogin,
  selectPublicFields,
};
