import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Header from '../components/Header'
import { motion } from 'framer-motion'

export default function StudentSignup() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (password !== confirmPassword) {
        setLoading(false)
        setError('Passwords do not match')
        return
      }
      const parts = String(fullName || '').trim().split(/\s+/)
      const firstName = parts.shift() || ''
      const lastName = parts.join(' ')
      const { data } = await axios.post(`${API_BASE}/auth/register`, { email, password, firstName, lastName, phone })
      const { token, user } = data.data || {}
      if (token) { try { localStorage.setItem('token', token) } catch {} }
      if (user) { try { localStorage.setItem('user', JSON.stringify(user)) } catch {} }
      navigate('/dashboard')
    } catch (err) {
      setError(err?.response?.data?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 pt-24">
      <Header />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div className="max-w-md w-full space-y-6 bg-white p-8 rounded-lg shadow" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold">Create Student Account</h2>
            <p className="text-sm text-gray-600">Join thousands of students finding their dream internships</p>
          </div>
          {error && <div className="text-red-600 text-sm bg-red-100 p-2 rounded">{error}</div>}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input className="w-full border rounded p-2" placeholder="Enter your full name" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" className="w-full border rounded p-2" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone (optional)</label>
              <input className="w-full border rounded p-2" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input type="password" className="w-full border rounded p-2" placeholder="Create a password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm Password</label>
              <input type="password" className="w-full border rounded p-2" placeholder="Confirm your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-2 rounded">
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
          <div className="text-sm text-center text-gray-600">
            Already have an account?{' '}
            <button className="text-primary-600 hover:underline" onClick={() => navigate('/login/student')}>
              Sign in
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
