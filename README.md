# InternMitra 🎯

> AI-powered internship matching platform connecting students with companies through intelligent resume parsing and skill-based matching algorithms.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://intern-match-sih.vercel.app/)
[![Smart India Hackathon 2024](https://img.shields.io/badge/SIH-2024-orange)](https://www.sih.gov.in/)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## 🌟 Overview

InternMitra is a comprehensive internship matching platform developed for Smart India Hackathon 2024. It bridges the gap between students seeking internships and companies looking for talented interns through:

- **AI-Powered Matching**: Intelligent algorithms that parse resumes and job descriptions to find the best matches
- **Resume Parser**: Automated extraction of skills, education, and experience from uploaded resumes
- **Smart Recommendations**: Personalized internship recommendations based on candidate profiles
- **Dual Interface**: Separate portals for students and employers with tailored features
- **Mock Interviews**: AI-driven interview preparation tool for students

## ✨ Features

### For Students

- 📄 **Resume Upload & Parsing**: Upload your resume in PDF format and let AI extract your skills automatically
- 🎯 **Smart Matching**: Get matched with internships based on your skills, preferences, and career goals
- 🔍 **Internship Discovery**: Browse and search internships filtered by location, sector, and skills
- 📊 **Match Percentage**: See compatibility scores for each internship opportunity
- 🎤 **Mock Interview Practice**: Prepare for interviews with AI-powered mock interview sessions
- 📈 **Application Tracking**: Track all your applications in one place
- 🌱 **Career Growth Insights**: Get recommendations aligned with your career trajectory

### For Employers

- 📝 **Easy Posting**: Create internship postings with eligibility criteria and required skills
- 🎯 **Ranked Matches**: View candidates ranked by match percentage with skill breakdowns
- 📊 **Skills Analytics**: See detailed breakdowns by skills, sector, and location
- 🔄 **Application Management**: Update application status, close postings when filled
- 🎨 **Diversity Filters**: Filter candidates by gender, residence, and social background
- 📧 **Automated Notifications**: Keep candidates informed about application status

## 🛠️ Tech Stack

### Frontend
- **React 18.3.1**: Modern UI library for building interactive interfaces
- **Vite**: Lightning-fast build tool and development server
- **Clerk**: Authentication and user management
- **React Router DOM**: Client-side routing
- **Framer Motion**: Smooth animations and transitions
- **Lucide React**: Beautiful icon system
- **Recharts**: Data visualization and analytics charts
- **TailwindCSS**: Utility-first CSS framework
- **PostCSS**: CSS post-processing

### Backend
- **Node.js & Express.js**: RESTful API server
- **PostgreSQL**: Relational database for structured data
- **Drizzle ORM**: Type-safe database ORM
- **Clerk/Express**: Backend authentication middleware
- **@neondatabase/serverless**: Serverless PostgreSQL driver
- **Morgan**: HTTP request logger
- **Helmet**: Security middleware
- **CORS**: Cross-origin resource sharing
- **Bcrypt.js**: Password hashing
- **JSON Web Tokens**: Secure authentication
- **Multer**: File upload handling
- **UUID**: Unique identifier generation

### AI/ML Components
- **Resume Parser**: NLP-based text extraction and skill identification
- **Matching Algorithm**: Skill-based scoring with weighted factors
- **Mock Interview AI**: Conversational AI for interview practice

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐
│                 │         │                  │
│  React Frontend │◄────────┤  Express Backend │
│   (Vite + Clerk)│  REST   │  (Node.js)       │
│                 │  API    │                  │
└─────────────────┘         └────────┬─────────┘
                                     │
                                     │ Drizzle ORM
                                     │
                            ┌────────▼─────────┐
                            │                  │
                            │   PostgreSQL     │
                            │    Database      │
                            │                  │
                            └──────────────────┘
```

### Database Schema

- **Users**: Student and employer profiles with authentication data
- **Resumes**: Parsed resume data with extracted skills and experience
- **Internships**: Job postings with requirements and details
- **Applications**: Application submissions and status tracking
- **Matches**: Calculated match scores between candidates and internships

## 🚀 Installation

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn package manager

### Clone the Repository

```bash
git clone https://github.com/aadith247/InternMitra.git
cd InternMitra
```

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/internmitra
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
PORT=5000
NODE_ENV=development
```

4. Run database migrations:
```bash
npm run db:push
```

5. Seed the database (optional):
```bash
npm run db:seed
```

6. Start the development server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## 💻 Usage

### For Students

1. **Sign Up**: Create an account as a student
2. **Upload Resume**: Go to Dashboard and upload your resume (PDF format)
3. **Complete Profile**: Fill in additional details like preferences and career goals
4. **Browse Internships**: Explore internships in the Internships tab
5. **View Matches**: Check your personalized matches with compatibility scores
6. **Apply**: Submit applications for internships that interest you
7. **Practice**: Use the Mock Interview feature to prepare
8. **Track**: Monitor application status in the Applications tab

### For Employers

1. **Register**: Create an account as a company/employer
2. **Post Internship**: Create a new internship posting with requirements
3. **Set Criteria**: Define skills, eligibility, location, and other criteria
4. **Review Matches**: See ranked candidates with match percentages
5. **Filter Candidates**: Use advanced filters for specific requirements
6. **Manage Applications**: Update status, shortlist, or reject applications
7. **Close Posting**: Mark positions as filled when complete

## 📚 API Documentation

### Authentication

All API requests require authentication via Clerk JWT tokens in the Authorization header:

```
Authorization: Bearer <token>
```

### Endpoints

#### Students

```http
GET    /api/students/profile       # Get student profile
PUT    /api/students/profile       # Update student profile
POST   /api/students/resume        # Upload resume
GET    /api/students/matches       # Get matched internships
GET    /api/students/applications  # Get all applications
POST   /api/students/apply         # Apply to internship
```

#### Employers

```http
GET    /api/employers/profile      # Get employer profile
PUT    /api/employers/profile      # Update employer profile
POST   /api/internships            # Create internship
GET    /api/internships            # Get all internships
GET    /api/internships/:id        # Get specific internship
PUT    /api/internships/:id        # Update internship
DELETE /api/internships/:id        # Delete internship
GET    /api/internships/:id/matches # Get matched candidates
```

#### Applications

```http
GET    /api/applications/:id       # Get application details
PUT    /api/applications/:id/status # Update application status
```

## 📁 Project Structure

```
InternMitra/
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API service functions
│   │   ├── utils/            # Utility functions
│   │   ├── App.jsx           # Main app component
│   │   └── main.jsx          # Entry point
│   ├── public/               # Static assets
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/
│   ├── routes/               # API route definitions
│   ├── middleware/           # Express middleware
│   ├── services/             # Business logic
│   ├── utils/                # Helper functions
│   ├── database/
│   │   ├── schema.js         # Drizzle schema definitions
│   │   ├── migrations/       # Database migrations
│   │   └── seed.sql          # Seed data
│   ├── clerk-react/          # Clerk authentication setup
│   ├── config/               # Configuration files
│   ├── server.js             # Express server setup
│   └── package.json
│
└── README.md
```

## 🤝 Contributing

We welcome contributions to InternMitra! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation for new features
- Test your changes thoroughly
- Ensure no breaking changes to existing features

## 📄 License

This project was developed for Smart India Hackathon 2024.

## 👥 Team

Developed with ❤️ for Smart India Hackathon 2024

## 🔗 Links

- **Live Demo**: [https://intern-match-sih.vercel.app/](https://intern-match-sih.vercel.app/)
- **GitHub**: [https://github.com/aadith247/InternMitra](https://github.com/aadith247/InternMitra)

## 📞 Support

For questions or support, please open an issue on GitHub.

---

**Made with ❤️ for Smart India Hackathon 2024**
