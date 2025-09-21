#!/usr/bin/env node

/**
 * Migration script to convert from raw SQL to Drizzle ORM
 * This script helps migrate existing data and provides examples
 */

const { db } = require('../config/database');
const { students, companies, internships, applications, matchScores, studentProfiles } = require('../config/schema');
const { eq } = require('drizzle-orm');

async function migrateToDrizzle() {
  console.log('🚀 Starting migration to Drizzle ORM...');
  
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const testQuery = await db.select().from(students).limit(1);
    console.log('✅ Database connection successful');
    
    // Example: Get all students using Drizzle
    console.log('👥 Fetching students using Drizzle...');
    const allStudents = await db
      .select({
        id: students.id,
        email: students.email,
        firstName: students.firstName,
        lastName: students.lastName,
        createdAt: students.createdAt
      })
      .from(students)
      .orderBy(students.createdAt);
    
    console.log(`✅ Found ${allStudents.length} students`);
    
    // Example: Get internships with company info using Drizzle
    console.log('💼 Fetching internships with company info...');
    const internshipsWithCompanies = await db
      .select({
        id: internships.id,
        title: internships.title,
        sector: internships.sector,
        location: internships.location,
        companyName: companies.name,
        companyWebsite: companies.website
      })
      .from(internships)
      .innerJoin(companies, eq(internships.companyId, companies.id))
      .where(eq(internships.isActive, true))
      .limit(5);
    
    console.log(`✅ Found ${internshipsWithCompanies.length} active internships`);
    
    // Example: Get student applications using Drizzle
    console.log('📝 Fetching student applications...');
    const studentApplications = await db
      .select({
        applicationId: applications.id,
        studentName: sql`${students.firstName} || ' ' || ${students.lastName}`,
        internshipTitle: internships.title,
        companyName: companies.name,
        status: applications.status,
        appliedAt: applications.appliedAt
      })
      .from(applications)
      .innerJoin(students, eq(applications.studentId, students.id))
      .innerJoin(internships, eq(applications.internshipId, internships.id))
      .innerJoin(companies, eq(internships.companyId, companies.id))
      .limit(5);
    
    console.log(`✅ Found ${studentApplications.length} applications`);
    
    console.log('🎉 Migration to Drizzle ORM completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update your routes to use the new Drizzle-based files');
    console.log('2. Test all endpoints to ensure they work correctly');
    console.log('3. Gradually replace old routes with Drizzle versions');
    console.log('4. Remove old SQL-based routes once migration is complete');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToDrizzle()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateToDrizzle };
