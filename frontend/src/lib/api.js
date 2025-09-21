import axios from 'axios'

const RAW_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
export const API_BASE = RAW_BASE.endsWith('/api') ? RAW_BASE : `${RAW_BASE.replace(/\/$/, '')}/api`

export function getAuthHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use((config) => {
  config.headers = { ...config.headers, ...getAuthHeaders() }
  return config
})
