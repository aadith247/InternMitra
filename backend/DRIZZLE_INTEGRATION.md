# Drizzle ORM Integration Guide

This document explains how to use Drizzle ORM in the Resume-job-post project, following the same patterns as QuickLearn.AI.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Setup

Update your `.env` file with the following variables:

```env
# Database URLs (same as QuickLearn.AI pattern)
DATABASE_URL=postgresql://username:password@localhost:5432/internship_matching
NEXT_PUBLIC_DATABASE_URL=postgresql://username:password@localhost:5432/internship_matching
NEXT_DATABASE_URL=postgresql://username:password@localhost:5432/internship_matching
```

### 3. Database Schema Setup

```bash
# Push schema to database
npm run db:push

# Open Drizzle Studio (optional)
npm run db:studio

# Run migration script
npm run db:migrate
```

## 📁 File Structure

```
backend/
├── config/
│   ├── db.js              # Drizzle database connection (Neon serverless)
│   ├── schema.js          # Drizzle schema definitions
│   └── database.js        # Legacy database config (backward compatibility)
├── routes/
│   ├── auth-drizzle.js    # Auth routes using Drizzle
│   ├── internships-drizzle.js # Internship routes using Drizzle
│   └── ...                # Other routes (legacy)
├── scripts/
│   └── migrate-to-drizzle.js # Migration helper script
├── drizzle.config.js      # Drizzle configuration
└── package.json           # Updated with Drizzle dependencies
```

## 🗄️ Schema Definitions

The schema is defined in `config/schema.js` with the following tables:

- **students**: User accounts and authentication
- **studentProfiles**: Extended user profiles with skills and preferences
- **companies**: Company information
- **internships**: Job postings with requirements
- **applications**: Student applications to internships
- **matchScores**: Cached matching algorithm results

## 🔧 Usage Examples

### Basic Queries

```javascript
const { db } = require('./config/database');
const { students, internships, companies } = require('./config/schema');
const { eq, and, or, ilike } = require('drizzle-orm');

// Get all students
const allStudents = await db.select().from(students);

// Get student by email
const [user] = await db
  .select()
  .from(students)
  .where(eq(students.email, 'user@example.com'))
  .limit(1);

// Get internships with company info (JOIN)
const internshipsWithCompanies = await db
  .select({
    id: internships.id,
    title: internships.title,
    companyName: companies.name,
    sector: internships.sector
  })
  .from(internships)
  .innerJoin(companies, eq(internships.companyId, companies.id))
  .where(eq(internships.isActive, true));
```

### Insert Operations

```javascript
// Create new student
const [newStudent] = await db
  .insert(students)
  .values({
    email: 'newuser@example.com',
    passwordHash: hashedPassword,
    firstName: 'John',
    lastName: 'Doe'
  })
  .returning();

// Create internship
const [newInternship] = await db
  .insert(internships)
  .values({
    companyId: 'company-uuid',
    title: 'Software Engineering Intern',
    description: 'Work on cutting-edge projects...',
    requirements: 'Strong programming skills...',
    sector: 'Technology',
    location: 'San Francisco, CA',
    requiredSkills: ['Python', 'JavaScript', 'React']
  })
  .returning();
```

### Update Operations

```javascript
// Update student profile
await db
  .update(studentProfiles)
  .set({
    skills: ['Python', 'JavaScript', 'React'],
    sectorPreference: 'Technology',
    locationPreference: 'Remote'
  })
  .where(eq(studentProfiles.studentId, userId));

// Update application status
await db
  .update(applications)
  .set({ status: 'accepted' })
  .where(eq(applications.id, applicationId));
```

### Complex Queries

```javascript
// Search internships with filters
const filteredInternships = await db
  .select({
    id: internships.id,
    title: internships.title,
    companyName: companies.name,
    sector: internships.sector,
    location: internships.location
  })
  .from(internships)
  .innerJoin(companies, eq(internships.companyId, companies.id))
  .where(
    and(
      eq(internships.isActive, true),
      eq(internships.sector, 'Technology'),
      or(
        ilike(internships.location, '%San Francisco%'),
        eq(internships.isRemote, true)
      )
    )
  )
  .orderBy(desc(internships.createdAt))
  .limit(20);
```

## 🔄 Migration from Raw SQL

### Step 1: Use New Drizzle Routes

Replace the old routes with Drizzle versions:

```javascript
// Old: const authRouter = require('./routes/auth');
// New:
const authRouter = require('./routes/auth-drizzle');

// Old: const internshipsRouter = require('./routes/internships');
// New:
const internshipsRouter = require('./routes/internships-drizzle');
```

### Step 2: Update Server Configuration

In `server.js`, update route imports:

```javascript
// Import Drizzle-based routes
const authRouter = require('./routes/auth-drizzle');
const internshipsRouter = require('./routes/internships-drizzle');

// Use them in your app
app.use('/api/auth', authRouter);
app.use('/api/internships', internshipsRouter);
```

### Step 3: Test Migration

```bash
# Run migration script
npm run db:migrate

# Test endpoints
curl http://localhost:5000/api/internships
curl http://localhost:5000/api/auth/me
```

## 🛠️ Available Scripts

- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio (web UI)
- `npm run db:generate` - Generate migration files
- `npm run db:migrate` - Run migration script
- `npm run db:seed` - Seed database with sample data

## 🔍 Drizzle Studio

Drizzle Studio provides a web interface to view and edit your database:

```bash
npm run db:studio
```

This opens a web interface at `http://localhost:4983` where you can:
- Browse tables and data
- Run queries
- Edit records
- View relationships

## 🚨 Important Notes

1. **Backward Compatibility**: The old database configuration is still available for gradual migration
2. **Environment Variables**: Use the same pattern as QuickLearn.AI with multiple DATABASE_URL variants
3. **Schema Changes**: Always use `npm run db:push` after modifying schema
4. **Type Safety**: Drizzle provides better type safety compared to raw SQL
5. **Performance**: Drizzle queries are optimized and can be cached

## 🔧 Troubleshooting

### Common Issues

1. **Connection Errors**: Ensure DATABASE_URL is correctly set
2. **Schema Mismatch**: Run `npm run db:push` to sync schema
3. **Import Errors**: Check that all schema exports are correct
4. **Query Errors**: Verify table and column names match schema

### Debug Mode

Enable debug logging:

```javascript
// In your route files
console.log('Query result:', result);
console.log('Query error:', error);
```

## 📚 Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL with Drizzle](https://orm.drizzle.team/docs/get-started-postgresql)
- [Neon Database](https://neon.tech/)
- [QuickLearn.AI Reference](https://github.com/your-repo/QuickLearn.AI)

## 🎯 Next Steps

1. Test all endpoints with Drizzle routes
2. Gradually replace remaining SQL routes
3. Add more complex queries and relationships
4. Implement caching for better performance
5. Add database indexes for optimization
