import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { Button } from '../components/ui/button'
import { motion } from 'framer-motion'
import axios from 'axios'

export default function EmployerStudentProfile() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await axios.get(`${API_BASE}/employer/students/${id}/profile`)
        setProfile(data?.data || null)
      } catch (e) {
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 pt-24">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-cream-50 pt-24">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile not available</h2>
            <p className="text-gray-600 mb-4">{error || 'We could not find this student profile.'}</p>
            <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-50 pt-24">
      <Header />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Student Profile</h1>
              <p className="text-gray-600">Review details and reach out if the profile matches your role.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Summary */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-2xl font-semibold text-gray-900">{profile.first_name} {profile.last_name}</div>
                    <div className="text-sm text-gray-600">{profile.email}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{String(profile?.diversity?.residence || '-').toUpperCase()}</span>
                      {profile?.diversity?.gender && <span className="px-2 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200">{profile.diversity.gender}</span>}
                      {profile?.diversity?.social && <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{profile.diversity.social}</span>}
                    </div>
                  </div>
                </div>
                {profile.bio && <p className="mt-4 text-gray-800 leading-relaxed">{profile.bio}</p>}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills</h3>
                <div className="text-gray-800">{Array.isArray(profile.skills) ? profile.skills.join(', ') : '-'}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Sector Preference</h3>
                  <div className="text-gray-800">{profile.sector_preference || '-'}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Location Preference</h3>
                  <div className="text-gray-800">{profile.location_preference || '-'}</div>
                </div>
              </div>

              {profile.resume_url && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Resume</h3>
                  <a className="text-primary-600 underline" href={profile.resume_url} target="_blank" rel="noreferrer">Open resume</a>
                </div>
              )}
            </div>

            {/* Right: Links */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Links</h3>
                <div className="flex gap-3 text-sm">
                  {profile.linkedin_url ? (
                    <a className="text-primary-600 underline" href={profile.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>
                  ) : (<span className="text-gray-400">LinkedIn —</span>)}
                  {profile.github_url ? (
                    <a className="text-primary-600 underline" href={profile.github_url} target="_blank" rel="noreferrer">GitHub</a>
                  ) : (<span className="text-gray-400">GitHub —</span>)}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact</h3>
                <div className="text-sm text-gray-700">Email the candidate directly or use your preferred channel.</div>
                <div className="mt-3 flex gap-2">
                  <a href={`mailto:${profile.email}`}><Button>Contact</Button></a>
                  <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
