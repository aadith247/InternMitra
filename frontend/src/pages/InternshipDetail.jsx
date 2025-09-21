import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import Header from '../components/Header'
import { Button } from '../components/ui/button'
import { motion } from 'framer-motion'
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  IndianRupee,
  Building,
  Calendar,
  CheckCircle,
  ArrowLeft
} from 'lucide-react'

export default function InternshipDetail() {
  const { id } = useParams()
  const [internship, setInternship] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    loadInternship()
  }, [id])

  const loadInternship = async () => {
    try {
      const { data } = await api.get(`/internships/${id}`)
      setInternship(data.data)
    } catch (error) {
      console.error('Error loading internship:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    setApplying(true)
    try {
      await api.post('/applications', {
        internshipId: id,
        coverLetter: coverLetter
      })
      navigate('/applications')
    } catch (error) {
      console.error('Error applying:', error)
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading internship details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!internship) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Internship not found</h2>
            <Link to="/matches">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Matches
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Link to="/matches" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Matches
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {internship.title}
          </h1>
          
          <div className="flex items-center gap-4 text-gray-600">
            <div className="flex items-center gap-1">
              <Building className="w-5 h-5" />
              {internship.company_name}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-5 h-5" />
              {internship.location}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-5 h-5" />
              {internship.duration_weeks} weeks
            </div>
            {internship.stipend_amount && (
              <div className="flex items-center gap-1">
                <IndianRupee className="w-5 h-5" />
                ₹{internship.stipend_amount}
              </div>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700 leading-relaxed">
                {internship.description}
              </p>
            </motion.div>

            <motion.div 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Requirements</h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {internship.requirements}
                </p>
              </div>
            </motion.div>

            <motion.div 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {internship.required_skills?.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <motion.div 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Info</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Company:</span>
                  <p className="text-gray-900">{internship.company_name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Sector:</span>
                  <p className="text-gray-900">{internship.sector}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Location:</span>
                  <p className="text-gray-900">{internship.location}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Duration:</span>
                  <p className="text-gray-900">{internship.duration_weeks} weeks</p>
                </div>
                {internship.stipend_amount && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Stipend:</span>
                    <p className="text-gray-900">₹{internship.stipend_amount} {internship.stipend_currency}</p>
                  </div>
                )}
                {internship.application_deadline && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Deadline:</span>
                    <p className="text-gray-900">
                      {new Date(internship.application_deadline).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Application form */}
            {!showApplicationForm ? (
              <motion.div 
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.8 }}
              >
                <Button 
                  onClick={() => setShowApplicationForm(true)}
                  className="w-full"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Apply Now
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.8 }}
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Apply for this position</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Letter (Optional)
                    </label>
                    <textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Tell us why you're interested in this internship..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleApply}
                      disabled={applying}
                      className="flex-1"
                    >
                      {applying ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Applying...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Submit Application
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => setShowApplicationForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
