import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import StudentLogin from './pages/StudentLogin.jsx'
import CompanyLogin from './pages/CompanyLogin.jsx'
import StudentSignup from './pages/StudentSignup.jsx'
import CompanySignup from './pages/CompanySignup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Profile from './pages/Profile.jsx'
import Matches from './pages/Matches.jsx'
import Applications from './pages/Applications.jsx'
import InternshipDetail from './pages/InternshipDetail.jsx'
import EngineeringForm from './pages/EngineeringForm.jsx'
import FinanceForm from './pages/FinanceForm.jsx'
import Internships from './pages/Internships.jsx'
import Employer from './pages/Employer.jsx'
import EmployerStart from './pages/EmployerStart.jsx'
import EmployerPost from './pages/EmployerPost.jsx'
import EmployerStudentProfile from './pages/EmployerStudentProfile.jsx'
import MockInterview from './pages/MockInterview.jsx'

export default function App() {
  const isAuthed = () => {
    try { return Boolean(localStorage.getItem('token')) } catch { return false }
  }

  const Private = ({ children }) => (isAuthed() ? children : <Navigate to="/login" replace />)

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      {/* Legacy routes (still work) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Dedicated role-specific routes */}
      <Route path="/login/student" element={<StudentLogin />} />
      <Route path="/login/company" element={<CompanyLogin />} />
      <Route path="/signup/student" element={<StudentSignup />} />
      <Route path="/signup/company" element={<CompanySignup />} />
      <Route path="/dashboard" element={<Private><Dashboard /></Private>} />
      <Route path="/mock-interview" element={<Private><MockInterview /></Private>} />
      <Route path="/profile" element={<Private><Profile /></Private>} />
      <Route path="/matches" element={<Private><Matches /></Private>} />
      <Route path="/applications" element={<Private><Applications /></Private>} />
      <Route path="/internship/:id" element={<Private><InternshipDetail /></Private>} />
      <Route path="/internships" element={<Internships />} />
      <Route path="/form/engineering" element={<Private><EngineeringForm /></Private>} />
      <Route path="/form/finance" element={<Private><FinanceForm /></Private>} />
      <Route path="/employer" element={<Employer />} />
      <Route path="/employer/post" element={<EmployerPost />} />
      <Route path="/employer/students/:id" element={<EmployerStudentProfile />} />
      <Route path="/employer/start" element={<EmployerStart />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
