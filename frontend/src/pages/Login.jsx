import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import Header from '../components/Header'
import { motion } from 'framer-motion'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const isEmployer = new URLSearchParams(location.search).get('role') === 'employer'
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
      if (isEmployer) {
        const { data } = await axios.post(`${API_BASE}/employer-auth/login`, { email, password })
        const { token, company } = data.data || {}
        if (token) { try { localStorage.setItem('employerToken', token) } catch {} }
        if (company) { try { localStorage.setItem('employer', JSON.stringify(company)) } catch {} }
        navigate('/employer')
      } else {
        const { data } = await axios.post(`${API_BASE}/auth/login`, { email, password })
        const { token, user } = data.data || {}
        if (token) {
          try { localStorage.setItem('token', token) } catch {}
        }
        if (user) {
          try { localStorage.setItem('user', JSON.stringify(user)) } catch {}
        }
        navigate('/dashboard')
      }
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
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-2xl font-bold text-center">{isEmployer ? 'Company Login' : 'Student Login'}</h2>
            <div className="inline-flex items-center rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => navigate('/login')}
                className={`px-4 py-2 text-sm ${!isEmployer ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'}`}
              >
                Student
              </button>
              <button
                onClick={() => navigate('/login?role=employer')}
                className={`px-4 py-2 text-sm ${isEmployer ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'}`}
              >
                Company
              </button>
            </div>
          </div>
          {error && <div className="text-red-600 text-sm bg-red-100 p-2 rounded">{error}</div>}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" className="w-full border rounded p-2" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input type="password" className="w-full border rounded p-2" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-2 rounded">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="text-sm text-center text-gray-600">
            Not registered with us?{' '}
            <button
              className="text-primary-600 hover:underline"
              onClick={() => navigate(isEmployer ? '/signup?role=employer' : '/signup')}
            >
              Register now
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
