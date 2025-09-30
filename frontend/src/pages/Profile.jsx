import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { api } from '../lib/api'
import Header from '../components/Header'
import { Button } from '../components/ui/button'
import { motion } from 'framer-motion'
import { 
  User, 
  MapPin, 
  Briefcase, 
  Link as LinkIcon,
  Save
} from 'lucide-react'
import EngineeringForm from './EngineeringForm.jsx'
import FinanceForm from './FinanceForm.jsx'
import SectorSimpleForm from './SectorSimpleForm.jsx'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  // Resume upload removed
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  // Using form-based auth: token from localStorage

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


  // useEffect(() => {
  //   const token = localStorage.getItem('token')
  //   if (!token) {
  //     navigate('/login')
  //     return

  const loadProfile = async () => {
    try {
      const jwt = localStorage.getItem('token')
      const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {}
      const response = await api.get('/students/profile', { headers })
      const profileData = response?.data?.data || {}
      setProfile(profileData)
      
      setFormData({
        sectorPreference: profileData.sector_preference || '',
        locationPreference: profileData.location_preference || '',
        bio: profileData.bio || '',
        linkedinUrl: profileData.linkedin_url || '',
        githubUrl: profileData.github_url || '',
        gender: profileData.gender || '',
        residenceType: profileData.residence_type || '',
        socialBg: profileData.social_bg || ''
      })
      
      // Skills are managed within sector-specific forms
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load profile on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    setLoading(true)
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    
    try {
      const jwt = localStorage.getItem('token')
      const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {}
      await api.post('/students/profile', formData, { headers })
      setMessage('Profile updated successfully!')
    } catch (error) {
      setMessage('Error updating profile')
    } finally {
      setSaving(false)
    }
  }

  // Resume upload removed

  // Standalone skills editor removed; sector forms handle skills.

  const handleSectorChange = (e) => {
    const value = e.target.value
    setFormData({ ...formData, sectorPreference: value })
    // Render the relevant sector form inline below Basic Information
  }

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

  return (
    <div className="min-h-screen bg-cream-50 pt-24">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Profile</h1>
          <p className="text-gray-600">
            Keep your profile updated with new skills to get better internship suggestions
          </p>
        </motion.div>

        {message && (
          <motion.div 
            className={`mb-6 p-4 rounded-lg ${
              message.includes('successfully') 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {message}
          </motion.div>
        )}

        <div className="space-y-8">
          {/* Basic Information */}
          <motion.div 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Basic Information
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sector Preference
                  </label>
                  <select
                    value={formData.sectorPreference}
                    onChange={handleSectorChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Preference
                  </label>
                  <input
                    type="text"
                    value={formData.locationPreference}
                    onChange={(e) => setFormData({...formData, locationPreference: e.target.value})}
                    placeholder="e.g., San Francisco, CA or Remote"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Category fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other/Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Residence</label>
                  <select
                    value={formData.residenceType}
                    onChange={(e) => setFormData({ ...formData, residenceType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select</option>
                    <option value="rural">Rural</option>
                    <option value="urban">Urban</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Social Background</label>
                  <input
                    type="text"
                    value={formData.socialBg}
                    onChange={(e) => setFormData({ ...formData, socialBg: e.target.value })}
                    placeholder="e.g., Any / Category"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="Tell us about yourself, your interests, and career goals..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData({...formData, linkedinUrl: e.target.value})}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GitHub URL
                  </label>
                  <input
                    type="url"
                    value={formData.githubUrl}
                    onChange={(e) => setFormData({...formData, githubUrl: e.target.value})}
                    placeholder="https://github.com/yourusername"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <Button type="submit" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </motion.div>

          {/* Sector-specific detailed forms (embedded) */}
          {formData.sectorPreference && (
            <motion.div 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Briefcase className="w-5 h-5 mr-2" />
                {formData.sectorPreference} Details
              </h2>
              {formData.sectorPreference === 'Technology' && <EngineeringForm embedded />}
              {formData.sectorPreference === 'Finance' && <FinanceForm embedded />}
              {['Healthcare','Education','Environmental','Marketing','Other'].includes(formData.sectorPreference) && (
                <SectorSimpleForm sector={formData.sectorPreference} embedded />
              )}
            </motion.div>
          )}

          {/* Standalone Skills section removed; sector-specific forms below manage skills. */}
        </div>
      </div>
    </div>
  )
}
