import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <motion.header className={`fixed top-0 left-0 right-0 z-50 transition-all ${isScrolled ? 'bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm' : 'bg-white'}`} initial={{ y: -100 }} animate={{ y: 0 }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
        <Link to="/" className="font-bold text-xl"><span className="text-indigo-600">Auto</span> Meme-Commerce</Link>
        <div className="ml-auto hidden sm:flex items-center gap-4">
          <Link to="/login" className="text-gray-700 hover:text-gray-900">Login</Link>
          <Link to="/signup" className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Get Started</Link>
        </div>
        <button className="sm:hidden ml-auto p-2" onClick={() => setOpen(v => !v)}>
          <span className="sr-only">Menu</span>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="sm:hidden bg-white border-t">
            <div className="px-4 py-4 space-y-3">
              <Link to="/signup" onClick={() => setOpen(false)} className="block w-full text-center px-4 py-2 rounded-md bg-indigo-600 text-white">Get Started</Link>
              <Link to="/login" onClick={() => setOpen(false)} className="block w-full text-center px-4 py-2 rounded-md border">Login</Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  )
}


