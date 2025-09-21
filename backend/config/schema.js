import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  timestamp, 
  boolean, 
  integer, 
  decimal, 
  jsonb,
  pgEnum,
  unique
} from "drizzle-orm/pg-core";

// Enums
export const applicationStatusEnum = pgEnum('application_status', ['pending', 'accepted', 'rejected', 'withdrawn']);

// Students table
export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  isActive: boolean('is_active').default(true)
});

// Student profiles table
export const studentProfiles = pgTable('student_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  skills: text('skills').array(), // Array of skills extracted from resume
  sectorPreference: varchar('sector_preference', { length: 100 }), // Technology, Finance, Healthcare, etc.
  locationPreference: varchar('location_preference', { length: 100 }), // City, State, or Remote
  resumeUrl: varchar('resume_url', { length: 500 }), // URL to uploaded resume file
  resumeParsedData: jsonb('resume_parsed_data'), 
  bio: text('bio'),
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  githubUrl: varchar('github_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Companies table
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  description: text('description'),
  website: varchar('website', { length: 500 }),
  logoUrl: varchar('logo_url', { length: 500 }),
  contactName: varchar('contact_name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// Internships table
export const internships = pgTable('internships', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  requirements: text('requirements').notNull(), // Job description text
  requiredSkills: text('required_skills').array(), // Array of skills extracted from job description
  sector: varchar('sector', { length: 100 }).notNull(),
  location: varchar('location', { length: 100 }).notNull(),
  durationWeeks: integer('duration_weeks'),
  stipendAmount: decimal('stipend_amount', { precision: 10, scale: 2 }),
  stipendCurrency: varchar('stipend_currency', { length: 10 }).default('USD'),
  isRemote: boolean('is_remote').default(false),
  isActive: boolean('is_active').default(true),
  applicationDeadline: timestamp('application_deadline'),
  jobParsedData: jsonb('job_parsed_data'), // Parsed job data from Python service
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Applications table
export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  internshipId: uuid('internship_id').references(() => internships.id, { onDelete: 'cascade' }).notNull(),
  status: applicationStatusEnum('status').default('pending'), // pending, accepted, rejected, withdrawn
  coverLetter: text('cover_letter'),
  appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  // Prevent duplicate applications
  uniqueStudentInternship: unique('unique_student_internship', [table.studentId, table.internshipId])
}));

// Match scores table (for caching and analytics)
export const matchScores = pgTable('match_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  internshipId: uuid('internship_id').references(() => internships.id, { onDelete: 'cascade' }).notNull(),
  skillMatchScore: decimal('skill_match_score', { precision: 5, scale: 4 }), // 0.0000 to 1.0000
  locationMatchScore: decimal('location_match_score', { precision: 5, scale: 4 }),
  sectorMatchScore: decimal('sector_match_score', { precision: 5, scale: 4 }),
  totalScore: decimal('total_score', { precision: 5, scale: 4 }), // Weighted total score
  skillsMatched: text('skills_matched').array(), // Array of matched skills
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  // Prevent duplicate match scores
  uniqueStudentInternshipMatch: unique('unique_student_internship_match', [table.studentId, table.internshipId])
}));

