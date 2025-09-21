import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { useNavigate, Navigate } from 'react-router-dom'

const AuthContext = createContext(null)

function readStored() {
  try {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    return { token, user }
  } catch {
    return { token: null, user: null }
  }
}

export function AuthProvider({ children }) {
  const [{ token, user }, setState] = useState(readStored())

  useEffect(() => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
    if (user) localStorage.setItem('user', JSON.stringify(user))
    else localStorage.removeItem('user')
  }, [token, user])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { token: t, refreshToken, user: u } = res.data.data
    setState({ token: t, user: u })
    return u
  }

  const register = async (payload) => {
    const res = await api.post('/auth/register', payload)
    const { token: t, refreshToken, user: u } = res.data.data
    setState({ token: t, user: u })
    return u
  }

  const logout = () => {
    setState({ token: null, user: null })
  }

  const value = useMemo(() => ({ token, user, login, register, logout, setAuth: setState }), [token, user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export function RequireAuth({ children }) {
  const { token } = useAuth() || {}
  if (!token) return <Navigate to="/login" replace />
  return children
}
