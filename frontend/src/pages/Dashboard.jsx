import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Header from '../components/Header'
import { Button } from '../components/ui/button'
import { motion } from 'framer-motion'
import { 
  User, 
  FileText, 
  Target, 
  Briefcase, 
  TrendingUp, 
  CheckCircle,
  Settings
} from 'lucide-react'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [suggested, setSuggested] = useState([])
  const [applicationsCount, setApplicationsCount] = useState(0)
  const loadingRef = useRef(false)
  const navigate = useNavigate()
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

  useEffect(() => {
    if (loadingRef.current) return
    loadingRef.current = true
    const userData = localStorage.getItem('user')
    if (userData) setUser(JSON.parse(userData))
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const jwt = localStorage.getItem('token')
      const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {}
      const results = await Promise.allSettled([
        axios.get(`${API_BASE}/students/profile`, { headers }),
        axios.get(`${API_BASE}/matches/stats`, { headers }),
        axios.get(`${API_BASE}/matches`, { headers }),
      ])

      const [prof, stats, sugg] = results
      if (prof.status === 'fulfilled') setProfile(prof.value?.data?.data)
      const suggestedData = sugg.status === 'fulfilled' ? (sugg.value?.data?.data || []) : []
      setSuggested(suggestedData)

      // If stats call failed or returned empty, compute client-side fallback from suggested
      if (stats.status === 'fulfilled' && stats.value?.data?.data) {
        setStats(stats.value.data.data)
      } else {
        const totalMatches = suggestedData.length
        const highMatches = suggestedData.filter(m => (m.matchScore || 0) >= 0.7).length
        const averageScore = totalMatches > 0 ? (suggestedData.reduce((s, m) => s + (m.matchScore || 0), 0) / totalMatches) : 0
        setStats({
          totalMatches,
          highMatches,
          averageScore
        })
      }

      // Load applications count from DB
      try {
        const appsRes = await axios.get(`${API_BASE}/applications`, { headers })
        const apps = appsRes?.data?.data || []
        setApplicationsCount(Array.isArray(apps) ? apps.length : 0)
      } catch (e) {
        setApplicationsCount(0)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome section */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's your internship matching overview
          </p>
        </motion.div>

        {/* Stats cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Target className="w-6 h-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Matches</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalMatches || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">High Matches</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.highMatches || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Applications</p>
                <p className="text-2xl font-bold text-gray-900">{applicationsCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.averageScore ? Math.round(stats.averageScore * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          {/* Profile completion */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Profile Status</h3>
              <User className="w-5 h-5 text-gray-400" />
            </div>
            
            {profile ? (
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Profile created
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Skills: {profile.skills?.length || 0} skills
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Preferences set
                </div>
                <Link to="/profile">
                  <Button variant="outline" className="mt-4">
                    <Settings className="w-4 h-4 mr-2" />
                    Update Profile
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Complete your profile to get better matches
                </p>
                <Link to="/profile">
                  <Button className="mt-4">
                    <User className="w-4 h-4 mr-2" />
                    Complete Profile
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Resume upload */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Resume</h3>
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Keep your profile skills updated to get better matches
              </p>
              <Link to="/profile">
                <Button className="mt-4">
                  Update Skills
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Suggested Internships */}
        <motion.div 
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Suggested Internships</h3>
            <Link to="/matches">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
          {suggested.length === 0 ? (
            <div className="text-sm text-gray-600">No suggestions yet. Update your profile with your latest skills.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {suggested.slice(0, 5).map(it => (
                <li key={it.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{it.title}</div>
                    <div className="text-sm text-gray-600">{it.company_name} · {it.location}</div>
                  </div>
                  <Link to={`/internship/${it.id}`}>
                    <Button size="sm" variant="outline">Details</Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* All Internships section removed; full list available at /internships */}
      </div>
    </div>
  )
}
