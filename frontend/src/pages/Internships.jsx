import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Header from '../components/Header'
import { Button } from '../components/ui/button'
import { motion } from 'framer-motion'
import { Building, MapPin, Clock, IndianRupee, Search, Filter } from 'lucide-react'

export default function Internships() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [sector, setSector] = useState('')
  const [remote, setRemote] = useState(false)
  const [minDuration, setMinDuration] = useState('')
  const [stipendMin, setStipendMin] = useState('')
  const [socialBackground, setSocialBackground] = useState('')
  const [page, setPage] = useState(0)
  const LIMIT = 20
  const navigate = useNavigate()

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const loadAll = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/internships`, {
        params: {
          search: query || undefined,
          location: location || undefined,
          sector: sector || undefined,
          remote: remote || undefined,
          minDuration: minDuration || undefined,
          stipendMin: stipendMin || undefined,
          socialBackground: socialBackground || undefined,
          limit: LIMIT,
          offset: page * LIMIT
        }
      })
      setItems(data.data || [])
    } catch (e) {
      console.error('Failed to load internships', e)
    } finally {
      setLoading(false)
    }
  }

  const onFilter = (e) => {
    e.preventDefault()
    setLoading(true)
    setPage(0)
    loadAll()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 pt-24">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading internships...</p>
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
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Internships</h1>
          <p className="text-gray-600">Browse all available internships and view details.</p>
        </motion.div>

        {/* Filters */}
        <form onSubmit={onFilter} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="flex items-center border rounded px-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input className="flex-1 p-2 outline-none" placeholder="Search title or keywords" value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <input className="border rounded p-2" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
            <select className="border rounded p-2" value={sector} onChange={e => setSector(e.target.value)}>
              <option value="">All Sectors</option>
              <option>Technology</option>
              <option>Finance</option>
              <option>Healthcare</option>
              <option>Education</option>
              <option>Environmental</option>
              <option>Marketing</option>
              <option>Other</option>
            </select>
            <select className="border rounded p-2" value={socialBackground} onChange={e => setSocialBackground(e.target.value)}>
              <option value="">All Backgrounds</option>
              <option value="Rural">Rural</option>
              <option value="Urban">Urban</option>
            </select>
            <div className="flex items-center gap-2">
              <input id="remote" type="checkbox" className="h-4 w-4" checked={remote} onChange={e => setRemote(e.target.checked)} />
              <label htmlFor="remote" className="text-sm text-gray-700">Remote</label>
            </div>
            <input className="border rounded p-2" placeholder="Min Duration (wks)" value={minDuration} onChange={e => setMinDuration(e.target.value)} />
            <input className="border rounded p-2" placeholder="Min Stipend" value={stipendMin} onChange={e => setStipendMin(e.target.value)} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Button type="submit"><Filter className="w-4 h-4 mr-2" /> Apply Filters</Button>
            <div className="text-sm text-gray-500">Page {page + 1}</div>
          </div>
        </form>

        {/* List */}
        {items.length === 0 ? (
          <div className="text-sm text-gray-600">No internships found.</div>
        ) : (
          <div className="space-y-4">
            {items.map((it, idx) => (
              <motion.div
                key={it.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.5 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{it.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1"><Building className="w-4 h-4" />{it.company_name}</div>
                      <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />{it.location}</div>
                      {it.duration_weeks && (
                        <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{it.duration_weeks} weeks</div>
                      )}
                      {it.stipend_amount && (
                        <div className="flex items-center gap-1"><IndianRupee className="w-4 h-4" />₹{it.stipend_amount}</div>
                      )}
                    </div>
                    <p className="text-gray-700 line-clamp-2">{it.description}</p>
                  </div>
                  <Link to={`/internship/${it.id}`}>
                    <Button variant="outline" size="sm">Details</Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage(Math.max(0, page - 1))}>Previous</Button>
          <Button variant="outline" onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  )
}
