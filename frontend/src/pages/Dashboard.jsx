import { useEffect, useState } from 'react'
import Header from '../components/Header'
import { api } from '../lib/api'
import { Link, useNavigate } from 'react-router-dom'

export default function Dashboard() {
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Products</h1>
          <Link to="/upload" className="px-4 py-2 rounded-md bg-indigo-600 text-white">Upload Product</Link>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.map((p) => (
              <div key={p._id} className="border rounded-lg p-4">
                <div className="aspect-square bg-gray-100 rounded mb-3" style={{backgroundImage: `url(${p?.images?.[0]?.url||''})`, backgroundSize:'cover'}} />
                <div className="font-semibold">{p.name}</div>
                <div className="text-gray-600 text-sm mb-2">{p.description}</div>
                <div className="text-sm font-medium">₹{p.price}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


