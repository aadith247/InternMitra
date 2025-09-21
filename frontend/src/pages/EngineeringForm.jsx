import { useState } from 'react'
import Header from '../components/Header'
import axios from 'axios'
import { Button } from '../components/ui/button'

export default function EngineeringForm() {
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    summary: '',
    skills: [],
    newSkill: '',
    education: [{ degree: '', discipline: '', institute: '' }],
    projects: [{ name: '', github: '', demo: '', desc: '' }],
    experience: [{ role: '', company: '', duration: '' }],
    codingProfiles: { leetcode: '', codeforces: '', codechef: '' },
    tools: ''
  })

  const addSkill = () => {
    const s = (form.newSkill || '').trim()
    if (!s) return
    if (!form.skills.includes(s)) setForm({ ...form, skills: [...form.skills, s], newSkill: '' })
  }
  const removeSkill = (s) => setForm({ ...form, skills: form.skills.filter(x => x !== s) })

  const updateArrayField = (field, idx, key, value) => {
    const arr = [...form[field]]
    arr[idx] = { ...arr[idx], [key]: value }
    setForm({ ...form, [field]: arr })
  }
  const addRow = (field, row) => setForm({ ...form, [field]: [...form[field], row] })
  const removeRow = (field, idx) => setForm({ ...form, [field]: form[field].filter((_, i) => i !== idx) })

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      const jwt = localStorage.getItem('token')
      const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {}
      await axios.post(`${API_BASE}/students/profile/engineering`, form, { headers })
      setMsg('Saved! Your engineering profile has been updated.')
    } catch (e) {
      setMsg('Failed to save form')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-4">Engineering Profile</h1>
        {msg && <div className="mb-4 text-sm text-green-700 bg-green-100 p-3 rounded">{msg}</div>}
        <form onSubmit={onSubmit} className="space-y-8">
          <div className="bg-white p-6 rounded border">
            <h2 className="font-semibold mb-3">Summary</h2>
            <textarea className="w-full border rounded p-2" rows={3} placeholder="Short summary" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} />
          </div>

          <div className="bg-white p-6 rounded border">
            <h2 className="font-semibold mb-3">Skills</h2>
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

          <div className="bg-white p-6 rounded border">
            <h2 className="font-semibold mb-3">Education</h2>
            {form.education.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <input className="border rounded p-2" placeholder="Degree" value={row.degree} onChange={e => updateArrayField('education', idx, 'degree', e.target.value)} />
                <input className="border rounded p-2" placeholder="Discipline" value={row.discipline} onChange={e => updateArrayField('education', idx, 'discipline', e.target.value)} />
                <input className="border rounded p-2" placeholder="Institute" value={row.institute} onChange={e => updateArrayField('education', idx, 'institute', e.target.value)} />
                <div className="md:col-span-3 text-right"><button type="button" className="text-sm text-red-600" onClick={() => removeRow('education', idx)}>Remove</button></div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => addRow('education', { degree: '', discipline: '', institute: '' })}>Add Education</Button>
          </div>

          <div className="bg-white p-6 rounded border">
            <h2 className="font-semibold mb-3">Projects</h2>
            {form.projects.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <input className="border rounded p-2" placeholder="Name" value={row.name} onChange={e => updateArrayField('projects', idx, 'name', e.target.value)} />
                <input className="border rounded p-2" placeholder="GitHub URL" value={row.github} onChange={e => updateArrayField('projects', idx, 'github', e.target.value)} />
                <input className="border rounded p-2" placeholder="Live Demo URL" value={row.demo} onChange={e => updateArrayField('projects', idx, 'demo', e.target.value)} />
                <input className="border rounded p-2" placeholder="Short Description" value={row.desc} onChange={e => updateArrayField('projects', idx, 'desc', e.target.value)} />
                <div className="md:col-span-4 text-right"><button type="button" className="text-sm text-red-600" onClick={() => removeRow('projects', idx)}>Remove</button></div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => addRow('projects', { name: '', github: '', demo: '', desc: '' })}>Add Project</Button>
          </div>

          <div className="bg-white p-6 rounded border">
            <h2 className="font-semibold mb-3">Experience</h2>
            {form.experience.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <input className="border rounded p-2" placeholder="Role" value={row.role} onChange={e => updateArrayField('experience', idx, 'role', e.target.value)} />
                <input className="border rounded p-2" placeholder="Company" value={row.company} onChange={e => updateArrayField('experience', idx, 'company', e.target.value)} />
                <input className="border rounded p-2" placeholder="Duration" value={row.duration} onChange={e => updateArrayField('experience', idx, 'duration', e.target.value)} />
                <div className="md:col-span-3 text-right"><button type="button" className="text-sm text-red-600" onClick={() => removeRow('experience', idx)}>Remove</button></div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => addRow('experience', { role: '', company: '', duration: '' })}>Add Experience</Button>
          </div>

          <div className="bg-white p-6 rounded border">
            <h2 className="font-semibold mb-3">Coding Profiles & Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input className="border rounded p-2" placeholder="LeetCode" value={form.codingProfiles.leetcode} onChange={e => setForm({ ...form, codingProfiles: { ...form.codingProfiles, leetcode: e.target.value } })} />
              <input className="border rounded p-2" placeholder="Codeforces" value={form.codingProfiles.codeforces} onChange={e => setForm({ ...form, codingProfiles: { ...form.codingProfiles, codeforces: e.target.value } })} />
              <input className="border rounded p-2" placeholder="CodeChef" value={form.codingProfiles.codechef} onChange={e => setForm({ ...form, codingProfiles: { ...form.codingProfiles, codechef: e.target.value } })} />
            </div>
            <input className="border rounded p-2 w-full" placeholder="Tools/Frameworks (comma separated)" value={form.tools} onChange={e => setForm({ ...form, tools: e.target.value })} />
          </div>

          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Engineering Profile'}</Button>
        </form>
      </div>
    </div>
  )
}
