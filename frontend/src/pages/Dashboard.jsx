import { useEffect, useRef, useState } from 'react'
// removed Link/useNavigate as Dashboard no longer links out from here
import axios from 'axios'
import Header from '../components/Header'
import { Button } from '../components/ui/button'
import { motion } from 'framer-motion'
import EngineeringForm from './EngineeringForm.jsx'
import FinanceForm from './FinanceForm.jsx'
import SectorSimpleForm from './SectorSimpleForm.jsx'
import { 
  User, 
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
  // Suggested internships removed to reduce load time
  const [applicationsCount, setApplicationsCount] = useState(0)
  const loadingRef = useRef(false)
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'
  const [resumeMsg, setResumeMsg] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [applications, setApplications] = useState([])
  const [mockSessions, setMockSessions] = useState([])
  const [formData, setFormData] = useState({
    sectorPreference: '',
    locationPreference: '',
    bio: '',
    linkedinUrl: '',
    githubUrl: '',
    gender: '',
    residenceType: '',
    socialBg: ''
  })

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
        axios.get(`${API_BASE}/matches/stats`, { headers })
      ])

      const [profRes, statsRes] = results
      if (profRes.status === 'fulfilled') {
        const p = profRes.value?.data?.data
        setProfile(p)
        if (p) {
          setFormData({
            sectorPreference: p.sector_preference || '',
            locationPreference: p.location_preference || '',
            bio: p.bio || '',
            linkedinUrl: p.linkedin_url || '',
            githubUrl: p.github_url || '',
            gender: p.gender || '',
            residenceType: p.residence_type || '',
            socialBg: p.social_bg || ''
          })
        }
      // Load mock interview sessions from localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('mock_sessions') || '[]')
        setMockSessions(Array.isArray(stored) ? stored : [])
      } catch { setMockSessions([]) }
      }

      // Use server stats if available; else derive from /matches
      let s = { totalMatches: 0, highMatches: 0, averageScore: 0 }
      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.data) {
        s = statsRes.value.data.data
      }

      // If stats are missing or zeros, try deriving from matches list
      try {
        const mres = await axios.get(`${API_BASE}/matches`, { headers })
        const items = Array.isArray(mres?.data?.data) ? mres.data.data : []
        if (items.length) {
          const total = items.length
          const high = items.filter(x => (x.matchScore || 0) >= 0.8).length
          // averageScore expected as 0-1 on server; compute as 0-1 here
          const avg = items.reduce((a,b)=> a + (Number(b.matchScore)||0), 0) / total
          // Only override if server gave nothing helpful
          const missing = !s || ((s.totalMatches||0) === 0 && (s.highMatches||0) === 0 && (s.averageScore||0) === 0)
          if (missing) s = { totalMatches: total, highMatches: high, averageScore: avg }
          else {
            // Fill any individual zero fields conservatively
            if (!s.totalMatches) s.totalMatches = total
            if (!s.highMatches) s.highMatches = high
            if (!s.averageScore) s.averageScore = avg
          }
        }
      } catch {}
      setStats(s)

      // Load applications from DB
      try {
        const appsRes = await axios.get(`${API_BASE}/applications`, { headers })
        const apps = appsRes?.data?.data || []
        setApplicationsCount(Array.isArray(apps) ? apps.length : 0)
        setApplications(Array.isArray(apps) ? apps : [])
      } catch (e) {
        setApplicationsCount(0)
        setApplications([])
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const onResumeSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setResumeMsg('Uploading...')
    try {
      const jwt = localStorage.getItem('token')
      const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {}
      const form = new FormData()
      form.append('resume', file)
      const res = await axios.post(`${API_BASE}/students/resume`, form, { headers })
      if (res?.data?.success) {
        setResumeMsg('Resume successfully uploaded and profile updated!')
        // refresh profile to reflect parsed skills/category
        await loadDashboardData()
      } else {
        setResumeMsg('Failed to upload resume')
      }
    } catch (e) {
      setResumeMsg('Failed to upload resume')
    }
  }

  const downloadResume = async () => {
    try {
      const jwt = localStorage.getItem('token')
      const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {}
      const res = await axios.get(`${API_BASE}/students/resume`, { headers, responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'resume.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      const link = profile?.resume_url || profile?.resumeLink || ''
      if (link) {
        window.open(link, '_blank')
      } else {
        alert('Resume not available to download')
      }
    }
  }

  const saveProfileBasics = async (e) => {
    e.preventDefault()
    try {
      const jwt = localStorage.getItem('token')
      const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {}
      await axios.post(`${API_BASE}/students/profile`, formData, { headers })
      setEditMode(false)
      await loadDashboardData()
    } catch (e) {
      alert('Failed to save profile')
    }
  }

  // Suggest the track to focus on based on lowest average score across sessions
  const topWeakTrack = (sessions = []) => {
    if (!Array.isArray(sessions) || sessions.length === 0) return 'the General'
    const byTrack = {}
    for (const s of sessions) {
      const k = s.track || 'general'
      if (!byTrack[k]) byTrack[k] = { sum: 0, n: 0 }
      byTrack[k].sum += Number(s.percent || 0)
      byTrack[k].n += 1
    }
    let weakest = 'general', weakestAvg = Infinity
    for (const [k, v] of Object.entries(byTrack)) {
      const avg = v.n ? v.sum / v.n : 0
      if (avg < weakestAvg) { weakestAvg = avg; weakest = k }
    }
    return weakest
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 pt-24">
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
    <div className="min-h-screen bg-cream-50 pt-24">
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
                  {(() => {
                    const val = Number(stats?.averageScore || 0)
                    if (!val) return 0
                    // If API returned 0-1, scale; if it returned 0-100, leave as is
                    return Math.round(val <= 1 ? val * 100 : val)
                  })()}%
                </p>
              </div>
            </div>
          </div>

        </motion.div>

        {/* Resume Management */}
        <motion.div
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.8 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Resume Management</h3>
            {resumeMsg?.toLowerCase().includes('success') && (
              <span className="text-xs text-green-600">Resume Uploaded</span>
            )}
          </div>
          <div className={`mb-4 text-sm p-4 rounded border ${resumeMsg?.toLowerCase().includes('success') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
            {resumeMsg || 'Your resume helps us auto-update your profile and improve matches.'}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded cursor-pointer hover:bg-primary-700">
              <input type="file" accept="application/pdf" onChange={onResumeSelect} className="hidden" />
              Upload Resume
            </label>
            <Button variant="outline" onClick={downloadResume}>Download Resume</Button>
          </div>
        </motion.div>

        {/* Profile Overview (inline, with edit and embedded sector forms) */}
        <motion.div 
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
            <div className="flex items-center gap-2">
              <Button variant={editMode ? 'outline' : 'default'} onClick={() => setEditMode(!editMode)}>
                {editMode ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>
          </div>
          

          {!editMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-gray-500 mb-1">Full Name</div>
                <div className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Email</div>
                <div className="font-medium text-gray-900">{user?.email}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Sector Preference</div>
                <div className="font-medium text-gray-900">{formData.sectorPreference || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Location Preference</div>
                <div className="font-medium text-gray-900">{formData.locationPreference || '-'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-gray-500 mb-1">Bio</div>
                <div className="text-gray-800">{formData.bio || '-'}</div>
              </div>
            </div>
          ) : (
            <form onSubmit={saveProfileBasics} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Sector Preference</label>
                  <select className="w-full border rounded p-2" value={formData.sectorPreference} onChange={e => setFormData({ ...formData, sectorPreference: e.target.value })}>
                    <option value="">Select a sector</option>
                    <option value="Technology">Technology</option>
                    <option value="Finance">Finance</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Education">Education</option>
                    <option value="Environmental">Environmental</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location Preference</label>
                  <input className="w-full border rounded p-2" value={formData.locationPreference} onChange={e => setFormData({ ...formData, locationPreference: e.target.value })} placeholder="e.g., Bengaluru or Remote" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Gender</label>
                  <select className="w-full border rounded p-2" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other/Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Residence</label>
                  <select className="w-full border rounded p-2" value={formData.residenceType} onChange={e => setFormData({ ...formData, residenceType: e.target.value })}>
                    <option value="">Select</option>
                    <option value="rural">Rural</option>
                    <option value="urban">Urban</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Social Background</label>
                  <input className="w-full border rounded p-2" value={formData.socialBg} onChange={e => setFormData({ ...formData, socialBg: e.target.value })} placeholder="e.g., Any / Category" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <textarea className="w-full border rounded p-2" rows={3} value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
                  <input className="w-full border rounded p-2" value={formData.linkedinUrl} onChange={e => setFormData({ ...formData, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/you" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">GitHub URL</label>
                  <input className="w-full border rounded p-2" value={formData.githubUrl} onChange={e => setFormData({ ...formData, githubUrl: e.target.value })} placeholder="https://github.com/you" />
                </div>
              </div>
              <Button type="submit">Save Profile</Button>
            </form>
          )}

          {/* Embedded sector forms when editing */}
          {editMode && formData.sectorPreference && (
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-3">{formData.sectorPreference} Details</h4>
              {formData.sectorPreference === 'Technology' && <EngineeringForm embedded />}
              {formData.sectorPreference === 'Finance' && <FinanceForm embedded />}
              {['Healthcare','Education','Environmental','Marketing','Other'].includes(formData.sectorPreference) && (
                <SectorSimpleForm sector={formData.sectorPreference.toLowerCase()} embedded />
              )}
            </div>
          )}
          {/* Applications list */}
          <div className="mt-8">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Your Applications</h4>
            {applications.length === 0 ? (
              <div className="text-sm text-gray-600">You haven't applied to any internships yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2 pr-4">Company</th>
                      <th className="py-2 pr-4">Title</th>
                      <th className="py-2 pr-4">Applied On</th>
                      <th className="py-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="py-2 pr-4">{app.company_name || app.company || '-'}</td>
                        <td className="py-2 pr-4">{app.internship_title || app.title || '-'}</td>
                        <td className="py-2 pr-4">{app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '-'}</td>
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-1 rounded text-xs border ${app.status === 'accepted' ? 'bg-green-50 text-green-700 border-green-200' : app.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>{app.status || 'pending'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>

        

        {/* Mock Interview Analytics (at end of dashboard) */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mock Interview Analytics</h3>
          {mockSessions.length === 0 ? (
            <div className="text-sm text-gray-600">No practice sessions yet. Start a session from the header → Mock Interview.</div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-600">Total Sessions</div>
                  <div className="text-2xl font-bold text-gray-900">{mockSessions.length}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-600">Average Score</div>
                  <div className="text-2xl font-bold text-gray-900">{(() => {
                    const avg = mockSessions.reduce((a,s)=>a+Number(s.percent||0),0)/mockSessions.length
                    return `${Math.round(avg)}%`
                  })()}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-600">Focus Area</div>
                  <div className="text-2xl font-bold text-gray-900 capitalize">{topWeakTrack(mockSessions)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-700">Recent Sessions</div>
                  <ul className="mt-2 space-y-2 text-sm">
                    {mockSessions.slice(0,6).map(s => (
                      <li key={s.id} className="flex items-center justify-between border-b last:border-b-0 py-2">
                        <div>
                          <div className="font-medium text-gray-900 capitalize">{s.track} · {s.percent}%</div>
                          <div className="text-xs text-gray-500">{new Date(s.finishedAt).toLocaleString()} · {s.questions?.length || 0} questions</div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs border ${s.percent >= 70 ? 'bg-green-50 text-green-700 border-green-200' : s.percent >= 40 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{s.percent}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-700 mb-2">Suggestions</div>
                  <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                    <li>Practice <span className="font-medium">{topWeakTrack(mockSessions)}</span> questions twice this week.</li>
                    <li>Review notes for questions marked “Needs Work.”</li>
                    <li>Use STAR: Situation, Task, Action, Result to structure answers.</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Suggested Internships removed to improve performance. Full list available at /internships */}
      </div>
    </div>
  )
}
