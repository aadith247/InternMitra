import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import { Button } from '../components/ui/button'
import { motion } from 'framer-motion'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { Briefcase, Users, BarChart3 } from 'lucide-react'
import axios from 'axios'

export default function Employer() {
  const [companyId, setCompanyId] = useState('')
  const [company, setCompany] = useState(null)
  const [internships, setInternships] = useState([])
  const [selectedInternshipId, setSelectedInternshipId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('overview') // overview | jobs | candidates | matches
  const [appCounts, setAppCounts] = useState({}) // internshipId -> count
  const [selectedJobFilter, setSelectedJobFilter] = useState(null) // filter from pie chart
  const [allCandidates, setAllCandidates] = useState([]) // aggregated applicants for Candidates tab
  const [form, setForm] = useState({
    title: '',
    description: '',
    requirements: '',
    requiredSkills: '',
    sector: 'Technology',
    location: '',
    // Locked values per policy
    durationWeeks: 52,
    stipendAmount: 4000,
    stipendCurrency: 'INR',
    isRemote: false,
    applicationDeadline: '',
    genderRequirement: 'both',
    residenceRequirement: 'any',
    socialRequirement: 'any'
  })
  const [matches, setMatches] = useState(null)
  const [applicants, setApplicants] = useState(null)
  const [profileModal, setProfileModal] = useState({ open: false, data: null })
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'
  const location = useLocation()
  const navigate = useNavigate()

  const loadInternships = async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const { data } = await axios.get(`${API_BASE}/employer/internships`, { params: { companyId } })
      setInternships(data.data || [])
      // after internships load, fetch applicant counts in background
      try {
        const ids = (data.data || []).map(x => x.id)
        const results = await Promise.allSettled(ids.map(id => axios.get(`${API_BASE}/employer/internships/${id}/applicants`)))
        const map = {}
        ids.forEach((id, i) => {
          const r = results[i]
          if (r.status === 'fulfilled') map[id] = Array.isArray(r.value?.data?.data) ? r.value.data.data.length : 0
        })
        setAppCounts(map)
      } catch {}
    } catch (e) {
      console.error('Failed to load internships', e)
    } finally {
      setLoading(false)
    }
  }
  // Load all applicants across all internships for Candidates tab
  const loadAllApplicants = async () => {
    if (!companyId || internships.length === 0) { setAllCandidates([]); return }
    try {
      const reqs = internships.map(it => axios.get(`${API_BASE}/employer/internships/${it.id}/applicants`).then(r => ({ title: it.title, rows: r.data?.data || [] })))
      const out = await Promise.all(reqs)
      const merged = []
      out.forEach(({ title, rows }) => {
        rows.forEach(r => merged.push({ ...r, internshipTitle: title }))
      })
      setAllCandidates(merged)
    } catch (e) {
      console.error('loadAllApplicants failed', e)
    }
  }

  useEffect(() => {
    if (tab === 'candidates') {
      loadAllApplicants()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, internships])

  const openProfile = async (studentId) => {
    try {
      const { data } = await axios.get(`${API_BASE}/employer/students/${studentId}/profile`)
      setProfileModal({ open: true, data: data.data })
    } catch (e) {
      console.error('Failed to load profile', e)
      alert('Failed to load profile')
    }
  }

  // On mount, pull employer from localStorage and set companyId automatically
  useEffect(() => {
    try {
      const raw = localStorage.getItem('employer')
      if (raw) {
        const c = JSON.parse(raw)
        setCompany(c)
        if (c?.id) setCompanyId(c.id)
      }
    } catch {}
  }, [])

  // Sync tab with URL (?tab=overview|jobs|candidates|matches)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const t = params.get('tab')
    if (t && ['overview','jobs','candidates','matches'].includes(t) && t !== tab) {
      setTab(t)
      setMatches(null)
      setApplicants(null)
      setSelectedInternshipId(null)
      if (t !== 'candidates') setAllCandidates([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  // Auto-load internships when companyId is available
  useEffect(() => {
    if (companyId) {
      loadInternships()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  const createInternship = async (e) => {
    e.preventDefault()
    if (!companyId) return alert('No company found. Please sign in as an employer.')
    try {
      // Ensure fixed values before submit
      const payload = { ...form, companyId, requiredSkills: form.requiredSkills, durationWeeks: 52, stipendAmount: 4000, stipendCurrency: 'INR' }
      const { data } = await axios.post(`${API_BASE}/employer/internships`, payload)
      setForm({
        title: '', description: '', requirements: '', requiredSkills: '',
        sector: 'Technology', location: '',
        durationWeeks: 52, stipendAmount: 4000, stipendCurrency: 'INR',
        isRemote: false, applicationDeadline: '',
        genderRequirement: 'both', residenceRequirement: 'any', socialRequirement: 'any'
      })
      await loadInternships()
      alert('Internship created')
    } catch (e) {
      console.error('Failed to create internship', e)
      alert('Failed to create internship')
    }
  }

  const viewMatches = async (id) => {
    setMatches(null)
    setApplicants(null)
    try {
      setSelectedInternshipId(id)
      const { data } = await axios.get(`${API_BASE}/employer/internships/${id}/matches`)
      setMatches(data.data || [])
    } catch (e) {
      console.error('Failed to load matches', e)
    }
  }

  const viewApplicants = async (id) => {
    setMatches(null)
    setApplicants(null)
    try {
      setSelectedInternshipId(id)
      const { data } = await axios.get(`${API_BASE}/employer/internships/${id}/applicants`)
      setApplicants(data.data || [])
    } catch (e) {
      console.error('Failed to load applicants', e)
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 pt-24">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Company Dashboard</h1>
              <p className="text-gray-600">Manage your job postings and find the perfect candidates.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline">Search Candidates</Button>
            </div>
          </div>
        </motion.div>

        {/* Overview card */}
        {tab === 'overview' && (
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl border border-primary-100 p-5 mb-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-900">Company</h2>
            {company ? (
              <div className="text-sm text-gray-700 grid grid-cols-1 md:grid-cols-3 gap-2">
                <div><span className="font-medium">Name:</span> {company.name || '-'}</div>
                <div><span className="font-medium">Email:</span> {company.email || '-'}</div>
                {company.contactName && <div><span className="font-medium">Contact:</span> {company.contactName}</div>}
                {company.phone && <div><span className="font-medium">Phone:</span> {company.phone}</div>}
                <div className="md:col-span-3 mt-1 text-xs text-gray-500">Company ID: {companyId || '—'}</div>
              </div>
            ) : (
              <div className="text-sm text-gray-600">Sign in as an employer to manage your postings. Use <span className="font-mono">/login?role=employer</span>.</div>
            )}
          </div>
        )}

        {/* Candidates (all applicants across jobs) */}
        {tab === 'candidates' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">All Applicants</h2>
            <div className="text-xs text-gray-500">{allCandidates.length} total</div>
          </div>
          {allCandidates.length === 0 ? (
            <div className="text-sm text-gray-600">No applicants yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Applied For</th>
                    <th className="py-2 pr-4">Match</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Diversity</th>
                    <th className="py-2 pr-4">Skills</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allCandidates.map((a, idx) => (
                    <tr key={`${a.id}-${idx}`} className="border-t">
                      <td className="py-2 pr-4">{a.first_name} {a.last_name}</td>
                      <td className="py-2 pr-4">{a.email}</td>
                      <td className="py-2 pr-4">{a.internshipTitle || '-'}</td>
                      <td className="py-2 pr-4">
                        {(() => {
                          const pct = Math.round((a.matchScore || 0) * 100)
                          const quality = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 40 ? 'Fair' : 'Low'
                          const cls = pct >= 80 ? 'bg-green-50 text-green-700 border-green-200' : pct >= 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : pct >= 40 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                          return (
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs border ${cls}`}>{quality}</span>
                              <span className="text-sm text-gray-800">{pct}%</span>
                            </div>
                          )
                        })()}
                      </td>
                      <td className="py-2 pr-4">{a.status}</td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-1 text-xs">
                          {a.resume_parsed_data?.profileCategory?.residenceType || a.diversity?.residence ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              {String(a.resume_parsed_data?.profileCategory?.residenceType || a.diversity?.residence).toUpperCase()}
                            </span>
                          ) : null}
                          {a.diversity?.gender && (
                            <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">{a.diversity.gender}</span>
                          )}
                          {a.diversity?.social && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{a.diversity.social}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(a.skills) && a.skills.length > 0 ? (
                            a.skills.slice(0,5).map((s,i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-800">{s}</span>
                            ))
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                          {Array.isArray(a.skills) && a.skills.length > 5 && (
                            <span className="text-xs text-gray-500">+{a.skills.length - 5}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <Link to={`/employer/students/${a.student_id || a.studentId}`}>
                            <Button size="sm" variant="outline">View Profile</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {/* Overview Insights & Analytics */}
        {tab === 'overview' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Insights & Analytics</h2>
            </div>
            {/* KPI cards */}
            {(() => {
              const totalJobs = internships.length
              const totalApps = Object.values(appCounts || {}).reduce((a,b) => a + (b || 0), 0)
              const topJob = (() => {
                let best = null
                internships.forEach(it => {
                  const c = appCounts[it.id] || 0
                  if (!best || c > best.count) best = { title: it.title, count: c }
                })
                return best
              })()
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-500">Active Postings</div>
                        <div className="text-2xl font-semibold text-gray-900">{totalJobs}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-primary-50 text-primary-700"><Briefcase size={18} /></div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-500">Total Applicants</div>
                        <div className="text-2xl font-semibold text-gray-900">{totalApps}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700"><Users size={18} /></div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-500">Top Job by Applicants</div>
                        <div className="text-sm font-medium text-gray-900 truncate" title={topJob?.title || '—'}>{topJob?.title || '—'}</div>
                        <div className="text-xs text-gray-600">{topJob ? `${topJob.count} applicants` : '—'}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700"><BarChart3 size={18} /></div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Chart: Applicants by Job (Top 6) */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Applicants by Job (Top 6)</h3>
              </div>
              {internships.length === 0 ? (
                <div className="text-sm text-gray-500">No postings yet.</div>
              ) : (
                <div className="h-72 relative">
                  {(() => {
                    const data = internships
                      .map(it => ({ name: it.title, value: appCounts[it.id] || 0 }))
                      .sort((a,b) => b.value - a.value)
                      .slice(0,6)
                    const COLORS = ['#0ea5e9','#22c55e','#f59e0b','#ef4444','#8b5cf6','#14b8a6']
                    const total = data.reduce((a,b) => a + b.value, 0) || 1
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={data} 
                            dataKey="value" 
                            nameKey="name" 
                            innerRadius={50} 
                            outerRadius={90} 
                            paddingAngle={2}
                            label={false}
                            labelLine={false}
                            onClick={(d) => setSelectedJobFilter(d?.name || null)}
                          >
                            {data.map((_, i) => <Cell key={i} cursor="pointer" fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v, n, p) => {
                            const pct = Math.round(((p?.value || 0) / total) * 100)
                            return [`${p?.value || 0} applicants (${pct}%)`, p?.name]
                          }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )
                  })()}
                  {/* Center label showing total applicants */}
                  {(() => {
                    const total = internships
                      .map(it => appCounts[it.id] || 0)
                      .reduce((a,b) => a + b, 0)
                    return (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Total</div>
                          <div className="text-xl font-semibold text-gray-900">{total}</div>
                          <div className="text-xs text-gray-500 -mt-0.5">applicants</div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
              {/* Custom legend with percentages and click-to-filter hint */}
              {(() => {
                const data = internships
                  .map(it => ({ name: it.title, value: appCounts[it.id] || 0 }))
                  .sort((a,b) => b.value - a.value)
                  .slice(0,6)
                const total = data.reduce((a,b) => a + b.value, 0) || 1
                const COLORS = ['#0ea5e9','#22c55e','#f59e0b','#ef4444','#8b5cf6','#14b8a6']
                return (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {data.map((d, i) => {
                      const pct = Math.round((d.value / total) * 100)
                      const active = selectedJobFilter === d.name
                      return (
                        <button key={i} onClick={() => setSelectedJobFilter(active ? null : d.name)} className={`flex items-center gap-2 text-left p-2 rounded border ${active ? 'border-primary-300 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                          <span className="truncate flex-1" title={d.name}>{d.name}</span>
                          <span className="text-xs text-gray-700">{d.value} applicants ({pct}%)</span>
                        </button>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Jobs header with CTA */}
        {tab === 'jobs' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Your Internships</h2>
              {selectedJobFilter && (
                <div className="flex items-center gap-2 text-sm px-2 py-1 rounded-full border border-primary-300 bg-primary-50">
                  <span className="text-gray-800 truncate max-w-[220px]" title={selectedJobFilter}>Filtered: {selectedJobFilter}</span>
                  <Button size="sm" variant="outline" onClick={() => setSelectedJobFilter(null)}>Clear</Button>
                </div>
              )}
            </div>
            <Link to="/employer/post"><Button>Post Internship</Button></Link>
          </div>
        </div>
        )}

        {/* Candidates by Job (overview only) */}
        {tab === 'overview' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Candidates by Job</h2>
            <Button variant="outline">Search Candidates</Button>
          </div>
          {internships.length === 0 ? (
            <div className="text-sm text-gray-600">No internships found for this company.</div>
          ) : (
            <div className="space-y-4">
              {internships.map(it => (
                <div key={it.id} className="rounded-xl border border-gray-200 p-4 hover:shadow-sm transition">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">IA</div>
                      <div>
                        <div className="font-semibold text-gray-900">{it.title}</div>
                        <div className="text-xs text-gray-600">{it.location} · {it.sector}</div>
                      </div>
                    </div>
                    <div className="inline-flex items-center text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {appCounts[it.id] ?? '—'} Applications
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => viewApplicants(it.id)}>View Applicants</Button>
                    <Button size="sm" variant="outline" onClick={() => viewMatches(it.id)}>View Matches</Button>
                  </div>
                  {selectedInternshipId === it.id && applicants && (
                    <div className="mt-4">
                      <div className="text-xs font-semibold text-gray-500 mb-2">Top Applications</div>
                      <ul className="divide-y divide-gray-100">
                        {applicants.slice(0,5).map((a, idx) => (
                          <li key={idx} className="py-3 flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium text-gray-900">{a.first_name} {a.last_name}</div>
                              <div className="text-xs text-gray-600">{Array.isArray(a.skills) ? a.skills.slice(0,3).join(', ') : '-'}</div>
                              <div className="mt-1 flex items-center gap-2 text-xs">
                                <span className={`px-2 py-0.5 rounded-full border ${a.matchScore >= 0.8 ? 'bg-green-50 text-green-700 border-green-200' : a.matchScore >= 0.6 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>{a.matchScore >= 0.8 ? 'Excellent' : a.matchScore >= 0.6 ? 'Good' : 'Fair'}</span>
                                <span className="text-gray-500">{Math.round((a.matchScore || 0)*100)}% match</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Link to={`/employer/students/${a.student_id}`}>
                              <Button size="sm" variant="outline">View Profile</Button>
                            </Link>
                              <Button size="sm">Contact</Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Employer internships list (Jobs tab) */}
        {tab === 'jobs' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          {(() => {
            const list = selectedJobFilter ? internships.filter(it => it.title === selectedJobFilter) : internships
            if (list.length === 0) {
              return <div className="text-sm text-gray-600">No internships found for this company.</div>
            }
            return (
              <ul className="divide-y divide-gray-100">
                {list.map(it => (
                  <li key={it.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-gray-900">{it.title}</div>
                      <div className="text-sm text-gray-600">{it.location} · {it.sector}</div>
                    </div>
                    <div className="text-xs text-gray-500">{appCounts[it.id] || 0} applicants</div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => viewMatches(it.id)}>View Matches</Button>
                      <Button variant="outline" onClick={() => viewApplicants(it.id)}>View Applicants</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          })()}
        </div>
        )}

        {/* Matches panel */}
        {matches && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3">Matching Students</h2>
            {matches.length === 0 ? (
              <div className="text-sm text-gray-600">No matching students.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Match</th>
                      <th className="py-2 pr-4">Skills%</th>
                      <th className="py-2 pr-4">Sector%</th>
                      <th className="py-2 pr-4">Location%</th>
                      <th className="py-2 pr-4">Matched Skills</th>
                      <th className="py-2 pr-4">Diversity</th>
                      <th className="py-2 pr-4">Applied</th>
                      <th className="py-2 pr-4">App Status</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="py-2 pr-4">{m.name}</td>
                        <td className="py-2 pr-4">{m.email}</td>
                        <td className="py-2 pr-4">
                          {(() => {
                            const pct = Math.round((m.matchScore || 0) * 100)
                            const quality = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 40 ? 'Fair' : 'Low'
                            const cls = pct >= 80 ? 'bg-green-50 text-green-700 border-green-200' : pct >= 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : pct >= 40 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                            return (
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs border ${cls}`}>{quality}</span>
                                <span className="text-sm text-gray-800">{pct}%</span>
                              </div>
                            )
                          })()}
                        </td>
                        <td className="py-2 pr-4">{Math.round((m.skillMatch || 0) * 100)}%</td>
                        <td className="py-2 pr-4">{Math.round((m.sectorMatch || 0) * 100)}%</td>
                        <td className="py-2 pr-4">{Math.round((m.locationMatch || 0) * 100)}%</td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {(m.matchedSkills || []).slice(0,5).map((s,i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-800">{s}</span>
                            ))}
                            {(m.matchedSkills || []).length > 5 && (
                              <span className="text-xs text-gray-500">+{(m.matchedSkills || []).length - 5}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-wrap gap-1 text-xs">
                            {m.diversity?.gender && <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">{m.diversity.gender}</span>}
                            {m.diversity?.residence && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{String(m.diversity.residence).toUpperCase()}</span>}
                            {m.diversity?.social && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{m.diversity.social}</span>}
                            {!m.diversity && <span className="text-gray-400">—</span>}
                          </div>
                        </td>
                        <td className="py-2 pr-4">{m.applied ? 'Yes' : 'No'}</td>
                        <td className="py-2 pr-4">{m.applicationStatus || '-'}</td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2 mb-2">
                            {m.studentId && (
                              <Link to={`/employer/students/${m.studentId}`}>
                                <Button size="sm" variant="outline">View Profile</Button>
                              </Link>
                            )}
                          </div>
                          {m.applied && m.applicationId ? (
                            <div className="flex items-center gap-2">
                              <select className="border rounded p-1" defaultValue={m.applicationStatus} onChange={(e) => m.__nextStatus = e.target.value}>
                                {['pending','accepted','rejected','withdrawn'].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <Button size="sm" onClick={async () => {
                                try {
                                  const status = m.__nextStatus || m.applicationStatus
                                  await axios.put(`${API_BASE}/employer/applications/${m.applicationId}/status`, { status })
                                  // refresh matches
                                  if (selectedInternshipId) {
                                    const { data } = await axios.get(`${API_BASE}/employer/internships/${selectedInternshipId}/matches`)
                                    setMatches(data.data || [])
                                  }
                                } catch (e) {
                                  console.error('Failed to update status', e)
                                  alert('Failed to update status')
                                }
                              }}>Update</Button>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Applicants panel */}
        {applicants && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3">Applicants</h2>
            {applicants.length === 0 ? (
              <div className="text-sm text-gray-600">No applicants yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Match</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Diversity</th>
                      <th className="py-2 pr-4">Sector Pref</th>
                      <th className="py-2 pr-4">Location Pref</th>
                      <th className="py-2 pr-4">Skills</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicants.map((a, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="py-2 pr-4">{a.first_name} {a.last_name}</td>
                        <td className="py-2 pr-4">{a.email}</td>
                        <td className="py-2 pr-4">
                          {(() => {
                            const pct = Math.round((a.matchScore || 0) * 100)
                            const quality = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 40 ? 'Fair' : 'Low'
                            const cls = pct >= 80 ? 'bg-green-50 text-green-700 border-green-200' : pct >= 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : pct >= 40 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                            return (
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs border ${cls}`}>{quality}</span>
                                <span className="text-sm text-gray-800">{pct}%</span>
                              </div>
                            )
                          })()}
                        </td>
                        <td className="py-2 pr-4">{a.status}</td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-wrap gap-1 text-xs">
                            {a.resume_parsed_data?.profileCategory?.residenceType || a.diversity?.residence ? (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                {String(a.resume_parsed_data?.profileCategory?.residenceType || a.diversity?.residence).toUpperCase()}
                              </span>
                            ) : null}
                            {a.diversity?.gender && (
                              <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">{a.diversity.gender}</span>
                            )}
                            {a.diversity?.social && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{a.diversity.social}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-4">{a.sector_preference || '-'}</td>
                        <td className="py-2 pr-4">{a.location_preference || '-'}</td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(a.skills) && a.skills.length > 0 ? (
                              a.skills.slice(0,5).map((s,i) => (
                                <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-800">{s}</span>
                              ))
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                            {Array.isArray(a.skills) && a.skills.length > 5 && (
                              <span className="text-xs text-gray-500">+{a.skills.length - 5}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => openProfile(a.student_id)}>View Profile</Button>
                            <select className="border rounded p-1" defaultValue={a.status} onChange={(e) => a.__nextStatus = e.target.value}>
                              {['pending','accepted','rejected','withdrawn'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <Button size="sm" onClick={async () => {
                              try {
                                const status = a.__nextStatus || a.status
                                await axios.put(`${API_BASE}/employer/applications/${a.id}/status`, { status })
                                // refresh applicants
                                const { data } = await axios.get(`${API_BASE}/employer/internships/${a.internship_id}/applicants`)
                                setApplicants(data.data || [])
                              } catch (e) {
                                console.error('Failed to update status', e)
                                alert('Failed to update status')
                              }
                            }}>Update</Button>
                            <Button variant="destructive" size="sm" onClick={async () => {
                              if (!confirm('Delete this application? This cannot be undone.')) return
                              try {
                                await axios.delete(`${API_BASE}/employer/applications/${a.id}`)
                                const { data } = await axios.get(`${API_BASE}/employer/internships/${a.internship_id}/applicants`)
                                setApplicants(data.data || [])
                              } catch (e) {
                                console.error('Failed to delete application', e)
                                alert('Failed to delete application')
                              }
                            }}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Profile modal */}
        {profileModal.open && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white max-w-xl w-full rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Student Profile</h3>
                <button onClick={() => setProfileModal({ open: false, data: null })}>✕</button>
              </div>
              {profileModal.data ? (
                <div className="space-y-3 text-sm text-gray-800">
                  <div className="font-medium text-gray-900">{profileModal.data.first_name} {profileModal.data.last_name}</div>
                  <div className="text-gray-600">{profileModal.data.email}</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{String(profileModal.data.diversity?.residence || '-').toUpperCase()}</span>
                    {profileModal.data.diversity?.gender && <span className="px-2 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200">{profileModal.data.diversity.gender}</span>}
                    {profileModal.data.diversity?.social && <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{profileModal.data.diversity.social}</span>}
                  </div>
                  {profileModal.data.bio && <p className="text-gray-700">{profileModal.data.bio}</p>}
                  <div>
                    <div className="font-medium">Skills</div>
                    <div>{Array.isArray(profileModal.data.skills) ? profileModal.data.skills.join(', ') : '-'}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <div className="font-medium">Sector Preference</div>
                      <div>{profileModal.data.sector_preference || '-'}</div>
                    </div>
                    <div>
                      <div className="font-medium">Location Preference</div>
                      <div>{profileModal.data.location_preference || '-'}</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {profileModal.data.linkedin_url && <a className="text-primary-600 underline" href={profileModal.data.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>}
                    {profileModal.data.github_url && <a className="text-primary-600 underline" href={profileModal.data.github_url} target="_blank" rel="noreferrer">GitHub</a>}
                  </div>
                </div>
              ) : (
                <div>Loading...</div>
              )}
              <div className="mt-4 text-right">
                <Button onClick={() => setProfileModal({ open: false, data: null })}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
