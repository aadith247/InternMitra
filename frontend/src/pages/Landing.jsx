import Header from '../components/Header.jsx'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Briefcase, Target, Zap, Users, TrendingUp, CheckCircle } from 'lucide-react'

export default function Landing() {
  const authed = (() => { try { return Boolean(localStorage.getItem('token')) } catch { return false } })()
  return (
    <div className="min-h-screen bg-white">
      <Header />
      {/* Hero section */}
      <section className="pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1 
              className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <span className="text-primary-600">Find Your Perfect</span>
              <br />
              <span className="text-gray-900">Internship Match</span>
            </motion.h1>

            <motion.p 
              className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto mb-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              Upload your resume, get AI-powered skill matching, and discover internships 
              that perfectly align with your career goals and preferences.
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              <Link to="/signup">
                <motion.button
                  className="px-8 py-4 bg-primary-600 text-white font-semibold rounded-lg text-lg shadow-sm hover:bg-primary-700 transition-all duration-200 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="flex items-center gap-2">
                    Get Started Free
                    <motion.svg 
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </motion.svg>
                  </span>
                </motion.button>
              </Link>
              
              <Link to="/login">
                <motion.button
                  className="px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg text-lg hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Sign In
                </motion.button>
              </Link>
            </motion.div>

            {/* Features */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              {[
                { 
                  icon: <Target className="w-8 h-8 text-primary-600" />, 
                  title: "Smart Matching", 
                  desc: "AI-powered algorithm matches your skills with the perfect internship opportunities" 
                },
                { 
                  icon: <Zap className="w-8 h-8 text-primary-600" />, 
                  title: "Instant Results", 
                  desc: "Upload your resume and get matched with relevant internships in seconds" 
                },
                { 
                  icon: <TrendingUp className="w-8 h-8 text-primary-600" />, 
                  title: "Career Growth", 
                  desc: "Find internships that align with your career goals and growth trajectory" 
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className="bg-gray-50 rounded-xl p-8 border border-gray-100 hover:border-gray-200 transition-all duration-300 group"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Employer section */}
      <section className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="order-2 lg:order-1"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-4">For Employers</h2>
              <p className="text-lg text-gray-600 mb-6">
                Post internships, discover matched candidates with skills/sector/location breakdowns,
                track applications, and manage statuses — all in one place.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/signup?role=employer">
                  <button className="px-5 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2">
                    <Users className="w-4 h-4" /> Register as Employer
                  </button>
                </Link>
                <Link to="/login?role=employer">
                  <button className="px-5 py-3 border border-gray-300 text-gray-800 rounded-lg font-medium hover:bg-white transition-colors">
                    Sign In
                  </button>
                </Link>
                <Link to="/employer">
                  <button className="px-5 py-3 border border-primary-200 text-primary-700 bg-primary-50 rounded-lg font-medium hover:bg-primary-100 transition-colors flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Post Internship
                  </button>
                </Link>
              </div>
              <ul className="mt-6 text-sm text-gray-600 list-disc ml-6 space-y-1">
                <li>Match candidates by Skills, Sector, and Location with transparent % breakdowns.</li>
                <li>Filter by diversity & eligibility preferences (gender, residence, social background).</li>
                <li>Update or delete applications; close postings when filled.</li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="order-1 lg:order-2"
            >
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Briefcase className="w-6 h-6 text-primary-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Employer Panel Highlights</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[ 
                    { icon: <CheckCircle className='w-4 h-4 text-green-600' />, t: 'Create postings with eligibility' },
                    { icon: <Target className='w-4 h-4 text-blue-600' />, t: 'View ranked matches with %' },
                    { icon: <TrendingUp className='w-4 h-4 text-purple-600' />, t: 'See matched skills list' },
                    { icon: <Zap className='w-4 h-4 text-yellow-600' />, t: 'Update app status inline' },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-700">
                      {f.icon}
                      <span>{f.t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Get matched with your dream internship in 3 simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Upload Resume",
                desc: "Upload your resume and our AI will extract your skills, education, and experience automatically."
              },
              {
                step: "2", 
                title: "Set Preferences",
                desc: "Tell us your preferred industry, location, and career goals to personalize your matches."
              },
              {
                step: "3",
                title: "Get Matches",
                desc: "Receive ranked internship matches with detailed compatibility scores and apply directly."
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2, duration: 0.8 }}
              >
                <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{step.title}</h3>
                <p className="text-gray-600">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Find Your Perfect Match?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of students who have found their dream internships through our platform.
          </p>
          <Link to="/signup">
            <motion.button
              className="px-8 py-4 bg-primary-600 text-white font-semibold rounded-lg text-lg shadow-sm hover:bg-primary-700 transition-all duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Start Your Journey Today
            </motion.button>
          </Link>
        </div>
      </section>
    </div>
  )
}
