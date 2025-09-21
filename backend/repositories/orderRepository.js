const { db } = require('../db');
const { orders } = require('../db/schema');
const { and, desc, eq } = require('drizzle-orm');

function genOrderNumber() {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `AMC-${ts}-${rand}`;
}

async function createOrder({ customerId, artisanId, items, shippingAddress, pricing, payment, source = 'direct', utm = {} }) {
  const orderNumber = genOrderNumber();
  const row = {
    orderNumber,
    customerId: Number(customerId),
    artisanId: Number(artisanId),
    items,
    shippingAddress,
    billingAddress: null,
    pricing,
    status: 'pending',
    payment,
    shipping: {},
    notes: {},
    timeline: [{ status: 'pending', message: 'Order created', timestamp: new Date(), updatedBy: Number(customerId) }],
    source,
    utm,
    notifications: { email: { sent: false }, sms: { sent: false } },
  };
  const inserted = await db.insert(orders).values(row).returning();
  return inserted[0];
}

async function listByCustomer(customerId) {
  return db.select().from(orders).where(eq(orders.customerId, Number(customerId))).orderBy(desc(orders.createdAt));
}

async function listByArtisan(artisanId) {
  return db.select().from(orders).where(eq(orders.artisanId, Number(artisanId))).orderBy(desc(orders.createdAt));
}

async function findById(id) {
  const rows = await db.select().from(orders).where(eq(orders.id, Number(id))).limit(1);
  return rows[0] || null;
}

async function updateStatus(id, newStatus, message, updatedBy) {
  const order = await findById(id);
  if (!order) return null;
  const timeline = [...(order.timeline || []), { status: newStatus, message: message || `Order status updated to ${newStatus}`, timestamp: new Date(), updatedBy: Number(updatedBy) }];
  const updated = await db.update(orders).set({ status: newStatus, timeline, updatedAt: new Date() }).where(eq(orders.id, Number(id))).returning();
  return updated[0];
}

async function updatePaymentCompleted(id, { paymentId, transactionId, currency }) {
  const order = await findById(id);
  if (!order) return null;
  const payment = { ...(order.payment || {}), status: 'completed', paymentId, transactionId, paidAt: new Date() };
  const updated = await db.update(orders).set({ payment, updatedAt: new Date() }).where(eq(orders.id, Number(id))).returning();
  return updated[0];
}

async function update(id, patch) {
  const updated = await db.update(orders).set({ ...patch, updatedAt: new Date() }).where(eq(orders.id, Number(id))).returning();
  return updated[0];
}

module.exports = {
  createOrder,
  listByCustomer,
  listByArtisan,
  findById,
  updateStatus,
  updatePaymentCompleted,
  update,
};
