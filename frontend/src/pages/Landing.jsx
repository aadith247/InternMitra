import Header from '../components/Header.jsx'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <section className="pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <motion.h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-indigo-600">Auto Meme-Commerce</span><br/>Make your products go viral.
          </motion.h1>
          <motion.p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Upload product photos, get AI-generated meme posts, auto-publish to Instagram, and sell with a frictionless checkout.
          </motion.p>
          <div className="flex gap-4 justify-center">
            <Link to="/signup" className="px-6 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Get Started Free</Link>
            <Link to="/login" className="px-6 py-3 rounded-lg border">Sign In</Link>
          </div>
        </div>
      </section>
    </div>
  )
}


