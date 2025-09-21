import Header from '../components/Header'
import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-md mx-auto pt-24 p-4">
        <h1 className="text-2xl font-bold mb-6">Sign in</h1>
        {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-500" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-500" placeholder="••••••" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2 rounded-md bg-lime-500 text-white font-medium hover:bg-lime-600 disabled:opacity-50">{loading ? 'Signing in…' : 'Sign in'}</button>
          <p className="text-sm text-gray-600 text-center">No account? <Link className="text-lime-600 hover:underline" to="/signup">Create one</Link></p>
        </form>
      </div>
    </div>
  )
}


