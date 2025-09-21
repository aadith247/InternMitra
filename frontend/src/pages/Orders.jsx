import { useEffect, useState } from 'react'
import Header from '../components/Header'
import { api } from '../lib/api'
import { useNavigate } from 'react-router-dom'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!token || !user) return navigate('/login')
    const endpoint = user.role === 'artisan' ? '/orders/artisan' : '/orders/me'
    api.get(endpoint).then(({ data }) => setOrders(data.data)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-5xl mx-auto pt-24 px-4">
        <h1 className="text-2xl font-bold mb-4">Orders</h1>
        {loading ? 'Loading...' : (
          <div className="space-y-4">
            {orders.map(o => (
              <div key={o._id} className="border rounded-lg p-4">
                <div className="font-semibold">{o.orderNumber}</div>
                <div className="text-sm text-gray-600">Status: {o.status}</div>
                <div className="text-sm">Total: {o.pricing?.currency} {o.pricing?.total}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


