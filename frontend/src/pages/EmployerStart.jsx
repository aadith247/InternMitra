import Header from '../components/Header'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Briefcase, Users } from 'lucide-react'
import { Button } from '../components/ui/button'

export default function EmployerStart() {
  return (
    <div className="min-h-screen bg-cream-50">
      <Header />
      <section className="pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <Briefcase className="w-6 h-6 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">Upload an Internship</h1>
            </div>
            <p className="text-gray-600 mb-6">
              Register or sign in as an employer to post internships and manage candidates. If you already have an account, sign in.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/signup?role=employer">
                <Button>
                  <Users className="w-4 h-4 mr-2" /> Register as Employer
                </Button>
              </Link>
              <Link to="/login?role=employer">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link to="/employer">
                <Button variant="ghost">Go to Employer Panel</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
