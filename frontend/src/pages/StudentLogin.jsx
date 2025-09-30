import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Header from '../components/Header'
import { motion } from 'framer-motion'

export default function StudentLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await axios.post(`${API_BASE}/auth/login`, { email, password })
      const { token, user } = data.data || {}
      if (token) { try { localStorage.setItem('token', token) } catch {} }
      if (user) { try { localStorage.setItem('user', JSON.stringify(user)) } catch {} }
      navigate('/dashboard')
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 pt-24">
      <Header />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold">Student Login</h2>
            <p className="text-sm text-gray-600">Access your dashboard to find internships and track applications</p>
          </div>
          {error && <div className="text-red-600 text-sm bg-red-100 p-2 rounded">{error}</div>}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" placeholder="Enter your email" className="w-full border rounded p-2" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input type="password" placeholder="Enter your password" className="w-full border rounded p-2" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-2 rounded">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="text-sm text-center text-gray-600 space-y-1">
            <div>
              Not registered with us?{' '}
              <button className="text-primary-600 hover:underline" onClick={() => navigate('/signup/student')}>
                Sign up
              </button>
            </div>
            <div>
              Are you a company?{' '}
              <button className="text-primary-600 hover:underline" onClick={() => navigate('/login/company')}>
                Login here
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
