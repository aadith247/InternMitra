import { useEffect, useState } from 'react'
import Header from '../components/Header'
import { api } from '../lib/api'
import { useNavigate } from 'react-router-dom'

export default function Analytics() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!token || !user) return navigate('/login')
    if (user.role !== 'artisan') return navigate('/')
    api.get('/products').then(({ data }) => setProducts(data.data)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-6xl mx-auto pt-24 px-4">
        <h1 className="text-2xl font-bold mb-6">Analytics</h1>
        {loading ? 'Loading...' : (
          <div className="space-y-6">
            {products.map(p => (
              <div key={p._id} className="border rounded-lg p-4">
                <div className="font-semibold mb-2">{p.name}</div>
                <div className="grid md:grid-cols-3 gap-4">
                  {p.memes?.length ? p.memes.map((m, idx) => (
                    <div key={idx} className="border rounded-md p-3">
                      <div className="aspect-square bg-gray-100 rounded mb-2" style={{backgroundImage:`url(${m.imageUrl})`, backgroundSize:'cover'}} />
                      <div className="text-sm text-gray-700">Status: {m.status}</div>
                      <div className="text-sm">Likes: {m.analytics?.likes ?? 0}</div>
                      <div className="text-sm">Comments: {m.analytics?.comments ?? 0}</div>
                      <div className="text-sm">Reach: {m.analytics?.reach ?? 0}</div>
                      <div className="text-sm">Impressions: {m.analytics?.impressions ?? 0}</div>
                    </div>
                  )) : <div className="text-gray-600">No memes yet.</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


