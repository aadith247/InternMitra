import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import Header from '../components/Header'
import { Button } from '../components/ui/button'
import { motion } from 'framer-motion'
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  DollarSign,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  FileText
} from 'lucide-react'

export default function Applications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    setLoading(true)
    loadApplications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadApplications = async () => {
    try {
      const { data } = await api.get('/applications')
      setApplications(data.data)
    } catch (error) {
      console.error('Error loading applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return 'text-green-600 bg-green-100'
      case 'rejected':
        return 'text-red-600 bg-red-100'
      case 'withdrawn':
        return 'text-gray-600 bg-gray-100'
      case 'pending':
      default:
        return 'text-yellow-600 bg-yellow-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />
      case 'rejected':
        return <XCircle className="w-4 h-4" />
      case 'withdrawn':
        return <XCircle className="w-4 h-4" />
      case 'pending':
      default:
        return <ClockIcon className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading applications...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Applications</h1>
          <p className="text-gray-600">
            Track the status of your internship applications
          </p>
        </motion.div>

        {applications.length === 0 ? (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No applications yet</h3>
            <p className="text-gray-600 mb-6">
              Start applying to internships that match your profile
            </p>
            <Link to="/matches">
              <Button>
                Browse Matches
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {applications.map((application, index) => (
              <motion.div
                key={application.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.8 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {application.internship_title}
                      </h3>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)}
                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {application.company_name}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {application.internship_location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {application.internship_duration_weeks} weeks
                      </div>
                      {application.internship_stipend_amount && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          ${application.internship_stipend_amount}
                        </div>
                      )}
                    </div>

                    <p className="text-gray-700 mb-4 line-clamp-2">
                      {application.internship_description}
                    </p>

                    {application.cover_letter && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Cover Letter:</h4>
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {application.cover_letter}
                        </p>
                      </div>
                    )}

                    <div className="text-sm text-gray-500">
                      Applied on {new Date(application.applied_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="ml-6 flex flex-col gap-3">
                    <Link to={`/internship/${application.internship_id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                    
                    {application.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => withdraw(application.id)}
                      >
                        Withdraw
                      </Button>
                    )}
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
