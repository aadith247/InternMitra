const { pgTable, serial, varchar, text, boolean, timestamp, jsonb, numeric, integer, uuid, index } = require('drizzle-orm/pg-core');

// Users table
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('artisan'),
  businessName: varchar('business_name', { length: 120 }),
  phone: varchar('phone', { length: 20 }),
  address: jsonb('address'),
  instagram: jsonb('instagram'),
  profileImage: text('profile_image'),
  isActive: boolean('is_active').notNull().default(true),
  emailVerified: boolean('email_verified').notNull().default(false),
  lastLogin: timestamp('last_login', { withTimezone: false }),
  preferences: jsonb('preferences'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Products table (using JSONB for arrays/objects to ease migration)
const products = pgTable('products', {
  id: serial('id').primaryKey(),
  artisanId: integer('artisan_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 120 }).notNull(),
  description: text('description').notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  images: jsonb('images').notNull().default(JSON.stringify([])),
  category: varchar('category', { length: 50 }).notNull(),
  tags: text('tags').array(),
  stock: integer('stock').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  dimensions: jsonb('dimensions'),
  weight: jsonb('weight'),
  shipping: jsonb('shipping'),
  memes: jsonb('memes').notNull().default(JSON.stringify([])),
  seoTitle: varchar('seo_title', { length: 160 }),
  seoDescription: varchar('seo_description', { length: 255 }),
  metaKeywords: text('meta_keywords').array(),
  views: integer('views').notNull().default(0),
  likes: integer('likes').notNull().default(0),
  shares: integer('shares').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Orders table (compact with JSONB fields)
const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 64 }).notNull().unique(),
  customerId: integer('customer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  artisanId: integer('artisan_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  items: jsonb('items').notNull(),
  shippingAddress: jsonb('shipping_address').notNull(),
  billingAddress: jsonb('billing_address'),
  pricing: jsonb('pricing').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  payment: jsonb('payment').notNull(),
  shipping: jsonb('shipping'),
  notes: jsonb('notes'),
  timeline: jsonb('timeline'),
  source: varchar('source', { length: 20 }).notNull().default('direct'),
  utm: jsonb('utm'),
  notifications: jsonb('notifications'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

module.exports = { users, products, orders };
