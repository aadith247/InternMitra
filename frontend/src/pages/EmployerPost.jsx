import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { Button } from '../components/ui/button'
import { motion } from 'framer-motion'
import axios from 'axios'

export default function EmployerPost() {
  const [companyId, setCompanyId] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const navigate = useNavigate()
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

  const [form, setForm] = useState({
    title: '',
    location: '',
    sector: 'Technology',
    description: '',
    requirements: '',
    requiredSkills: '',
    applicationDeadline: '',
    isRemote: false,
    genderRequirement: 'both',
    residenceRequirement: 'any',
    socialRequirement: 'any',
    // locked
    durationWeeks: 52,
    stipendAmount: 4000,
    stipendCurrency: 'INR',
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem('employer')
      if (raw) {
        const c = JSON.parse(raw)
        if (c?.id) setCompanyId(c.id)
      }
    } catch {}
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!companyId) return alert('Please login as employer')
    setSaving(true)
    setMsg('')
    try {
      const payload = { ...form, companyId, durationWeeks: 52, stipendAmount: 4000, stipendCurrency: 'INR' }
      await axios.post(`${API_BASE}/employer/internships`, payload)
      setMsg('Internship posted successfully!')
      setTimeout(() => navigate('/employer?tab=jobs'), 800)
    } catch (e) {
      setMsg('Failed to post internship')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 pt-24">
      <Header />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Post Internship</h1>
              <p className="text-gray-600">Create a new internship. Locked stipend and duration are applied per policy.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/employer?tab=jobs')}>Cancel</Button>
              <Button onClick={onSubmit} disabled={saving || !companyId}>{saving ? 'Posting...' : 'Post Internship'}</Button>
            </div>
          </div>

          {msg && (
            <div className={`mb-4 text-sm p-3 rounded border ${msg.toLowerCase().includes('success') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{msg}</div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            {/* Basics */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input className="w-full border rounded p-2" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., IA Engineer Internship" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input className="w-full border rounded p-2" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g., Bengaluru or Remote" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sector</label>
                  <select className="w-full border rounded p-2" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}>
                    {['Technology','Finance','Healthcare','Education','Environmental','Marketing','Other'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-6 md:mt-0">
                  <input id="isRemote" type="checkbox" checked={form.isRemote} onChange={e => setForm({ ...form, isRemote: e.target.checked })} />
                  <label htmlFor="isRemote" className="text-sm text-gray-700">Remote</label>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Short description</label>
                  <textarea className="w-full border rounded p-2" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Requirements / JD</label>
                  <textarea className="w-full border rounded p-2" rows={4} value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} />
                  <p className="text-xs text-gray-500 mt-1">We will also parse skills from here if not specified below.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Required Skills (comma-separated)</label>
                  <textarea className="w-full border rounded p-2" rows={2} value={form.requiredSkills} onChange={e => setForm({ ...form, requiredSkills: e.target.value })} placeholder="e.g., React, Node.js" />
                </div>
              </div>
            </div>

            {/* Compensation (locked) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Compensation</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded p-3 bg-gray-50 flex items-center justify-between"><span>Duration (weeks)</span><span className="font-medium">{form.durationWeeks}</span></div>
                <div className="border rounded p-3 bg-gray-50 flex items-center justify-between"><span>Stipend Amount</span><span className="font-medium">₹{form.stipendAmount}</span></div>
                <div className="border rounded p-3 bg-gray-50 flex items-center justify-between"><span>Currency</span><span className="font-medium">{form.stipendCurrency}</span></div>
              </div>
            </div>

            {/* Eligibility */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Eligibility</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Application Deadline</label>
                  <input type="date" className="w-full border rounded p-2" value={form.applicationDeadline} onChange={e => setForm({ ...form, applicationDeadline: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gender Requirement</label>
                  <select className="w-full border rounded p-2" value={form.genderRequirement} onChange={e => setForm({ ...form, genderRequirement: e.target.value })}>
                    <option value="both">Both</option>
                    <option value="male">Male only</option>
                    <option value="female">Female only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Residence Requirement</label>
                  <select className="w-full border rounded p-2" value={form.residenceRequirement} onChange={e => setForm({ ...form, residenceRequirement: e.target.value })}>
                    <option value="any">Any</option>
                    <option value="rural">Rural</option>
                    <option value="urban">Urban</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-1">Social Background Requirement</label>
                  <input className="w-full border rounded p-2" value={form.socialRequirement} onChange={e => setForm({ ...form, socialRequirement: e.target.value })} placeholder="e.g., Any / Category" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/employer?tab=jobs')}>Cancel</Button>
              <Button type="submit" disabled={saving || !companyId}>{saving ? 'Posting...' : 'Post Internship'}</Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
