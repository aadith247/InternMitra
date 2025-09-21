import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
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

export default function App() {
  const isAuthed = () => {
    try { return Boolean(localStorage.getItem('token')) } catch { return false }
  }

  const Private = ({ children }) => (isAuthed() ? children : <Navigate to="/login" replace />)

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Private><Dashboard /></Private>} />
      <Route path="/profile" element={<Private><Profile /></Private>} />
      <Route path="/matches" element={<Private><Matches /></Private>} />
      <Route path="/applications" element={<Private><Applications /></Private>} />
      <Route path="/internship/:id" element={<Private><InternshipDetail /></Private>} />
      <Route path="/internships" element={<Internships />} />
      <Route path="/form/engineering" element={<Private><EngineeringForm /></Private>} />
      <Route path="/form/finance" element={<Private><FinanceForm /></Private>} />
      <Route path="/employer" element={<Employer />} />
      <Route path="/employer/start" element={<EmployerStart />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
