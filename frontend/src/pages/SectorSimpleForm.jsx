import { useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from '../components/ui/button'

export default function SectorSimpleForm({ sector = 'other', embedded }) {
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    summary: '',
    skills: [],
    newSkill: '',
    experience: [{ role: '', org: '', duration: '' }],
    tools: ''
  })

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

  // Preload previously saved sector data from student profile
  useEffect(() => {
    const load = async () => {
      try {
        const jwt = localStorage.getItem('token')
        const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {}
        const { data } = await axios.get(`${API_BASE}/students/profile`, { headers })
        const existing = data?.data?.resume_parsed_data || null
        if (existing) {
          setForm(prev => ({
            ...prev,
            ...existing,
            experience: Array.isArray(existing.experience) && existing.experience.length ? existing.experience : prev.experience,
            skills: Array.isArray(existing.skills) ? existing.skills : prev.skills,
            summary: existing.summary || prev.summary,
            tools: existing.tools || prev.tools,
            newSkill: ''
          }))
        }
      } catch {}
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector])

  const addSkill = () => {
    const s = (form.newSkill || '').trim()
    if (!s) return
    if (!form.skills.includes(s)) setForm({ ...form, skills: [...form.skills, s], newSkill: '' })
  }
  const removeSkill = (s) => setForm({ ...form, skills: form.skills.filter(x => x !== s) })

  const updateExp = (idx, key, val) => {
    const arr = [...form.experience]
    arr[idx] = { ...arr[idx], [key]: val }
    setForm({ ...form, experience: arr })
  }
  const addExp = () => setForm({ ...form, experience: [...form.experience, { role: '', org: '', duration: '' }] })
  const removeExp = (idx) => setForm({ ...form, experience: form.experience.filter((_, i) => i !== idx) })

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      const jwt = localStorage.getItem('token')
      const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {}
      await axios.post(`${API_BASE}/students/profile/${String(sector).toLowerCase()}`, form, { headers })
      setMsg('Saved! Your profile has been updated.')
    } catch (e) {
      setMsg('Failed to save form')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {msg && <div className="text-sm text-green-700 bg-green-100 p-3 rounded">{msg}</div>}

      <div>
        <h3 className="font-semibold mb-2">Summary</h3>
        <textarea className="w-full border rounded p-2" rows={3} placeholder={`Short summary for ${sector}`} value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} />
      </div>

      <div>
        <h3 className="font-semibold mb-2">Skills</h3>
        <div className="flex gap-2 mb-3">
          <input className="flex-1 border rounded p-2" placeholder="Add a skill" value={form.newSkill} onChange={e => setForm({ ...form, newSkill: e.target.value })} onKeyDown={e => e.key==='Enter' && (e.preventDefault(), addSkill())} />
          <Button type="button" onClick={addSkill}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.skills.map((s, i) => (
            <span key={i} className="px-2 py-1 text-sm bg-primary-100 text-primary-800 rounded-full">
              {s}
              <button type="button" className="ml-2" onClick={() => removeSkill(s)}>×</button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Experience</h3>
        {form.experience.map((row, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input className="border rounded p-2" placeholder="Role" value={row.role} onChange={e => updateExp(idx, 'role', e.target.value)} />
            <input className="border rounded p-2" placeholder="Organization" value={row.org} onChange={e => updateExp(idx, 'org', e.target.value)} />
            <input className="border rounded p-2" placeholder="Duration" value={row.duration} onChange={e => updateExp(idx, 'duration', e.target.value)} />
            <div className="md:col-span-3 text-right"><button type="button" className="text-sm text-red-600" onClick={() => removeExp(idx)}>Remove</button></div>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addExp}>Add Experience</Button>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Tools</h3>
        <input className="border rounded p-2 w-full" placeholder="Tools/Platforms (comma separated)" value={form.tools} onChange={e => setForm({ ...form, tools: e.target.value })} />
      </div>

      <Button type="submit" disabled={saving}>{saving ? 'Saving...' : `Save ${sector} Profile`}</Button>
    </form>
  )
}
