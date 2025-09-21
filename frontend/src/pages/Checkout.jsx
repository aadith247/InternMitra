import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import { api } from '../lib/api'

export default function Checkout() {
  const { productId } = useParams()
  const [product, setProduct] = useState(null)
  const [qty, setQty] = useState(1)
  const [address, setAddress] = useState({ name: '', street:'', city:'', state:'', country:'', zipCode:'', phone:'' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.get(`/products/${productId}`).then(({ data }) => setProduct(data.data))
  }, [productId])

  const placeOrder = async (method) => {
    setLoading(true)
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (!user?._id) {
        // quick register a customer?
        navigate('/signup')
        return
      }
      const { data } = await api.post('/orders', {
        items: [{ product: productId, quantity: qty }],
        shippingAddress: address,
        payment: { method }
      })
      const order = data.data
      if (method === 'razorpay') {
        const rp = await api.post('/payments/razorpay/create-order', { orderId: order._id })
        alert('Razorpay order created. Integrate checkout on client to proceed.')
      } else if (method === 'stripe') {
        const session = await api.post('/payments/stripe/create-session', { orderId: order._id, successUrl: window.location.origin + `/track/${order._id}`, cancelUrl: window.location.href })
        window.location.href = session.data.data.url
      } else {
        navigate(`/track/${order._id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!product) return <div className="min-h-screen"><Header /><div className="pt-24 px-4">Loading...</div></div>

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-4xl mx-auto pt-24 px-4 grid md:grid-cols-2 gap-8">
        <div>
          <div className="aspect-square rounded-md bg-gray-100" style={{backgroundImage:`url(${product?.images?.[0]?.url||''})`, backgroundSize:'cover'}} />
          <h1 className="text-2xl font-bold mt-4">{product.name}</h1>
          <p className="text-gray-600">{product.description}</p>
        </div>
        <div>
          <div className="space-y-3">
            <input className="w-full border rounded-md px-3 py-2" placeholder="Full name" value={address.name} onChange={e=>setAddress(a=>({...a,name:e.target.value}))} />
            <input className="w-full border rounded-md px-3 py-2" placeholder="Street" value={address.street} onChange={e=>setAddress(a=>({...a,street:e.target.value}))} />
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded-md px-3 py-2" placeholder="City" value={address.city} onChange={e=>setAddress(a=>({...a,city:e.target.value}))} />
              <input className="border rounded-md px-3 py-2" placeholder="State" value={address.state} onChange={e=>setAddress(a=>({...a,state:e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded-md px-3 py-2" placeholder="Country" value={address.country} onChange={e=>setAddress(a=>({...a,country:e.target.value}))} />
              <input className="border rounded-md px-3 py-2" placeholder="ZIP" value={address.zipCode} onChange={e=>setAddress(a=>({...a,zipCode:e.target.value}))} />
            </div>
            <input className="w-full border rounded-md px-3 py-2" placeholder="Phone" value={address.phone} onChange={e=>setAddress(a=>({...a,phone:e.target.value}))} />
            <div className="flex items-center gap-3">
              <label>Qty</label>
              <input type="number" min={1} value={qty} onChange={e=>setQty(Number(e.target.value))} className="w-20 border rounded-md px-3 py-2" />
            </div>
            <div className="mt-4 space-x-3">
              <button disabled={loading} onClick={()=>placeOrder('razorpay')} className="px-4 py-2 rounded-md bg-indigo-600 text-white">Pay with Razorpay</button>
              <button disabled={loading} onClick={()=>placeOrder('stripe')} className="px-4 py-2 rounded-md border">Pay with Stripe</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


