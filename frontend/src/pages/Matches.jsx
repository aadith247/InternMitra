import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import Header from '../components/Header'
import { Button } from '../components/ui/button'
import { motion } from 'framer-motion'
import { 
  Target, 
  MapPin, 
  Building, 
  Clock, 
  IndianRupee,
  ExternalLink,
  CheckCircle,
  Star
} from 'lucide-react'

export default function Matches() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(null)
  const [priority, setPriority] = useState({ first: '', second: '', third: '' })
  const [socialBackground, setSocialBackground] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    setLoading(true)
    loadMatches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMatches = async () => {
    try {
      const order = [priority.first, priority.second, priority.third].filter(Boolean)
      const params = {}
      if (order.length === 3) params.priority = order.join(',')
      if (socialBackground) params.socialBackground = socialBackground
      const { data } = await api.get('/matches', { params })
      const items = Array.isArray(data.data) ? data.data : []
      // If no custom priority was specified, sort by blended score on client
      if (!params.priority) {
        items.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
      }
      setMatches(items)
    } catch (error) {
      console.error('Error loading matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (internshipId) => {
    setApplying(internshipId)
    try {
      await api.post('/applications', { internshipId })
      // Refresh matches to update UI
      loadMatches()
    } catch (error) {
      console.error('Error applying:', error)
    } finally {
      setApplying(null)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100'
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getScoreLabel = (score) => {
    if (score >= 0.8) return 'Excellent Match'
    if (score >= 0.6) return 'Good Match'
    if (score >= 0.4) return 'Fair Match'
    return 'Low Match'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 pt-24">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading matches...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-50 pt-24">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Internship Matches</h1>
          <p className="text-gray-600">
            {matches.length} internships matched to your profile
          </p>
        </motion.div>

        {/* Priority selector */}
        <motion.div 
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-1">Priority 1 (50%)</label>
              <select
                className="w-full border rounded p-2"
                value={priority.first}
                onChange={(e) => {
                  const v = e.target.value
                  setPriority(prev => ({ ...prev, first: v, ...(prev.second === v ? { second: '' } : {}), ...(prev.third === v ? { third: '' } : {}) }))
                }}
              >
                <option value="">Default (Skills 60 / Loc 20 / Sector 20)</option>
                <option value="skills">Skills</option>
                <option value="location">Location</option>
                <option value="sector">Sector</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-1">Priority 2 (30%)</label>
              <select
                className="w-full border rounded p-2"
                value={priority.second}
                onChange={(e) => {
                  const v = e.target.value
                  setPriority(prev => ({ ...prev, second: v, ...(prev.first === v ? { first: '' } : {}), ...(prev.third === v ? { third: '' } : {}) }))
                }}
                disabled={!priority.first}
              >
                <option value="">{priority.first ? 'Select' : 'Set Priority 1 first'}</option>
                {['skills','location','sector'].filter(opt => opt !== priority.first).map(opt => (
                  <option key={opt} value={opt}>{opt[0].toUpperCase()+opt.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-1">Priority 3 (20%)</label>
              <select
                className="w-full border rounded p-2"
                value={priority.third}
                onChange={(e) => setPriority(prev => ({ ...prev, third: e.target.value }))}
                disabled={!priority.second}
              >
                <option value="">{priority.second ? 'Select' : 'Set Priority 2 first'}</option>
                {['skills','location','sector'].filter(opt => opt !== priority.first && opt !== priority.second).map(opt => (
                  <option key={opt} value={opt}>{opt[0].toUpperCase()+opt.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-1">Social Background</label>
              <select
                className="w-full border rounded p-2"
                value={socialBackground}
                onChange={(e) => setSocialBackground(e.target.value)}
              >
                <option value="">All Backgrounds</option>
                <option value="Rural">Rural</option>
                <option value="Urban">Urban</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => { setLoading(true); loadMatches() }}>Apply</Button>
              <Button variant="outline" onClick={() => { setPriority({ first: '', second: '', third: '' }); setSocialBackground(''); setLoading(true); loadMatches() }}>Reset</Button>
            </div>
          </div>
        </motion.div>

        {matches.length === 0 ? (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No matches yet</h3>
            <p className="text-gray-600 mb-6">
              Update your profile with your latest skills to get personalized matches
            </p>
            <Link to="/profile">
              <Button>
                Update Profile
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {matches.map((match, index) => (
              <motion.div
                key={match.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.8 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <span className="text-gray-400 text-base">#{index + 1}</span>
                        {match.title}
                        {index < 3 && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                            <Star className="w-3 h-3" /> Top {index + 1}
                          </span>
                        )}
                      </h3>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(match.matchScore)}`}>
                        {Math.round(match.matchScore * 100)}% Match
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Building className="w-4 h-4" />
                        {match.company_name}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {match.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {match.duration_weeks} weeks
                      </div>
                      {match.stipend_amount && (
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-4 h-4" />
                          ₹{match.stipend_amount}
                        </div>
                      )}
                      {Array.isArray(match.preferred_social_backgrounds) && match.preferred_social_backgrounds.length > 0 && (
                        <div className="flex items-center gap-2">
                          {match.preferred_social_backgrounds.map((bg, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700"
                            >
                              {bg}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <p className="text-gray-700 mb-4 line-clamp-2">
                      {match.description}
                    </p>

                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Required Skills:</h4>
                      <div className="flex flex-wrap gap-2">
                        {match.required_skills?.slice(0, 6).map((skill, skillIndex) => (
                          <span
                            key={skillIndex}
                            className={`px-2 py-1 rounded-md text-xs ${
                              match.matchedSkills?.includes(skill)
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {skill}
                          </span>
                        ))}
                        {match.required_skills?.length > 6 && (
                          <span className="px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-800">
                            +{match.required_skills.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Match Breakdown:</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">
                            {Math.round(match.skillMatch * 100)}%
                          </div>
                          <div className="text-xs text-gray-600">Skills</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">
                            {Math.round(match.locationMatch * 100)}%
                          </div>
                          <div className="text-xs text-gray-600">Location</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-purple-600">
                            {Math.round(match.sectorMatch * 100)}%
                          </div>
                          <div className="text-xs text-gray-600">Sector</div>
                        </div>
                      </div>
                    </div>

                    {/* Why this match */}
                    <div className="mb-2">
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Why this matches your profile</h4>
                      <ul className="text-sm text-gray-700 list-disc ml-5 space-y-1">
                        {Array.isArray(match.matchedSkills) && match.matchedSkills.length > 0 && (
                          <li>Skills overlap: {match.matchedSkills.slice(0, 6).join(', ')}{match.matchedSkills.length > 6 ? '…' : ''}</li>
                        )}
                        {typeof match.sectorMatch === 'number' && match.sectorMatch >= 0.8 && (
                          <li>Sector aligns strongly with your preference.</li>
                        )}
                        {typeof match.locationMatch === 'number' && match.locationMatch >= 0.8 && (
                          <li>Location matches your preference or is remote.</li>
                        )}
                        {((!match.matchedSkills || match.matchedSkills.length === 0) && (match.sectorMatch < 0.8) && (match.locationMatch < 0.8)) && (
                          <li>Related role added to broaden your options based on your profile.</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="ml-6 flex flex-col gap-3">
                    <Link to={`/internship/${match.id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                    
                    <Button
                      onClick={() => handleApply(match.id)}
                      disabled={applying === match.id}
                      size="sm"
                    >
                      {applying === match.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Applying...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Apply Now
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
