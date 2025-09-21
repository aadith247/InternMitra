const { db } = require('../db');
const { products } = require('../db/schema');
const { and, desc, eq, ilike, gte, lte, inArray } = require('drizzle-orm');

function toDbImages(images = []) {
  return images;
}

async function createProduct(artisanId, { name, description, price, category, tags = [], images = [] }) {
  const values = {
    artisanId: Number(artisanId),
    name,
    description,
    price: String(price),
    category,
    tags: tags.length ? tags : null,
    images: toDbImages(images.map((img, idx) => ({ url: img.url, publicId: img.publicId || null, isPrimary: idx === 0 }))),
    currency: 'INR',
    stock: 0,
    isActive: true,
    memes: [],
  };
  const inserted = await db.insert(products).values(values).returning();
  return inserted[0];
}

async function findById(id) {
  const rows = await db.select().from(products).where(eq(products.id, Number(id))).limit(1);
  return rows[0] || null;
}

async function findManyByIds(ids = []) {
  if (!ids.length) return [];
  const numericIds = ids.map(id => Number(id)).filter(Boolean);
  const rows = await db.select().from(products).where(inArray(products.id, numericIds));
  return rows;
}

async function updateById(id, update) {
  const rows = await db.update(products).set({ ...update, updatedAt: new Date() }).where(eq(products.id, Number(id))).returning();
  return rows[0] || null;
}

async function removeById(id) {
  const rows = await db.delete(products).where(eq(products.id, Number(id))).returning();
  return rows[0] || null;
}

async function listByArtisan(artisanId) {
  const rows = await db.select().from(products).where(eq(products.artisanId, Number(artisanId))).orderBy(desc(products.createdAt));
  return rows;
}

async function searchPublic({ q, category, minPrice, maxPrice }) {
  const conditions = [eq(products.isActive, true)];
  if (category) conditions.push(eq(products.category, category));
  if (q) conditions.push(ilike(products.name, `%${q}%`));
  if (minPrice) conditions.push(gte(products.price, String(minPrice)));
  if (maxPrice) conditions.push(lte(products.price, String(maxPrice)));
  const rows = await db.select().from(products).where(and(...conditions)).orderBy(desc(products.createdAt));
  return rows;
}

async function addMeme(productId, meme) {
  const product = await findById(productId);
  if (!product) return null;
  const memes = [...(product.memes || []), meme];
  const updated = await updateById(product.id, { memes });
  return updated;
}

async function approveMeme(productId, memeIndex) {
  const product = await findById(productId);
  if (!product) return null;
  const memes = [...(product.memes || [])];
  if (!memes[memeIndex]) return null;
  memes[memeIndex] = { ...memes[memeIndex], status: 'approved', approvedAt: new Date() };
  const updated = await updateById(product.id, { memes });
  return updated;
}

async function markMemePosted(productId, memeIndex, instagramPostId) {
  const product = await findById(productId);
  if (!product) return null;
  const memes = [...(product.memes || [])];
  if (!memes[memeIndex]) return null;
  memes[memeIndex] = { ...memes[memeIndex], status: 'posted', postedAt: new Date(), instagramPostId };
  const updated = await updateById(product.id, { memes });
  return updated;
}

module.exports = {
  createProduct,
  findById,
  findManyByIds,
  updateById,
  removeById,
  listByArtisan,
  searchPublic,
  addMeme,
  approveMeme,
  markMemePosted,
};
