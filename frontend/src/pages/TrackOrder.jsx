import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Header'
import { api } from '../lib/api'

export default function TrackOrder() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/orders/${orderId}`).then(({ data }) => setOrder(data.data)).catch((e)=> setError('Unable to load order. Login might be required.'))
  }, [orderId])

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-3xl mx-auto pt-24 px-4">
        <h1 className="text-2xl font-bold mb-4">Order Tracking</h1>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        {!order ? 'Loading...' : (
          <div className="space-y-2">
            <div className="font-semibold">{order.orderNumber}</div>
            <div>Status: {order.status}</div>
            <div>Total: {order.pricing?.currency} {order.pricing?.total}</div>
            <div className="mt-4">
              <div className="font-medium mb-2">Timeline</div>
              <div className="space-y-2">
                {order.timeline?.map((t, idx) => (
                  <div key={idx} className="text-sm text-gray-700">{new Date(t.timestamp).toLocaleString()} - {t.status} - {t.message}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


