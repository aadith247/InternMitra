import { useEffect, useState } from 'react'
import Header from '../components/Header'
import { Button } from '../components/ui/button'
import { motion } from 'framer-motion'
import axios from 'axios'

export default function Employer() {
  const [companyId, setCompanyId] = useState('')
  const [company, setCompany] = useState(null)
  const [internships, setInternships] = useState([])
  const [selectedInternshipId, setSelectedInternshipId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    requirements: '',
    requiredSkills: '',
    sector: 'Technology',
    location: '',
    durationWeeks: '',
    stipendAmount: '',
    stipendCurrency: 'INR',
    isRemote: false,
    applicationDeadline: '',
    genderRequirement: 'both',
    residenceRequirement: 'any',
    socialRequirement: 'any'
  })
  const [matches, setMatches] = useState(null)
  const [applicants, setApplicants] = useState(null)
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

  const loadInternships = async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const { data } = await axios.get(`${API_BASE}/employer/internships`, { params: { companyId } })
      setInternships(data.data || [])
    } catch (e) {
      console.error('Failed to load internships', e)
    } finally {
      setLoading(false)
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
      const payload = { ...form, companyId, requiredSkills: form.requiredSkills }
      const { data } = await axios.post(`${API_BASE}/employer/internships`, payload)
      setForm({ title: '', description: '', requirements: '', requiredSkills: '', sector: 'Technology', location: '', durationWeeks: '', stipendAmount: '', stipendCurrency: 'USD', isRemote: false, applicationDeadline: '' })
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-gray-900">Employer Panel</h1>
          <p className="text-gray-600">Create internships, see matching students, and review applicants.</p>
        </motion.div>

        {/* Company info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Company</h2>
          {company ? (
            <div className="text-sm text-gray-700">
              <div><span className="font-medium">Name:</span> {company.name || '-'}</div>
              <div><span className="font-medium">Email:</span> {company.email || '-'}</div>
              {company.website && <div><span className="font-medium">Website:</span> {company.website}</div>}
              {company.contactName && <div><span className="font-medium">Contact:</span> {company.contactName}</div>}
              {company.phone && <div><span className="font-medium">Phone:</span> {company.phone}</div>}
              <div className="mt-2 text-xs text-gray-500">Company ID: {companyId || '—'}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">Sign in as an employer to manage your postings. Use <span className="font-mono">/login?role=employer</span>.</div>
          )}
        </div>

        {/* Create internship */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Post New Internship</h2>
          <form onSubmit={createInternship} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="border rounded p-2" placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <input className="border rounded p-2" placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            <select className="border rounded p-2" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}>
              {['Technology','Finance','Healthcare','Education','Environmental','Marketing','Other'].map(s => <option key={s}>{s}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isRemote" checked={form.isRemote} onChange={e => setForm({ ...form, isRemote: e.target.checked })} />
              <label htmlFor="isRemote" className="text-sm text-gray-700">Remote</label>
            </div>
            <input className="border rounded p-2" placeholder="Duration (weeks)" value={form.durationWeeks} onChange={e => setForm({ ...form, durationWeeks: e.target.value })} />
            <input className="border rounded p-2" placeholder="Stipend Amount" value={form.stipendAmount} onChange={e => setForm({ ...form, stipendAmount: e.target.value })} />
            <input className="border rounded p-2" placeholder="Stipend Currency" value={form.stipendCurrency} onChange={e => setForm({ ...form, stipendCurrency: e.target.value })} />
            <input type="date" className="border rounded p-2" value={form.applicationDeadline} onChange={e => setForm({ ...form, applicationDeadline: e.target.value })} />
            <textarea className="border rounded p-2 md:col-span-2" rows={3} placeholder="Short description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <textarea className="border rounded p-2 md:col-span-2" rows={4} placeholder="Requirements / JD (skills will be parsed)" value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Required Skills (comma-separated)</label>
              <textarea className="border rounded p-2 w-full" rows={2} placeholder="e.g., JavaScript, React, Node.js" value={form.requiredSkills} onChange={e => setForm({ ...form, requiredSkills: e.target.value })} />
              <p className="text-xs text-gray-500 mt-1">We will use these skills directly (normalized), and fall back to parsing your JD if left empty.</p>
            </div>
            {/* Eligibility requirements */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Gender Requirement</label>
              <select className="border rounded p-2 w-full" value={form.genderRequirement} onChange={e => setForm({ ...form, genderRequirement: e.target.value })}>
                <option value="both">Both</option>
                <option value="male">Male only</option>
                <option value="female">Female only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Residence Requirement</label>
              <select className="border rounded p-2 w-full" value={form.residenceRequirement} onChange={e => setForm({ ...form, residenceRequirement: e.target.value })}>
                <option value="any">Any</option>
                <option value="rural">Rural</option>
                <option value="urban">Urban</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Social Background Requirement</label>
              <input className="border rounded p-2 w-full" placeholder="e.g., Any / Category" value={form.socialRequirement} onChange={e => setForm({ ...form, socialRequirement: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={!companyId}>Create Internship</Button>
            </div>
          </form>
        </div>

        {/* Employer internships list */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Your Internships</h2>
          {internships.length === 0 ? (
            <div className="text-sm text-gray-600">No internships found for this company.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {internships.map(it => (
                <li key={it.id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-gray-900">{it.title}</div>
                    <div className="text-sm text-gray-600">{it.location} · {it.sector}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => viewMatches(it.id)}>View Matches</Button>
                    <Button variant="outline" onClick={() => viewApplicants(it.id)}>View Applicants</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

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
                        <td className="py-2 pr-4">{Math.round((m.matchScore || 0) * 100)}%</td>
                        <td className="py-2 pr-4">{Math.round((m.skillMatch || 0) * 100)}%</td>
                        <td className="py-2 pr-4">{Math.round((m.sectorMatch || 0) * 100)}%</td>
                        <td className="py-2 pr-4">{Math.round((m.locationMatch || 0) * 100)}%</td>
                        <td className="py-2 pr-4">{(m.matchedSkills || []).join(', ')}</td>
                        <td className="py-2 pr-4">{[m.diversity?.gender || '-', m.diversity?.residence || '-', m.diversity?.social || '-'].join(' / ')}</td>
                        <td className="py-2 pr-4">{m.applied ? 'Yes' : 'No'}</td>
                        <td className="py-2 pr-4">{m.applicationStatus || '-'}</td>
                        <td className="py-2 pr-4">
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
                      <th className="py-2 pr-4">Status</th>
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
                        <td className="py-2 pr-4">{a.status}</td>
                        <td className="py-2 pr-4">{a.sector_preference || '-'}</td>
                        <td className="py-2 pr-4">{a.location_preference || '-'}</td>
                        <td className="py-2 pr-4">{Array.isArray(a.skills) ? a.skills.join(', ') : '-'}</td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
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
      </div>
    </div>
  )
}
