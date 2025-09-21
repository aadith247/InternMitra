import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Button } from './ui/button'

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
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
          <span className="text-primary-600">Intern</span>Match
        </Link>

        <div className="flex flex-1 items-center justify-end gap-3">
          <Link to="/employer/start" className="hidden md:block">
            <Button className="bg-primary-600 text-white hover:bg-primary-700">Upload an Internship</Button>
          </Link>
          {user ? (
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
              </div>
              <Button onClick={handleLogout} variant="outline">
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="sm:flex sm:gap-4">
                <Link to="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button>Get Started</Button>
                </Link>
              </div>
            </div>
          )}

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
                <li>
                  <Link to="/employer/start" onClick={() => setOpen(false)}>
                    <Button className="w-full justify-start">Upload an Internship</Button>
                  </Link>
                </li>
                {user ? (
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
                    <li className="pt-4 border-t border-gray-200">
                      <Button onClick={handleLogout} variant="outline" className="w-full">
                        Logout
                      </Button>
                    </li>
                  </>
                ) : (
                  <li className="pt-4 border-t border-gray-200">
                    <Link to="/signup" onClick={() => setOpen(false)}>
                      <Button className="w-full">Get Started</Button>
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
