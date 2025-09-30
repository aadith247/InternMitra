import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Bot } from 'lucide-react'

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [employer, setEmployer] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    const empData = localStorage.getItem('employer')
    if (empData) {
      setEmployer(JSON.parse(empData))
    }
    
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    navigate('/')
  }

  const handleEmployerLogout = () => {
    localStorage.removeItem('employerToken')
    localStorage.removeItem('employer')
    setEmployer(null)
    navigate('/')
  }

  return (
    <motion.header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm' 
          : 'bg-white border-b border-gray-100'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="mx-auto flex h-20 max-w-screen-xl items-center px-4 sm:px-6 lg:px-8">
        <Link to="/" className="block text-gray-900 font-bold text-2xl">
          <span className="text-primary-600">Intern</span>मित्र 
        </Link>

        <div className="flex flex-1 items-center justify-end gap-3">
          {(() => {
            const onEmployer = !!employer && location.pathname.startsWith('/employer')
            if (onEmployer) {
              return (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex sm:gap-4">
                    <Link to="/employer?tab=overview"><Button variant="ghost">Overview</Button></Link>
                    <Link to="/employer?tab=jobs"><Button variant="ghost">Job Postings</Button></Link>
                    <Link to="/employer?tab=candidates"><Button variant="ghost">Candidates</Button></Link>
                    <Link to="/employer?tab=matches"><Button variant="ghost">All Matches</Button></Link>
                  </div>
                  <Button onClick={handleEmployerLogout} variant="outline">Logout</Button>
                </div>
              )
            }

            if (user) {
              return (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex sm:gap-4">
                    <Link to="/dashboard">
                      <Button variant="ghost">Dashboard</Button>
                    </Link>
                    <Link to="/internships">
                      <Button variant="ghost">Internships</Button>
                    </Link>
                    <Link to="/matches">
                      <Button variant="ghost">Matches</Button>
                    </Link>
                    <Link to="/applications">
                      <Button variant="ghost">Applications</Button>
                    </Link>
                    <Link to="/mock-interview">
                      <Button variant="ghost"><Bot className="w-4 h-4 mr-2"/>Mock Interview</Button>
                    </Link>
                  </div>
                  <Button onClick={handleLogout} variant="outline">Logout</Button>
                </div>
              )
            }

            return (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex sm:gap-2">
                  <Link to="/login/student"><Button variant="ghost">Student Login</Button></Link>
                  <Link to="/login/company"><Button className="bg-primary-600 text-white hover:bg-primary-700">Company Login</Button></Link>
                </div>
                <div className="sm:hidden">
                  <Link to="/login/student"><Button size="sm" variant="ghost">Login</Button></Link>
                </div>
              </div>
            )
          })()}

          {/* Mobile menu button */}
          <motion.button
            className="block rounded-lg p-2.5 text-gray-600 transition hover:text-gray-900 hover:bg-gray-50 md:hidden"
            onClick={() => setOpen(!open)}
            whileTap={{ scale: 0.95 }}
          >
            <span className="sr-only">Toggle menu</span>
            <motion.svg
              xmlns="http://www.w3.org/2000/svg"
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </motion.svg>
          </motion.button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="md:hidden bg-white border-t border-gray-200 shadow-lg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <nav className="px-4 py-6">
              <ul className="space-y-4">
                {(() => {
                  const onEmployer = !!employer && location.pathname.startsWith('/employer')
                  if (onEmployer) {
                    return (
                      <>
                        <li>
                          <Link to="/employer?tab=overview" onClick={() => setOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start">Overview</Button>
                          </Link>
                        </li>
                        <li>
                          <Link to="/employer?tab=jobs" onClick={() => setOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start">Job Postings</Button>
                          </Link>
                        </li>
                        <li>
                          <Link to="/employer?tab=candidates" onClick={() => setOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start">Candidates</Button>
                          </Link>
                        </li>
                        <li>
                          <Link to="/employer?tab=matches" onClick={() => setOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start">All Matches</Button>
                          </Link>
                        </li>
                        <li className="pt-4 border-t border-gray-200">
                          <Button onClick={handleEmployerLogout} variant="outline" className="w-full">Logout</Button>
                        </li>
                      </>
                    )
                  }
                  if (user) {
                    return (
                      <>
                        <li>
                          <Link to="/dashboard" onClick={() => setOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start">Dashboard</Button>
                          </Link>
                        </li>
                        <li>
                          <Link to="/internships" onClick={() => setOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start">Internships</Button>
                          </Link>
                        </li>
                        <li>
                          <Link to="/matches" onClick={() => setOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start">Matches</Button>
                          </Link>
                        </li>
                        <li>
                          <Link to="/applications" onClick={() => setOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start">Applications</Button>
                          </Link>
                        </li>
                        <li>
                          <Link to="/mock-interview" onClick={() => setOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start"><span className="inline-flex items-center gap-2"><Bot className="w-4 h-4"/>Mock Interview</span></Button>
                          </Link>
                        </li>
                        <li className="pt-4 border-t border-gray-200">
                          <Button onClick={handleLogout} variant="outline" className="w-full">Logout</Button>
                        </li>
                      </>
                    )
                  }
                  return (
                    <>
                      <li>
                        <Link to="/login/student" onClick={() => setOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">Student Login</Button>
                        </Link>
                      </li>
                      <li>
                        <Link to="/login/company" onClick={() => setOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">Company Login</Button>
                        </Link>
                      </li>
                    </>
                  )
                })()}
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
