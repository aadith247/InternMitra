import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import UploadProduct from './pages/UploadProduct.jsx'
import Orders from './pages/Orders.jsx'
import Checkout from './pages/Checkout.jsx'
import TrackOrder from './pages/TrackOrder.jsx'
import Analytics from './pages/Analytics.jsx'
import { RequireAuth } from './lib/auth'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/upload" element={<RequireAuth><UploadProduct /></RequireAuth>} />
      <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
      <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />

      {/* Public customer routes */}
      <Route path="/checkout/:productId" element={<Checkout />} />
      <Route path="/track/:orderId" element={<TrackOrder />} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}


