import Header from '../components/Header'
import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { Link, useNavigate } from 'react-router-dom'

export default function Signup() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('artisan')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register({ name, email, password, role })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-md mx-auto pt-24 p-4">
        <h1 className="text-2xl font-bold mb-6">Create your account</h1>
        {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-500" placeholder="Your name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-500" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-500" placeholder="••••••" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Account Type</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-500">
              <option value="artisan">Artisan</option>
              <option value="customer">Customer</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="w-full py-2 rounded-md bg-lime-500 text-white font-medium hover:bg-lime-600 disabled:opacity-50">{loading ? 'Creating…' : 'Create account'}</button>
          <p className="text-sm text-gray-600 text-center">Already have an account? <Link className="text-lime-600 hover:underline" to="/login">Sign in</Link></p>
        </form>
      </div>
    </div>
  )
}


